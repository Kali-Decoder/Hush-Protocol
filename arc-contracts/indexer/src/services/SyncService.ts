import type {Hex, PublicClient} from "viem";
import {config} from "../config/index.js";
import {createIndexerPublicClient} from "../blockchain/RootPoster.js";
import {RootPoster} from "../blockchain/RootPoster.js";
import {
  DepositRepository,
  RootRepository,
  SyncStateRepository,
} from "../db/DepositRepository.js";
import {PoseidonTree} from "../merkle/PoseidonTree.js";
import {EventWatcher} from "../watcher/EventWatcher.js";
import type {DepositEvent, WitnessResponse} from "../types/index.js";

/**
 * Core loop: hydrate tree → poll deposits → wait confirmations → insert →
 * post root. Idempotent and crash-safe via Postgres cursor + leaf ordering.
 */
export class SyncService {
  readonly tree: PoseidonTree;
  readonly deposits = new DepositRepository();
  readonly roots = new RootRepository();
  readonly sync = new SyncStateRepository();
  readonly watcher: EventWatcher;
  readonly poster: RootPoster;
  private readonly client: PublicClient;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private tickBusy = false;

  constructor(client?: PublicClient) {
    this.client = client ?? createIndexerPublicClient();
    this.watcher = new EventWatcher(this.client);
    this.poster = new RootPoster(this.client);
    this.tree = new PoseidonTree(config.treeDepth);
  }

  async start(): Promise<void> {
    await this.hydrate();
    // If START_BLOCK was raised (e.g. skip genesis crawl), jump the cursor forward.
    const state = await this.sync.get();
    if (state.lastProcessedBlock < config.startBlock) {
      const jumpTo = Math.max(0, config.startBlock - 1);
      await this.sync.update({lastProcessedBlock: jumpTo});
      console.log(
        `[sync] cursor ${state.lastProcessedBlock} < START_BLOCK ${config.startBlock}; jumped to ${jumpTo}`
      );
    }
    this.running = true;
    console.log(
      `[sync] started pool=${config.poolAddress} confirmations=${config.confirmations}`
    );
    void this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Rebuild in-memory tree from finalized deposits (never from zero unless empty). */
  async hydrate(): Promise<void> {
    const finalized = await this.deposits.listFinalizedOrdered();
    const commitments = finalized.map((d) => d.commitment);
    const root = await this.tree.rebuild(commitments);
    await this.sync.update({
      lastRoot: commitments.length ? root : null,
      treeDepth: config.treeDepth,
    });
    console.log(`[sync] hydrated ${commitments.length} leaf(s) root=${root}`);

    // Re-post latest root after restart so claims work if window evicted it.
    if (commitments.length > 0 && !config.skipPostRoot) {
      try {
        const tx = await this.poster.postRoot(root as Hex);
        if (tx) await this.roots.markPosted(root, tx);
        else await this.roots.upsert(root, commitments.length, null);
      } catch (err) {
        console.warn(
          "[sync] postRoot after hydrate failed (non-fatal):",
          err instanceof Error ? err.message.slice(0, 200) : err
        );
      }
    }

    // Retry any unposted roots from prior crashes
    for (const rootHex of await this.roots.unposted()) {
      try {
        const tx = await this.poster.postRoot(rootHex as Hex);
        if (tx) await this.roots.markPosted(rootHex, tx);
      } catch (err) {
        console.warn(`[sync] retry postRoot ${rootHex} failed:`, err);
      }
    }
  }

  async tick(): Promise<{ingested: number; finalized: number}> {
    if (this.tickBusy) return {ingested: 0, finalized: 0};
    this.tickBusy = true;
    try {
      const latest = await this.watcher.latestBlock();
      const state = await this.sync.get();

      let from =
        state.lastProcessedBlock > 0
          ? state.lastProcessedBlock + 1
          : config.startBlock;
      // Cap range to avoid huge eth_getLogs
      const to = Math.min(latest, from + 2_000 - 1);
      let ingested = 0;

      if (to >= from) {
        const events = await this.watcher.fetchDeposits(from, to);
        for (const ev of events) {
          const inserted = await this.deposits.insertIgnore({
            commitment: ev.commitment,
            leafIndex: ev.leafIndex,
            token: ev.token,
            amount: ev.amount.toString(),
            blockNumber: ev.blockNumber,
            blockHash: ev.blockHash,
            txHash: ev.txHash,
            logIndex: ev.logIndex,
            finalized: false,
          });
          if (inserted) ingested++;
        }
        await this.sync.update({lastProcessedBlock: to});
      }

      const finalized = await this.finalizeUpTo(latest - config.confirmations);
      return {ingested, finalized};
    } finally {
      this.tickBusy = false;
    }
  }

  /**
   * Finalize deposits at or below `safeBlock`: insert into Merkle tree in
   * leafIndex order, post root.
   */
  private async finalizeUpTo(safeBlock: number): Promise<number> {
    if (safeBlock < 0) return 0;
    const pending = await this.deposits.listPendingFinalization(safeBlock);
    if (pending.length === 0) return 0;

    let count = 0;
    for (const d of pending) {
      const expected = await this.deposits.nextExpectedLeafIndex();
      // Only finalize the next contiguous leaf — gaps wait for missing events
      if (d.leafIndex !== expected) {
        if (d.leafIndex < expected) {
          // Duplicate / already covered — mark finalized without re-insert
          await this.deposits.markFinalized(d.id!);
          continue;
        }
        console.warn(
          `[sync] waiting for leaf ${expected} before ${d.leafIndex} (gap)`
        );
        break;
      }

      // Verify commitment not already in tree at wrong index
      const {leafIndex, root} = await this.tree.insert(d.commitment);
      if (leafIndex !== d.leafIndex) {
        throw new Error(
          `leafIndex mismatch: event=${d.leafIndex} tree=${leafIndex} commitment=${d.commitment}`
        );
      }

      await this.deposits.markFinalized(d.id!);
      await this.roots.upsert(root, this.tree.size, d.blockNumber);
      await this.sync.update({lastRoot: root});

      try {
        const tx = await this.poster.postRoot(root as Hex);
        if (tx) await this.roots.markPosted(root, tx);
      } catch (err) {
        console.error(
          `[sync] postRoot failed for ${root}:`,
          err instanceof Error ? err.message : err
        );
        // Root stays unposted; hydrate/retry will try again
      }

      count++;
      console.log(
        `[sync] finalized leaf=${leafIndex} commitment=${d.commitment.slice(0, 18)}… root=${root.slice(0, 18)}…`
      );
    }
    return count;
  }

  async getWitness(commitment: string): Promise<WitnessResponse | null> {
    const dep = await this.deposits.findByCommitment(commitment);
    if (!dep || !dep.finalized) return null;
    return this.tree.witness(dep.leafIndex);
  }

  /** Expose for debugging / tests. */
  processEventForTest(ev: DepositEvent): Promise<boolean> {
    return this.deposits.insertIgnore({
      commitment: ev.commitment,
      leafIndex: ev.leafIndex,
      token: ev.token,
      amount: ev.amount.toString(),
      blockNumber: ev.blockNumber,
      blockHash: ev.blockHash,
      txHash: ev.txHash,
      logIndex: ev.logIndex,
      finalized: false,
    });
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const {ingested, finalized} = await this.tick();
        if (ingested || finalized) {
          console.log(`[sync] tick ingested=${ingested} finalized=${finalized}`);
        }
      } catch (err) {
        console.error("[sync] tick error:", err instanceof Error ? err.message : err);
      }
      await new Promise<void>((resolve) => {
        this.timer = setTimeout(resolve, config.pollIntervalMs);
      });
    }
  }
}

import {getPool} from "./client.js";
import type {DepositRecord, SyncState} from "../types/index.js";

function mapDeposit(row: Record<string, unknown>): DepositRecord {
  return {
    id: Number(row.id),
    commitment: String(row.commitment),
    leafIndex: Number(row.leaf_index),
    token: String(row.token),
    amount: String(row.amount),
    blockNumber: Number(row.block_number),
    blockHash: String(row.block_hash),
    txHash: String(row.tx_hash),
    logIndex: Number(row.log_index),
    finalized: Boolean(row.finalized),
    createdAt: row.created_at as Date,
  };
}

export class DepositRepository {
  async insertIgnore(d: DepositRecord): Promise<boolean> {
    try {
      const res = await getPool().query(
        `INSERT INTO deposits
          (commitment, leaf_index, token, amount, block_number, block_hash, tx_hash, log_index, finalized)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (tx_hash, log_index) DO NOTHING
         RETURNING id`,
        [
          d.commitment.toLowerCase(),
          d.leafIndex,
          d.token.toLowerCase(),
          d.amount,
          d.blockNumber,
          d.blockHash.toLowerCase(),
          d.txHash.toLowerCase(),
          d.logIndex,
          d.finalized,
        ]
      );
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      const code = (err as {code?: string}).code;
      // Unique leaf_index / commitment — treat as already ingested
      if (code === "23505") return false;
      throw err;
    }
  }

  async markFinalized(id: number): Promise<void> {
    await getPool().query(`UPDATE deposits SET finalized = TRUE WHERE id = $1`, [id]);
  }

  async findByCommitment(commitment: string): Promise<DepositRecord | null> {
    const res = await getPool().query(
      `SELECT * FROM deposits WHERE commitment = $1`,
      [commitment.toLowerCase()]
    );
    return res.rows[0] ? mapDeposit(res.rows[0]) : null;
  }

  async listFinalizedOrdered(): Promise<DepositRecord[]> {
    const res = await getPool().query(
      `SELECT * FROM deposits WHERE finalized = TRUE ORDER BY leaf_index ASC`
    );
    return res.rows.map(mapDeposit);
  }

  async listPendingFinalization(maxBlock: number): Promise<DepositRecord[]> {
    const res = await getPool().query(
      `SELECT * FROM deposits
       WHERE finalized = FALSE AND block_number <= $1
       ORDER BY leaf_index ASC, log_index ASC`,
      [maxBlock]
    );
    return res.rows.map(mapDeposit);
  }

  async countFinalized(): Promise<number> {
    const res = await getPool().query(
      `SELECT COUNT(*)::int AS c FROM deposits WHERE finalized = TRUE`
    );
    return Number(res.rows[0].c);
  }

  async nextExpectedLeafIndex(): Promise<number> {
    const res = await getPool().query(
      `SELECT COALESCE(MAX(leaf_index) + 1, 0)::int AS n FROM deposits WHERE finalized = TRUE`
    );
    return Number(res.rows[0].n);
  }
}

export class RootRepository {
  async upsert(root: string, leafCount: number, blockNumber: number | null): Promise<void> {
    await getPool().query(
      `INSERT INTO merkle_roots (root, leaf_count, block_number, posted)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (root) DO NOTHING`,
      [root.toLowerCase(), leafCount, blockNumber]
    );
  }

  async markPosted(root: string, txHash: string): Promise<void> {
    await getPool().query(
      `UPDATE merkle_roots SET posted = TRUE, posted_tx_hash = $2 WHERE root = $1`,
      [root.toLowerCase(), txHash.toLowerCase()]
    );
  }

  async latest(): Promise<{root: string; leafCount: number; posted: boolean} | null> {
    const res = await getPool().query(
      `SELECT root, leaf_count, posted FROM merkle_roots ORDER BY leaf_count DESC LIMIT 1`
    );
    if (!res.rows[0]) return null;
    return {
      root: String(res.rows[0].root),
      leafCount: Number(res.rows[0].leaf_count),
      posted: Boolean(res.rows[0].posted),
    };
  }

  async count(): Promise<number> {
    const res = await getPool().query(`SELECT COUNT(*)::int AS c FROM merkle_roots`);
    return Number(res.rows[0].c);
  }

  async unposted(): Promise<string[]> {
    const res = await getPool().query(
      `SELECT root FROM merkle_roots WHERE posted = FALSE ORDER BY leaf_count ASC`
    );
    return res.rows.map((r) => String(r.root));
  }
}

export class SyncStateRepository {
  async get(): Promise<SyncState> {
    const res = await getPool().query(`SELECT * FROM sync_state WHERE id = 1`);
    const row = res.rows[0];
    return {
      lastProcessedBlock: Number(row.last_processed_block),
      lastRoot: row.last_root ? String(row.last_root) : null,
      treeDepth: Number(row.tree_depth),
      updatedAt: row.updated_at as Date,
    };
  }

  async update(partial: {
    lastProcessedBlock?: number;
    lastRoot?: string | null;
    treeDepth?: number;
  }): Promise<void> {
    const cur = await this.get();
    await getPool().query(
      `UPDATE sync_state SET
         last_processed_block = $1,
         last_root = $2,
         tree_depth = $3,
         updated_at = NOW()
       WHERE id = 1`,
      [
        partial.lastProcessedBlock ?? cur.lastProcessedBlock,
        partial.lastRoot === undefined ? cur.lastRoot : partial.lastRoot,
        partial.treeDepth ?? cur.treeDepth,
      ]
    );
  }
}

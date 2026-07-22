"use client";

import {useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {createNote, noteToJSON} from "@bullet/sdk";
import {createPublicClient, http} from "viem";
import {bulletPoolAbi} from "@/abi/BulletPool";
import {erc20Abi} from "@/abi/erc20";
import {postNote, resolveUser} from "@/lib/api";
import {recipientDigestForWallet} from "@/lib/chain";
import {
  AMOUNT_PRESETS,
  addresses,
  arcTestnet,
  explorerTx,
  toUsdcUnits,
} from "@/lib/config";
import {sealPayload} from "@/lib/crypto";
import {getToken, getStoredUser} from "@/lib/session";
import {toast} from "@/lib/toast";
import {formatError, formatErrorTitle} from "@/lib/errors";
import type {PublicUser} from "@/shared";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {CheckIcon, ExternalLinkIcon, LoaderIcon} from "@/components/icons";
import {
  formatRecipientLabel,
  normalizeRecipient,
  RecipientKindIcon,
  type RecipientKind,
} from "@/components/RecipientKind";
import {RecipientKindSelect} from "@/components/RecipientKindSelect";
import {useSession} from "@/hooks/useSession";
import {TokenBalance, useUsdcBalance} from "@/hooks/useUsdcBalance";
import {
  AmountPills,
  ErrorBanner,
  FieldLabel,
  Panel,
  PayProgress,
} from "@/components/ui";

type Step =
  | "idle"
  | "resolving"
  | "creating"
  | "approving"
  | "depositing"
  | "posting"
  | "done"
  | "error";

const FLOW_STEPS = ["Note", "Approve", "Deposit", "Deliver"] as const;

function flowIndex(step: Step): number {
  switch (step) {
    case "creating":
      return 0;
    case "approving":
      return 1;
    case "depositing":
      return 2;
    case "posting":
      return 3;
    case "done":
      return 4;
    default:
      return -1;
  }
}

export function SendForm({initialRecipient}: {initialRecipient?: string}) {
  const {address, isConnected} = useAccount();
  const {writeContractAsync} = useWriteContract();
  const {isSignedIn, user: me} = useSession();
  const {hasEnough, formatted: usdcBalance, refetch: refetchBalance} =
    useUsdcBalance();

  const [recipient, setRecipient] = useState(initialRecipient ?? "");
  const [recipientKind, setRecipientKind] = useState<
    Exclude<RecipientKind, "unknown">
  >("twitter");
  const [resolved, setResolved] = useState<PublicUser | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [commitment, setCommitment] = useState("");

  const busy =
    step === "resolving" ||
    step === "creating" ||
    step === "approving" ||
    step === "depositing" ||
    step === "posting";

  async function handleResolve() {
    setError("");
    setResolved(null);
    setStep("resolving");
    try {
      const user = await resolveUser(normalizeRecipient(recipient, recipientKind));
      if (!user) {
        setError("User not found. They need to register first.");
        setStep("error");
        return;
      }
      setResolved(user);
      setStep("idle");
    } catch (e) {
      setError(formatError(e));
    }
  }

  async function handleSend() {
    setError("");
    if (!address || !resolved || amount == null) return;
    const token = getToken();
    const me = getStoredUser();
    if (!token || !me) {
      setError("Sign in at /register first so we can deliver the encrypted note.");
      setStep("error");
      return;
    }
    if (amount != null && !hasEnough(amount)) {
      setError(`Insufficient USDC. Balance is ${usdcBalance} USDC.`);
      setStep("error");
      toast.error(`Insufficient USDC. Balance is ${usdcBalance} USDC.`);
      return;
    }

    const {pool, usdc} = addresses();
    const units = toUsdcUnits(amount);

    try {
      setStep("creating");
      const digest = recipientDigestForWallet(resolved.wallet);
      const note = await createNote({
        recipientDigest: digest,
        amount: units,
        token: usdc,
      });
      const json = noteToJSON(note);
      const commitmentBytes32 = json.commitmentBytes32;
      setCommitment(commitmentBytes32);

      setStep("approving");
      const approveHash = await writeContractAsync({
        address: usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [pool, units],
        chainId: arcTestnet.id,
      });
      await waitTx(approveHash);

      setStep("depositing");
      const depositHash = await writeContractAsync({
        address: pool,
        abi: bulletPoolAbi,
        functionName: "deposit",
        args: [usdc, units, commitmentBytes32],
        chainId: arcTestnet.id,
      });
      await waitTx(depositHash);
      setTxHash(depositHash);

      setStep("posting");
      const sealed = sealPayload(JSON.stringify(json), resolved.bulletPublicKey);
      await postNote(token, {
        recipientUsername: resolved.username,
        commitment: commitmentBytes32,
        encryptedPayload: sealed,
      });

      setStep("done");
      toast.success(`Sent ${amount} USDC to @${resolved.username}`, {
        href: explorerTx(depositHash),
        hrefLabel: "View on arcscan",
      });
      void refetchBalance();
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <Panel className="animate-rise space-y-6 text-left">
        <div className="flex items-center gap-2 text-signal">
          <CheckIcon className="h-5 w-5" />
          <p className="text-sm font-medium text-ink">Sent silently</p>
        </div>
        <div>
          <p className="text-5xl font-bold tracking-tight">
            {amount}{" "}
            <span className="text-2xl font-semibold text-graphite">USDC</span>
          </p>
          <p className="mt-2 flex items-center justify-center gap-2 text-lg text-graphite">
            to{" "}
            {formatRecipientLabel(
              recipientKind === "email" ? recipient : `@${resolved?.username}`,
              recipientKind
            )}
            <RecipientKindIcon kind={recipientKind} className="h-4 w-4" />
          </p>
        </div>
        <div className="space-y-3 border-t border-fog pt-5">
          <p className="truncate font-mono text-xs text-graphite">{commitment}</p>
          {txHash ? (
            <a
              href={explorerTx(txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-fog bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-graphite"
            >
              View transaction
              <ExternalLinkIcon className="h-3.5 w-3.5 text-graphite" />
            </a>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setStep("idle");
            setResolved(null);
            setAmount(null);
            setRecipient("");
            setTxHash("");
            setCommitment("");
          }}
          className="btn-primary"
        >
          Send another
        </button>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-6 text-left">
      {!isConnected ? (
        <div className="space-y-4 py-2 text-center">
          <p className="text-sm text-graphite">
            Connect an Arc wallet to deposit a fixed USDC note.
          </p>
          <ConnectButton label="Connect wallet" />
        </div>
      ) : (
        <NetworkGate>
          {!isSignedIn ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-graphite">
                {me
                  ? `Signed profile @${me.username} loaded. Sign in to send.`
                  : "Sign in so we can deliver the encrypted note."}
              </p>
              <a href="/register" className="btn-primary">
                {me ? "Sign in" : "Sign in or register"}
              </a>
            </div>
          ) : !resolved ? (
            <>
              <TokenBalance />
              <div>
                <FieldLabel>To</FieldLabel>
                <div className="input-shell">
                  <RecipientKindSelect
                    value={recipientKind}
                    onChange={setRecipientKind}
                    disabled={busy}
                    variant="inline"
                  />
                  <span className="input-shell-divider" aria-hidden />
                  <input
                    type="text"
                    placeholder={
                      recipientKind === "email"
                        ? "name@email.com"
                        : "@username"
                    }
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value.trimStart())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && recipient.trim())
                        void handleResolve();
                    }}
                    disabled={busy}
                    autoComplete="off"
                    spellCheck={false}
                    className="input-shell-field"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={busy || !recipient.trim()}
                onClick={handleResolve}
                className="btn-primary"
              >
                {step === "resolving" ? (
                  <LoaderIcon className="h-5 w-5 animate-spin" />
                ) : null}
                {step === "resolving" ? "Looking up…" : "Continue"}
              </button>
            </>
          ) : (
            <>
              <TokenBalance />
              <div className="flex items-start justify-between gap-3 rounded-xl bg-paper/80 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-graphite">Paying</p>
                  <p className="mt-0.5 flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <span className="truncate">
                      {formatRecipientLabel(
                        recipientKind === "email"
                          ? recipient
                          : resolved.username,
                        recipientKind
                      )}
                    </span>
                    <RecipientKindIcon
                      kind={recipientKind}
                      className="h-4 w-4 shrink-0 text-graphite"
                    />
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-graphite">
                    {resolved.wallet}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setResolved(null);
                    setAmount(null);
                    setError("");
                  }}
                  className="shrink-0 text-xs font-medium text-graphite hover:text-ink disabled:opacity-50"
                >
                  Change
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <FieldLabel>Amount</FieldLabel>
                  <p className="pb-0.5 font-mono text-[11px] text-graphite">
                    Fixed sizes
                  </p>
                </div>
                <div className="rounded-2xl border border-fog bg-white px-5 py-5">
                  <p className="flex items-baseline gap-2 text-5xl font-bold tracking-tight">
                    {amount != null ? (
                      <span
                        key={amount}
                        className="animate-amount-pop inline-block tabular-nums motion-reduce:animate-none"
                      >
                        {amount}
                      </span>
                    ) : (
                      <span className="text-fog">—</span>
                    )}
                    <span
                      className={`text-lg font-semibold ${
                        amount != null ? "text-graphite" : "text-fog"
                      }`}
                    >
                      USDC
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-graphite">
                    Pick a note size. Larger amounts unlock when you have balance.
                  </p>
                </div>
                <AmountPills
                  amounts={AMOUNT_PRESETS}
                  value={amount}
                  onChange={setAmount}
                  disabled={busy}
                  canAfford={hasEnough}
                />
              </div>

              {amount != null && !hasEnough(amount) ? (
                <p className="text-sm text-amber">
                  Not enough USDC. Balance {usdcBalance}.
                </p>
              ) : null}

              {busy ? (
                <PayProgress
                  steps={[...FLOW_STEPS]}
                  current={Math.max(0, flowIndex(step))}
                />
              ) : null}

              <button
                type="button"
                disabled={
                  busy || amount == null || (amount != null && !hasEnough(amount))
                }
                onClick={handleSend}
                className="btn-primary"
              >
                {busy ? <LoaderIcon className="h-5 w-5 animate-spin" /> : null}
                {stepLabel(step, amount)}
              </button>
            </>
          )}
        </NetworkGate>
      )}

      {error ? (
        <ErrorBanner title={formatErrorTitle(error)} message={error} />
      ) : null}
    </Panel>
  );
}

function stepLabel(step: Step, amount: number | null): string {
  switch (step) {
    case "creating":
      return "Creating note…";
    case "approving":
      return "Approve USDC…";
    case "depositing":
      return "Depositing on Arc…";
    case "posting":
      return "Delivering note…";
    default:
      return amount != null ? `Pay ${amount} USDC` : "Select an amount";
  }
}

async function waitTx(hash: `0x${string}`) {
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(),
  });
  await client.waitForTransactionReceipt({hash});
}

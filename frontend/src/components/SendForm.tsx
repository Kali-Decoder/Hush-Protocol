"use client";

import {useEffect, useState} from "react";
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
  DEFAULT_POOL_TOKEN,
  explorerTx,
  toTokenUnits,
  type PoolToken,
} from "@/lib/config";
import {sealPayload} from "@/lib/crypto";
import {getToken, getStoredUser} from "@/lib/session";
import {toast} from "@/lib/toast";
import {formatError, formatErrorTitle} from "@/lib/errors";
import type {PublicUser} from "@/shared";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {CheckIcon, ExternalLinkIcon, LoaderIcon, MinusIcon, PlusIcon} from "@/components/icons";
import {
  formatRecipientLabel,
  normalizeRecipient,
  RecipientKindIcon,
  type RecipientKind,
} from "@/components/RecipientKind";
import {useSession} from "@/hooks/useSession";
import {useTokenBalance} from "@/hooks/useUsdcBalance";
import {shortAddr} from "@/lib/address";
import {TokenBalanceSelect} from "@/components/TokenSelect";
import {UserAvatar} from "@/components/UserAvatar";
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
const SUCCESS_MODAL_MS = 5000;
const AMOUNT_STEP = 1;

function isValidAmountInput(raw: string, maxDecimals: number): boolean {
  if (raw === "") return true;
  const re = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`);
  return re.test(raw);
}

function parseAmountInput(raw: string): number | null {
  if (!raw || raw === ".") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatAmountDisplay(n: number, decimals: number): string {
  return n
    .toFixed(decimals)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}

function roundAmount(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

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
  const [selectedToken, setSelectedToken] =
    useState<PoolToken>(DEFAULT_POOL_TOKEN);
  const {
    hasEnough,
    formatted: tokenBalance,
    refetch: refetchBalance,
  } = useTokenBalance(selectedToken);

  const [recipient, setRecipient] = useState(initialRecipient ?? "");
  const [recipientKind, setRecipientKind] = useState<
    Exclude<RecipientKind, "unknown">
  >("twitter");
  const [resolved, setResolved] = useState<PublicUser | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [amountText, setAmountText] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [commitment, setCommitment] = useState("");
  const [sentTokenSymbol, setSentTokenSymbol] = useState(
    DEFAULT_POOL_TOKEN.symbol
  );

  const busy =
    step === "resolving" ||
    step === "creating" ||
    step === "approving" ||
    step === "depositing" ||
    step === "posting";

  const amountDecimals = selectedToken.decimals;

  function applyAmount(n: number | null) {
    if (n == null || !Number.isFinite(n) || n <= 0) {
      setAmount(null);
      setAmountText("");
      return;
    }
    const rounded = roundAmount(n, amountDecimals);
    setAmount(rounded);
    setAmountText(formatAmountDisplay(rounded, amountDecimals));
  }

  function onAmountTextChange(raw: string) {
    if (!isValidAmountInput(raw, amountDecimals)) return;
    setAmountText(raw);
    const parsed = parseAmountInput(raw);
    setAmount(
      parsed != null && parsed > 0
        ? roundAmount(parsed, amountDecimals)
        : null
    );
  }

  function bumpAmount(delta: number) {
    const next = roundAmount((amount ?? 0) + delta, amountDecimals);
    if (next <= 0) {
      applyAmount(null);
      return;
    }
    applyAmount(next);
  }

  function onTokenChange(token: PoolToken) {
    setSelectedToken(token);
    if (amount != null) {
      const rounded = roundAmount(amount, token.decimals);
      setAmount(rounded);
      setAmountText(formatAmountDisplay(rounded, token.decimals));
    }
  }

  function resetAfterSuccess() {
    setStep("idle");
    setResolved(null);
    setAmount(null);
    setAmountText("");
    setRecipient("");
    setTxHash("");
    setCommitment("");
    setError("");
  }

  useEffect(() => {
    if (step !== "done") return;
    const id = window.setTimeout(resetAfterSuccess, SUCCESS_MODAL_MS);
    return () => window.clearTimeout(id);
  }, [step]);

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
    const authToken = getToken();
    const meUser = getStoredUser();
    if (!authToken || !meUser) {
      setError("Sign in at /register first so we can deliver the encrypted note.");
      setStep("error");
      return;
    }
    if (!hasEnough(amount)) {
      setError(
        `Insufficient ${selectedToken.symbol}. Balance is ${tokenBalance} ${selectedToken.symbol}.`
      );
      setStep("error");
      toast.error(
        `Insufficient ${selectedToken.symbol}. Balance is ${tokenBalance} ${selectedToken.symbol}.`
      );
      return;
    }

    const {pool} = addresses();
    const tokenAddr = selectedToken.address;
    const units = toTokenUnits(amount, selectedToken.decimals);

    try {
      setStep("creating");
      const digest = recipientDigestForWallet(resolved.wallet);
      const note = await createNote({
        recipientDigest: digest,
        amount: units,
        token: tokenAddr,
      });
      const json = noteToJSON(note);
      const commitmentBytes32 = json.commitmentBytes32;
      setCommitment(commitmentBytes32);

      setStep("approving");
      const approveHash = await writeContractAsync({
        address: tokenAddr,
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
        args: [tokenAddr, units, commitmentBytes32],
        chainId: arcTestnet.id,
      });
      await waitTx(depositHash);
      setTxHash(depositHash);

      setStep("posting");
      const sealed = sealPayload(JSON.stringify(json), resolved.bulletPublicKey);
      await postNote(authToken, {
        recipientUsername: resolved.username,
        commitment: commitmentBytes32,
        encryptedPayload: sealed,
        depositTxHash: depositHash,
        amount: String(amount),
        tokenSymbol: selectedToken.symbol,
      });

      setSentTokenSymbol(selectedToken.symbol);
      setStep("done");
      void refetchBalance();
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
      setStep("error");
    }
  }

  const showRecipientLookup = !resolved || step === "done";

  return (
    <>
      <Panel className="space-y-6 text-left">
        {!isConnected ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-graphite">
              Connect an Arc wallet to deposit a private note.
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
            ) : showRecipientLookup ? (
              <>
                <TokenBalanceSelect
                  value={selectedToken}
                  onChange={onTokenChange}
                  disabled={busy}
                />
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-3">
                    <FieldLabel>To</FieldLabel>
                    <p className="pb-0.5 font-mono text-[11px] text-graphite">
                      {recipientKind === "email" ? "Email" : "Username"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-fog bg-white px-5 py-5">
                    <p className="flex items-center gap-2.5 text-5xl font-bold tracking-tight">
                      {recipientKind !== "email" ? (
                        <span
                          className={`text-3xl font-semibold ${
                            recipient.trim() ? "text-graphite" : "text-fog"
                          }`}
                        >
                          @
                        </span>
                      ) : null}
                      {recipient.trim() ? (
                        <span
                          key={recipient.trim()}
                          className="animate-amount-pop min-w-0 truncate motion-reduce:animate-none"
                        >
                          {recipientKind === "email"
                            ? recipient.trim()
                            : recipient.trim().replace(/^@/, "")}
                        </span>
                      ) : (
                        <span className="text-fog">
                          {recipientKind === "email" ? "—" : "username"}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-sm text-graphite">
                      Who gets the silent note. We resolve their wallet and
                      encryption key.
                    </p>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Recipient type"
                    className="flex rounded-2xl border border-fog bg-paper/70 p-1"
                  >
                    {(
                      [
                        {id: "twitter" as const, label: "Username"},
                        {id: "email" as const, label: "Email"},
                      ] as const
                    ).map((opt) => {
                      const selected = recipientKind === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={busy || step === "done"}
                          onClick={() => {
                            setRecipientKind(opt.id);
                            setRecipient("");
                            setError("");
                          }}
                          className={`relative flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50 ${
                            selected
                              ? "bg-ink text-paper shadow-[0_1px_2px_rgba(10,10,10,0.18)]"
                              : "bg-transparent text-graphite hover:bg-white/80 hover:text-ink"
                          }`}
                        >
                          <RecipientKindIcon
                            kind={opt.id}
                            className="h-3.5 w-3.5"
                          />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`field flex items-center gap-1.5 !py-0 ${
                      busy || step === "done" ? "opacity-50" : ""
                    }`}
                  >
                    {recipientKind !== "email" ? (
                      <span
                        className="shrink-0 select-none pl-1 text-lg font-semibold text-graphite"
                        aria-hidden
                      >
                        @
                      </span>
                    ) : null}
                    <input
                      type="text"
                      inputMode={
                        recipientKind === "email" ? "email" : "text"
                      }
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder={
                        recipientKind === "email"
                          ? "name@email.com"
                          : "username"
                      }
                      value={
                        recipientKind === "email"
                          ? recipient
                          : recipient.replace(/^@/, "")
                      }
                      onChange={(e) => {
                        const raw = e.target.value.trimStart();
                        setRecipient(
                          recipientKind === "email"
                            ? raw
                            : raw.replace(/^@+/g, "")
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && recipient.trim())
                          void handleResolve();
                      }}
                      disabled={busy || step === "done"}
                      autoComplete="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 bg-transparent py-3.5 text-lg text-ink outline-none placeholder:text-fog disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy || step === "done" || !recipient.trim()}
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
                <TokenBalanceSelect
                  value={selectedToken}
                  onChange={onTokenChange}
                  disabled={busy}
                />
                <div className="animate-soft-rise space-y-5 motion-reduce:animate-none">
                <div className="rounded-2xl border border-fog bg-white px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <UserAvatar
                      address={resolved.wallet}
                      size="md"
                      className="animate-avatar-in shrink-0 motion-reduce:animate-none"
                    />
                    <div
                      className="min-w-0 flex-1 animate-soft-rise motion-reduce:animate-none"
                      style={{animationDelay: "80ms"}}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
                        Paying
                      </p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        <span
                          key={resolved.username}
                          className="animate-amount-pop truncate text-xl font-bold tracking-tight sm:text-2xl motion-reduce:animate-none"
                        >
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
                      <p
                        className="mt-0.5 truncate font-mono text-[11px] leading-snug text-graphite"
                        title={resolved.wallet}
                      >
                        {shortAddr(resolved.wallet)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setResolved(null);
                        setAmount(null);
                        setAmountText("");
                        setError("");
                      }}
                      className="shrink-0 self-center rounded-full border border-fog bg-paper px-3 py-1.5 text-xs font-semibold text-graphite transition-all duration-200 hover:border-graphite hover:text-ink active:scale-95 disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div
                  className="animate-soft-rise space-y-4 motion-reduce:animate-none"
                  style={{animationDelay: "120ms"}}
                >
                  <div className="flex items-end justify-between gap-3">
                    <FieldLabel>Amount</FieldLabel>
                    <p className="pb-0.5 font-mono text-[11px] text-graphite">
                      Up to {amountDecimals} decimals
                    </p>
                  </div>
                  <div className="rounded-2xl border border-fog bg-white px-4 py-5 transition-shadow duration-300 sm:px-5">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        disabled={busy || (amount ?? 0) <= 0}
                        onClick={() => bumpAmount(-AMOUNT_STEP)}
                        aria-label="Decrease amount"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-fog bg-paper text-ink transition-all duration-200 hover:border-graphite hover:bg-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                      <div className="min-w-0 flex-1 text-center">
                        <div className="flex items-baseline justify-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={amountText}
                            disabled={busy}
                            onChange={(e) => onAmountTextChange(e.target.value)}
                            className="w-full min-w-0 bg-transparent text-center text-5xl font-bold tracking-tight tabular-nums text-ink outline-none transition-colors duration-200 placeholder:text-fog focus:text-ink disabled:opacity-50"
                            aria-label={`Amount in ${selectedToken.symbol}`}
                          />
                          <span
                            className={`shrink-0 text-lg font-semibold transition-colors duration-200 ${
                              amount != null ? "text-graphite" : "text-fog"
                            }`}
                          >
                            {selectedToken.symbol}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => bumpAmount(AMOUNT_STEP)}
                        aria-label="Increase amount"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-fog bg-paper text-ink transition-all duration-200 hover:border-graphite hover:bg-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <AmountPills
                    amounts={AMOUNT_PRESETS}
                    value={amount}
                    onChange={applyAmount}
                    disabled={busy}
                    canAfford={hasEnough}
                    symbol={selectedToken.symbol}
                  />
                </div>

                {amount != null && !hasEnough(amount) ? (
                  <p className="animate-fade text-sm text-amber motion-reduce:animate-none">
                    Not enough {selectedToken.symbol}. Balance {tokenBalance}.
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
                    busy ||
                    amount == null ||
                    (amount != null && !hasEnough(amount))
                  }
                  onClick={handleSend}
                  className="btn-primary transition-transform duration-200 active:scale-[0.98]"
                >
                  {busy ? <LoaderIcon className="h-5 w-5 animate-spin" /> : null}
                  {stepLabel(step, amount, selectedToken.symbol)}
                </button>
                </div>
              </>
            )}
          </NetworkGate>
        )}

        {error ? (
          <ErrorBanner title={formatErrorTitle(error)} message={error} />
        ) : null}
      </Panel>

      {step === "done" ? (
        <PaymentSuccessModal
          amount={amount}
          tokenSymbol={sentTokenSymbol}
          username={resolved?.username ?? ""}
          recipientKind={recipientKind}
          recipientInput={recipient}
          commitment={commitment}
          txHash={txHash}
          onClose={resetAfterSuccess}
        />
      ) : null}
    </>
  );
}

function PaymentSuccessModal({
  amount,
  tokenSymbol,
  username,
  recipientKind,
  recipientInput,
  commitment,
  txHash,
  onClose,
}: {
  amount: number | null;
  tokenSymbol: string;
  username: string;
  recipientKind: Exclude<RecipientKind, "unknown">;
  recipientInput: string;
  commitment: string;
  txHash: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-success-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade motion-reduce:animate-none"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm animate-rise rounded-2xl border border-fog bg-white p-6 text-center motion-reduce:animate-none sm:p-7">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
          <CheckIcon className="h-6 w-6" />
        </div>
        <h2
          id="payment-success-title"
          className="mt-4 text-lg font-semibold tracking-tight text-ink"
        >
          Payment successful
        </h2>
        <p className="mt-3 text-4xl font-bold tracking-tight">
          {amount}{" "}
          <span className="text-xl font-semibold text-graphite">
            {tokenSymbol}
          </span>
        </p>
        <p className="mt-2 flex items-center justify-center gap-2 text-base text-graphite">
          to{" "}
          {formatRecipientLabel(
            recipientKind === "email" ? recipientInput : `@${username}`,
            recipientKind
          )}
          <RecipientKindIcon kind={recipientKind} className="h-4 w-4" />
        </p>
        {commitment ? (
          <p className="mt-4 truncate font-mono text-[11px] text-graphite">
            {commitment}
          </p>
        ) : null}
        {txHash ? (
          <a
            href={explorerTx(txHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-fog bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-graphite"
          >
            View transaction
            <ExternalLinkIcon className="h-3.5 w-3.5 text-graphite" />
          </a>
        ) : null}
        <p className="mt-5 text-xs text-graphite">Closes in 5 seconds</p>
        <button
          type="button"
          onClick={onClose}
          className="btn-primary mt-3 w-full"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function stepLabel(
  step: Step,
  amount: number | null,
  symbol: string
): string {
  switch (step) {
    case "creating":
      return "Creating note…";
    case "approving":
      return `Approve ${symbol}…`;
    case "depositing":
      return "Depositing on Arc…";
    case "posting":
      return "Delivering note…";
    default:
      return amount != null ? `Pay ${amount} ${symbol}` : "Select an amount";
  }
}

async function waitTx(hash: `0x${string}`) {
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(),
  });
  await client.waitForTransactionReceipt({hash});
}

"use client";

import {createNote, noteToJSON} from "@bullet/sdk";
import {useMemo, useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {createPublicClient, http, maxUint256} from "viem";
import {bulletPoolAbi} from "@/abi/BulletPool";
import {erc20Abi} from "@/abi/erc20";
import {resolveUser, postNote} from "@/lib/api";
import {recipientDigestForWallet} from "@/lib/chain";
import {
  AMOUNT_PRESETS,
  addresses,
  arcTestnet,
  DEFAULT_POOL_TOKEN,
  toTokenUnits,
  type PoolToken,
} from "@/lib/config";
import {sealPayload} from "@/lib/crypto";
import {formatError} from "@/lib/errors";
import {upsertPendingSend, removePendingSend} from "@/lib/pendingSends";
import {
  createScratchGiftPayload,
  encodeScratchClaimPayload,
  scratchClaimPath,
  type ScratchTheme,
} from "@/lib/scratchGift";
import {getStoredUser, getToken} from "@/lib/session";
import {toast} from "@/lib/toast";
import {
  filterRecentRecipients,
  rememberRecentRecipient,
} from "@/lib/recentRecipients";
import {useSession} from "@/hooks/useSession";
import {useTokenBalance} from "@/hooks/useUsdcBalance";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {ScratchRevealCard} from "@/components/ScratchRevealCard";
import {ScratchSendSuccessModal} from "@/components/ScratchSendSuccessModal";
import {TokenBalanceSelect} from "@/components/TokenSelect";
import {LoaderIcon} from "@/components/icons";
import {AmountPills, ErrorBanner, FieldLabel, Panel} from "@/components/ui";

const THEMES: Array<{id: ScratchTheme; label: string; swatch: string}> = [
  {id: "crimson", label: "Crimson", swatch: "bg-[#e11d48]"},
  {id: "azure", label: "Azure", swatch: "bg-[#2563eb]"},
  {id: "emerald", label: "Emerald", swatch: "bg-[#059669]"},
];

type Step =
  | "idle"
  | "resolving"
  | "creating"
  | "approving"
  | "depositing"
  | "posting";

export function ScratchPaymentForm() {
  const {address, isConnected} = useAccount();
  const {writeContractAsync} = useWriteContract();
  const {isSignedIn, user: me} = useSession();
  const [selectedToken, setSelectedToken] =
    useState<PoolToken>(DEFAULT_POOL_TOKEN);
  const {hasEnough, formatted: tokenBalance} = useTokenBalance(selectedToken);
  const [recipient, setRecipient] = useState("");
  const [cardName, setCardName] = useState("Scratch & Win");
  const [theme, setTheme] = useState<ScratchTheme>("crimson");
  const [amount, setAmount] = useState<number | null>(AMOUNT_PRESETS[1] ?? 10);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [claimUrl, setClaimUrl] = useState("");
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [recentTick, setRecentTick] = useState(0);
  const [success, setSuccess] = useState<{
    title: string;
    theme: ScratchTheme;
    amountLabel: string;
    tokenSymbol: string;
    recipientUsername: string;
    claimUrl: string;
    depositHash: string;
  } | null>(null);

  const busy = step !== "idle";
  const recentRecipients = useMemo(
    () =>
      filterRecentRecipients("twitter", recipient, {
        exclude: me?.username,
        limit: 5,
      }),
    [recipient, me?.username, recentTick]
  );

  function rememberRecipient(username: string) {
    rememberRecentRecipient("twitter", username);
    setRecentTick((n) => n + 1);
  }

  async function handleSend() {
    if (!address || !amount) return;
    const authToken = getToken();
    const meUser = getStoredUser();
    if (!authToken || !meUser) {
      setError("Sign in at /register first so we can deliver the scratch gift.");
      return;
    }
    if (!recipient.trim()) {
      setError("Recipient username is required.");
      return;
    }
    if (!hasEnough(amount)) {
      setError(
        `Insufficient ${selectedToken.symbol}. Balance is ${tokenBalance} ${selectedToken.symbol}.`
      );
      return;
    }

    setError("");
    setClaimUrl("");

    try {
      setStep("resolving");
      const resolved = await resolveUser(recipient.trim().replace(/^@/, ""));
      if (!resolved) {
        setError("User not found. They need to register first.");
        setStep("idle");
        return;
      }

      const {pool} = addresses();
      const tokenAddr = selectedToken.address;
      const units = toTokenUnits(amount, selectedToken.decimals);
      const amountLabel = String(amount);
      const digest = recipientDigestForWallet(resolved.wallet);
      const title = cardName.trim() || "Scratch & Win";

      setStep("creating");
      const note = await createNote({
        recipientDigest: digest,
        amount: units,
        token: tokenAddr,
      });
      const json = noteToJSON(note);
      const commitment = json.commitmentBytes32;

      const draftPayload = createScratchGiftPayload({
        note: json,
        amountLabel,
        tokenSymbol: selectedToken.symbol,
        recipientUsername: resolved.username,
        meta: {title, theme},
      });
      const draftEncoded = encodeScratchClaimPayload(draftPayload.claim);
      setClaimUrl(
        typeof window === "undefined"
          ? scratchClaimPath(draftEncoded)
          : `${window.location.origin}${scratchClaimPath(draftEncoded)}`
      );

      const plaintext = JSON.stringify(draftPayload);
      const sealed = sealPayload(plaintext, resolved.bulletPublicKey);

      const client = createPublicClient({
        chain: arcTestnet,
        transport: http(),
      });
      const allowance = await client.readContract({
        address: tokenAddr,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, pool],
      });

      if (allowance < units) {
        setStep("approving");
        const approveHash = await writeContractAsync({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: "approve",
          args: [pool, maxUint256],
          chainId: arcTestnet.id,
        });
        await client.waitForTransactionReceipt({hash: approveHash});
      }

      setStep("depositing");
      const hash = await writeContractAsync({
        address: pool,
        abi: bulletPoolAbi,
        functionName: "deposit",
        args: [tokenAddr, units, commitment],
        chainId: arcTestnet.id,
      });
      await client.waitForTransactionReceipt({hash});

      upsertPendingSend({
        commitment,
        noteJson: json,
        payloadPlaintext: plaintext,
        encryptedPayload: sealed,
        depositTxHash: hash,
        recipientUsername: resolved.username,
        recipientBulletPublicKey: resolved.bulletPublicKey,
        amount: String(amount),
        tokenSymbol: selectedToken.symbol,
      });

      setStep("posting");
      const created = await postNote(authToken, {
        recipientUsername: resolved.username,
        commitment,
        encryptedPayload: sealed,
        depositTxHash: hash,
        amount: String(amount),
        tokenSymbol: selectedToken.symbol,
      });
      removePendingSend(commitment);

      const finalPayload = createScratchGiftPayload({
        note: json,
        noteId: created.id,
        amountLabel,
        tokenSymbol: selectedToken.symbol,
        recipientUsername: resolved.username,
        meta: {title, theme},
      });
      const finalEncoded = encodeScratchClaimPayload(finalPayload.claim);
      const finalClaimUrl =
        typeof window === "undefined"
          ? scratchClaimPath(finalEncoded)
          : `${window.location.origin}${scratchClaimPath(finalEncoded)}`;

      setClaimUrl(finalClaimUrl);
      rememberRecipient(resolved.username);
      setSuccess({
        title,
        theme,
        amountLabel,
        tokenSymbol: selectedToken.symbol,
        recipientUsername: resolved.username,
        claimUrl: finalClaimUrl,
        depositHash: hash,
      });
      setStep("idle");
      toast.success("Scratch card sent.");
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
      setStep("idle");
    }
  }

  if (!isConnected) {
    return (
      <Panel className="space-y-4 text-center">
        <p className="text-sm text-graphite">
          Connect your wallet to create and send a scratch card.
        </p>
        <ConnectButton label="Connect wallet" />
      </Panel>
    );
  }

  return (
    <NetworkGate>
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel className="space-y-5">
          {!isSignedIn ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-graphite">
                Sign in so the encrypted scratch card can land in their inbox.
              </p>
              <a href="/register" className="btn-primary">
                Sign in
              </a>
            </div>
          ) : (
            <>
              {error ? <ErrorBanner message={error} /> : null}

              <div className="space-y-2">
                <FieldLabel>Send to username</FieldLabel>
                <div className="field !py-0">
                  <div className="flex items-center gap-2">
                    <span className="pl-1 text-lg font-semibold text-graphite">
                      @
                    </span>
                    <input
                      value={recipient.replace(/^@/, "")}
                      onChange={(e) =>
                        setRecipient(e.target.value.replace(/^@+/, ""))
                      }
                      onFocus={() => setRecipientFocused(true)}
                      onBlur={() =>
                        window.setTimeout(() => setRecipientFocused(false), 120)
                      }
                      placeholder="username"
                      className="min-w-0 flex-1 bg-transparent py-3.5 text-lg text-ink outline-none"
                    />
                  </div>
                </div>
                {recipientFocused && recentRecipients.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-fog bg-white">
                    {recentRecipients.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setRecipient(r.value);
                          setRecipientFocused(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-paper"
                      >
                        @{r.value}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <FieldLabel>Scratch card name</FieldLabel>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Scratch & Win"
                  className="field"
                />
                <p className="text-[11px] text-graphite">
                  Shown on the left side of the card, like “Scratch & Win”.
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel>Card color</FieldLabel>
                <div className="flex gap-2">
                  {THEMES.map((opt) => {
                    const on = theme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTheme(opt.id)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
                          on
                            ? "border-ink bg-ink text-paper"
                            : "border-fog bg-white text-graphite hover:border-graphite"
                        }`}
                      >
                        <span
                          className={`h-3 w-3 rounded-full ${opt.swatch}`}
                          aria-hidden
                        />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Token</FieldLabel>
                <TokenBalanceSelect
                  value={selectedToken}
                  onChange={setSelectedToken}
                  disabled={busy}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>Amount</FieldLabel>
                <AmountPills
                  amounts={AMOUNT_PRESETS}
                  value={amount}
                  onChange={setAmount}
                  disabled={busy}
                  canAfford={hasEnough}
                  symbol={selectedToken.symbol}
                />
              </div>

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={busy || !recipient.trim() || !amount}
                className="btn-primary"
              >
                {busy ? <LoaderIcon className="h-5 w-5 animate-spin" /> : null}
                {busy ? "Sending scratch card…" : "Send scratch card"}
              </button>
            </>
          )}
        </Panel>

        <Panel className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-graphite">
              Live preview
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
              Scratch & claim gift
            </h2>
          </div>
          <ScratchRevealCard
            meta={{
              title: cardName.trim() || "Scratch & Win",
              theme,
            }}
            amountLabel={String(amount ?? AMOUNT_PRESETS[1] ?? 10)}
            tokenSymbol={selectedToken.symbol}
            recipientLabel={
              recipient.trim()
                ? `@${recipient.replace(/^@/, "")}`
                : "@username"
            }
            disabled
          />
          <p className="text-sm leading-relaxed text-graphite">
            They open it from Inbox under Gift cards, scratch the silver panel,
            then sign the withdraw proof.
          </p>
          {claimUrl ? (
            <div className="rounded-2xl border border-fog bg-paper px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-graphite">
                Claim link
              </p>
              <p className="mt-1 truncate font-mono text-xs text-ink">
                {claimUrl}
              </p>
            </div>
          ) : null}
        </Panel>
      </div>

      {success ? (
        <ScratchSendSuccessModal
          title={success.title}
          theme={success.theme}
          amountLabel={success.amountLabel}
          tokenSymbol={success.tokenSymbol}
          recipientUsername={success.recipientUsername}
          claimUrl={success.claimUrl}
          depositHash={success.depositHash}
          onClose={() => setSuccess(null)}
        />
      ) : null}
    </NetworkGate>
  );
}

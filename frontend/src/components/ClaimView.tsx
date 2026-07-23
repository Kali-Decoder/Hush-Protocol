"use client";

/** Placeholder until Arc claim-link withdraw lands. */
export function ClaimView({ encoded }: { encoded: string }) {
  return (
    <div className="space-y-4 rounded-2xl border border-fog bg-white p-6 text-left">
      <p className="text-sm text-graphite">
        Claim link withdraw will prove membership and pull USDC from the Hushh Protocol
        pool on Arc.
      </p>
      {encoded ? (
        <p className="truncate font-mono text-xs text-graphite">
          payload: {encoded.slice(0, 24)}…
        </p>
      ) : null}
    </div>
  );
}

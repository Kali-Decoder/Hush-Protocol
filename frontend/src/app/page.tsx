import Link from "next/link";
import HowItWorks from "@/components/HowItWorks";
import LandingHero from "@/components/LandingHero";
import ProtocolFlow from "@/components/ProtocolFlow";
import Reveal from "@/components/Reveal";

const SAMPLE_NOTES = [
  {amount: 10, token: "USDC", hash: "9f3a41c7…c41d"},
  {amount: 50, token: "USDC", hash: "b7e208aa…08aa"},
  {amount: 100, token: "USDC", hash: "1c8fb0d2…b0d2"},
  {amount: 1, token: "USDC", hash: "e05cb912…b912"},
  {amount: 50, token: "USDC", hash: "77a8d4c6…d4c6"},
  {amount: 10, token: "USDC", hash: "3a4e59fb…59fb"},
];

const PILLARS = [
  {
    title: "Fixed notes",
    body: "Only a few USDC sizes. Your amount looks like everyone else's.",
  },
  {
    title: "ZK withdraw",
    body: "Groth16 membership proof spends a note without naming which deposit.",
  },
  {
    title: "Username send",
    body: "Pay @someone. Hushh Protocol resolves wallet and encryption key for you.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-28 text-center sm:gap-36">
      <LandingHero />

      <ProtocolFlow />

      <Reveal className="w-full max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-graphite">
          Design
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy with honest limits
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-graphite sm:text-base">
          Hushh Protocol hides the link between deposit and claim. It does not
          hide that you used the pool.
        </p>
        <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal
              key={p.title}
              delay={i * 90}
              className="panel group p-6 transition-transform duration-500 hover:-translate-y-1"
            >
              <p className="font-mono text-xs text-graphite">0{i + 1}</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-graphite">
                {p.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Reveal>

      <div id="how-it-works" className="w-full max-w-5xl scroll-mt-28">
        <HowItWorks />
      </div>

      <Reveal className="w-full max-w-4xl">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          What the chain sees
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-graphite sm:text-base">
          Fixed USDC notes and Poseidon commitments. One of these could be
          yours.
        </p>
        <div className="relative mt-10 overflow-hidden">
          <div className="animate-drift flex w-max motion-reduce:animate-none">
            {[...SAMPLE_NOTES, ...SAMPLE_NOTES].map((note, i) => (
              <div
                key={i}
                className="panel mr-4 w-56 shrink-0 p-5 text-left transition-transform duration-300 hover:-translate-y-0.5 sm:w-60 sm:p-6"
              >
                <p className="text-2xl font-bold tracking-tight">
                  {note.amount}{" "}
                  <span className="text-base font-semibold text-graphite">
                    {note.token}
                  </span>
                </p>
                <p className="mt-3 truncate font-mono text-xs text-graphite">
                  0x{note.hash}
                </p>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-paper to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-paper to-transparent" />
        </div>
        <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-graphite sm:text-base">
          The withdraw proof spends a note without revealing which deposit it
          came from.
        </p>
      </Reveal>

      <Reveal className="w-full max-w-3xl pb-16">
        <div className="panel relative overflow-hidden px-8 py-14 sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fog/50 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-signal/10 blur-3xl"
          />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-graphite">
            Hushh Protocol
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Ready when you are.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-graphite sm:text-base">
            Claim a username, connect an Arc wallet, and send a silent note.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/send"
              className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:bg-ink/90 active:scale-[0.98]"
            >
              Send USDC
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-full border border-fog bg-white px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-graphite"
            >
              Sign in
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

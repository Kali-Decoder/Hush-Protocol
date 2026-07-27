"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import type {ScratchGiftMeta, ScratchTheme} from "@/lib/scratchGift";

const THEME: Record<
  ScratchTheme,
  {
    shell: string;
    title: string;
    ampRing: string;
    prize: string;
    stars: string;
  }
> = {
  crimson: {
    shell: "from-[#c81e1e] via-[#e11d48] to-[#fb7185]",
    title: "text-white",
    ampRing: "border-white/80 text-white",
    prize: "text-[#c81e1e]",
    stars: "text-white/90",
  },
  azure: {
    shell: "from-[#1d4ed8] via-[#2563eb] to-[#60a5fa]",
    title: "text-white",
    ampRing: "border-white/80 text-white",
    prize: "text-[#1d4ed8]",
    stars: "text-white/90",
  },
  emerald: {
    shell: "from-[#047857] via-[#059669] to-[#34d399]",
    title: "text-white",
    ampRing: "border-white/80 text-white",
    prize: "text-[#047857]",
    stars: "text-white/90",
  },
};

type Props = {
  meta: ScratchGiftMeta;
  amountLabel: string;
  tokenSymbol: string;
  recipientLabel?: string;
  onThreshold?: () => void;
  /** Preview / non-interactive foil. */
  disabled?: boolean;
  /** Force fully revealed prize (success screen). */
  revealed?: boolean;
  className?: string;
};

function StarBorder({className = ""}: {className?: string}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-[6px] rounded-[1.05rem] border-[1.5px] border-dashed opacity-80 ${className}`}
    />
  );
}

export function ScratchRevealCard({
  meta,
  amountLabel,
  tokenSymbol,
  recipientLabel,
  onThreshold,
  disabled,
  revealed = false,
  className = "",
}: Props) {
  const foilRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scratched, setScratched] = useState(revealed);
  const [progress, setProgress] = useState(revealed ? 1 : 0);
  const scratching = useRef(false);
  const cells = useRef(new Set<string>());
  const triggered = useRef(revealed);
  const theme = useMemo(() => THEME[meta.theme] ?? THEME.crimson, [meta.theme]);
  const showFoil = !revealed && !scratched;
  const totalCells = 120;

  useEffect(() => {
    if (revealed) {
      setScratched(true);
      setProgress(1);
      triggered.current = true;
    }
  }, [revealed]);

  useEffect(() => {
    if (!showFoil) return;
    const canvas = canvasRef.current;
    const wrap = foilRef.current;
    if (!canvas || !wrap) return;

    const paint = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      g.addColorStop(0, "#f8fafc");
      g.addColorStop(0.35, "#cbd5e1");
      g.addColorStop(0.55, "#e2e8f0");
      g.addColorStop(0.75, "#94a3b8");
      g.addColorStop(1, "#64748b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Soft foil bands
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(rect.width * 0.18, 0, rect.width * 0.12, rect.height);
      ctx.fillRect(rect.width * 0.62, 0, rect.width * 0.08, rect.height);

      // Brush-stroke hint
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rect.width * 0.2, rect.height * 0.35);
      ctx.quadraticCurveTo(
        rect.width * 0.45,
        rect.height * 0.2,
        rect.width * 0.7,
        rect.height * 0.42
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rect.width * 0.28, rect.height * 0.62);
      ctx.quadraticCurveTo(
        rect.width * 0.5,
        rect.height * 0.78,
        rect.width * 0.78,
        rect.height * 0.55
      );
      ctx.stroke();

      ctx.fillStyle = "rgba(15,23,42,0.55)";
      ctx.font =
        "700 13px Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scratch here", rect.width / 2, rect.height / 2 + 5);
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [showFoil, meta.theme]);

  function markProgress(x: number, y: number, width: number, height: number) {
    const gx = Math.max(0, Math.min(9, Math.floor((x / width) * 10)));
    const gy = Math.max(0, Math.min(11, Math.floor((y / height) * 12)));
    cells.current.add(`${gx}:${gy}`);
    const next = Math.min(1, cells.current.size / totalCells);
    setProgress(next);
    if (!triggered.current && next >= 0.32) {
      triggered.current = true;
      setScratched(true);
      onThreshold?.();
    }
  }

  function erase(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const wrap = foilRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    markProgress(x, y, rect.width, rect.height);
  }

  const name = meta.title.trim() || "Scratch & Win";
  const nameParts = name.split(/\s+/).filter(Boolean);
  const top = nameParts[0] ?? "SCRATCH";
  const bottom =
    nameParts.length > 1 ? nameParts.slice(1).join(" ") : "WIN!";

  return (
    <div className={`w-full max-w-full ${className}`}>
      <div
        className={`relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br p-2.5 shadow-[0_22px_48px_-24px_rgba(10,10,10,0.45)] sm:rounded-[1.35rem] sm:p-3.5 ${theme.shell}`}
      >
        <StarBorder className={theme.stars} />

        <div className="relative z-[1] grid grid-cols-1 gap-2 min-[380px]:grid-cols-[0.9fr_1.15fr] min-[380px]:gap-2.5 sm:gap-3">
          {/* Left: card name */}
          <div className="flex min-h-[7.5rem] flex-col items-center justify-center px-2 py-3 text-center min-[380px]:min-h-[9.5rem] sm:min-h-[11rem] sm:px-3 sm:py-4">
            <p
              className={`text-[clamp(1.15rem,4.5vw,1.7rem)] font-extrabold uppercase leading-none tracking-[-0.04em] ${theme.title}`}
            >
              {top}
            </p>
            <span
              className={`my-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold sm:my-2.5 sm:h-8 sm:w-8 sm:text-sm ${theme.ampRing}`}
            >
              &
            </span>
            <p
              className={`text-[clamp(1.3rem,5vw,2rem)] font-extrabold uppercase leading-none tracking-[-0.045em] ${theme.title}`}
            >
              {bottom}
            </p>
            {recipientLabel ? (
              <p
                className={`mt-2 max-w-full truncate text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80 sm:mt-3 ${theme.title}`}
              >
                for {recipientLabel}
              </p>
            ) : null}
          </div>

          {/* Right: scratch foil / prize */}
          <div
            ref={foilRef}
            className="relative min-h-[8.5rem] overflow-hidden rounded-[0.9rem] bg-white sm:min-h-[11rem] sm:rounded-[1rem]"
            style={
              showFoil
                ? {
                    backgroundImage:
                      "linear-gradient(135deg,#f8fafc 0%,#cbd5e1 35%,#e2e8f0 55%,#94a3b8 75%,#64748b 100%)",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Prize
              </p>
              <p
                className={`mt-1 text-[clamp(1.75rem,6vw,2.25rem)] font-extrabold tracking-tight ${theme.prize}`}
              >
                {amountLabel}
              </p>
              <p
                className={`mt-0.5 text-sm font-bold uppercase tracking-[0.12em] ${theme.prize}`}
              >
                {tokenSymbol}
              </p>
            </div>

            {showFoil ? (
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 z-[2] rounded-[0.9rem] sm:rounded-[1rem] ${
                  disabled
                    ? "pointer-events-none"
                    : "cursor-crosshair touch-none"
                }`}
                onPointerDown={(e) => {
                  if (disabled) return;
                  (e.target as HTMLCanvasElement).setPointerCapture?.(
                    e.pointerId
                  );
                  scratching.current = true;
                  erase(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!scratching.current || disabled) return;
                  erase(e.clientX, e.clientY);
                }}
                onPointerUp={() => {
                  scratching.current = false;
                }}
                onPointerCancel={() => {
                  scratching.current = false;
                }}
                onPointerLeave={() => {
                  scratching.current = false;
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {!revealed && !disabled ? (
        <p className="mt-2 text-center text-[11px] font-medium text-graphite">
          {scratched
            ? "Revealed — claiming…"
            : `Scratch the silver panel · ${Math.round(progress * 100)}%`}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import {useEffect, useState} from "react";
import type {RecipientKind} from "@/components/RecipientKind";
import {RecipientKindSelect} from "@/components/RecipientKindSelect";

const SAMPLES = ["@maria", "ada@email.com", "@kyle", "pay@hussh.app"];

export default function HeroSendBox() {
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<Exclude<RecipientKind, "unknown">>("twitter");
  const [placeholder, setPlaceholder] = useState("@username");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let word = 0;
    let len = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;

    const step = () => {
      const sample = SAMPLES[word];
      if (!deleting && len === 0) {
        setKind(
          sample.includes("@") && !sample.startsWith("@") ? "email" : "twitter"
        );
      }
      if (!deleting && len < sample.length) {
        len += 1;
      } else if (!deleting) {
        deleting = true;
        t = setTimeout(step, 1800);
        return;
      } else if (len > 0) {
        len -= 1;
      } else {
        deleting = false;
        word = (word + 1) % SAMPLES.length;
      }
      setPlaceholder(sample.slice(0, len));
      t = setTimeout(step, deleting ? 40 : 90);
    };

    t = setTimeout(step, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <form
      action="/send"
      method="get"
      className="input-shell mx-auto max-w-lg !rounded-full !py-1.5 !pl-1.5 !pr-1.5 shadow-[0_1px_0_rgba(10,10,10,0.04),0_24px_48px_-28px_rgba(10,10,10,0.35)] transition-shadow duration-500 hover:shadow-[0_1px_0_rgba(10,10,10,0.04),0_28px_56px_-24px_rgba(10,10,10,0.4)]"
    >
      <input type="hidden" name="kind" value={kind} />
      <RecipientKindSelect value={kind} onChange={setKind} variant="inline" />
      <span className="input-shell-divider" aria-hidden />
      <input
        type="text"
        name="to"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          value
            ? undefined
            : placeholder || (kind === "email" ? "name@email.com" : "@username")
        }
        autoComplete="off"
        spellCheck={false}
        className="input-shell-field !py-2.5"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-ink px-6 py-3 text-base font-semibold text-paper transition-all duration-200 hover:bg-ink/90 active:scale-[0.97] sm:px-8"
      >
        Pay
      </button>
    </form>
  );
}

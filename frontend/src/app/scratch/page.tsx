import {AppShell} from "@/components/AppShell";
import {ScratchPaymentForm} from "@/components/ScratchPaymentForm";

export const metadata = {title: "Scratch Gift · Hushh Protocol"};

export default function ScratchPage() {
  return (
    <AppShell
      title="Scratch Card"
      subtitle="Name the card, pick an amount, and send a scratch-to-claim gift."
    >
      <ScratchPaymentForm />
    </AppShell>
  );
}

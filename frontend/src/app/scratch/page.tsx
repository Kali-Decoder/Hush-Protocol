import {AppShell} from "@/components/AppShell";
import {ScratchPaymentForm} from "@/components/ScratchPaymentForm";

export const metadata = {title: "Scratch Gift · Hushh Protocol"};

export default function ScratchPage() {
  return (
    <AppShell
      title="Scratch Card"
      subtitle="Pick amount, name the card, choose a token, and send to a username — just like Send, but as a scratch-to-claim gift."
    >
      <ScratchPaymentForm />
    </AppShell>
  );
}

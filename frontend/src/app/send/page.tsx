import {SendForm} from "@/components/SendForm";
import {PageHeader, Shell} from "@/components/ui";

export const metadata = {title: "Send · Hussh"};

export default async function SendPage({
  searchParams,
}: {
  searchParams: Promise<{to?: string}>;
}) {
  const {to} = await searchParams;
  return (
    <Shell>
      <PageHeader
        title="Send"
        subtitle="Pay a username. Deposit a fixed USDC note. Nothing on-chain links you to their claim."
      />
      <SendForm initialRecipient={to} />
    </Shell>
  );
}

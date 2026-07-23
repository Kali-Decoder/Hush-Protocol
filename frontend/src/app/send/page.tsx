import {SendForm} from "@/components/SendForm";
import {PageHeader, Shell} from "@/components/ui";

export const metadata = {title: "Send · Hushh Protocol"};

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
        subtitle="Pay a username. Pick a pool token, deposit a note. Nothing on-chain links you to their claim."
      />
      <SendForm initialRecipient={to} />
    </Shell>
  );
}

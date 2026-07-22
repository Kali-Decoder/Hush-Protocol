import {Inbox} from "@/components/Inbox";
import {PageHeader, Shell} from "@/components/ui";

export const metadata = {title: "Inbox · Hussh"};

export default function InboxPage() {
  return (
    <Shell>
      <PageHeader
        title="Inbox"
        subtitle="Decrypt notes sealed to your key, then claim USDC on Arc."
      />
      <Inbox />
    </Shell>
  );
}

import {AccountView} from "@/components/AccountView";
import {PageHeader, Shell} from "@/components/ui";

export const metadata = {title: "Account · Hushh Protocol"};

export default function AccountPage() {
  return (
    <Shell>
      <PageHeader
        title="Account"
        subtitle="Your identity, balances, and silent payment history on Arc."
      />
      <AccountView />
    </Shell>
  );
}

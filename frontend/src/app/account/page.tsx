import {AccountView} from "@/components/AccountView";
import {PageHeader, Shell} from "@/components/ui";

export const metadata = {title: "Account · Hushh Protocol"};

export default function AccountPage() {
  return (
    <Shell>
      <PageHeader
        title="Account"
        subtitle="Your username, Arc balance, wallet, and Hushh Protocol key."
      />
      <AccountView />
    </Shell>
  );
}

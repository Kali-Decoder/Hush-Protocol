import {AccountView} from "@/components/AccountView";
import {AppShell} from "@/components/AppShell";

export const metadata = {title: "Account · Hushh Protocol"};

export default function AccountPage() {
  return (
    <AppShell
      title="Account"
      subtitle="Your identity, balances, and silent payment history on Arc."
    >
      <AccountView />
    </AppShell>
  );
}

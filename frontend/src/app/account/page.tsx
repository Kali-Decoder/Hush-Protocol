import {AccountView} from "@/components/AccountView";
import {PageHeader, Shell} from "@/components/ui";

export const metadata = {title: "Account · Hussh"};

export default function AccountPage() {
  return (
    <Shell>
      <PageHeader
        title="Account"
        subtitle="Your username, Arc balance, wallet, and Hussh key."
      />
      <AccountView />
    </Shell>
  );
}

import {RegisterFlow} from "@/components/RegisterFlow";
import {AppShell} from "@/components/AppShell";

export const metadata = {title: "Sign in · Hushh Protocol"};

export default function RegisterPage() {
  return (
    <AppShell
      title="Sign in"
      subtitle="Sign in with email or X → claim username → sign. Privy creates your wallet."
    >
      <RegisterFlow />
    </AppShell>
  );
}

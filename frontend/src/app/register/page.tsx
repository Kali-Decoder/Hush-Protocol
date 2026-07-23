import {RegisterFlow} from "@/components/RegisterFlow";
import {PageHeader, Shell} from "@/components/ui";

export const metadata = {title: "Sign in · Hushh Protocol"};

export default function RegisterPage() {
  return (
    <Shell>
      <PageHeader
        title="Sign in"
        subtitle="Connect your wallet first, then sign a message. Sign out disconnects both."
        align="center"
      />
      <RegisterFlow />
    </Shell>
  );
}

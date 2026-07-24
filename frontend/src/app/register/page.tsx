import {RegisterFlow} from "@/components/RegisterFlow";
import {PageHeader, Shell} from "@/components/ui";

export const metadata = {title: "Sign in · Hushh Protocol"};

export default function RegisterPage() {
  return (
    <Shell>
      <PageHeader
        title="Sign in"
        subtitle="Connect wallet → connect Twitter → sign. Your X handle is your Hushh username."
        align="center"
      />
      <RegisterFlow />
    </Shell>
  );
}

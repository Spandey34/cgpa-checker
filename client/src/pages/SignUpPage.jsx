import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <SignUp routing="path" path="/sign-up" afterSignUpUrl="/dashboard" />
    </div>
  );
}

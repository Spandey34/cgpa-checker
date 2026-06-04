import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <SignIn routing="path" path="/sign-in" afterSignInUrl="/dashboard" />
    </div>
  );
}

import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-[#1b2441] to-slate-900 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-xl">
        <SignIn
          routing="path"
          path="/sign-in"
          afterSignInUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none",
              headerTitle: "text-white text-2xl font-bold",
              headerSubtitle: "text-slate-300",
              socialButtonsBlockButton:
                "bg-white/10 border border-white/15 text-white hover:bg-white/15",
              formButtonPrimary:
                "bg-indigo-500 hover:bg-indigo-600 text-white",
              formFieldInput:
                "bg-white/10 border border-white/15 text-white placeholder:text-slate-400 focus:border-indigo-400",
              formFieldLabel: "text-slate-200",
              footerActionLink: "text-indigo-300 hover:text-indigo-200",
              identityPreviewText: "text-slate-200",
              identityPreviewEditButton: "text-indigo-300",
              otpCodeFieldInput:
                "bg-white/10 border border-white/15 text-white",
            },
            variables: {
              colorPrimary: "#6366f1",
              colorText: "#ffffff",
              colorBackground: "transparent",
              colorInputBackground: "rgba(255,255,255,0.06)",
              colorInputText: "#ffffff",
              colorNeutral: "#cbd5e1",
            },
          }}
        />
      </div>
    </div>
  );
}
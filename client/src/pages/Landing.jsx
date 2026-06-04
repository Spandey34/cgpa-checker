import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

export default function Landing() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) navigate("/dashboard");
  }, [isSignedIn]);

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-mono mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Academic Integrity Tool
        </div>

        <h1 className="font-display text-5xl md:text-6xl font-800 text-white leading-[1.1] mb-4">
          CGPA
          <span className="text-indigo-400"> Verifier</span>
        </h1>
        <p className="text-slate-400 text-lg mb-10 font-light max-w-lg mx-auto leading-relaxed">
          Upload Google Form responses and automatically flag students whose self-reported CGPA
          deviates from institutional records.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/sign-up")}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all duration-200 text-sm shadow-lg shadow-indigo-600/30"
          >
            Get started →
          </button>
          <button
            onClick={() => navigate("/sign-in")}
            className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg font-medium transition-all duration-200 text-sm"
          >
            Sign in
          </button>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap gap-3 justify-center">
          {[
            "⚡ Instant flagging",
            "📥 Downloadable Excel",
            "🔴 Red-highlighted rows",
            "📋 1-year history",
            "🔍 Topic-based search",
          ].map((f) => (
            <span key={f} className="px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import api from "../lib/api";
import { format } from "date-fns";

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-[#111827] border border-slate-800/60 rounded-xl p-5">
      <p className="text-slate-500 text-xs uppercase tracking-widest font-mono mb-2">{label}</p>
      <p className={`font-display text-3xl font-bold ${accent || "text-slate-100"}`}>{value ?? "—"}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/students/stats"),
      api.get("/history?limit=5"),
    ])
      .then(([s, h]) => {
        setStats(s.data);
        setRecent(h.data.history || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1 className="font-display text-2xl font-700 text-slate-100">
          Good {getGreeting()}, {user?.firstName || "there"} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Here's what's happening with your verifications.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-up-delay-1">
        <StatCard
          label="Students in DB"
          value={loading ? "..." : stats?.total?.toLocaleString()}
          sub="ground truth records"
        />
        <StatCard
          label="Total Verifications"
          value={loading ? "..." : recent.length}
          sub="in last 5 fetched"
          accent="text-indigo-400"
        />
        <StatCard
          label="Quick Action"
          value="Verify Now"
          sub="upload a new sheet"
          accent="text-emerald-400"
        />
      </div>

      {/* CTA */}
      <div className="mb-8 animate-fade-up-delay-2">
        <button
          onClick={() => navigate("/upload")}
          className="flex items-center gap-3 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-indigo-600/20"
        >
          <span className="text-lg">↑</span>
          Upload & Verify New Sheet
        </button>
      </div>

      {/* Recent history */}
      <div className="animate-fade-up-delay-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-600 text-slate-200 text-sm uppercase tracking-wider">Recent Verifications</h2>
          <button onClick={() => navigate("/history")} className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">
            View all →
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl shimmer" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="bg-[#111827] border border-dashed border-slate-700 rounded-xl p-10 text-center">
            <p className="text-slate-500 text-sm">No verifications yet.</p>
            <button onClick={() => navigate("/upload")} className="mt-3 text-indigo-400 text-sm hover:underline">
              Upload your first sheet →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((entry) => (
              <button
                key={entry._id}
                onClick={() => navigate(`/history/${entry._id}`)}
                className="w-full flex items-center gap-4 bg-[#111827] hover:bg-slate-800/50 border border-slate-800/60 rounded-xl px-5 py-4 text-left transition-all duration-150 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{entry.topic}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {format(new Date(entry.createdAt), "d MMM yyyy, HH:mm")} · {entry.totalRows} rows
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {entry.flaggedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 text-xs font-mono">
                      {entry.flaggedCount} flagged
                    </span>
                  )}
                  <span className="text-slate-600 group-hover:text-slate-400 text-sm transition-colors">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import api from "../lib/api";
import toast from "react-hot-toast";

function StatusBadge({ flagged, found }) {
  if (!found) return <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono text-xs">NOT FOUND</span>;
  if (flagged) return <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-mono text-xs">FLAGGED</span>;
  return <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-xs">OK</span>;
}

export default function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | flagged | ok | missing

  useEffect(() => {
    api.get(`/history/${id}`)
      .then(({ data }) => setEntry(data))
      .catch(() => toast.error("Not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadExcel = async () => {
    try {
      const response = await api.get(`/history/${id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entry.topic.replace(/\s+/g, "_")}_verified.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl shimmer" />)}
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="p-8 text-center text-slate-500">
        Entry not found. <button onClick={() => navigate("/history")} className="text-indigo-400 hover:underline">Go back</button>
      </div>
    );
  }

  const filtered = entry.results?.filter(r => {
    if (filter === "flagged") return r.flagged;
    if (filter === "ok") return !r.flagged && r.found;
    if (filter === "missing") return !r.found;
    return true;
  }) || [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <button onClick={() => navigate("/history")} className="text-slate-500 hover:text-slate-300 text-sm mb-4 flex items-center gap-1.5 transition-colors">
          ← Back to history
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-700 text-slate-100">{entry.topic}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {format(new Date(entry.createdAt), "d MMMM yyyy, HH:mm")} · δ = {entry.threshold} · {entry.originalFileName}
            </p>
          </div>
          <button
            onClick={downloadExcel}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ↓ Download Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6 animate-fade-up-delay-1">
        {[
          { label: "Total", val: entry.totalRows, color: "text-slate-200" },
          { label: "Flagged", val: entry.flaggedCount, color: "text-red-400" },
          { label: "Not Found", val: entry.notFoundCount, color: "text-amber-400" },
          { label: "Clean", val: entry.totalRows - entry.flaggedCount - entry.notFoundCount, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-slate-800/60 rounded-xl p-4 text-center">
            <p className={`font-display text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-slate-600 text-xs mt-0.5 font-mono">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 animate-fade-up-delay-2">
        {[
          { key: "all", label: "All" },
          { key: "flagged", label: `Flagged (${entry.flaggedCount})` },
          { key: "missing", label: `Missing (${entry.notFoundCount})` },
          { key: "ok", label: "Clean" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t.key
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden animate-fade-up-delay-2">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr className="bg-slate-900 border-b border-slate-800">
                {["#", "Reg. Number", "Entered CGPA", "Actual CGPA", "Difference", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-slate-400 font-mono font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-slate-800/40 ${
                    row.flagged ? "bg-red-500/8" : !row.found ? "bg-amber-500/6" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-slate-600 font-mono">{i + 1}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{row.registrationNumber}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{row.enteredCgpa ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{row.actualCgpa ?? "—"}</td>
                  <td className={`px-4 py-2.5 font-mono font-bold ${row.flagged ? "text-red-400" : "text-slate-500"}`}>
                    {row.difference !== null ? row.difference.toFixed(4) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge flagged={row.flagged} found={row.found} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">No rows match this filter.</div>
        )}
      </div>
    </div>
  );
}

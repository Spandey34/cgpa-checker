import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import api from "../lib/api";
import toast from "react-hot-toast";

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/history?page=${p}&limit=15&search=${encodeURIComponent(q)}`);
      setHistory(data.history);
      setTotalPages(data.pages);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(1, ""); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchHistory(1, search);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this entry?")) return;
    try {
      await api.delete(`/history/${id}`);
      toast.success("Deleted");
      fetchHistory(page, search);
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-700 text-slate-100">History</h1>
          <p className="text-slate-500 text-sm mt-1">{total} verification{total !== 1 ? "s" : ""} stored (up to 1 year)</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 animate-fade-up-delay-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by topic…"
            className="flex-1 px-4 py-2.5 bg-[#111827] border border-slate-700/60 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 text-sm transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); fetchHistory(1, ""); }}
              className="px-3 py-2.5 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="animate-fade-up-delay-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl shimmer" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-[#111827] border border-dashed border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-500 text-sm">{search ? "No results found." : "No history yet."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry._id}
                onClick={() => navigate(`/history/${entry._id}`)}
                className="flex items-center gap-4 bg-[#111827] hover:bg-slate-800/50 border border-slate-800/60 rounded-xl px-5 py-4 cursor-pointer transition-all duration-150 group"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <span className="text-sm">◷</span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{entry.topic}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {format(new Date(entry.createdAt), "d MMM yyyy, HH:mm")} · {entry.totalRows} rows · δ={entry.threshold}
                  </p>
                </div>
                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.flaggedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 text-xs font-mono">
                      {entry.flaggedCount} flagged
                    </span>
                  )}
                  {entry.notFoundCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-xs font-mono">
                      {entry.notFoundCount} missing
                    </span>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadEntry(entry._id); }}
                    className="p-2 text-slate-500 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-all text-xs"
                    title="Download"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => handleDelete(entry._id, e)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all text-xs"
                    title="Delete"
                  >
                    ✕
                  </button>
                  <span className="text-slate-600 group-hover:text-slate-400 text-sm transition-colors ml-1">→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => fetchHistory(page - 1, search)}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg text-xs disabled:opacity-30 hover:border-slate-500 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-slate-500 text-xs">Page {page} of {totalPages}</span>
            <button
              onClick={() => fetchHistory(page + 1, search)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg text-xs disabled:opacity-30 hover:border-slate-500 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

async function downloadEntry(id) {
  try {
    const response = await api.get(`/history/${id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verified.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Download failed");
  }
}

import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import api from "../lib/api";
import toast from "react-hot-toast";

const ENABLE_STUDENT_IMPORT = false;

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const fetchStudents = async (p = 1, q = "") => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/students?page=${p}&limit=30&search=${encodeURIComponent(q)}`
      );
      setStudents(data.students);
      setTotal(data.total);
      setPage(p);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setImportFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!ENABLE_STUDENT_IMPORT) {
      toast.error("Student import is currently disabled");
      return;
    }

    if (!importFile) return toast.error("Select a file first");
    setImporting(true);
    const fd = new FormData();
    fd.append("file", importFile);

    try {
      const { data } = await api.post("/students/bulk-import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Imported! ${data.upserted} added, ${data.modified} updated`);
      setImportFile(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this student?")) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success("Deleted");
      fetchStudents(page, search);
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1 className="font-display text-2xl font-700 text-slate-100">Student Database</h1>
        <p className="text-slate-500 text-sm mt-1">{total.toLocaleString()} ground truth records</p>
      </div>

      {ENABLE_STUDENT_IMPORT && (
        <div className="bg-[#111827] border border-slate-800/60 rounded-xl p-5 mb-6 animate-fade-up-delay-1">
          <h2 className="text-slate-300 text-sm font-medium mb-3">Bulk Import Students</h2>
          <p className="text-slate-500 text-xs mb-3">
            Upload an Excel with columns:{" "}
            <span className="font-mono text-slate-400">Registration Number, CGPA</span>
            {" "} (and optionally Name, Branch, Batch). Existing records are updated.
          </p>
          <div className="flex items-center gap-3">
            <div
              {...getRootProps()}
              className={`flex-1 border border-dashed rounded-lg px-4 py-3 text-xs cursor-pointer transition-colors ${
                isDragActive
                  ? "border-indigo-500 bg-indigo-500/5 text-indigo-300"
                  : importFile
                  ? "border-emerald-500/50 text-emerald-400"
                  : "border-slate-700 text-slate-500 hover:border-slate-500"
              }`}
            >
              <input {...getInputProps()} />
              {importFile ? `✓ ${importFile.name}` : "Drop Excel file here or click to browse"}
            </div>
            {importFile && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
              >
                {importing ? (
                  <span className="animate-spin w-3 h-3 border border-white/30 border-t-white rounded-full" />
                ) : (
                  "↑"
                )}
                {importing ? "Importing…" : "Import"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2 mb-4 animate-fade-up-delay-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchStudents(1, search)}
          placeholder="Search by reg. number or name…"
          className="flex-1 px-4 py-2.5 bg-[#111827] border border-slate-700/60 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 text-sm transition-colors"
        />
        <button
          onClick={() => fetchStudents(1, search)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            onClick={() => {
              setSearch("");
              fetchStudents(1, "");
            }}
            className="px-3 py-2.5 border border-slate-700 text-slate-400 rounded-xl text-sm transition-colors hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden animate-fade-up-delay-3">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr className="bg-slate-900 border-b border-slate-800">
                {["Registration No.", "Name", "Branch", "Batch", "Actual CGPA", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-slate-400 font-mono font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/40">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 rounded shimmer w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No students found.</td>
                </tr>
              ) : students.map((s) => (
                <tr key={s._id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-slate-300">{s.registrationNumber}</td>
                  <td className="px-4 py-2.5 text-slate-300">{s.name || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400">{s.branch || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400">{s.batch || "—"}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-indigo-300">{s.actualCgpa.toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="text-slate-600 hover:text-red-400 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {Math.ceil(total / 30) > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => fetchStudents(page - 1, search)}
            disabled={page <= 1}
            className="px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg text-xs disabled:opacity-30 hover:border-slate-500 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-slate-500 text-xs">Page {page} of {Math.ceil(total / 30)}</span>
          <button
            onClick={() => fetchStudents(page + 1, search)}
            disabled={page >= Math.ceil(total / 30)}
            className="px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg text-xs disabled:opacity-30 hover:border-slate-500 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState("");
  const [threshold, setThreshold] = useState("0.02");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const handleSubmit = async () => {
    if (!file) return toast.error("Please select an Excel file");
    if (!topic.trim()) return toast.error("Please enter a topic");
    if (isNaN(parseFloat(threshold)) || parseFloat(threshold) < 0) {
      return toast.error("Invalid threshold value");
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("topic", topic.trim());
    formData.append("threshold", threshold);

    try {
      const { data } = await api.post("/upload/process", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      toast.success(`Processed ${data.totalRows} rows — ${data.flaggedCount} flagged`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!result?.excelBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.excelBase64}`;
    link.download = result.fileName || "verified.xlsx";
    link.click();
  };

  const reset = () => {
    setFile(null);
    setTopic("");
    setThreshold("0.02");
    setResult(null);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1 className="font-display text-2xl font-700 text-slate-100">Verify CGPA</h1>
        <p className="text-slate-500 text-sm mt-1">Upload a Google Form response sheet to flag discrepancies.</p>
      </div>

      {!result ? (
        <div className="space-y-5 animate-fade-up-delay-1">
          {/* Topic input */}
          <div>
            <label className="block text-xs text-slate-400 font-mono uppercase tracking-wider mb-2">
              Topic / Session Name *
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Uber Response, Placement Drive Jan 2025"
              className="w-full px-4 py-3 bg-[#111827] border border-slate-700/60 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 text-sm transition-colors"
            />
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-xs text-slate-400 font-mono uppercase tracking-wider mb-2">
              Threshold (δ) — Max allowed deviation
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                step="0.01"
                min="0"
                max="10"
                className="w-36 px-4 py-3 bg-[#111827] border border-slate-700/60 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500/60 text-sm font-mono transition-colors"
              />
              <span className="text-slate-500 text-xs">
                Rows where |entered CGPA − actual CGPA| &gt; {threshold || "0.02"} will be flagged red
              </span>
            </div>
          </div>

          {/* File drop */}
          <div>
            <label className="block text-xs text-slate-400 font-mono uppercase tracking-wider mb-2">
              Excel File (.xlsx / .xls) *
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? "border-indigo-500 bg-indigo-500/5"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-700 hover:border-slate-500 bg-[#111827]"
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <p className="text-emerald-400 text-2xl mb-2">✓</p>
                  <p className="text-slate-200 text-sm font-medium">{file.name}</p>
                  <p className="text-slate-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="mt-3 text-xs text-slate-500 hover:text-red-400 transition-colors"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 text-4xl mb-3">⬆</p>
                  <p className="text-slate-300 text-sm font-medium">
                    {isDragActive ? "Drop it here" : "Drag & drop or click to browse"}
                  </p>
                  <p className="text-slate-600 text-xs mt-2">
                    Must contain columns: <span className="font-mono text-slate-500">Registration Number</span> and{" "}
                    <span className="font-mono text-slate-500">CGPA</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Required columns hint */}
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg px-4 py-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-400 mb-1">Expected column names (case-insensitive):</p>
            <p>Registration: <span className="font-mono">Registration Number, Reg No, Roll No</span></p>
            <p>CGPA: <span className="font-mono">CGPA, GPA, Entered CGPA, Self CGPA</span></p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !file || !topic.trim()}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
                Processing...
              </>
            ) : (
              "Process & Verify"
            )}
          </button>
        </div>
      ) : (
        /* Results panel */
        <div className="animate-fade-up">
          <ResultPanel result={result} onDownload={downloadExcel} onReset={reset} onViewHistory={() => navigate(`/history/${result.historyId}`)} />
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result, onDownload, onReset, onViewHistory }) {
  const flaggedRows = result.results?.filter(r => r.flagged) || [];
  const notFoundRows = result.results?.filter(r => !r.found) || [];

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Total Rows" value={result.totalRows} color="text-slate-200" />
        <SummaryCard label="Flagged" value={result.flaggedCount} color="text-red-400" />
        <SummaryCard label="Not Found" value={result.notFoundCount} color="text-amber-400" />
        <SummaryCard label="Clean" value={result.totalRows - result.flaggedCount - result.notFoundCount} color="text-emerald-400" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          ↓ Download Verified Excel
        </button>
        <button
          onClick={onViewHistory}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          View in History
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-lg text-sm transition-colors"
        >
          New Upload
        </button>
      </div>

      {/* Preview table */}
      <div>
        <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-3">
          Preview — first 100 rows (showing flagged & not-found highlighted)
        </p>
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="bg-slate-900 border-b border-slate-800">
                  {["Reg. Number", "Entered CGPA", "Actual CGPA", "Difference", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-slate-400 font-mono font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.results?.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-800/50 transition-colors ${
                      row.flagged ? "bg-red-500/10 hover:bg-red-500/15" :
                      !row.found ? "bg-amber-500/8 hover:bg-amber-500/12" :
                      "hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-slate-300">{row.registrationNumber}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{row.enteredCgpa ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{row.actualCgpa ?? "—"}</td>
                    <td className={`px-4 py-2.5 font-mono font-bold ${row.flagged ? "text-red-400" : "text-slate-400"}`}>
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
        </div>
        {result.results?.length >= 100 && (
          <p className="text-slate-600 text-xs mt-2 text-center">Showing first 100 rows · download Excel for full data</p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-[#111827] border border-slate-800/60 rounded-xl p-4 text-center">
      <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-slate-600 text-xs mt-0.5 font-mono">{label}</p>
    </div>
  );
}

function StatusBadge({ flagged, found }) {
  if (!found) return <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono">NOT FOUND</span>;
  if (flagged) return <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-mono">FLAGGED</span>;
  return <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">OK</span>;
}

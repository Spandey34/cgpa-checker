import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { setAuthToken } from "./lib/api";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import History from "./pages/History";
import HistoryDetail from "./pages/HistoryDetail";
import Students from "./pages/Students";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner /></div>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return children;
}

function Spinner() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-indigo-500"
          style={{ animation: `pulse-dot 1.2s ${i * 0.2}s infinite ease-in-out` }} />
      ))}
    </div>
  );
}

export default function App() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) { setAuthToken(null); return; }
    const refresh = async () => {
      const token = await getToken();
      setAuthToken(token);
    };
    refresh();
    const interval = setInterval(refresh, 55 * 1000); // refresh every 55s
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<HistoryDetail />} />
        <Route path="/students" element={<Students />} />
      </Route>
    </Routes>
  );
}

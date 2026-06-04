import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "⬡" },
  { to: "/upload", label: "Verify CGPA", icon: "↑" },
  { to: "/history", label: "History", icon: "◷" },
  { to: "/students", label: "Student DB", icon: "◈" },
];

export default function Layout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-slate-800/60 bg-[#0d1424]">
        {/* Logo */}
        <div className="px-6 pt-7 pb-6 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-display font-bold text-sm">CV</div>
            <div>
              <p className="font-display font-700 text-[15px] text-slate-100 leading-tight">CGPA</p>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Verifier</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 font-medium"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`
              }
            >
              <span className="text-[16px] w-4 text-center opacity-80">{item.icon}</span>
              <span className="font-body">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 pb-5 border-t border-slate-800/60 pt-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            {user?.imageUrl ? (
              <img src={user.imageUrl} className="w-7 h-7 rounded-full object-cover" alt="avatar" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs text-white font-semibold">
                {user?.firstName?.[0] || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-slate-500 text-[10px] truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(() => navigate("/"))}
            className="w-full mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 text-sm transition-all duration-150"
          >
            <span className="text-base">⟵</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

import { useEffect } from "react";
import { BarChart3, LogOut, ShieldAlert } from "lucide-react";
import { navigate } from "../lib/router";
import { checkIsAdmin, logoutAdmin } from "../lib/adminAuth";

export function AdminPanelView() {
  useEffect(() => {
    if (!checkIsAdmin()) {
      navigate({ name: "home" });
    }
  }, []);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate({ name: "home" });
  };

  if (!checkIsAdmin()) return null;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="border-b border-marine-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-marine-text">Admin Panel</h1>
            <p className="text-sm text-marine-muted mt-1">
              Manage Marine Fix administration tools.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate({ name: "admin-pending" })}
          className="group text-left p-6 rounded-2xl bg-marine-card border border-marine-border hover:border-amber-400/40 hover:bg-marine-card/80 transition cursor-pointer"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-marine-text">Review</div>
              <p className="text-sm text-marine-muted mt-1">
                Review, approve or reject submitted troubleshooting guides.
              </p>
            </div>
            <ShieldAlert className="h-7 w-7 text-amber-400 shrink-0" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate({ name: "admin-analytics" })}
          className="group text-left p-6 rounded-2xl bg-marine-card border border-marine-border hover:border-cyan-400/40 hover:bg-marine-card/80 transition cursor-pointer"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-marine-text">Analytics</div>
              <p className="text-sm text-marine-muted mt-1">
                View anonymous website and Android app usage statistics.
              </p>
            </div>
            <BarChart3 className="h-7 w-7 text-cyan-300 shrink-0" />
          </div>
        </button>
      </div>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer text-sm font-semibold"
      >
        <LogOut className="h-4 w-4" />
        Exit Admin
      </button>
    </div>
  );
}

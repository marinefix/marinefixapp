import { useEffect, useState } from "react";
import { Activity, Globe2, Smartphone, Users, RefreshCw } from "lucide-react";

const API_BASE_URL = "https://marinefixapp.pages.dev";

type AnalyticsData = {
  totals: { web_visitors: number; app_users: number; app_first_launches: number; total_sessions: number };
  recent30Days: { web_visitors: number; app_users: number; app_first_launches: number; sessions: number };
  daily: Array<{ day: string; unique_users: number; web_sessions: number; app_sessions: number }>;
};

function n(value: unknown): number { return Number(value || 0); }

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const response = await fetch(`${API_BASE_URL}/api/analytics`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Admin session expired." : "Failed to load analytics.");
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const cards = data ? [
    { label: "Website Visitors", value: n(data.totals.web_visitors), icon: Globe2, note: "Unique browsers" },
    { label: "App Users", value: n(data.totals.app_users), icon: Smartphone, note: "Unique app devices" },
    { label: "App First Launches", value: n(data.totals.app_first_launches), icon: Users, note: "First-launch events" },
    { label: "Total Sessions", value: n(data.totals.total_sessions), icon: Activity, note: "1 session / visitor / day" },
  ] : [];

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 border-b border-marine-border pb-4">
        <div><h1 className="text-2xl font-bold text-marine-text">Usage Analytics</h1><p className="text-xs text-marine-muted mt-1">Anonymous website and Android app usage.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-marine-card border border-marine-border text-xs font-semibold text-marine-text hover:border-marine-accent/50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}
      {loading && !data ? <div className="p-12 text-center text-marine-muted animate-pulse">Loading analytics...</div> : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(({ label, value, icon: Icon, note }) => <div key={label} className="p-5 rounded-2xl bg-marine-card border border-marine-border"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-marine-muted">{label}</span><Icon className="h-5 w-5 text-marine-accent" /></div><div className="text-3xl font-extrabold text-marine-text mt-3">{value.toLocaleString()}</div><div className="text-[11px] text-marine-muted mt-1">{note}</div></div>)}
          </div>
          <div className="p-5 rounded-2xl bg-marine-card border border-marine-border"><h2 className="font-bold text-marine-text">Last 30 days</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm"><div><div className="text-marine-muted text-xs">Website visitors</div><div className="font-bold text-marine-text mt-1">{n(data.recent30Days.web_visitors)}</div></div><div><div className="text-marine-muted text-xs">App users</div><div className="font-bold text-marine-text mt-1">{n(data.recent30Days.app_users)}</div></div><div><div className="text-marine-muted text-xs">First launches</div><div className="font-bold text-marine-text mt-1">{n(data.recent30Days.app_first_launches)}</div></div><div><div className="text-marine-muted text-xs">Sessions</div><div className="font-bold text-marine-text mt-1">{n(data.recent30Days.sessions)}</div></div></div></div>
          <div className="rounded-2xl bg-marine-card border border-marine-border overflow-hidden"><div className="p-5 border-b border-marine-border"><h2 className="font-bold text-marine-text">Daily activity</h2></div>{data.daily.length === 0 ? <div className="p-8 text-center text-marine-muted text-sm">No activity recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-marine-muted bg-marine-dark/40"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Unique users</th><th className="px-5 py-3">Website sessions</th><th className="px-5 py-3">App sessions</th></tr></thead><tbody>{data.daily.map((row) => <tr key={row.day} className="border-t border-marine-border/60"><td className="px-5 py-3 text-marine-text">{row.day}</td><td className="px-5 py-3 text-marine-text">{n(row.unique_users)}</td><td className="px-5 py-3 text-marine-muted">{n(row.web_sessions)}</td><td className="px-5 py-3 text-marine-muted">{n(row.app_sessions)}</td></tr>)}</tbody></table></div>}</div>
        </>
      ) : null}
      <p className="text-[11px] text-marine-muted">Privacy: only a random anonymous visitor ID, platform, event, page path and timestamp are stored. No name, email, phone number, IP address or device fingerprint is intentionally stored.</p>
    </div>
  );
}

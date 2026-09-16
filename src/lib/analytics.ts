import { Capacitor } from "@capacitor/core";

const API_BASE_URL = "https://marinefixapp.pages.dev";
const VISITOR_KEY = "marinefix_analytics_visitor_id_v1";
const FIRST_LAUNCH_KEY = "marinefix_analytics_first_launch_v1";
const LAST_SESSION_KEY = "marinefix_analytics_last_session_v1";

function isAndroidApp(): boolean {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

function getVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY);

  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
          .toString(36)
          .slice(2)}`;

  localStorage.setItem(VISITOR_KEY, id);

  return id;
}

async function send(
  event: "visit" | "session" | "install",
  path: string
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/analytics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      body: JSON.stringify({
        visitor_id: getVisitorId(),
        platform: isAndroidApp() ? "android" : "web",
        event,
        path: path.slice(0, 200),
      }),
    });
  } catch {
    // Analytics must never break the app when offline
    // or when the API is unavailable.
  }
}

export function trackUsage(
  path = window.location.pathname
): void {
  if (typeof window === "undefined") return;

  if (path.startsWith("/admin-")) return;

  const firstLaunch =
    !localStorage.getItem(FIRST_LAUNCH_KEY);

  if (firstLaunch) {
    localStorage.setItem(
      FIRST_LAUNCH_KEY,
      new Date().toISOString()
    );

    void send("visit", path);

    if (isAndroidApp()) {
      void send("install", path);
    }
  }

  // One session event per visitor per 24 hours
  // keeps D1 storage small.
  const lastSession = Number(
    localStorage.getItem(LAST_SESSION_KEY) || "0"
  );

  if (
    !Number.isFinite(lastSession) ||
    Date.now() - lastSession >= 24 * 60 * 60 * 1000
  ) {
    localStorage.setItem(
      LAST_SESSION_KEY,
      String(Date.now())
    );

    void send("session", path);
  }
}
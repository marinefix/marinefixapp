const STORAGE_KEY = "marinefix_admin_session";
const LAST_ACTIVITY_KEY = "marinefix_admin_last_activity";
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const SERVER_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "network" };

let idleTimer: ReturnType<typeof setTimeout> | undefined;
let lastServerRefreshAt = 0;
let lastActivityWriteAt = 0;
let monitorStarted = false;

function clearLocalAdminSession(): void {
  const wasAdmin = localStorage.getItem(STORAGE_KEY) === "authenticated";
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  if (wasAdmin) {
    window.dispatchEvent(new Event("admin_session_changed"));
  }
}

function expireAdminSession(): void {
  clearLocalAdminSession();
  // Clear the HttpOnly server cookie as well. If the network is offline,
  // server-side token expiry still prevents the old cookie being used forever.
  void fetch("/api/admin-logout", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  }).catch(() => {});
}

function getLastActivity(): number {
  const value = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function checkIsAdmin(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(STORAGE_KEY) !== "authenticated") return false;

  const lastActivity = getLastActivity();
  if (!lastActivity || Date.now() - lastActivity >= IDLE_TIMEOUT_MS || lastActivity > Date.now()) {
    expireAdminSession();
    return false;
  }

  return true;
}

async function refreshServerSession(): Promise<void> {
  const now = Date.now();
  if (now - lastServerRefreshAt < SERVER_REFRESH_INTERVAL_MS) return;
  lastServerRefreshAt = now;

  try {
    const response = await fetch("/api/admin-session", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    if (response.status === 401) {
      clearLocalAdminSession();
      return;
    }
    // A temporary network failure must not falsely report a bad password or
    // immediately log the user out. The server cookie has its own expiry.
  } catch {
    // Keep the local idle timer; a later activity can retry the refresh.
  }
}

function recordAdminActivity(): void {
  if (localStorage.getItem(STORAGE_KEY) !== "authenticated") return;

  const now = Date.now();
  const lastActivity = getLastActivity();
  if (!lastActivity || now - lastActivity >= IDLE_TIMEOUT_MS || lastActivity > now) {
    expireAdminSession();
    return;
  }

  // Limit localStorage writes while the pointer moves continuously.
  if (now - lastActivityWriteAt >= 15000 || lastActivity === 0) {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    lastActivityWriteAt = now;
  }

  scheduleIdleCheck();
  void refreshServerSession();
}

function scheduleIdleCheck(): void {
  if (idleTimer) clearTimeout(idleTimer);
  if (localStorage.getItem(STORAGE_KEY) !== "authenticated") return;

  const lastActivity = getLastActivity();
  if (!lastActivity) {
    expireAdminSession();
    return;
  }

  const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
  if (remaining <= 0) {
    expireAdminSession();
    return;
  }

  idleTimer = setTimeout(() => {
    if (Date.now() - getLastActivity() >= IDLE_TIMEOUT_MS) {
      expireAdminSession();
    } else {
      scheduleIdleCheck();
    }
  }, remaining + 50);
}

/** Start once from the persistent app header so every route shares the same idle session. */
export function initializeAdminSessionMonitor(): () => void {
  if (monitorStarted || typeof window === "undefined") return () => {};
  monitorStarted = true;

  const onActivity = () => recordAdminActivity();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && localStorage.getItem(STORAGE_KEY) === "authenticated") {
      if (Date.now() - getLastActivity() >= IDLE_TIMEOUT_MS) expireAdminSession();
      else scheduleIdleCheck();
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === LAST_ACTIVITY_KEY) {
      if (checkIsAdmin()) scheduleIdleCheck();
      else if (idleTimer) clearTimeout(idleTimer);
    }
  };
  const onSessionChange = () => {
    if (checkIsAdmin()) scheduleIdleCheck();
    else if (idleTimer) clearTimeout(idleTimer);
  };

  window.addEventListener("pointerdown", onActivity, { passive: true });
  window.addEventListener("keydown", onActivity);
  window.addEventListener("touchstart", onActivity, { passive: true });
  window.addEventListener("scroll", onActivity, { passive: true });
  window.addEventListener("mousemove", onActivity, { passive: true });
  window.addEventListener("storage", onStorage);
  window.addEventListener("admin_session_changed", onSessionChange);
  document.addEventListener("visibilitychange", onVisibilityChange);

  if (checkIsAdmin()) {
    lastServerRefreshAt = Date.now();
    scheduleIdleCheck();
  }

  return () => {
    monitorStarted = false;
    if (idleTimer) clearTimeout(idleTimer);
    window.removeEventListener("pointerdown", onActivity);
    window.removeEventListener("keydown", onActivity);
    window.removeEventListener("touchstart", onActivity);
    window.removeEventListener("scroll", onActivity);
    window.removeEventListener("mousemove", onActivity);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("admin_session_changed", onSessionChange);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export async function authenticateAdmin(passcode: string): Promise<AdminAuthResult> {
  const body = JSON.stringify({ passcode });
  let response: Response | null = null;

  // Retry transient failures on weak connections. A failed request is never
  // reported as a wrong password unless the API explicitly says so.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body,
      });
    } catch {
      response = null;
    }

    if (response?.ok || response?.status === 401) break;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  if (!response) return { ok: false, reason: "network" };

  if (response.status === 401) {
    try {
      const data = await response.clone().json() as { error?: string };
      if (data.error === "Invalid credentials") return { ok: false, reason: "invalid" };
    } catch {
      // An unexpected 401 response is not proof that the passcode was incorrect.
    }
    return { ok: false, reason: "network" };
  }

  if (!response.ok) return { ok: false, reason: "network" };

  let data: { success?: boolean };
  try {
    data = await response.json();
  } catch {
    return { ok: false, reason: "network" };
  }

  if (data.success !== true) return { ok: false, reason: "network" };

  localStorage.setItem(STORAGE_KEY, "authenticated");
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  lastActivityWriteAt = Date.now();
  lastServerRefreshAt = Date.now();
  window.dispatchEvent(new Event("admin_session_changed"));
  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fetch("/api/admin-logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } finally {
    clearLocalAdminSession();
  }
}

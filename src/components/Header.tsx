import { useEffect, useState } from "react";
import {
  Anchor,
  Bookmark,
  PlusCircle,
  ShieldAlert,
  Menu,
  LogOut,
  Smartphone,
  BarChart3,
} from "lucide-react";
import { SearchBar } from "./SearchBar";
import { navigate } from "../lib/router";
import { checkIsAdmin, logoutAdmin } from "../lib/adminAuth";
import { AdminLoginModal } from "./AdminLoginModal";

type HeaderProps = {
  onToggleMobileMenu?: () => void;
};

export function Header({ onToggleMobileMenu }: HeaderProps) {
  const [isAdmin, setIsAdmin] = useState(checkIsAdmin());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    const checkAppMode = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      setIsApp(isStandalone);
    };

    checkAppMode();

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener("change", checkAppMode);

    return () => mediaQuery.removeEventListener("change", checkAppMode);
  }, []);

  useEffect(() => {
    const handleHashCheck = () => {
      if (window.location.hash === "#admin") {
        if (checkIsAdmin()) {
          window.history.replaceState(null, "", window.location.pathname);
        } else {
          setShowAdminModal(true);
        }
      }
    };

    const handleSessionChange = () => {
      setIsAdmin(checkIsAdmin());
    };

    handleHashCheck();

    window.addEventListener("hashchange", handleHashCheck);
    window.addEventListener("admin_session_changed", handleSessionChange);

    return () => {
      window.removeEventListener("hashchange", handleHashCheck);
      window.removeEventListener(
        "admin_session_changed",
        handleSessionChange
      );
    };
  }, []);

  const handleAdminSuccess = () => {
    setShowAdminModal(false);
    setIsAdmin(true);

    if (window.location.hash === "#admin") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const handleCloseModal = () => {
    setShowAdminModal(false);

    if (window.location.hash === "#admin") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();

    if (
      window.location.pathname.includes("admin-pending") ||
      window.location.search.includes("admin-pending")
    ) {
      navigate({ name: "home" });
    } else {
      const currentPath = window.location.pathname;

      if (currentPath === "/admin-pending") {
        navigate({ name: "home" });
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-marine-dark/95 backdrop-blur-md border-b border-marine-border">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16 gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 text-marine-muted hover:text-marine-accent focus:outline-none rounded-lg cursor-pointer"
              title="Open Departments"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2 text-marine-accent font-bold text-lg tracking-tight hover:opacity-90 transition cursor-pointer"
              title="Return to Home Dashboard"
            >
              <Anchor className="h-6 w-6" />
              <span className="text-marine-text font-extrabold">
                MARINE FIX
              </span>
            </button>
          </div>

          <div className="hidden md:block flex-1 max-w-xl mx-4">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isApp && (
              <a
                href="https://marinefixapp.pages.dev/api/upload?key=MarineFix.apk"
                download="MarineFix.apk"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-marine-accent/10 text-marine-accent border border-marine-accent/30 hover:bg-marine-accent hover:text-marine-base transition cursor-pointer"
                title="Download Marine Fix Android App"
              >
                <Smartphone className="h-4 w-4" />
                <span>Get APK</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => navigate({ name: "add-guide" })}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-marine-card text-marine-text border border-marine-border hover:border-marine-accent/50 transition cursor-pointer"
              title="Post a Troubleshooting Guide"
            >
              <PlusCircle className="h-4 w-4 text-marine-accent" />
              <span>Post Guide</span>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => navigate({ name: "admin-pending" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/15 transition cursor-pointer"
                  title="Review pending submissions"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Review</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ name: "admin-analytics" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/15 transition cursor-pointer"
                  title="View usage analytics"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
                  title="Exit Admin Mode"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate({ name: "bookmarks" })}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-marine-card text-marine-text border border-marine-border hover:border-marine-accent/50 transition cursor-pointer"
              title="Saved Bookmarks"
            >
              <Bookmark className="h-4 w-4 text-marine-accent" />
              <span>Saved</span>
            </button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-3">
          <SearchBar />
        </div>
      </header>

      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={handleCloseModal}
        onSuccess={handleAdminSuccess}
      />
    </>
  );
}
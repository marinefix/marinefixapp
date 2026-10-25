import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./lib/theme";
import "./index.css";

try {
  const savedTheme = localStorage.getItem("marinefix_theme");
  document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// PWA Service Worker: check for updates on load, when the network returns,
// and when the user returns to the tab. No manual site-data clearing required.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        void reg.update().catch(() => {});
        const checkForUpdate = () => { void reg.update().catch(() => {}); };
        window.addEventListener("online", checkForUpdate);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        console.log("Service Worker Registered Successfully:", reg.scope);
      })
      .catch((err) => console.error("Service Worker Registration Failed:", err));
  });
}

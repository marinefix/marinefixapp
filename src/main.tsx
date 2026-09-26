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

// PWA Service Worker Registration with Auto-Update Check
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Build maarum bothu pudhiya sw.js-ah force update check pannum
        reg.update();
        console.log("Service Worker Registered Successfully:", reg.scope);
      })
      .catch((err) => console.error("Service Worker Registration Failed:", err));
  });
}
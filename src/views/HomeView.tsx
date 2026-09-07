import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  Wrench,
  BookOpen,
  Download,
  MessageSquare,
} from "lucide-react";
import type { Category, Equipment } from "../types";
import { navigate } from "../lib/router";

type Props = {
  categories: Category[];
  equipment: Equipment[];
  totalGuides: number;
};

const featuredEquipment = [
  {
    name: "Marine Main Engine",
    img: "/main-engine.png",
    description:
      "2-Stroke propulsion engine diagnostics, fuel injection, and safety system checks.",
  },
  {
    name: "Motors & Alternators",
    img: "/motor.png",
    description:
      "High-voltage alternators, starter panels, and insulation tests.",
  },
  {
    name: "Marine Auxiliary Boiler",
    img: "/boiler.png",
    description:
      "Steam pressure control, burner automation, and safety cutouts.",
  },
  {
    name: "Marine Electrical",
    img: "/electrical.png",
    description:
      "Main switchboard, circuit breakers, and control automation.",
  },
];

export function HomeView({
  categories,
  equipment,
  totalGuides,
}: Props) {
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    const checkAppMode = () => {
      // Capacitor native detection
      const isCapacitor =
        typeof (window as any).Capacitor !== "undefined" ||
        Boolean(
          (window as any).Capacitor?.isNativePlatform?.()
        );

      // PWA / Standalone mode detection
      const isStandalone =
        window.matchMedia(
          "(display-mode: standalone)"
        ).matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      // Android WebView / App host scheme detection
      const isAndroidWebView =
        /wv|Android.*Version\/[0-9.]+/i.test(
          navigator.userAgent
        ) ||
        window.location.origin.includes("localhost") ||
        window.location.protocol === "capacitor:" ||
        (window.location.protocol === "http:" &&
          window.location.hostname === "localhost");

      setIsApp(
        Boolean(
          isCapacitor ||
            isStandalone ||
            isAndroidWebView
        )
      );
    };

    checkAppMode();

    const mediaQuery = window.matchMedia(
      "(display-mode: standalone)"
    );

    mediaQuery.addEventListener(
      "change",
      checkAppMode
    );

    return () =>
      mediaQuery.removeEventListener(
        "change",
        checkAppMode
      );
  }, []);

  const departments = useMemo(
    () =>
      categories
        .filter((c) => c.parent_id === null)
        .sort(
          (a, b) =>
            a.order_index - b.order_index
        ),
    [categories]
  );

  return (
    <div className="animate-fade-in flex flex-col min-h-full">
      <div className="flex-1 pb-16">

        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-marine-border">
          <div
            className="absolute inset-0 opacity-35 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('/hero-bg.jpg')",
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-marine-base via-marine-base/80 to-marine-base/40" />

          <div className="relative px-6 py-16 lg:px-12 lg:py-20 max-w-5xl">

            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-marine-accent bg-marine-accent/10 border border-marine-accent/30 rounded-full px-3 py-1 mb-4">
              <Wrench className="h-3.5 w-3.5" />
              MARINE ELECTRICAL KNOWLEDGE BASE
            </span>

            <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-marine-text">
              Troubleshoot Marine Electrical Systems,
              <span className="text-marine-accent">
                {" "}Faster.
              </span>
            </h1>

            <p className="mt-4 text-marine-muted text-base lg:text-lg max-w-3xl leading-relaxed">
              Step-by-step electrical diagnostic guides
              for marine ETOs, engineers, and electricians.
              Even if a problem seems basic or familiar,
              what is simple to one can be a vital lifeline
              to a beginner or someone facing it for the
              first time onboard. Let’s share knowledge,
              help each other out, and grow together.
            </p>

            {/* Stats & Actions */}
            <div className="mt-8 flex flex-wrap gap-6 items-center">

              <Stat
                label="Departments"
                value={departments.length}
              />

              <Stat
                label="Equipment"
                value={equipment.length}
              />

              <button
                type="button"
                onClick={() =>
                  navigate({
                    name: "all-guides",
                  })
                }
                className="group flex items-center gap-3 p-2.5 rounded-xl bg-marine-accent/10 border border-marine-accent/30 hover:bg-marine-accent/20 hover:border-marine-accent/60 transition text-left cursor-pointer"
                title="View All Troubleshooting Guides"
              >
                <div>
                  <div className="text-3xl font-bold text-marine-accent flex items-center gap-1.5">
                    {totalGuides}

                    <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-marine-accent" />
                  </div>

                  <div className="text-xs uppercase tracking-wider text-marine-accent font-semibold flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    View All Guides
                  </div>
                </div>
              </button>

              {/* Direct APK Download Button - Hidden inside Installed App */}
              {!isApp && (
                <a
                  href="https://marinefixapp.pages.dev/api/upload?key=MarineFix.apk"
                  download="MarineFix.apk"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-emerald-950/40 transition-all cursor-pointer border border-emerald-400/30"
                  title="Download Marine Fix APK"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>
                    Download App (.APK)
                  </span>
                </a>
              )}
            </div>

            {/* Feedback Card */}
            <button
              type="button"
              onClick={() =>
                navigate({
                  name: "feedback",
                })
              }
              className="group mt-8 w-full rounded-2xl border border-marine-accent/70 bg-marine-accent/5 hover:bg-marine-accent/10 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-4 p-4 lg:p-5">

                {/* Icon */}
                <div className="shrink-0 w-14 h-14 rounded-xl border-2 border-marine-accent flex items-center justify-center">
                  <MessageSquare className="h-7 w-7 text-marine-accent" />
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base lg:text-lg font-bold text-marine-text">
                    Help us improve Marine Fix
                  </h2>

                  <p className="text-sm text-marine-muted mt-1 leading-relaxed">
                    Share your feedback or suggest a feature.
                    Your input helps us make Marine Fix better
                    for everyone.
                  </p>
                </div>

                {/* Arrow */}
                <div className="shrink-0">
                  <ArrowRight className="h-6 w-6 text-marine-accent transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Machinery Showcase */}
        <section className="px-6 py-10 lg:px-12">
          <h2 className="text-xl font-bold text-marine-text mb-2">
            Key Machinery Showcase
          </h2>

          <p className="text-marine-muted text-sm mb-6">
            Common vessel machinery and critical electrical diagnostics.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredEquipment.map(
              (item, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-xl bg-marine-card border border-marine-border p-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-marine-accent/50 hover:shadow-lg hover:shadow-marine-accent/10 cursor-pointer"
                >
                  <div className="relative w-full h-44 overflow-hidden rounded-lg bg-slate-900 mb-4 flex items-center justify-center border border-marine-border/40">
                    <img
                      src={item.img}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <h3 className="font-semibold text-marine-text group-hover:text-marine-accent transition-colors">
                    {item.name}
                  </h3>

                  <p className="text-xs text-marine-muted mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="text-3xl font-bold text-marine-text">
        {value}
      </div>

      <div className="text-xs uppercase tracking-wider text-marine-muted">
        {label}
      </div>
    </div>
  );
}
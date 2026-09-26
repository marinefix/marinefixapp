import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  Wrench,
  BookOpen,
  Download,
  WifiOff,
  FileDown,
  Users,
  Smartphone,
  GraduationCap,
  Search,
  ChevronRight,
  Eye,
  Bookmark,
} from "lucide-react";

import type { Category, Equipment, Guide } from "../types";
import { navigate } from "../lib/router";
import { Capacitor } from "@capacitor/core";
import { resolveRemoteUrl } from "../lib/offlineStorage";
import { searchAll, type SearchResult } from "../lib/queries";

type Props = {
  categories: Category[];
  equipment: Equipment[];
  totalGuides: number;
  guides: Guide[];
};

const popularCategoryCards = [
  { label: "Main Engine", slug: "main-engine", img: "/equipment/main-engine.png" },
  { label: "Generators", slug: "auxiliary-engine-generator", img: "/equipment/generator.png" },
  { label: "Boiler", slug: "boilers", img: "/equipment/boiler.png" },
  { label: "Pumps", slug: "pumps", img: "/equipment/pump.png" },
  { label: "Compressors", slug: "compressors", img: "/equipment/compressor.png" },
  { label: "Purifiers", slug: "purifiers", img: "/equipment/purifier.png" },
  { label: "Electrical", slug: "power-generation", img: "/equipment/electrical.png" },
  { label: "HVAC", slug: "accommodation-electricals", img: "/equipment/hvac.png" },
  { label: "Steering Gear", slug: "deck-machinery", img: "/equipment/steering-gear.png" },
];

const recentGuideFallbackImages = popularCategoryCards.map((item) => item.img);

export function HomeView({
  categories,
  equipment,
  totalGuides,
  guides,
}: Props) {
  const [isApp, setIsApp] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const [heroResults, setHeroResults] = useState<SearchResult>({
    guides: [],
    equipment: [],
  });
  const [heroSearchOpen, setHeroSearchOpen] = useState(false);
  const [heroSearchLoading, setHeroSearchLoading] = useState(false);
  const heroSearchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setIsApp(
      Capacitor.isNativePlatform() &&
        Capacitor.getPlatform() === "android"
    );
  }, []);

  const departments = useMemo(
    () =>
      categories
        .filter((c) => c.parent_id === null)
        .sort((a, b) => a.order_index - b.order_index),
    [categories]
  );

  const recentGuides = useMemo(() => {
    return [...guides]
      .filter((g) => g.is_approved !== false)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 4);
  }, [guides]);

  useEffect(() => {
    const q = heroSearch.trim();

    if (!q) {
      setHeroResults({ guides: [], equipment: [] });
      setHeroSearchOpen(false);
      setHeroSearchLoading(false);
      return;
    }

    setHeroSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchAll(q);
        setHeroResults(results);
        setHeroSearchOpen(true);
      } catch {
        // Fall back to the equipment already loaded on the Home page.
        const lower = q.toLowerCase();
        const localEquipment = equipment.filter((item) =>
          item.name.toLowerCase().includes(lower)
        );
        setHeroResults({ guides: [], equipment: localEquipment });
        setHeroSearchOpen(true);
      } finally {
        setHeroSearchLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [heroSearch, equipment]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        heroSearchRef.current &&
        !heroSearchRef.current.contains(event.target as Node)
      ) {
        setHeroSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const closeHeroSearch = () => {
    setHeroSearchOpen(false);
  };

  const handleHeroSearch = () => {
    const q = heroSearch.trim().toLowerCase();
    if (!q) {
      navigate({ name: "all-guides" });
      return;
    }

    const exactEquipment = equipment.find(
      (item) => item.name.toLowerCase() === q
    );

    const matchingEquipment =
      exactEquipment ||
      heroResults.equipment[0] ||
      equipment.find(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          q.includes(item.name.toLowerCase())
      );

    if (matchingEquipment) {
      navigate({ name: "equipment", id: matchingEquipment.id });
      closeHeroSearch();
      return;
    }

    if (heroResults.guides.length > 0) {
      navigate({ name: "guide", id: heroResults.guides[0].id });
      closeHeroSearch();
      return;
    }

    navigate({ name: "all-guides" });
    closeHeroSearch();
  };

  const openCategory = (slug: string) => {
    const category = categories.find((item) => item.slug === slug);
    if (category) {
      navigate({ name: "category", id: category.id });
    }
    closeHeroSearch();
  };

  return (
    <div className="animate-fade-in min-h-full bg-white text-slate-900">
      <div>

        {/* =========================================================
            HERO
        ========================================================== */}
        <section className="relative z-20 px-2 sm:px-3 lg:px-3 pt-2">
          <div className="relative z-50 rounded-xl border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.10)] h-[310px] sm:h-[320px] lg:h-[310px]">
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/hero-bg.png')" }}
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#062044]/95 via-[#062044]/78 to-[#062044]/18" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061a34]/45 via-transparent to-transparent" />
            </div>

            <div className="relative z-10 h-full px-6 sm:px-8 lg:px-10 py-5 sm:py-6">
              <div className="max-w-[650px]">
                <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] text-white/95 backdrop-blur-sm">
                  Marine Knowledge Sharing Platform
                </div>

                <h1 className="mt-2.5 text-[30px] sm:text-[36px] lg:text-[40px] font-extrabold leading-[0.98] tracking-tight text-white">
                  Real Marine Problems.
                  <span className="block text-sky-400">Practical Solutions.</span>
                </h1>

                <p className="mt-2 max-w-[650px] text-[12px] sm:text-[13px] lg:text-[14px] leading-snug text-white/90">
                  Step-by-step electrical diagnostic guides for marine ETOs, engineers, and electricians. Even if a problem seems basic or familiar, what is simple to one can be a vital lifeline to a beginner or someone facing it for the first time onboard. Let’s share knowledge, help each other out, and grow together.
                </p>

                <form
                  ref={heroSearchRef}
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleHeroSearch();
                  }}
                  className="relative mt-3 max-w-[570px]"
                >
                  <div className="flex items-center rounded-lg bg-white p-1 shadow-lg">
                    <Search className="ml-2.5 h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={heroSearch}
                      onChange={(event) => setHeroSearch(event.target.value)}
                      onFocus={() => heroSearch.trim() && setHeroSearchOpen(true)}
                      placeholder="Search equipment, problem or guide..."
                      className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Search
                    </button>
                  </div>

                  {heroSearchOpen && heroSearch.trim() && (
                    <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
                      {heroSearchLoading && (
                        <div className="px-4 py-3 text-xs text-slate-500">
                          Searching...
                        </div>
                      )}

                      {!heroSearchLoading &&
                        heroResults.equipment.length === 0 &&
                        heroResults.guides.length === 0 && (
                          <div className="px-4 py-3 text-xs text-slate-500">
                            No matches for “{heroSearch}”.
                          </div>
                        )}

                      {!heroSearchLoading && heroResults.equipment.length > 0 && (
                        <div className="p-2">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Equipment
                          </div>
                          {heroResults.equipment.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                navigate({ name: "equipment", id: item.id });
                                closeHeroSearch();
                              }}
                              className="flex w-full items-center rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                            >
                              <Wrench className="mr-2 h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {!heroSearchLoading && heroResults.guides.length > 0 && (
                        <div className="border-t border-slate-100 p-2">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Guides
                          </div>
                          {heroResults.guides.slice(0, 8).map((guide) => (
                            <button
                              key={guide.id}
                              type="button"
                              onClick={() => {
                                navigate({ name: "guide", id: guide.id });
                                closeHeroSearch();
                              }}
                              className="flex w-full items-center rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                            >
                              <BookOpen className="mr-2 h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">{guide.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </form>

              </div>
            </div>
          </div>

          {/* HERO STATS / ACTIONS — kept outside the image so they are never clipped */}
          <div className="relative z-30 mt-3 grid grid-cols-2 sm:grid-cols-5 gap-1.5 w-full">
            <HeroStat icon={<BookOpen />} value={departments.length} label="DEPARTMENTS" />
            <HeroStat icon={<Wrench />} value={equipment.length} label="EQUIPMENT" />
            <HeroStat
              icon={<BookOpen />}
              value={totalGuides}
              label="TOTAL GUIDES"
              onClick={() => navigate({ name: "all-guides" })}
            />

            {!isApp && (
              <a
                href="https://marinefixapp.pages.dev/api/upload?key=MarineFix.apk"
                download="MarineFix.apk"
                className="rounded-md bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1.5 text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="h-5 w-5" />
                <span>
                  <span className="block text-xs font-extrabold">Download App</span>
                  <span className="block text-[9px] text-white/90">Offline access</span>
                </span>
              </a>
            )}

            <button
              type="button"
              onClick={() => navigate({ name: "add-guide" })}
              className="group rounded-md border border-marine-accent/35 bg-marine-card hover:bg-marine-hover hover:border-marine-accent px-2.5 py-1.5 text-left text-marine-text flex items-center gap-1.5 transition cursor-pointer shadow-sm hover:shadow-md"
            >
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span>
                <span className="block text-xs font-extrabold">Post a Guide</span>
                <span className="block text-[9px] text-slate-500">Share your knowledge</span>
              </span>
            </button>
          </div>
        </section>

        {/* =========================================================
            WHY MARINEFIX
        ========================================================== */}
        <section className="px-3 sm:px-4 lg:px-5 pt-4">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Why <span className="text-blue-600">MarineFix?</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Practical knowledge, wherever you need it.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("why-marinefix")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex shrink-0 items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                View All Features
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div
              id="why-marinefix"
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5"
            >
              <FeatureCard
                icon={<Wrench />}
                title="Real-World Troubleshooting"
                text="Actual ship equipment problems with step-by-step practical solutions."
                iconClass="bg-blue-50 text-blue-600"
              />
              <FeatureCard
                icon={<WifiOff />}
                title="Read Offline"
                text="Save guides and read without internet. Useful even onboard."
                iconClass="bg-emerald-50 text-emerald-600"
              />
              <FeatureCard
                icon={<FileDown />}
                title="Download as PDF"
                text="Download any guide as PDF and keep it for future reference."
                iconClass="bg-red-50 text-red-600"
              />
              <FeatureCard
                icon={<Users />}
                title="Free for Everyone"
                text="MarineFix is free to access and built for the marine community."
                iconClass="bg-violet-50 text-violet-600"
              />
              <FeatureCard
                icon={<GraduationCap />}
                title="Learn From Real Experience"
                text="Working professionals share their actual troubleshooting knowledge."
                iconClass="bg-amber-50 text-amber-600"
              />
              <FeatureCard
                icon={<Smartphone />}
                title="Web + Mobile App"
                text="Use MarineFix from your browser or Android app. Anytime, anywhere."
                iconClass="bg-cyan-50 text-cyan-600"
              />
            </div>
          </div>
        </section>

        {/* =========================================================
            POPULAR EQUIPMENT
        ========================================================== */}
        <section className="px-3 sm:px-4 lg:px-5 pt-4">
          <div className="max-w-[1600px] mx-auto">
            <SectionHeader
              title="Popular Equipment"
              subtitle="Explore marine departments and equipment guides."
              action="View All Categories"
              onAction={() => navigate({ name: "categories" })}
            />

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-2">
              {popularCategoryCards.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => openCategory(item.slug)}
                  className="group overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition cursor-pointer"
                >
                  <div className="h-16 sm:h-[72px] lg:h-[82px] bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.label}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="px-1.5 py-2 text-[11px] sm:text-xs font-bold leading-tight text-slate-800 group-hover:text-blue-600">
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            RECENT GUIDES + CONTRIBUTE
        ========================================================== */}
        <section className="px-3 sm:px-4 lg:px-5 pt-4">
          <div className="max-w-[1600px] mx-auto">
            <SectionHeader
              title="Recent Guides"
              subtitle="Latest troubleshooting guides from the community."
              action="View All Guides"
              onAction={() => navigate({ name: "all-guides" })}
            />

            {recentGuides.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {recentGuides.map((guide, index) => {
                  const image = guide.image_url
                    ? resolveRemoteUrl(guide.image_url)
                    : recentGuideFallbackImages[index % recentGuideFallbackImages.length];

                  const equipmentName =
                    equipment.find(
                      (e) => e.id === guide.equipment_id
                    )?.name || "Marine Equipment";

                  return (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() =>
                        navigate({
                          name: "guide",
                          id: guide.id,
                        })
                      }
                      className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left hover:border-blue-300 hover:shadow-md transition cursor-pointer"
                    >
                      <div className="h-28 overflow-hidden bg-slate-100">
                        <img
                          src={image}
                          alt={guide.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="p-2.5">
                        <h3 className="font-bold text-xs leading-tight text-slate-900 line-clamp-2 group-hover:text-blue-600">
                          {guide.title}
                        </h3>

                        <span className="inline-flex mt-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600">
                          {equipmentName}
                        </span>

                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Troubleshooting Guide
                          </span>
                          <Bookmark className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}

                <ContributeCard />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5">
                <div className="lg:col-span-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Troubleshooting guides will appear here as they are published.
                </div>
                <ContributeCard />
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            FROM PROBLEM TO SOLUTION
        ========================================================== */}
        <section className="px-3 sm:px-4 lg:px-5 pt-4">
          <div className="max-w-[1600px] mx-auto">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    From Problem to{" "}
                    <span className="text-blue-600">Solution</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Find the problem → Follow the steps → Understand the cause → Fix it safely.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate({ name: "all-guides" })}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
                >
                  Explore Guides
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                <StepCard
                  number="1"
                  title="Find Your Equipment"
                  text="Choose the equipment and find relevant troubleshooting guides."
                  icon={<Search />}
                />
                <StepCard
                  number="2"
                  title="Identify the Problem"
                  text="Check symptoms, alarms and fault conditions."
                  icon={<BookOpen />}
                />
                <StepCard
                  number="3"
                  title="Follow the Steps"
                  text="Work through the troubleshooting procedure step by step."
                  icon={<Wrench />}
                />
                <StepCard
                  number="4"
                  title="Learn & Save"
                  text="Save the guide for offline use or download it as PDF."
                  icon={<Bookmark />}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function HeroStat({
  icon,
  value,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center gap-1.5">
      <div className="text-blue-600">{icon}</div>
      <div>
        <div className="text-lg sm:text-xl font-extrabold leading-none text-slate-900">{value}</div>
        <div className="mt-0.5 text-[7px] sm:text-[8px] font-bold tracking-wide text-slate-500">{label}</div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex items-center justify-between gap-2 rounded-md border border-marine-accent/35 bg-marine-card px-2 py-1.5 text-left text-marine-text shadow-sm hover:border-marine-accent hover:bg-marine-hover hover:shadow-md transition cursor-pointer"
        title="View all uploaded guides"
        aria-label="View all uploaded guides"
      >
        {content}
        <ChevronRight className="h-4 w-4 shrink-0 text-marine-accent transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-900 shadow-sm">
      {content}
    </div>
  );
}


function ContributeCard() {
  return (
    <button
      type="button"
      onClick={() => navigate({ name: "add-guide" })}
      className="group relative min-h-[188px] w-full overflow-hidden rounded-lg border border-blue-100 bg-blue-50 text-left transition hover:bg-blue-100 cursor-pointer"
    >
      {/* TEXT */}
      <div className="relative z-10 h-full w-full p-4">
        <h3 className="text-[17px] font-extrabold leading-[1.08] text-slate-900">
          Contribute Your
          <span className="block text-blue-600">
            Knowledge
          </span>
        </h3>

        <p className="mt-2 max-w-[145px] text-[11px] leading-[1.45] text-slate-600">
          Share your experience and help the marine community.
        </p>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white">
          <BookOpen className="h-3.5 w-3.5" />
          Post a Guide
        </span>
      </div>

    </button>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  iconClass,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  iconClass: string;
}) {
  return (
    <div className="min-h-[112px] rounded-lg border border-slate-200 bg-white px-3 py-3 hover:shadow-sm transition">
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconClass}`}
      >
        <div className="h-5 w-5">{icon}</div>
      </div>

      <h3 className="mt-2 text-[11px] sm:text-xs font-bold leading-tight text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-[10px] sm:text-[11px] leading-snug text-slate-500">
        {text}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4 mb-2 min-w-0">
      <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          {title}
        </h2>

        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
        >
          {action}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
  icon,
}: {
  number: string;
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-start gap-3.5">
        <div className="shrink-0 h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
          {number}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 text-blue-600">
            <div className="shrink-0 h-5 w-5 flex items-center justify-center mr-0.5">
              {icon}
            </div>
            <h3 className="text-xs font-bold leading-tight text-slate-900">
              {title}
            </h3>
          </div>

          <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { ArrowLeft, ChevronRight, FolderTree } from "lucide-react";
import type { Category, Equipment, Guide } from "../types";
import { navigate } from "../lib/router";

const categoryImages: Record<string, string> = {
  "bridge-navigation": "/equipment/bridge-navigation-systems.png",
  "deck-machinery": "/equipment/deck-machinery.png",
  "ballast-systems": "/equipment/ballast-systems.png",
  "main-engine": "/equipment/main-engine.png",
  "auxiliary-engine-generator": "/equipment/generator.png",
  purifiers: "/equipment/purifier.png",
  boilers: "/equipment/boiler.png",
  compressors: "/equipment/compressor.png",
  pumps: "/equipment/pump.png",
  "auxiliary-systems": "/equipment/auxiliary-systems.png",
  "power-generation": "/equipment/electrical.png",
  "instrumentation-control": "/equipment/instrumentation-control.png",
  "safety-fire-protection": "/equipment/safety-fire-protection.png",
  "accommodation-electricals": "/equipment/hvac.png",
  "reefer-systems": "/equipment/reefer-systems.png",
  "others-general-machinery": "/equipment/others-general-machinery.png",
};

type Props = {
  categories: Category[];
  equipment: Equipment[];
  guides: Guide[];
};

export function CategoriesView({ categories, equipment, guides }: Props) {
  const rootCategories = useMemo(
    () =>
      categories
        .filter((category) => category.parent_id === null)
        .sort((a, b) => a.order_index - b.order_index),
    [categories]
  );

  const guideCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    guides.forEach((guide) => {
      if (guide.equipment_id) {
        counts[guide.equipment_id] = (counts[guide.equipment_id] || 0) + 1;
      }
    });
    return counts;
  }, [guides]);

  const categoryGuideCount = (categoryId: string) => {
    const equipmentIds = equipment
      .filter((item) => item.category_id === categoryId)
      .map((item) => item.id);
    return equipmentIds.reduce((sum, id) => sum + (guideCounts[id] || 0), 0);
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 lg:px-8 lg:py-8 animate-fade-in">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate({ name: "home" })}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
            <FolderTree className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              All Marine Categories
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse marine departments, systems and equipment from one place.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rootCategories.map((category) => {
            const image = categoryImages[category.slug] || "/equipment/main-engine.png";
            const count = categoryGuideCount(category.id);

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => navigate({ name: "category", id: category.id })}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md cursor-pointer"
              >
                <div className="h-36 overflow-hidden bg-slate-100">
                  <img
                    src={image}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold leading-snug text-slate-900 group-hover:text-blue-600">
                        {category.name}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {category.department}
                        {count > 0 ? ` · ${count} guide${count === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  ChevronRight,
  ArrowLeft,
  Plus,
  FileText,
  AlertCircle,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  X,
  Clock,
} from "lucide-react";
import type { Category, Equipment, Guide } from "../types";
import {
  fetchEquipmentById,
  fetchGuidesByEquipment,
} from "../lib/queries";
import { navigate } from "../lib/router";

type Props = {
  equipmentId: string;
  categories: Category[];
  onNavigate?: () => void;
  submitted?: boolean;
};

export function EquipmentView({
  equipmentId,
  categories,
  onNavigate,
  submitted,
}: Props) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmittedNotice, setShowSubmittedNotice] = useState(
    submitted || false
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("submitted") === "true" || submitted) {
      setShowSubmittedNotice(true);
    }
  }, [submitted]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // fetchGuidesByEquipment only returns 'approved' guides
    Promise.all([
      fetchEquipmentById(equipmentId),
      fetchGuidesByEquipment(equipmentId),
    ])
      .then(([eq, gs]) => {
        if (!active) return;
        setEquipment(eq);
        setGuides(gs);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [equipmentId]);

  const category = categories.find((c) => c.id === equipment?.category_id);
  const parent = categories.find((c) => c.id === category?.parent_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-marine-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading equipment...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <AlertCircle className="h-10 w-10 text-marine-error mx-auto mb-3" />
        <p className="text-marine-error">{error}</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="p-10 text-center text-marine-muted">
        Equipment not found.
      </div>
    );
  }

  const breadcrumb =
    parent && category
      ? [parent.name, category.name]
      : category
      ? [category.name]
      : [];

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-marine-muted px-6 py-3 lg:px-10 border-b border-marine-border flex-wrap">
        <button
          onClick={() => navigate({ name: "home" })}
          className="hover:text-marine-accent transition"
        >
          Home
        </button>
        {breadcrumb.map((b) => (
          <span key={b} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{b}</span>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-marine-text">{equipment.name}</span>
        </span>
      </div>

      {/* Submission Confirmation Banner */}
      {showSubmittedNotice && (
        <div className="mx-6 mt-6 lg:mx-10 p-4 rounded-xl bg-marine-accent/10 border border-marine-accent/30 text-marine-text flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-marine-accent shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-marine-accent">
              Submission Received
            </p>
            <p className="text-marine-text mt-1">
              Thank you! Your troubleshooting guide has been submitted for review
              and will be published once approved by the Admin.
            </p>
          </div>
          <button
            onClick={() => setShowSubmittedNotice(false)}
            className="text-marine-muted hover:text-marine-text transition p-1"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Equipment header */}
      <div className="px-6 py-8 lg:px-10 border-b border-marine-border">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-sm text-marine-muted hover:text-marine-accent transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {equipment.image_url && (
            <div className="md:w-56 shrink-0 rounded-xl overflow-hidden border border-marine-border">
              <img
                src={equipment.image_url}
                alt={equipment.name}
                loading="lazy"
                decoding="async"
                className="w-full h-40 md:h-32 object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-marine-text">
              {equipment.name}
            </h1>
            {equipment.description && (
              <p className="text-marine-muted mt-2 max-w-2xl">
                {equipment.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-marine-muted">
                {guides.length} published troubleshooting{" "}
                {guides.length === 1 ? "guide" : "guides"}
              </span>
              <button
                onClick={() => {
                  navigate({ name: "add-guide", equipmentId: equipment.id });
                  onNavigate?.();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-marine-accent text-marine-base font-medium text-sm hover:bg-marine-accentHover transition shadow-lg shadow-marine-accent/20"
              >
                <Plus className="h-4 w-4" /> Add New Guide
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guides list */}
      <div className="px-6 py-8 lg:px-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-marine-text">
            Troubleshooting Guides
          </h2>
          <span className="text-xs text-marine-muted flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            New posts are reviewed before publication
          </span>
        </div>

        {guides.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-marine-border">
            <FileText className="h-10 w-10 text-marine-muted mx-auto mb-3" />
            <p className="text-marine-muted mb-4">
              No approved troubleshooting guides posted for this equipment yet.
            </p>
            <button
              onClick={() => {
                navigate({ name: "add-guide", equipmentId: equipment.id });
                onNavigate?.();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-marine-accent text-marine-base font-medium text-sm hover:bg-marine-accentHover transition"
            >
              <Plus className="h-4 w-4" /> Post the first guide
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {guides.map((g) => (
              <GuideArticleCard key={g.id} guide={g} />
            ))}
            {/* Add-new slot card */}
            <button
              onClick={() => {
                navigate({ name: "add-guide", equipmentId: equipment.id });
                onNavigate?.();
              }}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-marine-border hover:border-marine-accent/60 hover:bg-marine-hover/30 transition p-8 min-h-[160px]"
            >
              <Plus className="h-8 w-8 text-marine-muted group-hover:text-marine-accent transition" />
              <span className="text-sm font-medium text-marine-muted group-hover:text-marine-text transition">
                Add another troubleshooting guide
              </span>
              <span className="text-xs text-marine-muted">
                Requires admin review before publication
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GuideArticleCard({ guide }: { guide: Guide }) {
  return (
    <button
      onClick={() => navigate({ name: "guide", id: guide.id })}
      className="group text-left rounded-xl border border-marine-border bg-marine-card p-5 hover:border-marine-accent/60 hover:bg-marine-hover/40 transition-all hover:shadow-lg hover:shadow-marine-accent/10"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-marine-text group-hover:text-marine-accent transition leading-snug">
          {guide.title}
        </h3>
        <ChevronRight className="h-5 w-5 text-marine-muted group-hover:text-marine-accent group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
      </div>
      {guide.symptom && (
        <p className="text-sm text-marine-muted mt-2 line-clamp-3">
          {guide.symptom}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {guide.safety_ppe && guide.safety_ppe.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-marine-warn/10 text-marine-warn border border-marine-warn/30">
            <ShieldAlert className="h-3 w-3" />
            {guide.safety_ppe.length} PPE items
          </span>
        )}
        {guide.tools_required && guide.tools_required.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-marine-accent/10 text-marine-accent border border-marine-accent/30">
            {guide.tools_required.length} tools
          </span>
        )}
      </div>
    </button>
  );
}
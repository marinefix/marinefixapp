import { useEffect, useState } from "react";
import {
  Check,
  X,
  ShieldAlert,
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  AlertTriangle,
  Wrench,
  FileText,
  Info,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { getPendingGuides, approveGuide, fetchGuideById } from "../lib/queries";
import type { Equipment, Guide, Category } from "../types";
import { navigate } from "../lib/router";
import { Lightbox } from "../components/Lightbox";

type Props = {
  categories?: Category[];
  equipment?: Equipment[];
};

export function AdminPendingView(_props: Props = {}) {
  const [pendingGuides, setPendingGuides] = useState<
    (Guide & { equipment?: Equipment })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    try {
      setLoading(true);
      const data = await getPendingGuides();
      setPendingGuides(data);
    } catch (err) {
      console.error("Error loading pending guides:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenReview(guideId: string) {
    try {
      setModalLoading(true);
      const fullData = await fetchGuideById(guideId);
      setSelectedGuide(fullData);
    } catch (err) {
      console.error("Error fetching full guide details:", err);
      const basic = pendingGuides.find((g) => g.id === guideId);
      setSelectedGuide(basic || null);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveGuide(id);
      setPendingGuides((prev) => prev.filter((g) => g.id !== id));
      if (selectedGuide?.id === id) setSelectedGuide(null);
      alert("Guide Approved & Published!");
    } catch (err) {
      alert("Error approving guide");
    }
  }

  // Reject panna permanent-a delete aagidum (Reload pannalum thirumba varaadhu)
  async function handleReject(id: string) {
    if (!confirm("Are you sure you want to permanently reject & delete this guide?")) return;
    try {
      const res = await fetch(`/api/guides?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPendingGuides((prev) => prev.filter((g) => g.id !== id));
        if (selectedGuide?.id === id) setSelectedGuide(null);
        alert("Guide Rejected!");
      } else {
        alert("Failed to reject guide.");
      }
    } catch (err) {
      alert("Error rejecting guide");
    }
  }

  const parseAttachment = (val: any) => {
    let url = "";
    let isPdf = false;
    let name = "";

    if (typeof val === "string" && val.trim()) {
      url = val.trim();
      isPdf = url.toLowerCase().includes(".pdf") || url.startsWith("data:application/pdf");
    } else if (val && typeof val === "object") {
      url = val.url || val.image_url || val.image || val.publicUrl || "";
      isPdf = Boolean(val.isPdf) || url.toLowerCase().includes(".pdf") || url.startsWith("data:application/pdf");
      name = val.name || val.caption || "";
    }

    return { url, isPdf, name };
  };

  const stepsList = selectedGuide?.steps || selectedGuide?.guide_steps || [];

  // 1. Get attachments belonging ONLY to this specific step
  const getStepAttachments = (step: any) => {
    let stepImgs = step.images || step.step_images || step.uploadItems || [];
    if (typeof stepImgs === "string") {
      try {
        stepImgs = JSON.parse(stepImgs);
      } catch {
        stepImgs = [];
      }
    }
    if (!Array.isArray(stepImgs)) return [];
    return stepImgs.map(parseAttachment).filter((i: any) => i.url);
  };

  // 2. Get attachments belonging ONLY to overall guide section
  const rawGuideImages = selectedGuide?.images || [];
  const overallAttachments = (Array.isArray(rawGuideImages) ? rawGuideImages : [])
    .map(parseAttachment)
    .filter((item, idx, self) => item.url && self.findIndex((t) => t.url === item.url) === idx);

  // Collect lightbox preview images
  const allReviewImages: { url: string; name: string }[] = [];
  if (stepsList.length > 0) {
    stepsList.forEach((step: any, idx: number) => {
      const sNum = step.step_number || idx + 1;
      const sAtts = getStepAttachments(step);
      sAtts.forEach((att: any) => {
        if (!att.isPdf && att.url && !allReviewImages.some((x) => x.url === att.url)) {
          allReviewImages.push({ url: att.url, name: att.name || `Step ${sNum} Schematic` });
        }
      });
    });
  }
  overallAttachments.forEach((att) => {
    if (!att.isPdf && att.url && !allReviewImages.some((x) => x.url === att.url)) {
      allReviewImages.push({ url: att.url, name: att.name || "Overall Schematic" });
    }
  });

  const reviewLightboxUrls = allReviewImages.map((i) => i.url);
  const reviewLightboxCaptions = allReviewImages.map((i) => i.name);

  function openLightbox(url: string) {
    const idx = reviewLightboxUrls.indexOf(url);
    if (idx !== -1) setLightboxIndex(idx);
    else {
      reviewLightboxUrls.push(url);
      reviewLightboxCaptions.push("Schematic Drawing");
      setLightboxIndex(reviewLightboxUrls.length - 1);
    }
  }

  const getCleanTitle = (guide: Guide) => {
    if (!guide.title || guide.title.toLowerCase() === "null" || guide.title.trim() === "") {
      return "Untitled Troubleshooting Guide";
    }
    return guide.title;
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6 animate-fade-in relative">
      <button
        type="button"
        onClick={() => navigate({ name: "admin-panel" })}
        className="inline-flex items-center gap-2 text-xs font-medium text-marine-muted hover:text-marine-accent transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      <div className="flex items-center justify-between border-b border-marine-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-marine-text flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
            <span>Admin Review Panel</span>
          </h1>
          <p className="text-xs text-marine-muted mt-1">
            Review user-submitted troubleshooting guides before publishing to public.
          </p>
        </div>
        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full font-semibold">
          {pendingGuides.length} Pending
        </span>
      </div>

      {loading ? (
        <div className="p-10 text-center text-marine-muted animate-pulse">
          Loading pending submissions...
        </div>
      ) : pendingGuides.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-marine-card border border-marine-border text-marine-muted">
          🎉 No pending guides for review! All clear!
        </div>
      ) : (
        <div className="space-y-4">
          {pendingGuides.map((guide) => (
            <div
              key={guide.id}
              className="p-5 rounded-2xl bg-marine-card border border-marine-border hover:border-marine-accent/30 transition space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div
                  className="cursor-pointer space-y-1 flex-1"
                  onClick={() => handleOpenReview(guide.id)}
                >
                  <span className="text-xs font-medium text-marine-accent bg-marine-accent/10 px-2.5 py-1 rounded-md">
                    {guide.equipment?.name || "General Equipment"}
                  </span>
                  <h3 className="text-lg font-bold text-marine-text hover:text-marine-accent transition mt-2">
                    {getCleanTitle(guide)}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenReview(guide.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-marine-hover text-marine-text border border-marine-border hover:bg-marine-border transition text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="h-4 w-4 text-marine-accent" /> Review / View
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ name: "admin-edit-guide", id: guide.id })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition text-xs font-semibold cursor-pointer"
                  >
                    <FileText className="h-4 w-4" /> Edit Guide
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(guide.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition text-xs font-semibold cursor-pointer"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(guide.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition text-xs font-semibold cursor-pointer"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>

              {guide.symptom && (
                <div
                  className="text-xs text-marine-text/80 bg-marine-dark/50 p-3 rounded-lg border border-marine-border/40 cursor-pointer"
                  onClick={() => handleOpenReview(guide.id)}
                >
                  <strong>Symptom:</strong> {guide.symptom}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-marine-card border border-marine-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-fade-in text-marine-text">
            {modalLoading ? (
              <div className="p-10 text-center text-marine-muted animate-pulse">
                Loading guide details...
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start border-b border-marine-border pb-4">
                  <div>
                    <span className="text-xs font-semibold text-marine-accent bg-marine-accent/10 px-2.5 py-1 rounded">
                      {selectedGuide.equipment?.name || "General Equipment"}
                    </span>
                    <h2 className="text-xl font-bold mt-2">{getCleanTitle(selectedGuide)}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedGuide(null)}
                    className="p-1 rounded-lg text-marine-muted hover:text-marine-text hover:bg-marine-hover cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Author Contact Section */}
                <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400 uppercase tracking-wider">
                      Admin Contact Info:
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {selectedGuide.author_email ? (
                      <a
                        href={`mailto:${selectedGuide.author_email}`}
                        className="flex items-center gap-1.5 text-sky-300 hover:underline font-semibold"
                      >
                        <Mail className="h-3.5 w-3.5 text-sky-400" />
                        {selectedGuide.author_email}
                      </a>
                    ) : (
                      <span className="text-marine-muted italic">No email provided</span>
                    )}

                    {selectedGuide.author_phone && (
                      <a
                        href={`tel:${selectedGuide.author_phone}`}
                        className="flex items-center gap-1.5 text-emerald-400 hover:underline font-semibold"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        {selectedGuide.author_phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Symptom */}
                {selectedGuide.symptom && (
                  <div className="bg-marine-dark/60 p-4 rounded-xl border border-marine-border/60 space-y-1">
                    <h4 className="text-xs font-semibold text-marine-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-marine-accent" /> Symptom Description
                    </h4>
                    <p className="text-sm">{selectedGuide.symptom}</p>
                  </div>
                )}

                {/* Introduction */}
                {selectedGuide.introduction && (
                  <div className="bg-marine-dark/40 p-4 rounded-xl border border-marine-border/60 space-y-1">
                    <h4 className="text-xs font-semibold text-marine-muted uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-sky-400" /> Introduction
                    </h4>
                    <p className="text-xs text-marine-text/90 leading-relaxed">
                      {selectedGuide.introduction}
                    </p>
                  </div>
                )}

                {/* Safety & PPE */}
                {selectedGuide.safety_ppe && selectedGuide.safety_ppe.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Safety & PPE Required
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedGuide.safety_ppe.map((item: string, idx: number) => (
                        <span
                          key={idx}
                          className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md text-xs border border-amber-500/30"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools Required */}
                {selectedGuide.tools_required && selectedGuide.tools_required.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Wrench className="h-4 w-4" /> Tools Required
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedGuide.tools_required.map((tool: string, idx: number) => (
                        <span
                          key={idx}
                          className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md text-xs border border-blue-500/30"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Troubleshooting Steps List */}
                {stepsList.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-marine-muted uppercase tracking-wider">
                      Troubleshooting Steps ({stepsList.length})
                    </h4>
                    <div className="space-y-4">
                      {stepsList.map((step: any, idx: number) => {
                        const stepIndexNum = step.step_number || idx + 1;
                        const stepAttachments = getStepAttachments(step);
                        const stepTitle = step.title && step.title.trim() ? step.title.trim() : `Step ${stepIndexNum} Procedure`;

                        return (
                          <div
                            key={idx}
                            className="p-4 bg-marine-dark/90 rounded-2xl border border-marine-border/80 space-y-3 shadow-md"
                          >
                            <div>
                              <span className="px-3 py-1 rounded-lg bg-marine-accent/20 text-marine-accent text-xs font-bold inline-block">
                                Step {stepIndexNum}
                              </span>
                            </div>

                            <div className="p-3.5 bg-marine-card/60 rounded-xl border border-marine-border/60 text-xs space-y-1">
                              <span className="text-[10px] font-bold text-marine-muted uppercase tracking-wider block">
                                Step Title:
                              </span>
                              <div className="text-sm font-semibold text-marine-text">
                                {stepTitle}
                              </div>
                            </div>

                            {step.instruction && (
                              <div className="p-3.5 bg-marine-card/60 rounded-xl border border-marine-border/60 text-xs text-marine-text/90 leading-relaxed space-y-1">
                                <span className="text-[10px] font-bold text-marine-muted uppercase tracking-wider block">
                                  Action / Instruction:
                                </span>
                                <p className="text-sm text-marine-text">{step.instruction}</p>
                              </div>
                            )}

                            {step.warning && (
                              <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <strong className="text-amber-400 font-bold block text-[10px] uppercase tracking-wider">
                                    Safety Warning:
                                  </strong>
                                  <p className="text-xs text-amber-200">{step.warning}</p>
                                </div>
                              </div>
                            )}

                            {/* Dedicated Step Attachments */}
                            {stepAttachments.length > 0 && (
                              <div className="pt-2 space-y-2 border-t border-marine-border/40">
                                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block flex items-center gap-1">
                                  <ImageIcon className="h-3.5 w-3.5" /> Step {stepIndexNum} Dedicated
                                  Attachment ({stepAttachments.length}):
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {stepAttachments.map((parsed: any, imgIdx: number) => (
                                    <div
                                      key={imgIdx}
                                      className="p-3 bg-marine-card/80 rounded-xl border border-marine-border/80 flex items-center justify-between text-xs"
                                    >
                                      {parsed.isPdf ? (
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                                            <span
                                              className="text-xs font-semibold text-marine-text truncate max-w-[140px]"
                                              title={parsed.name}
                                            >
                                              {parsed.name || `Step ${stepIndexNum} PDF Schematic`}
                                            </span>
                                          </div>
                                          <a
                                            href={parsed.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-[11px] font-bold transition shrink-0"
                                          >
                                            <ExternalLink className="h-3 w-3" /> View PDF
                                          </a>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openLightbox(parsed.url)}
                                          className="group relative w-full flex items-center justify-center p-1 bg-black/80 rounded-lg max-h-48 border border-marine-border hover:border-marine-accent/60 transition cursor-pointer"
                                          title="Click to Zoom Fullscreen"
                                        >
                                          <img
                                            src={parsed.url}
                                            alt={`Step ${stepIndexNum} attachment`}
                                            className="max-h-44 object-contain rounded group-hover:scale-105 transition-transform duration-300"
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-semibold">
                                            <ImageIcon className="h-4 w-4 text-marine-accent" />
                                            <span>Click to Zoom</span>
                                          </div>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Overall Attachments */}
                {overallAttachments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-marine-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-marine-accent" /> Overall Guide Attachments
                      &amp; Schematics ({overallAttachments.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {overallAttachments.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl overflow-hidden border border-marine-border bg-marine-dark min-h-[140px] flex items-center justify-center p-3 relative"
                        >
                          {item.isPdf ? (
                            <div className="flex flex-col items-center justify-center text-center space-y-2 p-3 w-full">
                              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <FileText className="h-7 w-7" />
                              </div>
                              <div>
                                <span
                                  className="text-xs font-bold text-marine-text block truncate max-w-[200px]"
                                  title={item.name}
                                >
                                  {item.name || "Overall PDF Schematic Drawing"}
                                </span>
                                <span className="text-[10px] text-marine-muted">
                                  Electrical / Technical Document
                                </span>
                              </div>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-xs font-semibold transition mt-1"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Open / View PDF
                              </a>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openLightbox(item.url)}
                              className="group relative w-full aspect-video bg-black/80 rounded-lg overflow-hidden border border-marine-border hover:border-marine-accent/60 transition cursor-pointer flex items-center justify-center"
                              title="Click to Zoom Fullscreen"
                            >
                              <img
                                src={item.url}
                                alt={`Attachment ${idx + 1}`}
                                className="max-h-56 object-contain w-full rounded-lg group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-semibold">
                                <ImageIcon className="h-4 w-4 text-marine-accent" />
                                <span>Click to Zoom</span>
                              </div>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-marine-border">
                  <button
                    type="button"
                    onClick={() => handleReject(selectedGuide.id)}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="h-4 w-4" /> Reject Guide
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedGuide.id)}
                    className="px-5 py-2 bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Check className="h-4 w-4" /> Approve &amp; Publish
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {lightboxIndex !== null && reviewLightboxUrls.length > 0 && (
        <Lightbox
          urls={reviewLightboxUrls}
          captions={reviewLightboxCaptions}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex(
              (i) => (i === null ? 0 : (i - 1 + reviewLightboxUrls.length) % reviewLightboxUrls.length)
            )
          }
          onNext={() =>
            setLightboxIndex(
              (i) => (i === null ? 0 : (i + 1) % reviewLightboxUrls.length)
            )
          }
        />
      )}
    </div>
  );
}
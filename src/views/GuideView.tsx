import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ShieldAlert,
  Wrench,
  AlertTriangle,
  Loader2,
  AlertCircle,
  ImageIcon,
  Mail,
  FileText,
  ExternalLink,
  Trash2,
  Printer,
} from "lucide-react";
import type { GuideWithRelations } from "../types";
import { fetchGuideById, addBookmark, removeBookmark } from "../lib/queries";
import {
  saveGuideOffline,
  removeGuideOffline,
  getOfflineGuideById,
} from "../lib/offlineStorage";
import { navigate } from "../lib/router";
import { Lightbox } from "../components/Lightbox";
import { checkIsAdmin } from "../lib/adminAuth";
import * as pdfjsLib from "pdfjs-dist";
import {
  getOfflineAttachmentUrl,
  resolveRemoteUrl,
} from "../lib/offlineStorage";

type Props = {
  guideId: string;
  isBookmarked: boolean;
  onBookmarkChange: (id: string, saved: boolean) => void;
};

export function GuideView({
  guideId,
  isBookmarked,
  onBookmarkChange,
}: Props) {
  const [guide, setGuide] = useState<GuideWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [deletingGuide, setDeletingGuide] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(checkIsAdmin());
  const [resolvedAttachmentUrls, setResolvedAttachmentUrls] = useState<
    Record<string, string>
  >({});
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfViewerName, setPdfViewerName] = useState("");
  const [pdfViewerLoading, setPdfViewerLoading] = useState(false);
  const [pdfViewerError, setPdfViewerError] = useState<string | null>(null);
  const [pendingPdf, setPendingPdf] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const pdfCanvasRef = useRef<HTMLDivElement | null>(null);
  const pdfObjectUrlsRef = useRef<string[]>([]);

  // ============================================================
  // GUIDE LOADING
  // LOCAL FIRST FOR SAVED GUIDES
  // ============================================================
  useEffect(() => {
    let active = true;

    setError(null);

    // Saved guide irundha local copy FIRST
    const cached = isBookmarked
      ? getOfflineGuideById(guideId)
      : null;

    if (cached) {
      // INSTANT DISPLAY
      setGuide(cached);
      setLoading(false);

      // Online irundha background refresh
      void fetchGuideById(guideId)
        .then((g) => {
          if (!active || !g) return;

          setGuide(g);

          // Updated server copy local-la refresh
          void saveGuideOffline(g);
        })
        .catch(() => {
          // Offline — local copy already loaded.
        });
    } else {
      // Normal online guide
      setLoading(true);

      fetchGuideById(guideId)
        .then((g) => {
          if (!active) return;

          if (g) {
            setGuide(g);

            if (isBookmarked) {
              void saveGuideOffline(g);
            }
          } else {
            setError("Guide not found.");
          }
        })
        .catch((e) => {
          if (!active) return;

          // Final local fallback
          const local = getOfflineGuideById(guideId);

          if (local) {
            setGuide(local);
          } else {
            setError(
              e instanceof Error
                ? e.message
                : "Failed to load guide."
            );
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }

    const handleSessionChange = () => {
      setIsAdmin(checkIsAdmin());
    };

    window.addEventListener(
      "admin_session_changed",
      handleSessionChange
    );

    return () => {
      active = false;

      window.removeEventListener(
        "admin_session_changed",
        handleSessionChange
      );
    };
  }, [guideId, isBookmarked]);

  // ============================================================
  // ATTACHMENT RESOLUTION
  // ============================================================
  useEffect(() => {
    let active = true;
    const createdObjectUrls: string[] = [];

    async function resolveAttachments() {
      if (!guide) {
        setResolvedAttachmentUrls({});
        return;
      }

      const urls: string[] = [];

      const addUrl = (value: any) => {
        if (typeof value === "string" && value.trim()) {
          urls.push(resolveRemoteUrl(value.trim()));
          return;
        }

        if (value && typeof value === "object") {
          const url =
            value.url ||
            value.image_url ||
            value.image ||
            value.publicUrl ||
            "";

          if (typeof url === "string" && url.trim()) {
            urls.push(resolveRemoteUrl(url.trim()));
          }
        }
      };

      if (Array.isArray(guide.images)) {
        guide.images.forEach(addUrl);
      }

      if (Array.isArray(guide.steps)) {
        guide.steps.forEach((step: any) => {
          let raw = step?.images || step?.step_images || [];

          if (typeof raw === "string") {
            try {
              raw = JSON.parse(raw);
            } catch {
              raw = [];
            }
          }

          if (Array.isArray(raw)) {
            raw.forEach(addUrl);
          }
        });
      }

      const resolved: Record<string, string> = {};

      await Promise.all(
        [...new Set(urls)].map(async (url) => {
          const displayUrl = await getOfflineAttachmentUrl(url);

          resolved[url] = displayUrl;

          if (displayUrl.startsWith("blob:")) {
            createdObjectUrls.push(displayUrl);
          }
        })
      );

      if (active) {
        setResolvedAttachmentUrls(resolved);
      }
    }

    void resolveAttachments();

    return () => {
      active = false;

      createdObjectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [guide]);

  // ============================================================
  // PDF.JS WORKER
  // ============================================================
  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }, []);

  // ============================================================
  // PDF VIEWER
  // ============================================================
  useEffect(() => {
    if (
      !pdfViewerOpen ||
      !pendingPdf ||
      !pdfCanvasRef.current
    ) {
      return;
    }

    let active = true;

    async function renderPdf() {
      setPdfViewerLoading(true);
      setPdfViewerError(null);

      try {
        const displayUrl = await getOfflineAttachmentUrl(
          resolveRemoteUrl(pendingPdf!.url)
        );

        const response = await fetch(displayUrl, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(
            `Unable to load PDF (${response.status})`
          );
        }

        const data = await response.arrayBuffer();

        if (!active || !pdfCanvasRef.current) {
          return;
        }

        pdfCanvasRef.current.innerHTML = "";

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          if (!active || !pdfCanvasRef.current) {
            return;
          }

          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });

          const wrapper = document.createElement("div");

          wrapper.className =
            "mb-4 w-full flex justify-center bg-slate-900 rounded-lg overflow-hidden";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            continue;
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = "max-w-full h-auto";

          wrapper.appendChild(canvas);
          pdfCanvasRef.current.appendChild(wrapper);

          page.render({
            canvasContext: context,
            viewport,
            canvas,
          });
        }

        if (displayUrl.startsWith("blob:")) {
          pdfObjectUrlsRef.current.push(displayUrl);
        }
      } catch (err) {
        if (active) {
          console.error("PDF viewer error:", err);

          setPdfViewerError(
            err instanceof Error
              ? err.message
              : "Failed to open PDF."
          );
        }
      } finally {
        if (active) {
          setPdfViewerLoading(false);
        }
      }
    }

    void renderPdf();

    return () => {
      active = false;
    };
  }, [pdfViewerOpen, pendingPdf]);

  // ============================================================
  // PDF OPEN
  // ============================================================
  function openPdf(url: string, name: string) {
    setPdfViewerName(name || "PDF Document");
    setPdfViewerError(null);

    setPendingPdf({
      url: resolveRemoteUrl(url),
      name: name || "PDF Document",
    });

    setPdfViewerOpen(true);
  }

  // ============================================================
  // PDF CLOSE
  // ============================================================
  function closePdfViewer() {
    setPdfViewerOpen(false);
    setPendingPdf(null);
    setPdfViewerError(null);
    setPdfViewerLoading(false);

    if (pdfCanvasRef.current) {
      pdfCanvasRef.current.innerHTML = "";
    }

    pdfObjectUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    pdfObjectUrlsRef.current = [];
  }

  // ============================================================
  // BOOKMARK / OFFLINE SAVE
  // ============================================================
  async function toggleBookmark() {
    if (!guide) return;

    setSavingBookmark(true);
    setError(null);

    try {
      if (isBookmarked) {
        await removeBookmark(guide.id);
        await removeGuideOffline(guide.id);

        onBookmarkChange(guide.id, false);
      } else {
        await addBookmark(guide.id);

        // Save guide + attachments locally
        await saveGuideOffline(guide);

        onBookmarkChange(guide.id, true);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to update offline save."
      );
    } finally {
      setSavingBookmark(false);
    }
  }

  // ============================================================
  // ADMIN DELETE
  // ============================================================
  async function handleDeleteGuide() {
    if (
      !confirm(
        "Are you sure you want to permanently delete this approved guide from the database?"
      )
    ) {
      return;
    }

    try {
      setDeletingGuide(true);

      const res = await fetch(
        `/api/guides?id=${guideId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        await removeGuideOffline(guideId);

        alert("Guide deleted permanently!");

        window.location.href = "/";
      } else {
        alert(
          "Failed to delete guide from database."
        );
      }
    } catch {
      alert("Error deleting guide.");
    } finally {
      setDeletingGuide(false);
    }
  }

  // ============================================================
  // PRINT
  // ============================================================
  const handlePrintSOP = () => {
    if (
      (window as any).AndroidPrint &&
      typeof (window as any).AndroidPrint.printPage ===
        "function"
    ) {
      (window as any).AndroidPrint.printPage();
    } else {
      window.print();
    }
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-marine-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading guide...
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================
  if (error && !guide) {
    return (
      <div className="p-10 text-center">
        <AlertCircle className="h-10 w-10 text-marine-error mx-auto mb-3" />

        <p className="text-marine-error">
          {error}
        </p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="p-10 text-center text-marine-muted">
        Guide not found.
      </div>
    );
  }

  const equipment = guide.equipment;

  // ============================================================
  // ATTACHMENT PARSER
  // ============================================================
  const parseAttachment = (val: any) => {
    let url = "";
    let isPdf = false;
    let name = "";

    if (
      typeof val === "string" &&
      val.trim()
    ) {
      url = val.trim();

      isPdf =
        url.toLowerCase().includes(".pdf") ||
        url.startsWith("data:application/pdf");
    } else if (
      val &&
      typeof val === "object"
    ) {
      url =
        val.url ||
        val.image_url ||
        val.image ||
        val.publicUrl ||
        "";

      isPdf =
        Boolean(val.isPdf) ||
        url.toLowerCase().includes(".pdf") ||
        url.startsWith("data:application/pdf");

      name =
        val.name ||
        val.caption ||
        "";
    }

    url = resolveRemoteUrl(url);

    return {
      url,
      isPdf,
      name,
    };
  };

  // ============================================================
  // STEP ATTACHMENTS
  // ============================================================
  const getStepAttachments = (step: any) => {
    let raw =
      step.images ||
      step.step_images ||
      [];

    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [];
      }
    }

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map(parseAttachment)
      .filter((i: any) => i.url);
  };

  // ============================================================
  // OVERALL ATTACHMENTS
  // ============================================================
  const rawGuideImages =
    guide.images || [];

  const overallAttachments = (
    Array.isArray(rawGuideImages)
      ? rawGuideImages
      : []
  )
    .map(parseAttachment)
    .filter(
      (item, idx, self) =>
        item.url &&
        self.findIndex(
          (t) => t.url === item.url
        ) === idx
    );

  // ============================================================
  // LIGHTBOX ITEMS
  // ============================================================
  const lightboxItems: {
    url: string;
    name: string;
  }[] = [];

  if (
    guide.steps &&
    guide.steps.length > 0
  ) {
    guide.steps.forEach(
      (step: any, idx: number) => {
        const stepNum =
          step.step_number ||
          idx + 1;

        const stepAtts =
          getStepAttachments(step);

        stepAtts.forEach(
          (att: any) => {
            if (
              !att.isPdf &&
              att.url &&
              !lightboxItems.some(
                (x) =>
                  x.url === att.url
              )
            ) {
              lightboxItems.push({
                url: att.url,
                name:
                  att.name ||
                  `Step ${stepNum} Drawing`,
              });
            }
          }
        );
      }
    );
  }

  overallAttachments.forEach(
    (att: any) => {
      if (
        !att.isPdf &&
        att.url &&
        !lightboxItems.some(
          (x) =>
            x.url === att.url
        )
      ) {
        lightboxItems.push({
          url: att.url,
          name:
            att.name ||
            "Schematic Drawing",
        });
      }
    }
  );

  // ============================================================
  // DISPLAY ATTACHMENT URL
  // ============================================================
  function displayAttachmentUrl(
    url: string
  ): string {
    const absolute =
      resolveRemoteUrl(url);

    return (
      resolvedAttachmentUrls[
        absolute
      ] || absolute
    );
  }

  const lightboxUrls =
    lightboxItems.map((i) =>
      displayAttachmentUrl(i.url)
    );

  const lightboxCaptions =
    lightboxItems.map(
      (i) => i.name
    );

  // ============================================================
  // LIGHTBOX OPEN
  // ============================================================
  function openLightboxByUrl(
    targetUrl: string
  ) {
    const idx =
      lightboxUrls.indexOf(
        displayAttachmentUrl(
          targetUrl
        )
      );

    if (idx !== -1) {
      setLightboxIndex(idx);
    } else {
      lightboxUrls.push(
        displayAttachmentUrl(
          targetUrl
        )
      );

      lightboxCaptions.push(
        "Schematic Drawing"
      );

      setLightboxIndex(
        lightboxUrls.length - 1
      );
    }
  }

  function nextImg() {
    setLightboxIndex((i) =>
      i === null
        ? 0
        : (i + 1) %
          lightboxUrls.length
    );
  }

  function prevImg() {
    setLightboxIndex((i) =>
      i === null
        ? 0
        : (i - 1 +
            lightboxUrls.length) %
          lightboxUrls.length
    );
  }

  const authorEmail =
    (guide as any).author_email;

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="animate-fade-in print:bg-white print:text-black w-full min-w-0">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-marine-muted px-4 sm:px-6 py-3 lg:px-10 border-b border-marine-border flex-wrap print:hidden">

        <button
          onClick={() =>
            navigate({
              name: "home",
            })
          }
          className="hover:text-marine-accent transition cursor-pointer"
        >
          Home
        </button>

        {equipment && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />

            <button
              onClick={() =>
                navigate({
                  name: "equipment",
                  id: equipment.id,
                })
              }
              className="hover:text-marine-accent transition cursor-pointer"
            >
              {equipment.name}
            </button>
          </>
        )}

        <ChevronRight className="h-3.5 w-3.5 shrink-0" />

        <span className="text-marine-text line-clamp-1">
          {guide.title}
        </span>
      </div>

      <article className="px-4 sm:px-6 py-6 lg:px-10 w-full max-w-6xl print:max-w-full print:px-0 print:py-2">

        {/* Back */}
        <button
          onClick={() =>
            window.history.back()
          }
          className="flex items-center gap-1 text-sm text-marine-muted hover:text-marine-accent transition mb-4 cursor-pointer print:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-marine-error text-sm p-3 rounded-lg bg-marine-error/10 border border-marine-error/30 mb-4 print:hidden">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-marine-text print:text-black leading-tight flex-1 break-words">
            {guide.title}
          </h1>

          <div className="flex items-center gap-2 shrink-0 flex-wrap print:hidden">

            {/* Print */}
            <button
              type="button"
              onClick={handlePrintSOP}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs bg-marine-card text-marine-text border border-marine-border hover:border-marine-accent/50 transition cursor-pointer"
              title="Print SOP / Save PDF"
            >
              <Printer className="h-4 w-4 text-sky-400" />
              <span>
                Print SOP
              </span>
            </button>

            {/* Admin Delete */}
            {isAdmin && (
              <button
                type="button"
                onClick={
                  handleDeleteGuide
                }
                disabled={
                  deletingGuide
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition cursor-pointer"
                title="Permanently delete from database"
              >
                {deletingGuide ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}

                <span>
                  Delete Guide
                </span>
              </button>
            )}

            {/* Bookmark */}
            <button
              type="button"
              onClick={
                toggleBookmark
              }
              disabled={
                savingBookmark
              }
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition border cursor-pointer ${
                isBookmarked
                  ? "bg-marine-accent/15 text-marine-accent border-marine-accent/40"
                  : "bg-marine-card text-marine-text border-marine-border hover:border-marine-accent/60"
              }`}
            >
              {savingBookmark ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-marine-accent" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}

              {isBookmarked
                ? "Saved Offline"
                : "Save Offline"}
            </button>
          </div>
        </div>

        {/* Author */}
        {authorEmail && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">

            <span className="text-xs text-marine-muted print:text-slate-600 font-medium">
              Author Contact:
            </span>

            <a
              href={`mailto:${authorEmail}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 print:text-sky-700 text-xs font-semibold hover:bg-sky-500/20 transition break-all"
            >
              <Mail className="h-3.5 w-3.5" />
              {authorEmail}
            </a>
          </div>
        )}

        {/* Symptom */}
        {guide.symptom && (
          <div className="mb-6 p-4 rounded-lg bg-marine-base/60 print:bg-slate-100 border border-marine-border print:border-slate-300 w-full overflow-hidden">

            <div className="text-xs uppercase tracking-wider text-marine-muted font-semibold mb-1">
              Symptom
            </div>

            <p className="text-marine-text print:text-black break-words">
              {guide.symptom}
            </p>
          </div>
        )}

        {/* Safety */}
        {guide.safety_ppe &&
          guide.safety_ppe.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-marine-warn/10 print:bg-amber-50 border-2 border-marine-warn/40 print:border-amber-400 w-full">

              <div className="flex items-center gap-2 text-marine-warn print:text-amber-800 font-semibold mb-2">
                <ShieldAlert className="h-5 w-5" />
                <span>
                  Safety &amp; PPE — Isolation Required
                </span>
              </div>

              <p className="text-sm text-marine-warn/90 print:text-amber-900 mb-3">
                Ensure the following PPE is worn and isolation is confirmed before beginning work.
              </p>

              <div className="flex flex-wrap gap-2">
                {guide.safety_ppe.map(
                  (p) => (
                    <span
                      key={p}
                      className="inline-flex items-center text-sm px-3 py-1.5 rounded-full bg-marine-warn/15 print:bg-amber-200 text-marine-warn print:text-amber-900 border border-marine-warn/30 print:border-amber-400"
                    >
                      {p}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

        {/* Tools */}
        {guide.tools_required &&
          guide.tools_required.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-marine-card print:bg-slate-100 border border-marine-border print:border-slate-300 w-full">

              <div className="flex items-center gap-2 text-marine-accent print:text-sky-800 font-semibold mb-2">
                <Wrench className="h-5 w-5" />
                <span>
                  Tools Required
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {guide.tools_required.map(
                  (t) => (
                    <span
                      key={t}
                      className="inline-flex items-center text-sm px-3 py-1.5 rounded-full bg-marine-accent/10 print:bg-sky-200 text-marine-accent print:text-sky-900 border border-marine-accent/30 print:border-sky-400"
                    >
                      {t}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

        {/* Introduction */}
        {guide.introduction && (
          <div className="mb-6 p-4 rounded-xl bg-marine-card print:bg-slate-100 border border-marine-border print:border-slate-300 w-full overflow-hidden">

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-marine-muted print:text-slate-600 mb-2">
              <FileText className="h-4 w-4 text-sky-400 shrink-0" />
              <span>
                Introduction / Overview
              </span>
            </div>

            <p className="text-sm text-marine-text print:text-slate-800 leading-relaxed whitespace-pre-line break-words">
              {guide.introduction}
            </p>
          </div>
        )}

        {/* Diagnostic Steps */}
        {guide.steps &&
          guide.steps.length > 0 && (
            <section className="mb-8 space-y-4 w-full">

              <h2 className="text-xl font-bold text-marine-text print:text-black flex items-center gap-2">
                Diagnostic Steps
              </h2>

              <div className="space-y-4 w-full">
                {guide.steps.map(
                  (
                    step: any,
                    index: number
                  ) => {
                    const stepNum =
                      step.step_number ||
                      index + 1;

                    const stepAttachments =
                      getStepAttachments(
                        step
                      );

                    const stepTitle =
                      step.title &&
                      step.title.trim()
                        ? step.title.trim()
                        : `Step ${stepNum} Procedure`;

                    return (
                      <div
                        key={
                          step.id ||
                          index
                        }
                        className="rounded-xl border border-marine-border print:border-slate-300 bg-marine-card print:bg-white p-4 sm:p-5 space-y-4 shadow-sm w-full overflow-hidden"
                      >

                        <div className="flex items-start gap-3">

                          <span className="flex items-center justify-center h-8 w-8 rounded-full bg-marine-accent print:bg-slate-800 text-marine-base print:text-white font-bold text-sm shrink-0 mt-0.5 shadow-sm">
                            {stepNum}
                          </span>

                          <div className="space-y-1 flex-1 min-w-0">

                            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 print:text-slate-600 block">
                              Step {stepNum} Action
                            </span>

                            <h3 className="text-base font-semibold text-marine-text print:text-black leading-snug break-words">
                              {stepTitle}
                            </h3>
                          </div>
                        </div>

                        {/* Instruction */}
                        {step.instruction &&
                          step.instruction.trim() && (
                            <div className="bg-marine-dark/70 print:bg-slate-50 border border-marine-border/80 print:border-slate-200 rounded-xl p-4 sm:ml-11 overflow-hidden">

                              <span className="text-[11px] font-bold uppercase tracking-wider text-marine-muted print:text-slate-500 block mb-1.5">
                                Instruction &amp; Procedure
                              </span>

                              <p className="text-sm text-marine-text print:text-slate-800 leading-relaxed whitespace-pre-line break-words">
                                {
                                  step.instruction
                                }
                              </p>
                            </div>
                          )}

                        {/* Warning / Tip */}
                        {(step.warning ||
                          step.tip) && (
                          <div className="bg-marine-warn/10 print:bg-amber-50 border border-marine-warn/30 print:border-amber-300 rounded-xl p-4 sm:ml-11 flex items-start gap-3 overflow-hidden">

                            <AlertTriangle className="h-5 w-5 text-marine-warn print:text-amber-600 shrink-0 mt-0.5" />

                            <div className="space-y-1 min-w-0 flex-1">

                              <span className="text-[11px] font-bold uppercase tracking-wider text-marine-warn print:text-amber-700 block">
                                Caution / Safety Note
                              </span>

                              <p className="text-xs text-marine-warn/90 print:text-amber-900 leading-relaxed font-medium break-words">
                                {
                                  step.warning ||
                                  step.tip
                                }
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Attachments */}
                        {stepAttachments.length >
                          0 && (
                          <div className="sm:ml-11 pt-3 border-t border-marine-border/60 print:border-slate-300">

                            <span className="text-[11px] font-bold text-sky-400 print:text-slate-600 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                              <ImageIcon className="h-3.5 w-3.5" />
                              Step {stepNum} Schematic / Drawing (
                              {
                                stepAttachments.length
                              }
                              ):
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                              {stepAttachments.map(
                                (
                                  parsed: any,
                                  attIdx: number
                                ) => (
                                  <div
                                    key={
                                      attIdx
                                    }
                                    className="p-3 bg-marine-dark/90 print:bg-slate-100 rounded-xl border border-marine-border print:border-slate-300 flex items-center justify-between text-xs"
                                  >

                                    {parsed.isPdf ? (
                                      <div className="flex items-center justify-between w-full">

                                        <div className="flex items-center gap-2 min-w-0">

                                          <FileText className="h-5 w-5 text-rose-400 shrink-0" />

                                          <span
                                            className="text-xs font-semibold text-marine-text print:text-black truncate max-w-[140px]"
                                            title={
                                              parsed.name
                                            }
                                          >
                                            {parsed.name ||
                                              `Step ${stepNum} Document`}
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            openPdf(
                                              parsed.url,
                                              parsed.name ||
                                                `Step ${stepNum} Document`
                                            )
                                          }
                                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 text-rose-300 print:text-rose-700 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-[11px] font-bold transition shrink-0"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          View PDF
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openLightboxByUrl(
                                            parsed.url
                                          )
                                        }
                                        className="group relative w-full flex items-center justify-center bg-black/60 rounded-lg overflow-hidden border border-marine-border hover:border-marine-accent/60 transition cursor-pointer p-1 min-h-[160px]"
                                        title="Click to Zoom Fullscreen"
                                      >
                                        <img
                                          src={displayAttachmentUrl(
                                            parsed.url
                                          )}
                                          alt={`Step ${stepNum}`}
                                          loading="lazy"
                                          decoding="async"
                                          className="max-h-48 w-full object-contain rounded group-hover:scale-105 transition-transform duration-300"
                                        />
                                      </button>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

        {/* Overall Schematics */}
        {overallAttachments.length >
          0 && (
          <section className="mb-8 w-full">

            <h2 className="text-xl font-bold text-marine-text print:text-black mb-2">
              Overall Schematics &amp; Diagrams (
              {
                overallAttachments.length
              }
              )
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">

              {overallAttachments.map(
                (
                  item: any,
                  i: number
                ) => (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden border border-marine-border print:border-slate-300 bg-marine-dark print:bg-slate-50 p-3 flex flex-col justify-between"
                  >

                    {item.isPdf ? (
                      <div className="flex flex-col items-center justify-center text-center space-y-2 p-4 w-full">

                        <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <FileText className="h-8 w-8" />
                        </div>

                        <div>
                          <span
                            className="text-xs font-bold text-marine-text print:text-black block truncate max-w-[200px]"
                            title={
                              item.name
                            }
                          >
                            {item.name ||
                              "PDF Schematic Document"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openPdf(
                              item.url,
                              item.name ||
                                "PDF Schematic Document"
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-300 print:text-rose-700 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-xs font-bold transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View PDF
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openLightboxByUrl(
                            item.url
                          )
                        }
                        className="group relative rounded-lg overflow-hidden border border-marine-border hover:border-marine-accent/60 transition w-full min-h-[180px] bg-black/50 cursor-pointer flex items-center justify-center"
                        title="Click to Zoom Fullscreen"
                      >
                        <img
                          src={displayAttachmentUrl(
                            item.url
                          )}
                          alt={
                            item.name ||
                            "Schematic"
                          }
                          loading="lazy"
                          decoding="async"
                          className="max-h-60 w-full object-contain opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                        />
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        )}
      </article>

      {/* PDF Viewer */}
      {pdfViewerOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col print:hidden">

          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-marine-card border-b border-marine-border">

            <div className="min-w-0">

              <h3 className="text-sm sm:text-base font-bold text-marine-text truncate">
                {pdfViewerName}
              </h3>

              <p className="text-[11px] text-marine-muted">
                PDF Viewer
              </p>
            </div>

            <button
              type="button"
              onClick={
                closePdfViewer
              }
              className="shrink-0 px-3 py-2 rounded-lg bg-marine-dark text-marine-text border border-marine-border hover:border-marine-accent transition text-xs font-bold"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6">

            {pdfViewerLoading && (
              <div className="flex items-center justify-center py-20 text-marine-muted">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading PDF...
              </div>
            )}

            {pdfViewerError &&
              !pdfViewerLoading && (
                <div className="max-w-xl mx-auto mt-10 p-5 rounded-xl bg-marine-card border border-red-500/30 text-center">

                  <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />

                  <p className="text-sm text-red-300 break-words">
                    {pdfViewerError}
                  </p>
                </div>
              )}

            <div
              ref={pdfCanvasRef}
              className="max-w-4xl mx-auto"
            />
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null &&
        lightboxUrls.length > 0 && (
          <Lightbox
            urls={lightboxUrls}
            captions={
              lightboxCaptions
            }
            index={
              lightboxIndex
            }
            onClose={() =>
              setLightboxIndex(null)
            }
            onPrev={prevImg}
            onNext={nextImg}
          />
        )}
    </div>
  );
}
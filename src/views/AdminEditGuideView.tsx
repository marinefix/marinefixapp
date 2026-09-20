import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft,
  Save,
  Trash2,
  Upload,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
} from "lucide-react";
import type { Category, Equipment, GuideWithRelations } from "../types";
import {
  fetchGuideById,
  updateGuideAsAdmin,
  uploadImage,
} from "../lib/queries";
import { navigate } from "../lib/router";
import { Lightbox } from "../components/Lightbox";
import { RichTextEditor } from "../components/RichTextEditor";

type Props = {
  guideId: string;
  categories: Category[];
  equipment: Equipment[];
};

type Attachment = {
  url: string;
  isPdf: boolean;
  name: string;
};

type NewFile = {
  file: File;
  previewUrl: string;
  isPdf: boolean;
};

type EditStep = {
  title: string;
  instruction: string;
  warning: string;
  attachments: Attachment[];
  newFiles: NewFile[];
};

function isPdfUrl(url: string) {
  return url.toLowerCase().includes(".pdf") ||
    url.startsWith("data:application/pdf");
}

function parseAttachment(value: any): Attachment | null {
  const url =
    typeof value === "string"
      ? value
      : value?.url || value?.image_url || value?.image || "";

  if (!url) return null;

  return {
    url,
    isPdf:
      Boolean(value?.isPdf) ||
      isPdfUrl(url),
    name:
      typeof value === "string"
        ? ""
        : value?.name || value?.caption || "",
  };
}

async function compressImageFile(
  file: File,
  maxWidth = 1280,
  quality = 0.75
): Promise<File> {
  if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName =
              file.name.replace(/\.[^/.]+$/, "") + ".webp";

            resolve(
              new File([blob], cleanName, {
                type: "image/webp",
                lastModified: Date.now(),
              })
            );
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function emptyStep(): EditStep {
  return {
    title: "",
    instruction: "",
    warning: "",
    attachments: [],
    newFiles: [],
  };
}

export function AdminEditGuideView({
  guideId,
  categories,
  equipment,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState<GuideWithRelations | null>(null);

  const [selectedEquip, setSelectedEquip] = useState("");
  const [title, setTitle] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [authorPhone, setAuthorPhone] = useState("");
  const [symptom, setSymptom] = useState("");
  const [ppeText, setPpeText] = useState("");
  const [toolsText, setToolsText] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [steps, setSteps] = useState<EditStep[]>([]);
  const [overallAttachments, setOverallAttachments] = useState<Attachment[]>([]);
  const [overallNewFiles, setOverallNewFiles] = useState<NewFile[]>([]);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxCaptions, setLightboxCaptions] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchGuideById(guideId);

        if (!active) return;

        if (!data) {
          setError("Guide could not be loaded.");
          return;
        }

        setGuide(data);
        setSelectedEquip(String((data as any).equipment_id || ""));
        setTitle(String((data as any).title || ""));
        setAuthorEmail(String((data as any).author_email || ""));
        setAuthorPhone(String((data as any).author_phone || ""));
        setSymptom(String((data as any).symptom || ""));
        setPpeText(
          Array.isArray((data as any).safety_ppe)
            ? (data as any).safety_ppe.join(", ")
            : ""
        );
        setToolsText(
          Array.isArray((data as any).tools_required)
            ? (data as any).tools_required.join(", ")
            : ""
        );
        setIntroduction(String((data as any).introduction || ""));

        const rawSteps =
          Array.isArray((data as any).steps)
            ? (data as any).steps
            : [];

        setSteps(
          rawSteps.length > 0
            ? rawSteps.map((step: any) => ({
                title: String(step.title || ""),
                instruction: String(step.instruction || ""),
                warning: String(step.warning || ""),
                attachments: (Array.isArray(step.images)
                  ? step.images
                  : [])
                  .map(parseAttachment)
                  .filter(Boolean) as Attachment[],
                newFiles: [],
              }))
            : [emptyStep()]
        );

        setOverallAttachments(
          (Array.isArray((data as any).images)
            ? (data as any).images
            : [])
            .map(parseAttachment)
            .filter(Boolean) as Attachment[]
        );
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load guide."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [guideId]);

  const currentCategory = useMemo(() => {
    const eq = equipment.find((item) => item.id === selectedEquip);
    return eq
      ? categories.find((c) => c.id === eq.category_id)
      : null;
  }, [equipment, categories, selectedEquip]);

  function updateStep(
    index: number,
    field: "title" | "instruction" | "warning",
    value: string
  ) {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    setSteps((prev) => {
      const next = [...prev];
      [next[index], next[nextIndex]] = [
        next[nextIndex],
        next[index],
      ];
      return next;
    });
  }

  function removeExistingStepAttachment(
    stepIndex: number,
    attachmentIndex: number
  ) {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              attachments: step.attachments.filter(
                (_, j) => j !== attachmentIndex
              ),
            }
          : step
      )
    );
  }

  function removeNewStepFile(stepIndex: number, fileIndex: number) {
    setSteps((prev) =>
      prev.map((step, i) => {
        if (i !== stepIndex) return step;
        const target = step.newFiles[fileIndex];
        if (target) URL.revokeObjectURL(target.previewUrl);

        return {
          ...step,
          newFiles: step.newFiles.filter(
            (_, j) => j !== fileIndex
          ),
        };
      })
    );
  }

  async function handleStepFiles(
    stepIndex: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (!event.target.files?.length) return;

    setProcessing(true);

    try {
      const processed: NewFile[] = [];

      for (const file of Array.from(event.target.files)) {
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");

        const finalFile = isPdf
          ? file
          : await compressImageFile(file);

        processed.push({
          file: finalFile,
          previewUrl: URL.createObjectURL(finalFile),
          isPdf,
        });
      }

      setSteps((prev) =>
        prev.map((step, i) =>
          i === stepIndex
            ? {
                ...step,
                newFiles: [...step.newFiles, ...processed],
              }
            : step
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process attachment."
      );
    } finally {
      setProcessing(false);
      event.target.value = "";
    }
  }

  function removeOverallAttachment(index: number) {
    setOverallAttachments((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  function removeOverallNewFile(index: number) {
    setOverallNewFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleOverallFiles(
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (!event.target.files?.length) return;

    setProcessing(true);

    try {
      const processed: NewFile[] = [];

      for (const file of Array.from(event.target.files)) {
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");

        const finalFile = isPdf
          ? file
          : await compressImageFile(file);

        processed.push({
          file: finalFile,
          previewUrl: URL.createObjectURL(finalFile),
          isPdf,
        });
      }

      setOverallNewFiles((prev) => [...prev, ...processed]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process attachment."
      );
    } finally {
      setProcessing(false);
      event.target.value = "";
    }
  }

  function openLightbox(urls: string[], captions: string[] = [], index = 0) {
    if (!urls.length) return;
    setLightboxUrls(urls);
    setLightboxCaptions(urls.map((_, i) => captions[i] || `Attachment ${i + 1}`));
    setLightboxIndex(index);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedEquip) {
      setError("Please select an equipment.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a guide title.");
      return;
    }

    setSaving(true);

    try {
      const finalSteps = [];

      for (const step of steps) {
        const uploadedAttachments: Attachment[] = [
          ...step.attachments,
        ];

        for (const item of step.newFiles) {
          const url = await uploadImage(item.file);
          uploadedAttachments.push({
            url,
            isPdf: item.isPdf,
            name: item.file.name,
          });
        }

        if (
          !step.title.trim() &&
          !step.instruction.trim() &&
          uploadedAttachments.length === 0
        ) {
          continue;
        }

        finalSteps.push({
          title:
            step.title.trim() ||
            `Step ${finalSteps.length + 1}`,
          instruction: step.instruction.trim(),
          warning: step.warning.trim() || undefined,
          images: uploadedAttachments,
        });
      }

      const finalOverall = [...overallAttachments];

      for (const item of overallNewFiles) {
        const url = await uploadImage(item.file);
        finalOverall.push({
          url,
          isPdf: item.isPdf,
          name: item.file.name,
        });
      }

      await updateGuideAsAdmin({
        id: guideId,
        equipment_id: selectedEquip,
        title: title.trim(),
        author_email: authorEmail.trim(),
        author_phone: authorPhone.trim(),
        symptom: symptom.trim(),
        safety_ppe: ppeText
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        tools_required: toolsText
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        introduction: introduction.trim(),
        steps: finalSteps,
        image_urls: finalOverall,
      });

      alert(
        "Guide updated successfully. It is still pending review."
      );
      navigate({ name: "admin-pending" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save guide."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-marine-muted animate-pulse">
        Loading guide for editing...
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate({ name: "admin-pending" })}
          className="inline-flex items-center gap-2 text-xs text-marine-muted hover:text-marine-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Review
        </button>
        <div className="mt-6 p-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
          {error || "Guide not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate({ name: "admin-pending" })}
        className="inline-flex items-center gap-2 text-xs font-medium text-marine-muted hover:text-marine-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Review
      </button>

      <div className="border-b border-marine-border pb-5">
        <h1 className="text-2xl lg:text-3xl font-bold text-marine-text">
          Edit Guide
        </h1>
        <p className="text-sm text-marine-muted mt-1">
          Admin can correct text, reorder steps, and add or remove photos/PDFs before approval.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <section className="p-5 rounded-2xl bg-marine-card border border-marine-border space-y-5">
          <h2 className="font-bold text-marine-text">Guide Details</h2>

          <Field label="Equipment">
            <select
              value={selectedEquip}
              onChange={(e) => setSelectedEquip(e.target.value)}
              className="input"
            >
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
            {currentCategory && (
              <p className="text-[11px] text-marine-muted mt-1">
                Category: {currentCategory.name}
              </p>
            )}
          </Field>

          <Field label="Guide Title *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              required
            />
          </Field>

          <Field label="Symptom / Fault Description">
            <textarea
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              rows={3}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Safety & PPE">
              <input
                value={ppeText}
                onChange={(e) => setPpeText(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Tools Required">
              <input
                value={toolsText}
                onChange={(e) => setToolsText(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Introduction">
            <textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              rows={4}
              className="input"
            />
          </Field>
        </section>

        <section className="p-5 rounded-2xl bg-marine-card border border-marine-border space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-marine-text">
                Diagnostic Steps
              </h2>
              <p className="text-xs text-marine-muted mt-1">
                Edit wording, split paragraphs into steps, reorder, or remove steps.
              </p>
            </div>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-marine-accent/10 text-marine-accent border border-marine-accent/30 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" /> Add Step
            </button>
          </div>

          <div className="space-y-5">
            {steps.map((step, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl bg-marine-dark/60 border border-marine-border space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="px-3 py-1 rounded-lg bg-marine-accent/20 text-marine-accent text-xs font-bold">
                    Step {index + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveStep(index, -1)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg border border-marine-border text-marine-muted disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(index, 1)}
                      disabled={index === steps.length - 1}
                      className="p-1.5 rounded-lg border border-marine-border text-marine-muted disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="p-1.5 rounded-lg border border-red-500/20 text-red-400"
                        title="Delete step"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <Field label="Step Title">
                  <input
                    value={step.title}
                    onChange={(e) =>
                      updateStep(index, "title", e.target.value)
                    }
                    className="input"
                  />
                </Field>

                <Field label="Action / Instruction">
                  <RichTextEditor
                    value={step.instruction}
                    onChange={(value) =>
                      updateStep(index, "instruction", value)
                    }
                    placeholder="Write the procedure... Select text and use Bold, Bullets or Numbered points."
                    minHeight="120px"
                  />
                </Field>

                <Field label="Safety Warning">
                  <input
                    value={step.warning}
                    onChange={(e) =>
                      updateStep(index, "warning", e.target.value)
                    }
                    className="input"
                  />
                </Field>

                {step.attachments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-marine-muted uppercase">
                      Existing Attachments
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {step.attachments.map((item, itemIndex) => (
                        <div
                          key={`${item.url}-${itemIndex}`}
                          className="relative rounded-xl border border-marine-border bg-marine-dark p-2 min-h-28 flex items-center justify-center"
                        >
                          {item.isPdf ? (
                            <div className="text-center">
                              <FileText className="h-7 w-7 mx-auto text-rose-400" />
                              <div className="text-[9px] text-marine-text mt-1 truncate max-w-[110px]">
                                {item.name || "PDF"}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const imageUrls = step.attachments
                                  .filter((attachment) => !attachment.isPdf)
                                  .map((attachment) => attachment.url);
                                const imageIndex = imageUrls.indexOf(item.url);
                                openLightbox(
                                  imageUrls,
                                  imageUrls.map((_, i) => `Step ${index + 1} Attachment ${i + 1}`),
                                  Math.max(0, imageIndex)
                                );
                              }}
                              className="group w-full cursor-zoom-in"
                              title="Click to Zoom Fullscreen"
                            >
                              <img
                                src={item.url}
                                alt=""
                                className="max-h-28 w-full object-contain rounded group-hover:scale-105 transition-transform duration-200"
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              removeExistingStepAttachment(
                                index,
                                itemIndex
                              )
                            }
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white"
                            title="Remove attachment"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step.newFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {step.newFiles.map((item, itemIndex) => (
                      <div
                        key={item.previewUrl}
                        className="relative rounded-xl border border-sky-500/20 bg-marine-dark p-2 min-h-28 flex items-center justify-center"
                      >
                        {item.isPdf ? (
                          <FileText className="h-7 w-7 text-rose-400" />
                        ) : (
                          <img
                            src={item.previewUrl}
                            alt=""
                            className="max-h-28 w-full object-contain rounded"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            removeNewStepFile(index, itemIndex)
                          }
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-marine-border hover:border-marine-accent/60 cursor-pointer text-xs font-semibold text-marine-text">
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-marine-accent" />
                  ) : (
                    <Upload className="h-4 w-4 text-marine-accent" />
                  )}
                  {processing
                    ? "Optimizing..."
                    : `Add Photo / PDF to Step ${index + 1}`}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    disabled={processing}
                    onChange={(e) => void handleStepFiles(index, e)}
                    className="hidden"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="p-5 rounded-2xl bg-marine-card border border-marine-border space-y-4">
          <div>
            <h2 className="font-bold text-marine-text">
              Overall Guide Attachments
            </h2>
            <p className="text-xs text-marine-muted mt-1">
              Add or remove general photos and PDF drawings.
            </p>
          </div>

          {(overallAttachments.length > 0 ||
            overallNewFiles.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {overallAttachments.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="relative rounded-xl border border-marine-border bg-marine-dark p-2 min-h-28 flex items-center justify-center"
                >
                  {item.isPdf ? (
                    <div className="text-center">
                      <FileText className="h-7 w-7 mx-auto text-rose-400" />
                      <div className="text-[9px] text-marine-text mt-1 truncate max-w-[100px]">
                        {item.name || "PDF"}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const imageUrls = overallAttachments
                          .filter((attachment) => !attachment.isPdf)
                          .map((attachment) => attachment.url);
                        const imageIndex = imageUrls.indexOf(item.url);
                        openLightbox(
                          imageUrls,
                          imageUrls.map((_, i) => `Overall Attachment ${i + 1}`),
                          Math.max(0, imageIndex)
                        );
                      }}
                      className="group w-full cursor-zoom-in"
                      title="Click to Zoom Fullscreen"
                    >
                      <img
                        src={item.url}
                        alt=""
                        className="max-h-28 w-full object-contain rounded group-hover:scale-105 transition-transform duration-200"
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeOverallAttachment(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {overallNewFiles.map((item, index) => (
                <div
                  key={item.previewUrl}
                  className="relative rounded-xl border border-sky-500/20 bg-marine-dark p-2 min-h-28 flex items-center justify-center"
                >
                  {item.isPdf ? (
                    <FileText className="h-7 w-7 text-rose-400" />
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="max-h-28 w-full object-contain rounded"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeOverallNewFile(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-marine-border hover:border-marine-accent/60 cursor-pointer text-xs font-semibold">
            <ImageIcon className="h-4 w-4 text-marine-accent" />
            Add Overall Photo / PDF
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              disabled={processing}
              onChange={(e) => void handleOverallFiles(e)}
              className="hidden"
            />
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || processing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-marine-accent text-marine-base font-bold hover:bg-marine-accentHover disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => navigate({ name: "admin-pending" })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-marine-border text-marine-text hover:bg-marine-hover"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </button>
        </div>

        <div className="text-[11px] text-marine-muted">
          After saving, the guide remains <b>Pending</b>. You can review it again and then approve/publish.
        </div>
      </form>

      {lightboxIndex !== null && lightboxUrls.length > 0 && (
        <Lightbox
          urls={lightboxUrls}
          captions={lightboxCaptions}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() =>
            setLightboxIndex((current) =>
              current === null ? 0 : (current - 1 + lightboxUrls.length) % lightboxUrls.length
            )
          }
          onNext={() =>
            setLightboxIndex((current) =>
              current === null ? 0 : (current + 1) % lightboxUrls.length
            )
          }
        />
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          background-color: #0F172A !important;
          border: 1px solid #334155;
          padding: 0.6rem 0.85rem;
          font-size: 0.875rem;
          color: #F8FAFC !important;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input::placeholder { color: #64748B; }
        .input:focus {
          border-color: #0EA5E9;
          box-shadow: 0 0 0 2px rgba(14,165,233,0.4);
        }
        textarea.input { resize: vertical; }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-marine-text mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

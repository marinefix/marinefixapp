import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Mail,
  FileText,
  ShieldCheck,
  Image as ImageIcon,
  Lock,
  ChevronUp,
  ChevronDown,
  PlusCircle,
} from "lucide-react";
import type { Category, Equipment } from "../types";
import { createGuide, uploadImage } from "../lib/queries";

type Props = {
  equipmentId?: string;
  categories: Category[];
  equipment: Equipment[];
  onNavigate?: () => void;
};

type StepUploadItem = {
  file: File;
  previewUrl: string;
  isPdf: boolean;
};

type StepForm = {
  title: string;
  instruction: string;
  warning: string;
  uploadItems: StepUploadItem[];
};

type UploadItem = {
  file: File;
  previewUrl: string;
  isPdf: boolean;
};

const DEFAULT_PPE = [
  "Insulated electrical gloves",
  "Safety goggles",
  "FR coveralls",
];

// Helper: Compress & Convert Images to WebP (10MB -> ~150KB) on the browser side
async function compressImageFile(file: File, maxWidth = 1280, quality = 0.75): Promise<File> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

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
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const compressedFile = new File([blob], cleanName, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}

export function AddGuideView({
  equipmentId,
  categories,
  equipment,
  onNavigate,
}: Props) {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedEquip, setSelectedEquip] = useState<string>(equipmentId ?? "");

  // Author Contact Details State (Both Mandatory)
  const [authorEmail, setAuthorEmail] = useState("");
  const [authorPhone, setAuthorPhone] = useState("");

  const [title, setTitle] = useState("");
  const [symptom, setSymptom] = useState("");
  const [ppeText, setPpeText] = useState(DEFAULT_PPE.join(", "));
  const [toolsText, setToolsText] = useState("");
  const [introduction, setIntroduction] = useState("");

  // Steps State with Dedicated Per-Step File Attachments
  const [steps, setSteps] = useState<StepForm[]>([
    { title: "", instruction: "", warning: "", uploadItems: [] },
  ]);

  // Overall/Global Mixed Files Upload State (General Guide Photos + PDFs)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);

  useEffect(() => {
    setEquipmentList(equipment);
    if (equipmentId) setSelectedEquip(equipmentId);
  }, [equipment, equipmentId]);

  // Find targeted equipment if launched from a specific equipment view
  const currentEquipment = useMemo(() => {
    return equipment.find((e) => e.id === (equipmentId || selectedEquip));
  }, [equipment, equipmentId, selectedEquip]);

  const currentCategory = useMemo(() => {
    if (!currentEquipment) return null;
    return categories.find((c) => c.id === currentEquipment.category_id);
  }, [currentEquipment, categories]);

  const groupedEquipment = useMemo(() => {
    const map = new Map<string, Equipment[]>();
    equipmentList.forEach((eq) => {
      const arr = map.get(eq.category_id) ?? [];
      arr.push(eq);
      map.set(eq.category_id, arr);
    });
    return categories
      .filter((c) => map.has(c.id))
      .map((c) => ({ category: c, items: map.get(c.id)! }))
      .sort((a, b) => a.category.name.localeCompare(b.category.name));
  }, [equipmentList, categories]);

  function addStep() {
    setSteps((s) => [...s, { title: "", instruction: "", warning: "", uploadItems: [] }]);
  }

  function insertStepAfter(index: number) {
    setSteps((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, { title: "", instruction: "", warning: "", uploadItems: [] });
      return next;
    });
  }

  function moveStepUp(index: number) {
    if (index === 0) return;
    setSteps((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  }

  function moveStepDown(index: number) {
    if (index === steps.length - 1) return;
    setSteps((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  }

  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: keyof StepForm, value: any) {
    setSteps((s) =>
      s.map((st, idx) => (idx === i ? { ...st, [field]: value } : st))
    );
  }

  async function handleStepFileSelect(stepIndex: number, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    try {
      setCompressing(true);
      const processedItems: StepUploadItem[] = await Promise.all(
        files.map(async (file) => {
          const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
          const finalFile = isPdf ? file : await compressImageFile(file);
          return {
            file: finalFile,
            previewUrl: URL.createObjectURL(finalFile),
            isPdf,
          };
        })
      );

      setSteps((prevSteps) =>
        prevSteps.map((st, idx) =>
          idx === stepIndex
            ? { ...st, uploadItems: [...st.uploadItems, ...processedItems] }
            : st
        )
      );
    } catch (err) {
      console.error("Image processing error:", err);
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  }

  function removeStepUploadItem(stepIndex: number, fileIndex: number) {
    setSteps((prevSteps) =>
      prevSteps.map((st, idx) =>
        idx === stepIndex
          ? {
              ...st,
              uploadItems: st.uploadItems.filter((_, fIdx) => fIdx !== fileIndex),
            }
          : st
      )
    );
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    try {
      setCompressing(true);
      const processedItems: UploadItem[] = await Promise.all(
        files.map(async (file) => {
          const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
          const finalFile = isPdf ? file : await compressImageFile(file);
          return {
            file: finalFile,
            previewUrl: URL.createObjectURL(finalFile),
            isPdf,
          };
        })
      );

      setUploadItems((prev) => [...prev, ...processedItems]);
    } catch (err) {
      console.error("Image processing error:", err);
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  }

  function removeUploadItem(index: number) {
    setUploadItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!authorEmail.trim()) {
      setError("Author email address is mandatory.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authorEmail.trim())) {
      setError("Please enter a valid email address (e.g., name@domain.com).");
      return;
    }

    if (!authorPhone.trim()) {
      setError("Author phone number is mandatory for reviewer technical verification.");
      return;
    }
    if (authorPhone.trim().length < 8) {
      setError("Please enter a valid phone number with country code (e.g. +91 98765 43210).");
      return;
    }

    const finalEquipId = equipmentId || selectedEquip;
    if (!finalEquipId) {
      setError("Please select an equipment.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a guide title.");
      return;
    }

    setSubmitting(true);
    setUploadingFiles(true);

    try {
      let finalPrimaryImageUrl: string | null = null;

      // 1. Upload Per-Step Files (Saved only inside that specific step)
      const finalSteps = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // Skip step ONLY if title, instruction, AND uploadItems are all completely empty
        if (!step.title.trim() && !step.instruction.trim() && step.uploadItems.length === 0) {
          continue;
        }

        const stepAttachments: { url: string; isPdf: boolean; name: string }[] = [];

        if (step.uploadItems.length > 0) {
          for (const item of step.uploadItems) {
            const uploadedUrl = await uploadImage(item.file);

            if (uploadedUrl) {
              const attachmentObj = {
                url: uploadedUrl,
                isPdf: item.isPdf,
                name: item.file.name,
              };
              stepAttachments.push(attachmentObj);

              if (!finalPrimaryImageUrl && !item.isPdf) {
                finalPrimaryImageUrl = uploadedUrl;
              }
            }
          }
        }

        finalSteps.push({
          step_number: finalSteps.length + 1,
          title: step.title.trim() || `Step ${finalSteps.length + 1}`,
          instruction: step.instruction.trim(),
          warning: step.warning.trim() || undefined,
          images: stepAttachments,
        });
      }

      // 2. Upload Overall Guide Files (Only from bottom Overall section)
      const overallUploadedUrls: { url: string; isPdf?: boolean; name?: string }[] = [];
      if (uploadItems.length > 0) {
        for (const item of uploadItems) {
          const uploadedUrl = await uploadImage(item.file);

          if (uploadedUrl) {
            const attachmentObj = {
              url: uploadedUrl,
              isPdf: item.isPdf,
              name: item.file.name,
            };
            overallUploadedUrls.push(attachmentObj);

            if (!finalPrimaryImageUrl && !item.isPdf) {
              finalPrimaryImageUrl = uploadedUrl;
            }
          }
        }
      }

      // 3. Create Guide in D1
      await createGuide({
        equipment_id: finalEquipId,
        title: title.trim(),
        author_email: authorEmail.trim(),
        author_phone: authorPhone.trim(),
        symptom: symptom.trim(),
        safety_ppe: ppeText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tools_required: toolsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        introduction: introduction.trim(),
        steps: finalSteps,
        image_urls: overallUploadedUrls, // Passed only overall files
        is_approved: false,
        status: "pending",
      } as any);

      setIsSubmittedSuccessfully(true);
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      console.error("Submit error:", err);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
    }
  }

  if (isSubmittedSuccessfully) {
    return (
      <div className="animate-fade-in px-6 py-16 lg:px-10 max-w-xl mx-auto text-center min-h-[80vh] flex flex-col items-center justify-center">
        <div className="rounded-2xl bg-marine-card border border-marine-accent/40 p-8 shadow-2xl space-y-6 w-full">
          <div className="w-16 h-16 bg-marine-accent/20 text-marine-accent rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-marine-text">Guide Submitted Successfully!</h2>
            <p className="text-sm text-marine-muted leading-relaxed">
              Your troubleshooting guide has been safely sent for <b className="text-marine-accent">Admin Review</b>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-marine-dark/60 border border-marine-border text-left space-y-2 text-xs text-marine-muted">
            <div className="flex items-center gap-2 font-semibold text-marine-text">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              What happens next?
            </div>
            <p>
              Once the administrator verifies the diagnostic procedures, your guide will be approved and published live for marine engineers worldwide.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.history.back();
              onNavigate?.();
            }}
            className="w-full py-3 px-4 rounded-xl bg-marine-accent text-marine-base font-bold hover:bg-marine-accentHover transition shadow-lg flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-6 py-8 lg:px-12 w-full max-w-6xl">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="flex items-center gap-1 text-sm text-marine-muted hover:text-marine-accent transition mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-marine-text">Add New Guide</h1>
        <p className="text-marine-muted text-sm mt-1">
          Post a troubleshooting guide with dedicated photos/PDF drawings per step.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-marine-error text-sm p-4 rounded-lg bg-marine-error/10 border border-marine-error/30 mb-6">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Author Contact Details Card */}
        <div className="p-5 rounded-xl border border-marine-accent/30 bg-marine-accent/5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-bold text-marine-accent uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> Author Contact Details
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-marine-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Confidential & Not Public</span>
            </div>
          </div>

          <p className="text-xs text-marine-muted leading-relaxed">
            Your contact details are strictly confidential and will <strong className="text-marine-text">never be displayed publicly</strong>. They are only used by reviewers to verify technical procedures and notify you once approved.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <Field label="Email Address *" hint="Required for technical review and approval notice">
              <input
                type="email"
                required
                autoComplete="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="your.email@company.com"
                className="input"
              />
            </Field>

            <Field label="Phone Number *" hint="Required: For urgent technical verifications">
              <input
                type="tel"
                required
                autoComplete="tel"
                value={authorPhone}
                onChange={(e) => setAuthorPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="input"
              />
            </Field>
          </div>
        </div>

        {/* Equipment Selection */}
        <Field label="Equipment *">
          {equipmentId && currentEquipment ? (
            <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-marine-accent/10 border border-marine-accent/40 text-marine-text sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex flex-wrap items-center gap-2.5">
                <span className="font-semibold text-marine-accent break-words">
                  {currentEquipment.name}
                </span>
                {currentCategory && (
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-md bg-marine-dark/80 text-marine-muted border border-marine-border">
                    {currentCategory.name}
                  </span>
                )}
              </div>
              <span className="self-start shrink-0 inline-flex items-center gap-1 text-xs text-marine-muted font-medium bg-marine-dark/50 px-2 py-1 rounded sm:self-auto">
                <Lock className="h-3 w-3 text-marine-accent shrink-0" /> Locked
              </span>
            </div>
          ) : (
            <select
              value={selectedEquip}
              onChange={(e) => setSelectedEquip(e.target.value)}
              className="input"
              required
            >
              <option value="">Select equipment...</option>
              {groupedEquipment.map((g) => (
                <optgroup key={g.category.id} label={g.category.name}>
                  {g.items.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </Field>

        <Field label="Guide Title *">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Carrier 69NT40 — Compressor Overload Trip Diagnosis"
            className="input"
          />
        </Field>

        <Field label="Symptom / Fault Description">
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            rows={2}
            placeholder="Describe the observed alarm, tripped breaker, or abnormal behavior..."
            className="input"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Safety & PPE (comma separated)">
            <input
              type="text"
              value={ppeText}
              onChange={(e) => setPpeText(e.target.value)}
              placeholder="Insulated electrical gloves, Safety goggles, FR coveralls"
              className="input"
            />
          </Field>

          <Field label="Tools Required (comma separated)">
            <input
              type="text"
              value={toolsText}
              onChange={(e) => setToolsText(e.target.value)}
              placeholder="Digital multimeter, Manifold gauge set, Megger"
              className="input"
            />
          </Field>
        </div>

        <Field label="Introduction">
          <textarea
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            rows={3}
            placeholder="Short overview of the procedure and approach..."
            className="input"
          />
        </Field>

        {/* Diagnostic Steps Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-base font-bold text-marine-text block">
                Diagnostic Steps
              </label>
              <p className="text-xs text-marine-muted">
                Add, re-order, or insert steps anywhere in the sequence.
              </p>
            </div>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-marine-accent/10 text-marine-accent hover:bg-marine-accent/20 border border-marine-accent/30 text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Step at Bottom
            </button>
          </div>

          <div className="space-y-5">
            {steps.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="rounded-xl border border-marine-border bg-marine-card p-5 space-y-4 shadow-sm relative">
                  <div className="flex items-center justify-between pb-2 border-b border-marine-border/60 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-marine-accent/20 text-marine-accent text-xs font-bold">
                        Step {i + 1}
                      </span>
                      <span className="text-[11px] text-marine-muted font-medium">
                        of {steps.length}
                      </span>
                    </div>

                    {/* Step Re-order and Delete Controls */}
                    <div className="flex items-center gap-1 bg-marine-dark/70 px-2 py-1 rounded-lg border border-marine-border/70">
                      <button
                        type="button"
                        onClick={() => moveStepUp(i)}
                        disabled={i === 0}
                        className="p-1 rounded text-marine-muted hover:text-marine-accent hover:bg-marine-accent/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-marine-muted transition cursor-pointer"
                        title="Move Step Up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveStepDown(i)}
                        disabled={i === steps.length - 1}
                        className="p-1 rounded text-marine-muted hover:text-marine-accent hover:bg-marine-accent/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-marine-muted transition cursor-pointer"
                        title="Move Step Down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      <div className="w-px h-3.5 bg-marine-border mx-1"></div>

                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          className="p-1 rounded text-marine-muted hover:text-marine-error hover:bg-marine-error/10 transition cursor-pointer"
                          title="Delete Step"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-marine-muted uppercase block mb-1">
                      Step Title
                    </label>
                    <input
                      type="text"
                      value={s.title}
                      onChange={(e) => updateStep(i, "title", e.target.value)}
                      placeholder="e.g. Check Main Circuit Breaker Voltage"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-marine-muted uppercase block mb-1">
                      Action / Instruction
                    </label>
                    <textarea
                      value={s.instruction}
                      onChange={(e) => updateStep(i, "instruction", e.target.value)}
                      rows={2}
                      placeholder="Detailed step instruction..."
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-400 uppercase block mb-1">
                      Safety Warning (Optional)
                    </label>
                    <input
                      type="text"
                      value={s.warning}
                      onChange={(e) => updateStep(i, "warning", e.target.value)}
                      placeholder="e.g. Ensure main power is isolated before probing"
                      className="input"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-sky-400 uppercase block mb-1.5 flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5" /> Photos / PDF Schematic for Step {i + 1}
                    </label>

                    <label className="flex items-center justify-center gap-2 p-3.5 border border-dashed border-marine-border hover:border-marine-accent/60 rounded-xl cursor-pointer bg-marine-dark/50 transition text-xs font-medium text-marine-text">
                      {compressing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-marine-accent" />
                      ) : (
                        <Upload className="h-4 w-4 text-marine-accent" />
                      )}
                      <span>
                        {compressing
                          ? "Optimizing & Compressing..."
                          : `Upload Photo / PDF Drawing for Step ${i + 1}`}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        disabled={compressing}
                        onChange={(e) => handleStepFileSelect(i, e)}
                        className="hidden"
                      />
                    </label>

                    {s.uploadItems && s.uploadItems.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-3">
                        {s.uploadItems.map((item, fIdx) => (
                          <div
                            key={fIdx}
                            className="relative rounded-lg overflow-hidden border border-marine-border bg-marine-dark aspect-square p-1.5 flex flex-col items-center justify-center text-center"
                          >
                            {item.isPdf ? (
                              <div className="flex flex-col items-center justify-center text-rose-400 gap-1 p-1">
                                <FileText className="h-6 w-6 text-rose-500" />
                                <span className="text-[9px] font-semibold text-marine-text truncate max-w-[80px]" title={item.file.name}>
                                  {item.file.name}
                                </span>
                                <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1 py-0.2 rounded font-bold">
                                  PDF
                                </span>
                              </div>
                            ) : (
                              <img
                                src={item.previewUrl}
                                alt={`Step ${i + 1} file ${fIdx}`}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeStepUploadItem(i, fIdx)}
                              className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition shadow cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick In-between Step Insertion Button */}
                <div className="flex items-center justify-center pt-1 pb-2">
                  <button
                    type="button"
                    onClick={() => insertStepAfter(i)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-marine-muted hover:text-marine-accent bg-marine-dark/60 hover:bg-marine-accent/10 border border-dashed border-marine-border hover:border-marine-accent/50 transition cursor-pointer"
                    title={`Insert step between Step ${i + 1} and Step ${i + 2}`}
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-marine-accent" />
                    <span>Insert step here (below Step {i + 1})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overall Schematics / Global Upload */}
        <Field
          label="Overall Guide Photos & PDF Drawings (Optional)"
          hint="General photos or circuit drawing documents for the overall guide."
        >
          <div className="mt-1">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-marine-border hover:border-marine-accent/60 rounded-xl cursor-pointer bg-marine-card/50 transition">
              {compressing ? (
                <Loader2 className="h-8 w-8 animate-spin text-marine-accent mb-1.5" />
              ) : (
                <Upload className="h-8 w-8 text-marine-accent mb-1.5" />
              )}
              <span className="text-xs font-medium text-marine-text">
                {compressing ? "Optimizing & Compressing Images..." : "Click to choose General Photos or PDF Drawings"}
              </span>
              <span className="text-[11px] text-marine-muted mt-0.5">
                Auto-optimized to WebP | Supports JPG, PNG, WEBP & PDF Drawings
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                disabled={compressing}
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {uploadItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
              {uploadItems.map((item, i) => (
                <div
                  key={i}
                  className="relative group rounded-xl border border-marine-border bg-marine-dark aspect-square p-2 flex flex-col items-center justify-center text-center"
                >
                  {item.isPdf ? (
                    <div className="flex flex-col items-center justify-center text-rose-400 gap-1.5 p-2">
                      <FileText className="h-8 w-8 text-rose-500" />
                      <span className="text-[10px] font-semibold text-marine-text truncate max-w-[100px]" title={item.file.name}>
                        {item.file.name}
                      </span>
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold uppercase">
                        PDF Schematic
                      </span>
                    </div>
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt={`Upload ${i}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeUploadItem(i)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition shadow cursor-pointer"
                    title="Remove File"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting || uploadingFiles || compressing}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-marine-accent text-marine-base font-semibold hover:bg-marine-accentHover transition disabled:opacity-60 cursor-pointer shadow-lg shadow-marine-accent/20"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {submitting ? "Submitting Guide..." : "Submit Guide"}
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2.5 rounded-lg border border-marine-border text-marine-text hover:bg-marine-hover transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>

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
        
        .input:-webkit-autofill,
        .input:-webkit-autofill:hover, 
        .input:-webkit-autofill:focus, 
        .input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #0F172A inset !important;
          -webkit-text-fill-color: #F8FAFC !important;
          caret-color: #F8FAFC !important;
          transition: background-color 50000s ease-in-out 0s;
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
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-marine-text mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-marine-muted mt-1">{hint}</p>}
    </div>
  );
}
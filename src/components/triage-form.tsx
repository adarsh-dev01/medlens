"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useState } from "react";

import { VoiceInput } from "@/components/voice-input";
import { persistTriageSession } from "@/lib/storage";
import type { TriageResponse, TriageSession } from "@/lib/types";
import { cn, createSessionId, formatTimestamp, getOrCreateDeviceId } from "@/lib/utils";

type FormState = {
  mode: "self" | "caregiver";
  patientName: string;
  patientAge: string;
  patientSex: "" | "male" | "female" | "other";
  language: "en" | "es" | "fr" | "hi" | "sw" | "ar";
  symptoms: string;
};

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Espa\u00F1ol" },
  { value: "fr", label: "Fran\u00E7ais" },
  { value: "hi", label: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { value: "sw", label: "Kiswahili" },
  { value: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" }
] as const;

const initialForm: FormState = {
  mode: "self",
  patientName: "",
  patientAge: "",
  patientSex: "",
  language: "en",
  symptoms: ""
};

const resultTheme = {
  GREEN: {
    panelClass: "border-green-500 bg-green-50 text-green-800",
    headerClass: "bg-green-500 text-white",
    title: "Low Urgency - Self-Care",
    icon: "\u2705",
    description:
      "Your symptoms look more suitable for self-care and monitoring at home unless they worsen."
  },
  YELLOW: {
    panelClass: "border-yellow-500 bg-yellow-50 text-yellow-800",
    headerClass: "bg-yellow-500 text-slate-950",
    title: "Moderate - See a Doctor",
    icon: "\u26A0\uFE0F",
    description:
      "Your symptoms should be reviewed by a doctor within the next 24-48 hours."
  },
  RED: {
    panelClass: "border-red-500 bg-red-50 text-red-800",
    headerClass: "bg-red-600 text-white",
    title: "Emergency - Seek Care NOW",
    icon: "\u{1F6A8}",
    description:
      "Your symptoms may represent a potentially life-threatening condition and need immediate care."
  }
} as const;

const medicationSafetyTips = [
  "Do not start any prescription medicine unless it was prescribed to you by a licensed clinician for this exact problem.",
  "If you already use over-the-counter pain or fever medicine safely, use only the package label directions and stop if symptoms worsen.",
  "Do not mix medicines, double doses, or take someone else's medicine. If symptoms worsen, contact a clinician or pharmacist promptly."
] as const;

type PdfSection = {
  title: string;
  lines: string[];
};

function wrapCanvasLine(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (context.measureText(word).width <= maxWidth) {
      currentLine = word;
      continue;
    }

    let chunk = "";
    for (const char of Array.from(word)) {
      const nextChunk = `${chunk}${char}`;
      if (!chunk || context.measureText(nextChunk).width <= maxWidth) {
        chunk = nextChunk;
      } else {
        lines.push(chunk);
        chunk = char;
      }
    }
    currentLine = chunk;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [normalized];
}

function buildPdfCanvas(sections: PdfSection[]) {
  const canvas = document.createElement("canvas");
  const width = 1240;
  const padding = 56;
  const contentWidth = width - padding * 2;
  const fontFamily = '"Segoe UI", "Nirmala UI", Tahoma, Arial, sans-serif';

  const render = (measureOnly: boolean) => {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }

    context.textBaseline = "top";
    context.direction = "inherit";

    if (!measureOnly) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    let y = 56;

    const drawWrappedLines = (
      text: string,
      font: string,
      color: string,
      lineHeight: number
    ) => {
      context.font = font;
      const wrappedLines = wrapCanvasLine(context, text, contentWidth);
      for (const line of wrappedLines) {
        if (!measureOnly) {
          context.fillStyle = color;
          context.fillText(line, padding, y);
        }
        y += lineHeight;
      }
    };

    drawWrappedLines(
      "MedLens - Pre-Visit Summary",
      `700 40px ${fontFamily}`,
      "#006fcb",
      52
    );

    drawWrappedLines(
      "This is an AI-generated triage summary, NOT a medical diagnosis.",
      `400 20px ${fontFamily}`,
      "#6e7681",
      30
    );

    y += 8;
    if (!measureOnly) {
      context.strokeStyle = "#d2dae2";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(padding, y);
      context.lineTo(width - padding, y);
      context.stroke();
    }
    y += 24;

    for (const section of sections) {
      drawWrappedLines(`${section.title}:`, `700 24px ${fontFamily}`, "#182738", 34);
      for (const line of section.lines) {
        drawWrappedLines(line, `400 22px ${fontFamily}`, "#25374b", 32);
      }
      y += 18;
    }

    drawWrappedLines(
      "DISCLAIMER: This summary was generated by MedLens, an AI tool. It is NOT a diagnosis. Please share this with your healthcare provider for proper evaluation.",
      `400 18px ${fontFamily}`,
      "#5a626c",
      26
    );

    return y + 32;
  };

  canvas.width = width;
  canvas.height = render(true);
  render(false);

  return canvas;
}

function buildFollowUpSymptoms(
  existingSymptoms: string,
  questions: string[],
  answers: string[]
) {
  const answeredPairs = questions
    .map((question, index) => ({
      question,
      answer: answers[index]?.trim() ?? ""
    }))
    .filter((entry) => entry.answer.length > 0);

  if (!answeredPairs.length) {
    return existingSymptoms.trim();
  }

  const followUpBlock = answeredPairs
    .map(
      (entry, index) =>
        `Follow-up ${index + 1}: ${entry.question}\nAnswer: ${entry.answer}`
    )
    .join("\n\n");

  return `${existingSymptoms.trim()}\n\nAdditional follow-up details:\n${followUpBlock}`;
}
export function TriageForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [doctorSummaryOpen, setDoctorSummaryOpen] = useState(false);

  const placeholder =
    form.mode === "self"
      ? "e.g., I've had a headache for 3 days with some nausea and blurred vision..."
      : "e.g., My mother has been experiencing chest tightness and fatigue for 2 days...";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.symptoms.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      symptoms: form.symptoms.trim(),
      mode: form.mode,
      language: form.language,
      ...(form.mode === "caregiver" && form.patientName.trim()
        ? { patientName: form.patientName.trim() }
        : {}),
      ...(form.mode === "caregiver" && form.patientAge
        ? { patientAge: Number(form.patientAge) }
        : {}),
      ...(form.mode === "caregiver" && form.patientSex
        ? { patientSex: form.patientSex }
        : {})
    };

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as Partial<TriageResponse> & { message?: string };

      if (!response.ok) {
        throw new Error();
      }

      const triageResult = data as TriageResponse;
      const deviceId = getOrCreateDeviceId();
      const session: TriageSession = {
        id: createSessionId(),
        userId: deviceId,
        symptoms: form.symptoms.trim(),
        triage_level: triageResult.triage_level,
        confidence: triageResult.confidence,
        reasoning: triageResult.reasoning,
        timestamp: new Date().toISOString(),
        mode: form.mode,
        patientName:
          form.mode === "caregiver" && form.patientName.trim()
            ? form.patientName.trim()
            : undefined,
        patientAge:
          form.mode === "caregiver" && form.patientAge
            ? Number(form.patientAge)
            : undefined,
        patientSex:
          form.mode === "caregiver" && form.patientSex
            ? form.patientSex
            : undefined,
        language: form.language,
        doctor_summary: triageResult.doctor_summary,
        follow_up_questions: triageResult.follow_up_questions,
        self_care_tips: triageResult.self_care_tips,
        disclaimer: triageResult.disclaimer,
        was_emergency_override: triageResult.was_emergency_override
      };

      setResult(triageResult);
      setFollowUpAnswers(triageResult.follow_up_questions.map(() => ""));
      setFollowUpError(null);
      setDoctorSummaryOpen(triageResult.triage_level === "RED");
      persistTriageSession(session);

      try {
        void fetch("/api/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(session)
        }).catch(() => undefined);
      } catch {
        // Fire-and-forget history sync should never block the UI.
      }
    } catch {
      setError(
        "We could not analyze symptoms right now. Please try again. If this may be an emergency, call 112 immediately."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowUpSubmit() {
    if (!result) {
      return;
    }

    const enhancedSymptoms = buildFollowUpSymptoms(
      form.symptoms.trim(),
      result.follow_up_questions,
      followUpAnswers
    );

    if (enhancedSymptoms === form.symptoms.trim()) {
      setFollowUpError("Answer at least one follow-up question before updating the assessment.");
      return;
    }

    setLoading(true);
    setError(null);
    setFollowUpError(null);

    const payload = {
      symptoms: enhancedSymptoms,
      mode: form.mode,
      language: form.language,
      ...(form.mode === "caregiver" && form.patientName.trim()
        ? { patientName: form.patientName.trim() }
        : {}),
      ...(form.mode === "caregiver" && form.patientAge
        ? { patientAge: Number(form.patientAge) }
        : {}),
      ...(form.mode === "caregiver" && form.patientSex
        ? { patientSex: form.patientSex }
        : {})
    };

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as Partial<TriageResponse> & { message?: string };

      if (!response.ok) {
        throw new Error();
      }

      const triageResult = data as TriageResponse;
      const deviceId = getOrCreateDeviceId();
      const session: TriageSession = {
        id: createSessionId(),
        userId: deviceId,
        symptoms: enhancedSymptoms,
        triage_level: triageResult.triage_level,
        confidence: triageResult.confidence,
        reasoning: triageResult.reasoning,
        timestamp: new Date().toISOString(),
        mode: form.mode,
        patientName:
          form.mode === "caregiver" && form.patientName.trim()
            ? form.patientName.trim()
            : undefined,
        patientAge:
          form.mode === "caregiver" && form.patientAge
            ? Number(form.patientAge)
            : undefined,
        patientSex:
          form.mode === "caregiver" && form.patientSex
            ? form.patientSex
            : undefined,
        language: form.language,
        doctor_summary: triageResult.doctor_summary,
        follow_up_questions: triageResult.follow_up_questions,
        self_care_tips: triageResult.self_care_tips,
        disclaimer: triageResult.disclaimer,
        was_emergency_override: triageResult.was_emergency_override
      };

      setForm((current) => ({
        ...current,
        symptoms: enhancedSymptoms
      }));
      setResult(triageResult);
      setFollowUpAnswers(triageResult.follow_up_questions.map(() => ""));
      setFollowUpError(null);
      setFollowUpAnswers(triageResult.follow_up_questions.map(() => ""));
      setDoctorSummaryOpen(triageResult.triage_level === "RED");
      persistTriageSession(session);

      try {
        void fetch("/api/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(session)
        }).catch(() => undefined);
      } catch {
        // Fire-and-forget history sync should never block the UI.
      }
    } catch {
      setFollowUpError(
        "We could not update the assessment right now. If this may be an emergency, call 112 immediately."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!result) {
      return;
    }

    const { jsPDF } = await import("jspdf");
    const sections: PdfSection[] = [
      {
        title: "Generated",
        lines: [formatTimestamp(new Date().toISOString())]
      },
      {
        title: "Reported Symptoms",
        lines: [form.symptoms.trim()]
      },
      {
        title: "Triage Level",
        lines: [`${result.triage_level} (${result.confidence}% confidence)`]
      },
      {
        title: "Reasoning",
        lines: [result.reasoning]
      },
      {
        title: "Doctor Summary",
        lines: [result.doctor_summary]
      },
      {
        title: "Self-Care Recommendations",
        lines: result.self_care_tips.map((tip, index) => `${index + 1}. ${tip}`)
      }
    ];

    const canvas = buildPdfCanvas(sections);
    const imageData = canvas.toDataURL("image/png", 1);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 28;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const imageHeight = (canvas.height * printableWidth) / canvas.width;

    let heightLeft = imageHeight;
    let position = margin;

    doc.addImage(imageData, "PNG", margin, position, printableWidth, imageHeight, undefined, "FAST");
    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      doc.addPage();
      position = margin - (imageHeight - heightLeft);
      doc.addImage(imageData, "PNG", margin, position, printableWidth, imageHeight, undefined, "FAST");
      heightLeft -= printableHeight;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    doc.save(`MedLens-Summary-${timestamp}.pdf`);
  }
  function handleNewCheck() {
    setError(null);
    setFollowUpError(null);
    setFollowUpAnswers([]);
    setDoctorSummaryOpen(false);
    setResult(null);
    setForm(initialForm);
  }

  function appendTranscript(transcript: string) {
    setForm((current) => ({
      ...current,
      symptoms: current.symptoms.trim()
        ? `${current.symptoms.trim()} ${transcript}`
        : transcript
    }));
  }

  const showResults = result !== null;
  const currentTheme = result ? resultTheme[result.triage_level] : null;

  return (
    <AnimatePresence mode="wait">
      {!showResults ? (
        <motion.form
          key="triage-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="panel-strong space-y-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-label="Use symptom checker for myself"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  mode: "self",
                  patientName: "",
                  patientAge: "",
                  patientSex: ""
                }))
              }
              className={cn(
                "rounded-3xl border px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                form.mode === "self"
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-700"
              )}
            >
              <div className="text-lg font-semibold">{"\u{1F9D1}"} For Myself</div>
            </button>
            <button
              type="button"
              aria-label="Use symptom checker for someone else"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  mode: "caregiver"
                }))
              }
              className={cn(
                "rounded-3xl border px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                form.mode === "caregiver"
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-700"
              )}
            >
              <div className="text-lg font-semibold">{"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}"} For Someone Else</div>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {form.mode === "caregiver" ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-1">
                  <label htmlFor="patientName" className="text-sm font-semibold text-slate-900">
                    Patient Name
                  </label>
                  <input
                    id="patientName"
                    type="text"
                    maxLength={100}
                    value={form.patientName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        patientName: event.target.value
                      }))
                    }
                    placeholder="e.g., John Doe"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                </div>
                <div className="grid gap-4 pt-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="patientAge" className="text-sm font-semibold text-slate-900">
                      Patient Age
                    </label>
                    <input
                      id="patientAge"
                      type="number"
                      min={0}
                      max={120}
                      value={form.patientAge}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          patientAge: event.target.value
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="patientSex" className="text-sm font-semibold text-slate-900">
                      Patient Sex
                    </label>
                    <select
                      id="patientSex"
                      value={form.patientSex}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          patientSex: event.target.value as FormState["patientSex"]
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="space-y-2">
            <label htmlFor="language" className="text-sm font-semibold text-slate-900">
              Language
            </label>
            <select
              id="language"
              value={form.language}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  language: event.target.value as FormState["language"]
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="symptoms" className="text-sm font-semibold text-slate-900">
              Symptoms
            </label>
            <textarea
              id="symptoms"
              aria-label="Describe your symptoms"
              rows={4}
              maxLength={2000}
              value={form.symptoms}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  symptoms: event.target.value
                }))
              }
              placeholder={placeholder}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <div className="text-right text-xs text-slate-500">
              {form.symptoms.length}/2000
            </div>
          </div>

          <VoiceInput language={form.language} onTranscript={appendTranscript} />

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            aria-label="Check symptoms"
            disabled={!form.symptoms.trim() || loading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all duration-200 hover:-translate-y-px hover:bg-brand-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {loading ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Analyzing symptoms...</span>
              </>
            ) : (
              <span>{"\u{1F50D}"} Check Symptoms</span>
            )}
          </button>
        </motion.form>
      ) : (
        <motion.div
          key="triage-results"
          initial={{ opacity: 0, y: 28, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="space-y-5"
          aria-live="polite"
        >
          {result?.triage_level === "RED" ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-red-200 bg-red-50 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="relative mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xl text-red-700">
                    <span className="absolute inline-flex h-10 w-10 animate-pulse rounded-full bg-red-300/60" />
                    <span className="relative">{"\u{1F6A8}"}</span>
                  </div>
                  <p className="max-w-2xl text-sm leading-7 text-red-900">
                    Emergency Detected - Your symptoms suggest a potentially
                    life-threatening condition. Please seek emergency medical care
                    immediately.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href="tel:112"
                    aria-label="Call emergency services 112"
                    className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  >
                    {"\u{1F4DE}"} Call 112
                  </a>
                  <Link
                    href="/map"
                    aria-label="Find nearest emergency room"
                    className="inline-flex items-center justify-center rounded-full border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition-colors duration-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  >
                    {"\u{1F4CD}"} Nearest Emergency Room
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : null}

          {result && currentTheme ? (
            <div className={cn("panel-strong overflow-hidden border p-0", currentTheme.panelClass)}>
              <div className={cn("p-5 sm:p-6", currentTheme.headerClass)}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">
                      {currentTheme.icon} Triage Result
                    </p>
                    <h2 className="text-2xl font-semibold">{currentTheme.title}</h2>
                    <p className="max-w-2xl text-sm leading-7 opacity-95">
                      {currentTheme.description}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-white/20 px-4 py-3 text-center backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] opacity-90">
                      Confidence
                    </p>
                    <p className="mt-1 text-3xl font-bold">{result.confidence}%</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 bg-white p-5 sm:p-6">
                {result.was_emergency_override ? (
                  <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                    {"\u26A1"} This result was triggered by an emergency keyword override.
                  </div>
                ) : null}

                <section className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {"\u{1F9E0}"} AI Assessment
                  </h3>
                  <p className="result-subpanel rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {result.reasoning}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {"\u{1F48A}"} Recommendations
                  </h3>
                  <ul className="result-subpanel result-subpanel-success rounded-3xl bg-green-50 p-4 text-sm leading-7 text-slate-700">
                    {result.self_care_tips.map((tip) => (
                      <li key={tip}>- {tip}</li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Medication Safety
                  </h3>
                  <ul className="result-subpanel result-subpanel-warning rounded-3xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-7 text-slate-700">
                    {medicationSafetyTips.map((tip) => (
                      <li key={tip}>- {tip}</li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {"\u2753"} Questions for Better Assessment
                  </h3>
                  {result.follow_up_questions.length ? (
                    <>
                      <ol className="result-subpanel result-subpanel-brand rounded-3xl bg-brand-50 p-4 text-sm leading-7 text-slate-700">
                        {result.follow_up_questions.map((question, index) => (
                          <li key={question}>{index + 1}. {question}</li>
                        ))}
                      </ol>

                      <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm leading-7 text-slate-600">
                          Add answers below and MedLens will update the assessment using your new details.
                        </p>
                        {result.follow_up_questions.map((question, index) => (
                          <div key={`${question}-${index}`} className="space-y-2">
                            <label
                              htmlFor={`follow-up-answer-${index}`}
                              className="text-sm font-semibold text-slate-900"
                            >
                              Answer {index + 1}
                            </label>
                            <textarea
                              id={`follow-up-answer-${index}`}
                              aria-label={`Answer for follow-up question ${index + 1}`}
                              rows={3}
                              value={followUpAnswers[index] ?? ""}
                              onChange={(event) => {
                                const nextAnswers = [...followUpAnswers];
                                nextAnswers[index] = event.target.value;
                                setFollowUpAnswers(nextAnswers);
                              }}
                              placeholder={question}
                              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            />
                          </div>
                        ))}
                        {followUpError ? (
                          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                            {followUpError}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          aria-label="Update assessment using follow-up answers"
                          onClick={handleFollowUpSubmit}
                          disabled={loading}
                          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                        >
                          {loading ? (
                            <>
                              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              <span>Updating assessment...</span>
                            </>
                          ) : (
                            <span>Update Assessment</span>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="result-subpanel rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                      No follow-up questions were asked because the emergency override already identified a high-risk term.
                    </div>
                  )}
                </section>

                <section className="space-y-2">
                  <button
                    type="button"
                    aria-label={doctorSummaryOpen ? "Collapse doctor summary" : "Expand doctor summary"}
                    onClick={() => setDoctorSummaryOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left text-lg font-semibold text-slate-900 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  >
                    <span>{"\u{1F468}\u200D\u2695\uFE0F"} Doctor Summary</span>
                    <span>{doctorSummaryOpen ? "-" : "+"}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {doctorSummaryOpen ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="result-subpanel rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                          {result.doctor_summary}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </section>

                <div className="rounded-3xl border border-slate-200 bg-slate-100 p-4 text-sm leading-7 text-slate-600">
                  {result.disclaimer}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/map"
              aria-label="Find nearest clinic"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {"\u{1F4CD}"} Find Nearest Clinic
            </Link>
            <button
              type="button"
              aria-label="Download triage summary as PDF"
              onClick={handleDownloadPdf}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-brand-300 bg-white px-5 py-3 text-sm font-semibold text-brand-700 transition-colors duration-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {"\u{1F4C4}"} Download PDF
            </button>
            <button
              type="button"
              aria-label="Start a new symptom check"
              onClick={handleNewCheck}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {"\u{1F504}"} New Check
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}











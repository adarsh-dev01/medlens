"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { loadTriageSessions, removeTriageSession } from "@/lib/storage";
import type { TriageSession } from "@/lib/types";
import { formatTimestamp, getOrCreateDeviceId } from "@/lib/utils";

type TimelinePoint = {
  id: string;
  shortDate: string;
  fullDate: string;
  riskScore: number;
  triageLevel: TriageSession["triage_level"];
  confidence: number;
  symptoms: string;
  reasoning: string;
  timestamp: string;
  color: string;
};

const riskScoreMap: Record<TriageSession["triage_level"], number> = {
  GREEN: 1,
  YELLOW: 2,
  RED: 3
};

const riskColorMap: Record<TriageSession["triage_level"], string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#dc2626"
};

const stopWords = new Set([
  "a",
  "about",
  "after",
  "all",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "been",
  "but",
  "by",
  "day",
  "days",
  "else",
  "elsewhere",
  "feeling",
  "for",
  "from",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "his",
  "i",
  "im",
  "in",
  "into",
  "is",
  "it",
  "its",
  "ive",
  "just",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "since",
  "some",
  "someone",
  "started",
  "still",
  "than",
  "that",
  "the",
  "their",
  "them",
  "there",
  "they",
  "this",
  "to",
  "today",
  "two",
  "up",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "with",
  "yesterday",
  "you",
  "your"
]);

function StatsCard({
  label,
  value,
  className
}: {
  label: string;
  value: ReactNode;
  className: string;
}) {
  return (
    <div className={`rounded-3xl px-4 py-4 ${className}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="panel-strong space-y-4">
        <div className="skeleton h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
        <div className="skeleton h-80 w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
      <div className="space-y-4">
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
      </div>
    </div>
  );
}

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

function buildHistoryPdfCanvas(sessions: TriageSession[]) {
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
      "MedLens - History Report",
      `700 40px ${fontFamily}`,
      "#006fcb",
      52
    );
    drawWrappedLines(
      "Selected triage sessions for sharing. This is AI-generated guidance, not a diagnosis.",
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

    sessions.forEach((session, index) => {
      drawWrappedLines(
        `Report ${index + 1} - ${session.triage_level} (${session.confidence}% confidence)`,
        `700 24px ${fontFamily}`,
        "#182738",
        34
      );
      drawWrappedLines(
        `Generated: ${formatTimestamp(session.timestamp)}`,
        `400 20px ${fontFamily}`,
        "#25374b",
        28
      );
      drawWrappedLines(
        `Symptoms: ${session.symptoms}`,
        `400 20px ${fontFamily}`,
        "#25374b",
        28
      );
      drawWrappedLines(
        `Reasoning: ${session.reasoning}`,
        `400 20px ${fontFamily}`,
        "#25374b",
        28
      );
      drawWrappedLines(
        `Doctor Summary: ${session.doctor_summary}`,
        `400 20px ${fontFamily}`,
        "#25374b",
        28
      );
      drawWrappedLines(
        `Self-Care Tips: ${session.self_care_tips.join(" | ")}`,
        `400 20px ${fontFamily}`,
        "#25374b",
        28
      );
      drawWrappedLines(
        `Disclaimer: ${session.disclaimer}`,
        `400 18px ${fontFamily}`,
        "#5a626c",
        26
      );
      y += 18;
    });

    return y + 32;
  };

  canvas.width = width;
  canvas.height = render(true);
  render(false);

  return canvas;
}

async function downloadHistoryPdf(sessions: TriageSession[], filenamePrefix: string) {
  if (!sessions.length) {
    return;
  }

  const { jsPDF } = await import("jspdf");
  const canvas = buildHistoryPdfCanvas(sessions);
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
  doc.save(`${filenamePrefix}-${timestamp}.pdf`);
}

function normalizeSymptomsForAnalytics(symptoms: string) {
  return symptoms
    .replace(/Additional follow-up details:[\s\S]*/i, "")
    .replace(/Follow-up\s+\d+:/gi, "")
    .replace(/Answer:/gi, "")
    .trim();
}

function getMostCommonSymptomKeyword(sessions: TriageSession[]) {
  const counts = new Map<string, number>();

  sessions.forEach((session) => {
    const tokens = normalizeSymptomsForAnalytics(session.symptoms)
      .toLowerCase()
      .match(/[a-zA-Z]+/g)
      ?.filter((token) => token.length >= 4 && !stopWords.has(token)) ?? [];

    tokens.forEach((token) => {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    });
  });

  const mostCommon = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return mostCommon ? mostCommon[0] : "No clear pattern";
}

function TimelineTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload: TimelinePoint }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {point.fullDate}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {point.triageLevel} risk ({point.confidence}% confidence)
      </p>
      <p className="mt-1 text-xs leading-6 text-slate-600">Tap or click to view full details.</p>
    </div>
  );
}

function renderRiskDot(props: {
  cx?: number;
  cy?: number;
  payload?: TimelinePoint;
}) {
  const { cx, cy, payload } = props;
  if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
    return null;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={payload.color}
      stroke="#ffffff"
      strokeWidth={2}
      className="cursor-pointer"
    />
  );
}

export function HistoryClient() {
  const [sessions, setSessions] = useState<TriageSession[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const userId = getOrCreateDeviceId();
        const response = await fetch(`/api/history?userId=${encodeURIComponent(userId)}`, {
          signal: controller.signal,
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error();
        }

        const data = (await response.json()) as { sessions: TriageSession[] };
        const remoteSessions = (data.sessions ?? []).map((session) => ({
          ...session,
          timestamp: session.timestamp ?? new Date().toISOString()
        }));
        const nextSessions = remoteSessions.length ? remoteSessions : loadTriageSessions();
        setSessions(nextSessions);
        setSelectedIds(nextSessions.map((session) => session.id));
      } catch (caughtError) {
        if ((caughtError as Error).name === "AbortError") {
          return;
        }

        const localSessions = loadTriageSessions();
        setSessions(localSessions);
        setSelectedIds(localSessions.map((session) => session.id));
        setError(
          "We could not load synced history right now. Showing any sessions saved locally on this device."
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    return {
      total: sessions.length,
      green: sessions.filter((session) => session.triage_level === "GREEN").length,
      yellow: sessions.filter((session) => session.triage_level === "YELLOW").length,
      red: sessions.filter((session) => session.triage_level === "RED").length,
      commonKeyword: getMostCommonSymptomKeyword(sessions)
    };
  }, [sessions]);

  const timelineData = useMemo<TimelinePoint[]>(() => {
    const shortFormatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric"
    });

    return [...sessions]
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      .map((session) => ({
        id: session.id,
        shortDate: shortFormatter.format(new Date(session.timestamp)),
        fullDate: formatTimestamp(session.timestamp),
        riskScore: riskScoreMap[session.triage_level],
        triageLevel: session.triage_level,
        confidence: session.confidence,
        symptoms: session.symptoms,
        reasoning: session.reasoning,
        timestamp: session.timestamp,
        color: riskColorMap[session.triage_level]
      }));
  }, [sessions]);

  const selectedSessions = useMemo(
    () => sessions.filter((session) => selectedIds.includes(session.id)),
    [selectedIds, sessions]
  );

  const selectedTimelinePoint = useMemo(
    () => timelineData.find((point) => point.id === selectedTimelineId) ?? null,
    [selectedTimelineId, timelineData]
  );

  const recentYellowCount = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sessions.filter(
      (session) =>
        session.triage_level === "YELLOW" &&
        new Date(session.timestamp).getTime() >= oneWeekAgo
    ).length;
  }, [sessions]);

  async function handleDownloadAllPdf() {
    if (!sessions.length) {
      return;
    }

    setDownloading(true);

    try {
      await downloadHistoryPdf(sessions, "MedLens-History-All");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadSelectedPdf() {
    if (!selectedSessions.length) {
      return;
    }

    setDownloading(true);

    try {
      await downloadHistoryPdf(selectedSessions, "MedLens-History-Selected");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDeleteSession(session: TriageSession) {
    const shouldDelete = window.confirm("Delete this symptom report from your history?");
    if (!shouldDelete) {
      return;
    }

    setError(null);
    setDeletingId(session.id);
    setSessions((current) => current.filter((entry) => entry.id !== session.id));
    setSelectedIds((current) => current.filter((id) => id !== session.id));
    setSelectedTimelineId((current) => (current === session.id ? null : current));
    removeTriageSession(session);

    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: session.id,
          userId: session.userId || getOrCreateDeviceId()
        })
      });

      if (!response.ok) {
        throw new Error();
      }
    } catch {
      setError(
        "We deleted the local copy, but the synced record could not be removed right now. It may reappear after refresh."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function toggleSessionSelection(sessionId: string) {
    setSelectedIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId]
    );
  }

  function handleTimelineClick(state: unknown) {
    const nextPoint = (state as { activePayload?: Array<{ payload: TimelinePoint }> } | undefined)
      ?.activePayload?.[0]?.payload;
    if (nextPoint) {
      setSelectedTimelineId(nextPoint.id);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!sessions.length) {
    return (
      <div className="panel-strong flex min-h-[22rem] flex-col items-center justify-center gap-3 text-center">
        <div className="text-5xl" aria-hidden="true">
          {"\u{1F4ED}"}
        </div>
        <h2 className="text-3xl font-semibold text-slate-900">No sessions yet</h2>
        <p className="max-w-xl text-sm leading-7 text-slate-600">
          Your triage history will appear here after your first symptom check.
        </p>
        <Link
          href="/triage"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Start First Check
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-3xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-900">
          {error}
        </div>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="panel-strong space-y-5"
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Health Risk Timeline</h2>
          <p className="text-sm leading-7 text-slate-600">
            Review how urgency levels have changed over time and tap a check to inspect the details.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatsCard label="Total checks" value={stats.total} className="bg-slate-100" />
          <StatsCard
            label="Most common symptom keyword"
            value={stats.commonKeyword}
            className="bg-emerald-50"
          />
        </div>

        {recentYellowCount >= 3 ? (
          <div className="rounded-3xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm font-medium text-yellow-900">
            Your symptoms have been recurring. Consider scheduling a medical consultation.
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="h-[20rem] w-full sm:h-[22rem]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timelineData}
                  margin={{ top: 12, right: 12, left: -20, bottom: 6 }}
                  onClick={(state) => handleTimelineClick(state)}
                >
                  <CartesianGrid stroke="#d7e2ea" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="shortDate"
                    minTickGap={18}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <YAxis
                    type="number"
                    domain={[1, 3]}
                    ticks={[1, 2, 3]}
                    allowDecimals={false}
                    tickFormatter={(value) =>
                      value === 1 ? "Green" : value === 2 ? "Yellow" : "Red"
                    }
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={{ stroke: "#cbd5e1" }}
                  />
                  <Tooltip content={<TimelineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="riskScore"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={renderRiskDot}
                    activeDot={{ r: 8, stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            {selectedTimelinePoint ? (
              <motion.div
                key={selectedTimelinePoint.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Selected Check
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{selectedTimelinePoint.fullDate}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedTimelinePoint.triageLevel === "GREEN"
                        ? "bg-green-500 text-white"
                        : selectedTimelinePoint.triageLevel === "YELLOW"
                          ? "bg-yellow-500 text-slate-950"
                          : "bg-red-600 text-white"
                    }`}
                  >
                    {selectedTimelinePoint.triageLevel}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">Symptoms</p>
                  <p className="mt-1 text-sm leading-7 text-slate-700">{selectedTimelinePoint.symptoms}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">Reasoning</p>
                  <p className="mt-1 text-sm leading-7 text-slate-700">{selectedTimelinePoint.reasoning}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">Confidence score</p>
                  <p className="mt-1 text-sm leading-7 text-slate-700">
                    {selectedTimelinePoint.confidence}% confidence
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
                <p className="text-lg font-semibold text-slate-900">Tap a point on the timeline</p>
                <p className="mt-2 max-w-sm text-sm leading-7 text-slate-600">
                  You will see the symptoms, triage level, reasoning, and confidence score for that session here.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Total sessions" value={stats.total} className="bg-slate-100" />
        <StatsCard label="Green count" value={stats.green} className="bg-green-50" />
        <StatsCard label="Yellow count" value={stats.yellow} className="bg-yellow-50" />
        <StatsCard label="Red count" value={stats.red} className="bg-red-50" />
      </div>

      <div className="panel-strong flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Download History Reports</h2>
          <p className="mt-1 text-sm leading-7 text-slate-600">
            Download every saved report in one click, or choose exactly which reports you want to keep in the PDF.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            aria-label="Download all history reports as one PDF"
            onClick={handleDownloadAllPdf}
            disabled={!sessions.length || downloading}
            className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {downloading ? "Preparing PDF..." : `Download All (${sessions.length})`}
          </button>
          <button
            type="button"
            aria-label="Select all history reports"
            onClick={() => setSelectedIds(sessions.map((session) => session.id))}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Select All
          </button>
          <button
            type="button"
            aria-label="Clear selected history reports"
            onClick={() => setSelectedIds([])}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Clear Selection
          </button>
          <button
            type="button"
            aria-label="Download selected history reports as PDF"
            onClick={handleDownloadSelectedPdf}
            disabled={!selectedSessions.length || downloading}
            className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors duration-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {downloading ? "Preparing PDF..." : `Download Selected (${selectedSessions.length})`}
          </button>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.08
            }
          }
        }}
        className="space-y-4"
      >
        {sessions.map((session) => {
          const isSelected = selectedIds.includes(session.id);
          const isDeleting = deletingId === session.id;

          return (
            <motion.article
              key={session.id}
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0 }
              }}
              className={isSelected ? "panel-strong ring-2 ring-brand-400" : "panel-strong"}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    id={`history-select-${session.id}`}
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSessionSelection(session.id)}
                    aria-label={`Select report from ${formatTimestamp(session.timestamp)}`}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="space-y-2">
                    <label htmlFor={`history-select-${session.id}`} className="block cursor-pointer">
                      <p className="line-clamp-2 text-sm leading-7 text-slate-800">
                        {session.symptoms}
                      </p>
                    </label>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      {isSelected ? "Included in PDF export" : "Excluded from PDF export"}
                    </p>
                    <p className="text-xs text-slate-500">{formatTimestamp(session.timestamp)}</p>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      session.triage_level === "GREEN"
                        ? "bg-green-500 text-white"
                        : session.triage_level === "YELLOW"
                          ? "bg-yellow-500 text-slate-950"
                          : "bg-red-600 text-white"
                    }`}
                  >
                    {session.triage_level === "GREEN"
                      ? "\u2705 GREEN"
                      : session.triage_level === "YELLOW"
                        ? "\u26A0\uFE0F YELLOW"
                        : "\u{1F6A8} RED"}
                  </span>
                  <p className="text-sm font-semibold text-slate-700">{session.confidence}% confidence</p>
                  <button
                    type="button"
                    aria-label={`Delete history report from ${formatTimestamp(session.timestamp)}`}
                    onClick={() => handleDeleteSession(session)}
                    disabled={isDeleting}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600">
                {session.reasoning}
              </p>
            </motion.article>
          );
        })}
      </motion.div>
    </div>
  );
}

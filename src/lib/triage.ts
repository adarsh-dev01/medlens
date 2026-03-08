import { z } from "zod";

import type { TriageRequest, TriageResponse } from "@/lib/types";

export const triageRequestSchema = z.object({
  symptoms: z.string().trim().min(8),
  mode: z.enum(["self", "caregiver"]),
  patientAge: z.number().int().min(0).max(120).optional(),
  patientSex: z.enum(["male", "female", "other"]).optional(),
  language: z.string().trim().min(2)
});

const urgentSignals = [
  "fever",
  "dehydration",
  "vomiting",
  "worsening",
  "pregnant",
  "severe pain",
  "persistent cough",
  "rash",
  "infection"
];

export async function generateTriageResponse(
  request: TriageRequest
): Promise<TriageResponse> {
  const normalizedSymptoms = request.symptoms.toLowerCase();
  const urgentMatch = urgentSignals.find((signal) =>
    normalizedSymptoms.includes(signal)
  );

  const triageLevel =
    urgentMatch || (request.patientAge !== undefined && (request.patientAge < 5 || request.patientAge > 65))
      ? "YELLOW"
      : "GREEN";

  return {
    triage_level: triageLevel,
    confidence: triageLevel === "YELLOW" ? 79 : 68,
    reasoning:
      triageLevel === "YELLOW"
        ? "The reported symptoms should be reviewed by a clinician soon because they may represent a moderate or persistent health concern."
        : "The symptoms do not include obvious emergency markers in this first-pass review, so self-care and monitoring may be reasonable if symptoms stay mild.",
    doctor_summary: `${request.mode === "caregiver" ? "Caregiver reports" : "Patient reports"} ${request.symptoms}. Primary triage recommendation is ${triageLevel}.`,
    follow_up_questions: [
      "When did the symptoms start?",
      "Are the symptoms getting worse?",
      "Are there any new warning signs such as trouble breathing or chest pain?"
    ],
    self_care_tips:
      triageLevel === "YELLOW"
        ? [
            "Arrange a clinician visit soon.",
            "Rest and stay hydrated.",
            "Seek urgent care faster if symptoms worsen."
          ]
        : [
            "Rest and stay hydrated.",
            "Monitor symptoms over the next 24 hours.",
            "Seek medical care if new warning signs appear."
          ],
    disclaimer:
      "MedLens provides informational triage support only and does not replace an in-person medical evaluation.",
    was_emergency_override: false,
    language: request.language
  };
}

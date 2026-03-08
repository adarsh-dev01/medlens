import type { TriageResponse } from "@/lib/types";

const emergencyKeywords = [
  "chest pain",
  "difficulty breathing",
  "can't breathe",
  "cannot breathe",
  "shortness of breath",
  "seizure",
  "seizures",
  "unconscious",
  "passed out",
  "not breathing",
  "suicidal",
  "want to die",
  "kill myself",
  "self harm",
  "severe bleeding",
  "won't stop bleeding",
  "uncontrolled bleeding",
  "stroke",
  "face drooping",
  "heart attack",
  "anaphylaxis",
  "throat swelling",
  "allergic reaction swelling",
  "overdose",
  "poisoning",
  "choking"
] as const;

type EmergencyOverrideResult = {
  isEmergency: boolean;
  matchedKeyword: string | null;
};

export function checkEmergencyOverride(input: string): EmergencyOverrideResult {
  const normalizedInput = input.toLowerCase();
  const matchedKeyword =
    emergencyKeywords.find((keyword) => normalizedInput.includes(keyword)) ?? null;

  return {
    isEmergency: matchedKeyword !== null,
    matchedKeyword
  };
}

export function buildEmergencyResponse(
  matchedKeyword: string,
  language: string
): TriageResponse {
  return {
    triage_level: "RED",
    confidence: 99,
    reasoning: `Emergency override triggered because the symptom description contains the high-risk phrase "${matchedKeyword}". This requires immediate emergency evaluation and must not wait for routine triage.`,
    doctor_summary: `URGENT: Emergency override triggered due to detected phrase "${matchedKeyword}". Patient should be directed to emergency services or the nearest emergency department immediately.`,
    follow_up_questions: [],
    self_care_tips: [
      "Call emergency services (911) immediately",
      "Do not wait - seek the nearest emergency room",
      "If someone is with you, ask them to drive you or call an ambulance"
    ],
    disclaimer:
      "This is a medical emergency warning. MedLens is not a substitute for emergency care. Seek immediate in-person emergency assistance or call 911 now.",
    was_emergency_override: true,
    language
  };
}

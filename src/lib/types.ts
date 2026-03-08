export interface TriageRequest {
  symptoms: string;
  mode: "self" | "caregiver";
  patientName?: string;
  patientAge?: number;
  patientSex?: "male" | "female" | "other";
  language: string;
}

export interface TriageResponse {
  triage_level: "GREEN" | "YELLOW" | "RED";
  confidence: number;
  reasoning: string;
  doctor_summary: string;
  follow_up_questions: string[];
  self_care_tips: string[];
  disclaimer: string;
  was_emergency_override: boolean;
  language: string;
}

export interface Clinic {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_km: number;
  place_id: string;
  rating: number;
  open_now: boolean;
}

export interface TriageSession {
  id: string;
  userId: string;
  symptoms: string;
  triage_level: "GREEN" | "YELLOW" | "RED";
  confidence: number;
  reasoning: string;
  timestamp: string;
  mode: TriageRequest["mode"];
  patientName?: string;
  patientAge?: number;
  patientSex?: TriageRequest["patientSex"];
  language: string;
  doctor_summary: string;
  follow_up_questions: string[];
  self_care_tips: string[];
  disclaimer: string;
  was_emergency_override: boolean;
}

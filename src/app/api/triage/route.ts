import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  buildEmergencyResponse,
  checkEmergencyOverride
} from "@/lib/emergencyOverride";
import { MEDLENS_SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { generateTriageResponse } from "@/lib/triage";
import type { TriageResponse } from "@/lib/types";

const requestSchema = z.object({
  symptoms: z.string().trim().min(1, "Symptoms are required."),
  mode: z.enum(["self", "caregiver"]),
  patientAge: z.coerce.number().int().min(0).max(120).optional(),
  patientSex: z.enum(["male", "female", "other"]).optional(),
  language: z.string().trim().min(1).default("en")
});

const modelResponseSchema = z.object({
  triage_level: z.enum(["GREEN", "YELLOW", "RED"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  doctor_summary: z.string().min(1),
  follow_up_questions: z.array(z.string()),
  self_care_tips: z.array(z.string())
});

const geminiResponseSchema = {
  type: "object",
  properties: {
    triage_level: {
      type: "string",
      enum: ["GREEN", "YELLOW", "RED"],
      description: "Exactly one urgency level."
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Confidence score from 0 to 100."
    },
    reasoning: {
      type: "string",
      description: "Plain-language explanation of the urgency assessment."
    },
    doctor_summary: {
      type: "string",
      description: "A concise doctor-ready summary."
    },
    follow_up_questions: {
      type: "array",
      items: {
        type: "string"
      },
      maxItems: 3,
      description: "Up to three clarifying follow-up questions."
    },
    self_care_tips: {
      type: "array",
      items: {
        type: "string"
      },
      minItems: 3,
      maxItems: 3,
      description: "Exactly three self-care tips."
    }
  },
  required: [
    "triage_level",
    "confidence",
    "reasoning",
    "doctor_summary",
    "follow_up_questions",
    "self_care_tips"
  ],
  additionalProperties: false
} as const;

const MEDLENS_DISCLAIMER =
  "MedLens is an AI-powered symptom triage tool for informational purposes only. It is NOT a medical diagnosis. Always consult a qualified healthcare professional. If this may be an emergency, call 911 immediately.";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

async function buildFallbackResponse(
  language: string,
  requestData: z.infer<typeof requestSchema>
): Promise<TriageResponse> {
  const heuristicResponse = await generateTriageResponse({
    symptoms: requestData.symptoms,
    mode: requestData.mode,
    patientAge: requestData.patientAge,
    patientSex: requestData.patientSex,
    language
  });

  return {
    ...heuristicResponse,
    reasoning: `${heuristicResponse.reasoning} The AI service is currently unavailable, so this result is based on MedLens safety fallback logic. If symptoms worsen or this may be an emergency, call 911 immediately.`,
    doctor_summary: `${heuristicResponse.doctor_summary} AI service unavailable; fallback safety logic used.`,
    disclaimer: MEDLENS_DISCLAIMER,
    was_emergency_override: false,
    language
  };
}

function normalizeModelResponse(
  parsed: z.infer<typeof modelResponseSchema>,
  language: string
): TriageResponse {
  return {
    triage_level: parsed.triage_level,
    confidence: Math.round(parsed.confidence),
    reasoning: parsed.reasoning,
    doctor_summary: parsed.doctor_summary,
    follow_up_questions: parsed.follow_up_questions.slice(0, 3),
    self_care_tips: parsed.self_care_tips.slice(0, 3),
    disclaimer: MEDLENS_DISCLAIMER,
    was_emergency_override: false,
    language
  };
}

function buildUserPrompt(input: z.infer<typeof requestSchema>) {
  return [
    "Return only a JSON object that matches the provided schema.",
    `Mode: ${input.mode}`,
    `Symptoms: ${input.symptoms}`,
    `Patient age: ${input.patientAge ?? "not provided"}`,
    `Patient sex: ${input.patientSex ?? "not provided"}`,
    `Language: ${input.language}`,
    "Duration: not explicitly provided unless mentioned in the symptoms text."
  ].join("\n");
}

function parseModelJson(rawContent: string) {
  const trimmed = rawContent.trim();
  const withoutCodeFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(withoutCodeFence);
}

async function requestGeminiResponseWithRetry(input: z.infer<typeof requestSchema>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestGeminiResponse(input);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  throw lastError;
}
async function requestGeminiResponse(input: z.infer<typeof requestSchema>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API key.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: MEDLENS_SYSTEM_PROMPT
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildUserPrompt(input)
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: "application/json",
          responseJsonSchema: geminiResponseSchema
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error("Gemini request failed.");
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const rawContent = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!rawContent) {
    throw new Error("Gemini returned an empty response.");
  }

  return modelResponseSchema.parse(parseModelJson(rawContent));
}

export async function POST(request: Request) {
  let parsedRequest: z.infer<typeof requestSchema>;

  try {
    const body = await request.json();
    parsedRequest = requestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Invalid triage request payload.",
          issues: error.flatten()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Request body must be valid JSON."
      },
      { status: 400 }
    );
  }

  const override = checkEmergencyOverride(parsedRequest.symptoms);
  if (override.isEmergency && override.matchedKeyword) {
    return NextResponse.json(
      buildEmergencyResponse(override.matchedKeyword, parsedRequest.language)
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      await buildFallbackResponse(parsedRequest.language, parsedRequest)
    );
  }

  try {
    const parsedModelResponse = await requestGeminiResponseWithRetry(parsedRequest);
    return NextResponse.json(
      normalizeModelResponse(parsedModelResponse, parsedRequest.language)
    );
  } catch {
    return NextResponse.json(
      await buildFallbackResponse(parsedRequest.language, parsedRequest)
    );
  }
}



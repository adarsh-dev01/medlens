import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteTriageSession, getTriageHistory, logTriageSession } from "@/lib/firebase";

const historySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  symptoms: z.string().min(1),
  triage_level: z.enum(["GREEN", "YELLOW", "RED"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  timestamp: z.string().min(1),
  mode: z.enum(["self", "caregiver"]),
  patientAge: z.number().int().min(0).max(120).optional(),
  patientSex: z.enum(["male", "female", "other"]).optional(),
  language: z.string().min(1),
  doctor_summary: z.string().min(1),
  follow_up_questions: z.array(z.string()),
  self_care_tips: z.array(z.string()),
  disclaimer: z.string().min(1).optional(),
  was_emergency_override: z.boolean()
});

const deleteSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = historySchema.parse(payload);
    const sessionId = await logTriageSession(parsed);

    return NextResponse.json({ success: true, sessionId });
  } catch {
    return NextResponse.json(
      {
        message: "Unable to save triage history right now."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await request.json();
    const parsed = deleteSchema.parse(payload);
    const result = await deleteTriageSession(parsed.sessionId, parsed.userId);

    return NextResponse.json({ success: true, deleted: result.deleted });
  } catch {
    return NextResponse.json(
      {
        message: "Unable to delete triage history right now."
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      {
        message: "userId query parameter is required."
      },
      { status: 400 }
    );
  }

  try {
    const sessions = await getTriageHistory(userId);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json(
      {
        message: "Unable to load triage history right now."
      },
      { status: 500 }
    );
  }
}

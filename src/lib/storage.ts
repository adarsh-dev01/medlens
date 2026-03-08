import type { TriageSession } from "@/lib/types";

const TRIAGE_HISTORY_KEY = "medlens-triage-history";

export function loadTriageSessions(): TriageSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TRIAGE_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const sessions = JSON.parse(raw) as TriageSession[];
    return sessions.sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    );
  } catch {
    return [];
  }
}

export function persistTriageSession(session: TriageSession) {
  if (typeof window === "undefined") {
    return;
  }

  const existingSessions = loadTriageSessions();
  const nextSessions = [session, ...existingSessions];
  window.localStorage.setItem(TRIAGE_HISTORY_KEY, JSON.stringify(nextSessions));
}

export function removeTriageSession(sessionToRemove: Pick<TriageSession, "id" | "symptoms" | "timestamp">) {
  if (typeof window === "undefined") {
    return;
  }

  const remainingSessions = loadTriageSessions().filter((session) => {
    if (session.id === sessionToRemove.id) {
      return false;
    }

    return !(
      session.timestamp === sessionToRemove.timestamp &&
      session.symptoms === sessionToRemove.symptoms
    );
  });

  window.localStorage.setItem(TRIAGE_HISTORY_KEY, JSON.stringify(remainingSessions));
}

export function clearTriageSessions() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TRIAGE_HISTORY_KEY);
}

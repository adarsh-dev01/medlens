"use client";

import { useEffect, useState } from "react";

import {
  clearTriageSessions as clearStoredSessions,
  loadTriageSessions
} from "@/lib/storage";
import type { TriageSession } from "@/lib/types";

export function useTriageHistory() {
  const [sessions, setSessions] = useState<TriageSession[]>([]);

  useEffect(() => {
    setSessions(loadTriageSessions());
  }, []);

  return {
    sessions,
    clearSessions: () => {
      clearStoredSessions();
      setSessions([]);
    }
  };
}

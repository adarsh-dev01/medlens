export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
}

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") {
    return "device_server";
  }

  const existingId = window.localStorage.getItem("medlens_device_id");
  if (existingId) {
    return existingId;
  }

  const nextId = `device_${Math.random().toString(36).slice(2, 12)}`;
  window.localStorage.setItem("medlens_device_id", nextId);
  return nextId;
}

export function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

import { cn } from "@/lib/utils";

type LevelPillProps = {
  level: "GREEN" | "YELLOW" | "RED";
};

const styles = {
  GREEN: "border-green-500 bg-green-500 text-white",
  YELLOW: "border-yellow-500 bg-yellow-500 text-slate-950",
  RED: "border-red-600 bg-red-600 text-white"
} as const;

const labels = {
  GREEN: "\u2705 GREEN",
  YELLOW: "\u26A0\uFE0F YELLOW",
  RED: "\u{1F6A8} RED"
} as const;

export function LevelPill({ level }: LevelPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em]",
        styles[level]
      )}
    >
      {labels[level]}
    </span>
  );
}

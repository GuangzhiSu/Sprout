import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { Status, Tone } from "@/lib/tracking";

const icons: Record<Tone, typeof CircleCheck> = {
  good: CircleCheck,
  warning: TriangleAlert,
  critical: CircleAlert,
};

/**
 * Green / amber / red always ships with its icon and its word — the colour
 * alone never carries the meaning.
 */
export function StatusChip({ status, size }: { status: Status; size?: "sm" }) {
  const Icon = icons[status.tone];
  return (
    <span className={`status-chip status-chip--${status.tone}${size === "sm" ? " status-chip--sm" : ""}`}>
      <Icon aria-hidden="true" />
      {status.label}
    </span>
  );
}

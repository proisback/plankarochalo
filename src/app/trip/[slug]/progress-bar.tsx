import type { TripStatus } from "@/lib/types";

const STEPS = [
  { key: "dates_open", label: "Dates" },
  { key: "destination_open", label: "Destination" },
  { key: "commitment", label: "Commitment" },
  { key: "ready", label: "Ready" },
] as const;

export function ProgressBar({ currentStage }: { currentStage: TripStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex-1">
          <div
            className={`h-1.5 rounded-full transition-colors ${
              i <= currentIndex ? "bg-primary" : "bg-gray-200"
            }`}
          />
          <p
            className={`text-[10px] mt-1 text-center ${
              i === currentIndex
                ? "text-primary font-semibold"
                : i < currentIndex
                  ? "text-status-confirmed"
                  : "text-text-secondary"
            }`}
          >
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
}

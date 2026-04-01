import type { TripStatus } from "@/lib/types";

const STEPS = [
  { key: "dates_open", label: "Pick Dates" },
  { key: "destination_open", label: "Choose Place" },
  { key: "commitment", label: "Confirm" },
  { key: "ready", label: "Ready!" },
] as const;

export function ProgressBar({ currentStage }: { currentStage: TripStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex w-full">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFirst = i === 0;
        const isLast = i === STEPS.length - 1;

        // The line to the LEFT of this circle is colored if this step is completed or current
        // (meaning the previous step was completed)
        const leftLineActive = i > 0 && i <= currentIndex;
        // The line to the RIGHT is colored if the next step is at or past current
        // i.e., this step is completed
        const rightLineActive = isCompleted;

        const circleClasses = [
          "relative z-10 flex items-center justify-center rounded-full text-xs font-semibold",
          "w-7 h-7 shrink-0",
          isCompleted
            ? "bg-[#E86A33] text-white"
            : isCurrent
              ? "bg-[#E86A33] text-white shadow-[0_0_0_3px_#FFF0E8]"
              : "bg-[#EBEBEB] text-[#999]",
        ].join(" ");

        return (
          <div key={step.key} className="flex flex-col items-center flex-1">
            {/* Circle row with half-lines */}
            <div className="flex items-center w-full">
              {/* Left half-line (invisible for first step) */}
              <div
                className={[
                  "flex-1 h-[3px]",
                  isFirst
                    ? "bg-transparent"
                    : leftLineActive
                      ? "bg-[#E86A33]"
                      : "bg-[#EBEBEB]",
                ].join(" ")}
              />

              {/* Circle */}
              <div className={circleClasses}>
                {isCompleted ? "✓" : i + 1}
              </div>

              {/* Right half-line (invisible for last step) */}
              <div
                className={[
                  "flex-1 h-[3px]",
                  isLast
                    ? "bg-transparent"
                    : rightLineActive
                      ? "bg-[#E86A33]"
                      : "bg-[#EBEBEB]",
                ].join(" ")}
              />
            </div>

            {/* Label */}
            <p
              className={[
                "text-[10px] leading-tight mt-1.5 text-center",
                isCurrent
                  ? "font-bold text-[#E86A33]"
                  : "font-normal text-[#999]",
              ].join(" ")}
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

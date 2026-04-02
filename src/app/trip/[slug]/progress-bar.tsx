import type { TripStatus } from "@/lib/types";

const STEPS = [
  { key: "dates_open", label: "Pick Dates", icon: "calendar" },
  { key: "destination_open", label: "Choose Place", icon: "map" },
  { key: "commitment", label: "Confirm", icon: "check" },
  { key: "ready", label: "Ready!", icon: "flag" },
] as const;

function StepIcon({ type, completed }: { type: string; completed: boolean }) {
  if (completed) {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }

  switch (type) {
    case "calendar":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case "map":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      );
    case "check":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "flag":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
      );
    default:
      return null;
  }
}

export function ProgressBar({ currentStage }: { currentStage: TripStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-start w-full animate-in">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === STEPS.length - 1;

        const circleClasses = [
          "relative z-10 flex items-center justify-center rounded-full shrink-0",
          "transition-all duration-500 ease-out",
          isCompleted
            ? "w-9 h-9 bg-gradient-to-br from-primary to-[#F4845F] text-white shadow-sm"
            : isCurrent
              ? "w-10 h-10 bg-primary text-white shadow-lg shadow-primary/20 ring-[3px] ring-primary/10"
              : "w-9 h-9 bg-subtle-hover text-muted",
        ].join(" ");

        const labelClasses = [
          "text-[10px] leading-tight mt-2 text-center font-medium transition-colors duration-300",
          isCurrent
            ? "text-primary font-bold"
            : isCompleted
              ? "text-text-secondary"
              : "text-text-tertiary",
        ].join(" ");

        return (
          <div key={step.key} className={`flex items-start ${isLast ? "" : "flex-1"}`}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center w-10">
              <div className={circleClasses}>
                <StepIcon type={step.icon} completed={isCompleted} />
              </div>
              <p className={labelClasses}>{step.label}</p>
            </div>

            {/* Connecting line */}
            {!isLast && (
              <div className="flex-1 mt-[18px] mx-1 h-[3px] rounded-full bg-subtle-hover relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-[#F4845F] transition-all duration-700 ease-out"
                  style={{
                    width: isCompleted ? "100%" : isCurrent ? "40%" : "0%",
                    opacity: isCompleted ? 1 : isCurrent ? 0.5 : 0,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

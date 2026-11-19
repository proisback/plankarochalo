"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

type Theme = "light" | "dark" | "system";
const ORDER: Theme[] = ["light", "dark", "system"];
const LABEL: Record<Theme, string> = { light: "Light", dark: "Dark", system: "Match device" };

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? systemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved && ORDER.includes(saved)) {
        setTheme(saved);
        applyTheme(saved);
      }
    } catch {
      // Storage blocked (private mode). Stay on the device theme.
    }
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Not persisted. Still applied for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={`icon-btn ${className}`}
      aria-label={`Theme: ${LABEL[theme]}. Tap to change.`}
      title={`Theme: ${LABEL[theme]}`}
    >
      <Icon name={theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor"} className="h-[18px] w-[18px]" />
    </button>
  );
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { themeApi } from "@/lib/api/theme";
import type { Theme } from "@/lib/types";

interface ThemeContextValue {
  activeTheme: Theme | null;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  activeTheme: null,
  refreshTheme: async () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// Inject / update a <style> tag that overrides Tailwind's compiled colors
function applyTheme(theme: Theme) {
  const id = "studentms-theme";
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }

  const p = theme.primary;
  const s = theme.secondary;
  const success = theme.success;
  const danger = theme.danger;
  const warning = theme.warning;
  const info = theme.info;
  const font = theme.fontFamily;
  const size = theme.fontSize;

  el.textContent = `
    :root {
      --theme-primary: ${p};
      --theme-secondary: ${s};
      --theme-success: ${success};
      --theme-danger: ${danger};
      --theme-warning: ${warning};
      --theme-info: ${info};
    }

    /* Primary overrides */
    .text-primary       { color: ${p} !important; }
    .bg-primary         { background-color: ${p} !important; }
    .border-primary     { border-color: ${p} !important; }
    .ring-primary       { --tw-ring-color: ${p} !important; }
    .focus\\:border-primary:focus { border-color: ${p} !important; }
    .hover\\:bg-primary:hover    { background-color: ${p} !important; }
    .hover\\:text-primary:hover  { color: ${p} !important; }

    /* Status overrides */
    .text-meta-3        { color: ${success} !important; }
    .bg-meta-3\\/10     { background-color: ${success}1a !important; }
    .text-meta-1        { color: ${danger} !important; }
    .bg-meta-1\\/10     { background-color: ${danger}1a !important; }

    /* Font */
    body, .font-sans    { font-family: ${font} !important; }
    body                { font-size: ${size}px !important; }

    ${theme.backgroundImage ? `body { background-image: url(${theme.backgroundImage}); background-size: cover; background-attachment: fixed; }` : ""}
  `;
}

function removeTheme() {
  const el = document.getElementById("studentms-theme");
  if (el) el.remove();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);

  const refreshTheme = async () => {
    try {
      const theme = await themeApi.getActive();
      setActiveTheme(theme);
      if (theme) {
        applyTheme(theme);
      } else {
        removeTheme();
      }
    } catch {
      // Silently fail — app uses default TailAdmin colors
    }
  };

  useEffect(() => {
    refreshTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ activeTheme, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

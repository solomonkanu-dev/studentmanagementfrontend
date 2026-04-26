import { useEffect, useState } from "react";

/**
 * Returns true when the <body> element has the "dark" class applied.
 * Reactively updates when the class changes via a MutationObserver.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initialise from current state
    setIsDark(document.body.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark"));
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

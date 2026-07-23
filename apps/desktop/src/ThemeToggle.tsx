import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const THEME_KEY = "verne.theme";
const LABELS: Record<Theme, string> = {
  system: "Tema: sistema",
  light: "Tema: claro",
  dark: "Tema: oscuro",
};
const ORDER: Theme[] = ["system", "light", "dark"];

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyTheme(theme: Theme): void {
  if (theme === "system") delete document.documentElement.dataset["theme"];
  else document.documentElement.dataset["theme"] = theme;
}

/** Aplica el tema guardado antes del primer render (evita el destello). */
export function initTheme(): void {
  applyTheme(loadTheme());
}

/** Selector de tema autocontenido: persiste en localStorage y aplica al vuelo. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <button
      type="button"
      className="linklike"
      title="Cambiar tema (sistema → claro → oscuro)"
      onClick={() => setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? "system")}
    >
      {LABELS[theme]}
    </button>
  );
}

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Appearance,
  useColorScheme,
  Dimensions,
  PixelRatio,
} from "react-native";

/* =========================
   ENUMS
========================= */

export enum ThemeMode {
  LIGHT = "light",
  DARK = "dark",
  SYSTEM = "system",
}

export enum FontScaleMode {
  SYSTEM = "system",
  X1 = 1,
  X1_5 = 1.5,
  X2 = 2,
}

/* =========================
   CONTEXT TYPE
========================= */

type UIContextType = {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  highContrast: boolean;
  fontScaleMode: FontScaleMode;

  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setHighContrast: (v: boolean) => void;
  setFontScaleMode: (v: FontScaleMode) => void;

  colors: {
    bg: string;
    text: string;
  };

  fontSize: number;
  fontScale: number;
};

const UIContext = createContext<UIContextType | null>(null);

/* =========================
   PROVIDER
========================= */

export function UIProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme();

  const [themeMode, setThemeMode] = useState<ThemeMode>(ThemeMode.SYSTEM);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    systemTheme ?? "light",
  );
  const [highContrast, setHighContrast] = useState(false);
  const [fontScaleMode, setFontScaleMode] = useState<FontScaleMode>(
    FontScaleMode.SYSTEM,
  );
  const [systemFontScale, setSystemFontScale] = useState(
    PixelRatio.getFontScale(),
  );

  /* =========================
     SYNC TEMA SISTEMA
  ========================= */

  useEffect(() => {
    if (themeMode === ThemeMode.SYSTEM) {
      setResolvedTheme(systemTheme ?? "light");
    } else {
      setResolvedTheme(themeMode);
    }
  }, [themeMode, systemTheme]);

  /* =========================
     SYNC FONT SCALE SISTEMA
  ========================= */

  useEffect(() => {
    const update = () => {
      setSystemFontScale(PixelRatio.getFontScale());
    };

    const sub = Dimensions.addEventListener("change", update);
    update();

    return () => sub?.remove?.();
  }, []);

  /* =========================
     TOGGLE THEME
  ========================= */

  function toggleTheme() {
    setThemeMode((prev) =>
      prev === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK,
    );
  }

  /* =========================
     FONT SIZE DINÂMICO
  ========================= */

  const { height } = Dimensions.get("window");

  const baseFont = Math.max(1, height * 0.018);

  const scale =
    fontScaleMode === FontScaleMode.SYSTEM ? systemFontScale : fontScaleMode;

  const fontSize = baseFont * scale;

  const value: UIContextType = {
    theme,
    resolvedTheme,
    highContrast,
    fontScaleMode,

    setTheme: setThemeMode,
    toggleTheme,
    setHighContrast,
    setFontScaleMode,

    colors,
    fontSize,
    fontScale: scale,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/* =========================
   HOOK
========================= */

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI precisa estar dentro do UIProvider");
  return ctx;
}

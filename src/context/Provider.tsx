import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance, PixelRatio } from "react-native";
import type { InferTheme } from "../config/createTheme";

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
  FIXED_1 = 1,
  FIXED_1_5 = 1.5,
  FIXED_2 = 2,
}

/* =========================
   CONTEXT TYPE
========================= */

type StyledConfig = {
  tokens: object;
  theme: { light: object; dark: object };
};

type ResolvedTheme<TConfig extends StyledConfig> = InferTheme<TConfig>;

type UIContextType<TConfig extends StyledConfig> = {
  theme: ResolvedTheme<TConfig>;
  themeMode: ThemeMode;
  setThemeMode: (t: ThemeMode) => void;

  highContrast: boolean;
  setHighContrast: (v: boolean) => void;

  fontScale: number;
  fontScaleMode: FontScaleMode;
  setFontScaleMode: (v: FontScaleMode) => void;
};

/* =========================
   PROVIDER
========================= */

const UIContext = createContext<UIContextType<StyledConfig> | null>(null);

export function UIProvider<TConfig extends StyledConfig>({
  children,
  config,
}: {
  children: React.ReactNode;
  config: TConfig;
}) {
  const getSystemMode = (): ThemeMode.LIGHT | ThemeMode.DARK =>
    Appearance.getColorScheme() === "dark" ? ThemeMode.DARK : ThemeMode.LIGHT;

  const [themeMode, setThemeMode] = useState<ThemeMode>(ThemeMode.SYSTEM);
  const [resolvedMode, setResolvedMode] = useState<ThemeMode.LIGHT | ThemeMode.DARK>(
    getSystemMode,
  );
  const [highContrast, setHighContrast] = useState(false);
  const [fontScaleMode, setFontScaleMode] = useState<FontScaleMode>(FontScaleMode.SYSTEM);
  const [fontScale, setFontScale] = useState(() => PixelRatio.getFontScale());

  // Sincroniza com o sistema quando mode = SYSTEM
  useEffect(() => {
    if (themeMode === ThemeMode.SYSTEM) {
      setResolvedMode(getSystemMode());
      const sub = Appearance.addChangeListener(({ colorScheme }) => {
        setResolvedMode(colorScheme === "dark" ? ThemeMode.DARK : ThemeMode.LIGHT);
      });
      return () => sub.remove();
    } else {
      setResolvedMode(themeMode as ThemeMode.LIGHT | ThemeMode.DARK);
    }
  }, [themeMode]);

  // Sincroniza fontScale com o modo selecionado
  useEffect(() => {
    if (fontScaleMode === FontScaleMode.SYSTEM) {
      setFontScale(PixelRatio.getFontScale());
    } else {
      setFontScale(fontScaleMode as number);
    }
  }, [fontScaleMode]);

  const activeTheme = {
    ...config.tokens,
    ...(resolvedMode === ThemeMode.DARK ? config.theme.dark : config.theme.light),
  } as ResolvedTheme<TConfig>;

  const value: UIContextType<TConfig> = {
    theme: activeTheme,
    themeMode,
    setThemeMode,
    highContrast,
    setHighContrast,
    fontScale,
    fontScaleMode,
    setFontScaleMode,
  };

  return (
    <UIContext.Provider value={value as UIContextType<StyledConfig>}>
      {children}
    </UIContext.Provider>
  );
}

/* =========================
   HOOK
========================= */

export function useUI<TConfig extends StyledConfig = StyledConfig>() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI precisa estar dentro do UIProvider");
  return ctx as UIContextType<TConfig>;
}

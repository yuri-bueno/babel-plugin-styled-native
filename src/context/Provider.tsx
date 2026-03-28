import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, PixelRatio } from "react-native";
import type { InferTheme } from "../config/createTheme";

function deepMerge<T extends Record<string, any>>(
  base: T,
  overrides: Record<string, any>,
): T {
  const result = { ...base } as Record<string, any>;
  for (const key of Object.keys(overrides)) {
    const ov = overrides[key];
    if (
      ov !== undefined &&
      ov !== null &&
      typeof ov === "object" &&
      !Array.isArray(ov)
    ) {
      result[key] = deepMerge(result[key] ?? {}, ov);
    } else if (ov !== undefined) {
      result[key] = ov;
    }
  }
  return result as T;
}

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

// Base vazia — augmentada pelo stampd-types.d.ts gerado no projeto do usuário
declare global {
  namespace StyledSystem {
    interface Theme {}
  }
}

/* =========================
   CONTEXT TYPE
========================= */

type StyledConfig = {
  tokens: object;
  theme: { light: object; dark: object; highContrast?: object };
  fonts?: object;
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

export function StampdUIProvider<TConfig extends StyledConfig>({
  children,
  config,
  defaultTheme = "light",
  highContrast: initialHighContrast = false,
}: {
  children: React.ReactNode;
  config: TConfig;
  defaultTheme?: "light" | "dark";
  highContrast?: boolean;
}) {
  const getSystemMode = (): ThemeMode.LIGHT | ThemeMode.DARK =>
    Appearance.getColorScheme() === "dark" ? ThemeMode.DARK : ThemeMode.LIGHT;

  const [themeMode, setThemeMode] = useState<ThemeMode>(
    defaultTheme === "dark" ? ThemeMode.DARK : ThemeMode.LIGHT,
  );
  const [resolvedMode, setResolvedMode] = useState<
    ThemeMode.LIGHT | ThemeMode.DARK
  >(getSystemMode);
  const [highContrast, setHighContrast] = useState(initialHighContrast);
  const [fontScaleMode, setFontScaleMode] = useState<FontScaleMode>(
    FontScaleMode.SYSTEM,
  );
  const [fontScale, setFontScale] = useState(() => PixelRatio.getFontScale());

  // Sincroniza com o sistema quando mode = SYSTEM
  useEffect(() => {
    if (themeMode === ThemeMode.SYSTEM) {
      setResolvedMode(getSystemMode());
      const sub = Appearance.addChangeListener(({ colorScheme }) => {
        setResolvedMode(
          colorScheme === "dark" ? ThemeMode.DARK : ThemeMode.LIGHT,
        );
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

  const activeTheme = useMemo(() => {
    try {
      const base = {
        ...(config.tokens ?? {}),
        ...(resolvedMode === ThemeMode.DARK
          ? (config.theme?.dark ?? {})
          : (config.theme?.light ?? {})),
        ...(config.fonts ? { fonts: config.fonts } : {}),
      } as ResolvedTheme<TConfig>;
      if (highContrast && config.theme?.highContrast) {
        return deepMerge(base, config.theme.highContrast as Record<string, any>);
      }
      return base;
    } catch (err: any) {
      console.error(
        `[stampd] StampdUIProvider: erro ao calcular o tema ativo.\n` +
        `  mode=${resolvedMode} highContrast=${highContrast}\n` +
        `  Verifique se config.tokens, config.theme.light e config.theme.dark estão definidos.\n` +
        `  Detalhe: ${err?.message ?? err}`,
      );
      return {} as ResolvedTheme<TConfig>;
    }
  }, [resolvedMode, highContrast]);

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

type StampdUIReturn = Omit<UIContextType<StyledConfig>, "theme"> & {
  theme: StyledSystem.Theme;
};

export function useStampdUI(): StampdUIReturn {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useStampdUI must be used inside StampdUIProvider");
  return ctx as unknown as StampdUIReturn;
}

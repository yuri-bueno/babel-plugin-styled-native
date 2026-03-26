// plugins/src/config/createTheme.tsx

// ─── Tipos utilitários ────────────────────────────────────────────────────────

/** Torna todas as propriedades de um objeto opcionais, recursivamente. */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/**
 * Shape esperado de `fonts` no config.
 * - `default`: fonte e tamanho padrão da aplicação
 * - `sizes`: escala de tamanhos nomeados (ex: sm, md, lg)
 * - `family`: famílias de fontes nomeadas (ex: inter, mono)
 */
export type FontsConfig<
  TSizes extends Record<string, number> = Record<string, number>,
  TFamily extends Record<string, string> = Record<string, string>,
> = {
  default?: { size?: number; family?: string };
  sizes?: TSizes;
  family?: TFamily;
};

/**
 * Merge de tokens com o tema ativo: chaves do tema sobrescrevem as dos tokens.
 * `fonts` é adicionado como `theme.fonts` (estático, não muda com light/dark).
 */
export type InferTheme<T> = T extends {
  tokens: infer Tok;
  theme: { light: infer L };
  fonts?: infer F;
}
  ? Tok extends object
    ? L extends object
      ? Omit<Tok, keyof L> & L & (F extends object ? { fonts: F } : {})
      : Tok
    : never
  : never;

/**
 * Garante que dark e light possuam exatamente as mesmas chaves (em cada nível).
 * TypeScript aponta erro de compile se dark estiver com chaves a menos.
 */
type EnsureSameStructure<TLight, TDark extends TLight> = TDark;

// ─── Validação em runtime ─────────────────────────────────────────────────────

function deepValidateKeys(
  light: Record<string, unknown>,
  dark: Record<string, unknown>,
  path: string,
): boolean {
  const lightKeys = new Set(Object.keys(light));
  const darkKeys = new Set(Object.keys(dark));

  const missingInDark = [...lightKeys].filter((k) => !darkKeys.has(k));
  const extraInDark = [...darkKeys].filter((k) => !lightKeys.has(k));
  let valid = true;

  if (missingInDark.length) {
    console.warn(
      `\x1b[33m[stampd] ⚠️  dark.${path} está FALTANDO: ${missingInDark.map((k) => `"${k}"`).join(", ")} (existe em light)\x1b[0m`,
    );
    valid = false;
  }
  if (extraInDark.length) {
    console.warn(
      `\x1b[33m[stampd] ⚠️  dark.${path} tem EXTRAS: ${extraInDark.map((k) => `"${k}"`).join(", ")} (não existe em light)\x1b[0m`,
    );
    valid = false;
  }

  for (const k of lightKeys) {
    if (
      darkKeys.has(k) &&
      light[k] !== null &&
      dark[k] !== null &&
      typeof light[k] === "object" &&
      typeof dark[k] === "object"
    ) {
      const childValid = deepValidateKeys(
        light[k] as Record<string, unknown>,
        dark[k] as Record<string, unknown>,
        `${path}.${k}`,
      );
      if (!childValid) valid = false;
    }
  }

  return valid;
}

// ─── createTheme ─────────────────────────────────────────────────────────────

/**
 * Define o tema da aplicação com validação de tipagem e consistência.
 *
 * - `tokens`: valores estáticos resolvidos em compile-time pelo plugin Babel.
 * - `theme.light` / `theme.dark`: variantes de runtime (dark/light switch).
 *
 * TypeScript garante em compile-time que `dark` possui pelo menos as mesmas
 * chaves de `light`. A validação em runtime verifica chaves extras e aninha.
 *
 * @example
 * export const config = createTheme({
 *   tokens: { colors: lightColors, spacing, radius, typography, shadows, size },
 *   theme: {
 *     light: { colors: lightColors },
 *     dark:  { colors: darkColors  },
 *   },
 * });
 *
 * export type AppTheme = InferTheme<typeof config>;
 */
export function createTheme<
  TTokens extends object,
  TLight extends object,
  TDark extends TLight,
  TFonts extends FontsConfig = FontsConfig,
>(config: {
  tokens: TTokens;
  theme: {
    light: TLight;
    dark: EnsureSameStructure<TLight, TDark>;
    /**
     * Sobrescreve cores para alto contraste — apenas as chaves presentes são aplicadas.
     * Cada propriedade é opcional (DeepPartial do light theme).
     */
    highContrast?: DeepPartial<TLight>;
  };
  /**
   * Configuração de fontes estáticas — acessível como `theme.fonts`.
   * @example
   * fonts: {
   *   default: { size: 14, family: "Inter" },
   *   sizes:   { sm: 12, md: 14, lg: 16 },
   *   family:  { inter: "Inter", mono: "JetBrainsMono" },
   * }
   */
  fonts?: TFonts;
}) {
  const isValid = deepValidateKeys(
    config.theme.light as Record<string, unknown>,
    config.theme.dark as Record<string, unknown>,
    "theme",
  );

  if (isValid) {
    console.log("\x1b[32m[stampd] ✅ Temas light/dark sincronizados\x1b[0m");
  }

  return config;
}

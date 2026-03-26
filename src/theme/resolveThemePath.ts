// plugins/src/theme/resolveThemePath.ts
import { loadStyledConfig } from "../config/loadStyledConfig";

/**
 * Resolve:
 * theme.colors.primary → '#FF0000'
 *
 * Usa o tema carregado de styled.config.ts na raiz do projeto.
 */
export function resolveThemePath(path: string[]): any {
  const theme = loadStyledConfig();

  let current: any = theme;
  for (const key of path) {
    if (current?.[key] === undefined) return undefined;
    current = current[key];
  }

  return current;
}

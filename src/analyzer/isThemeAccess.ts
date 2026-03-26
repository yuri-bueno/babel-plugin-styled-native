// plugins/src/analyzer/isThemeAccess.ts
import { types as t } from "@babel/core";

/**
 * Verifica se é algo tipo:
 * theme.colors.primary
 */
export function isThemeAccess(node: t.Node): boolean {
  let current: any = node;

  while (t.isMemberExpression(current)) {
    current = current.object;
  }

  return t.isIdentifier(current, { name: "theme" });
}

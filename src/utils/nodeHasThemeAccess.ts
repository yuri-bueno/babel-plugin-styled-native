// plugins/src/utils/nodeHasThemeAccess.ts
import { types as t } from "@babel/core";
import { isThemeAccess } from "../analyzer/isThemeAccess";

const SKIP_KEYS = new Set(["type", "start", "end", "loc", "extra"]);

/**
 * Verifica recursivamente se um nó AST ainda contém algum acesso a `theme.xxx`.
 * Usado após `resolveThemeInStyle` para decidir se ainda é necessário passar `theme`.
 */
export function nodeHasThemeAccess(node: t.Node): boolean {
  if (t.isMemberExpression(node) && isThemeAccess(node)) return true;

  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const child = (node as any)[key];
    if (!child || typeof child !== "object") continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          if (nodeHasThemeAccess(item as t.Node)) return true;
        }
      }
    } else if ("type" in child) {
      if (nodeHasThemeAccess(child as t.Node)) return true;
    }
  }

  return false;
}

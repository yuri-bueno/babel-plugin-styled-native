// plugins/src/analyzer/classifyValue.ts
import { types as t } from "@babel/core";
import { isThemeAccess } from "./isThemeAccess";

export type ValueType = "STATIC" | "THEME" | "DYNAMIC";

/**
 * Classifica um valor dentro do style
 */
export function classifyValue(node: t.Node): ValueType {
  // 🔹 valores estáticos
  if (
    t.isStringLiteral(node) ||
    t.isNumericLiteral(node) ||
    t.isBooleanLiteral(node)
  ) {
    return "STATIC";
  }

  // 🔹 theme.xxx.xxx
  if (t.isMemberExpression(node) && isThemeAccess(node)) {
    return "THEME";
  }

  // 🔹 spread (...theme)
  if (t.isSpreadElement(node)) {
    if (isThemeAccess(node.argument)) {
      return "THEME";
    }
  }

  // 🔴 qualquer outra coisa = dinâmica
  return "DYNAMIC";
}

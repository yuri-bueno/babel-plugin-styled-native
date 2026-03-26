// plugins/src/analyzer/analyzeStyle.ts
import { types as t } from "@babel/core";
import { classifyValue, ValueType } from "./classifyValue";

export type StyleAnalysis =
  | { type: "SAFE" }
  | { type: "PARTIAL" }
  | { type: "UNSAFE" };

/**
 * Analisa o objeto de style inteiro
 */
export function analyzeStyle(style: t.ObjectExpression): StyleAnalysis {
  let hasDynamic = false;
  let hasStaticOrTheme = false;

  for (const prop of style.properties) {
    if (t.isSpreadElement(prop)) {
      const type = classifyValue(prop);

      if (type === "DYNAMIC") hasDynamic = true;
      else hasStaticOrTheme = true;

      continue;
    }

    if (!t.isObjectProperty(prop)) continue;

    const valueType = classifyValue(prop.value);

    if (valueType === "DYNAMIC") {
      hasDynamic = true;
    } else {
      hasStaticOrTheme = true;
    }
  }

  // 🔴 tudo dinâmico → não mexe
  if (hasDynamic && !hasStaticOrTheme) {
    return { type: "UNSAFE" };
  }

  // 🟡 misto → parcial
  if (hasDynamic && hasStaticOrTheme) {
    return { type: "PARTIAL" };
  }

  // 🟢 tudo seguro → pode hardcode
  return { type: "SAFE" };
}

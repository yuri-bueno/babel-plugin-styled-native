// plugins/src/theme/resolveThemeInStyle.ts
import { types as t } from "@babel/core";
import { extractThemePath } from "./extractThemePath";
import { resolveThemePath } from "./resolveThemePath";
import { astFromValue } from "./astFromValue";
import { resolveExpression } from "./resolveExpression";

/**
 * Substitui theme.xxx.xxx por valor real
 */
export function resolveThemeInStyle(
  node: t.ObjectExpression,
): t.ObjectExpression {
  node.properties = node.properties.map((prop) => {
    // Handle spread: ...theme.shadows.level1 → ...Platform.select({...})
    if (t.isSpreadElement(prop) && t.isExpression(prop.argument)) {
      return t.spreadElement(resolveExpression(prop.argument as t.Expression));
    }

    if (!t.isObjectProperty(prop)) return prop;

    const value = prop.value;

    if (t.isExpression(value)) {
      return t.objectProperty(prop.key, resolveExpression(value));
    }

    return prop;
  });

  return node;
}

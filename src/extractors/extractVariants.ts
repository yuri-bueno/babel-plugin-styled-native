// plugins/src/extractors/extractVariants.ts
import { NodePath, types as t } from "@babel/core";

export type ExtractedVariants = {
  path: NodePath<t.ObjectExpression>;
  keys: string[];
};

/**
 * Extrai o campo `variants` do config:
 * { style: ..., variants: { variant: { ... }, size: { ... } } }
 */
export function extractVariants(
  config: NodePath<t.ObjectExpression>,
): ExtractedVariants | null {
  for (const prop of config.get("properties")) {
    if (!prop.isObjectProperty()) continue;

    const key = prop.get("key");
    if (!key.isIdentifier({ name: "variants" })) continue;

    const value = prop.get("value");
    if (!value.isObjectExpression()) return null;

    const keys: string[] = [];
    for (const variantProp of value.get("properties")) {
      if (!variantProp.isObjectProperty()) continue;
      const variantKey = variantProp.get("key");
      if (variantKey.isIdentifier()) {
        keys.push(variantKey.node.name);
      }
    }

    return { path: value, keys };
  }

  return null;
}

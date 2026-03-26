import { NodePath, types as t } from "@babel/core";

export type ExtractedAttrs = {
  node: t.ObjectExpression;
  path: NodePath<t.ObjectExpression>;
  params: string[];
};

/**
 * Extrai o campo `attrs` do config:
 * { style: ..., attrs: { activeOpacity: 0.8 } }
 * { style: ..., attrs: ({ theme }) => ({ ... }) }
 */
export function extractAttrs(
  config: NodePath<t.ObjectExpression>,
): ExtractedAttrs | null {
  for (const prop of config.get("properties")) {
    if (!prop.isObjectProperty()) continue;

    const key = prop.get("key");
    if (!key.isIdentifier({ name: "attrs" })) continue;

    const value = prop.get("value");

    if (value.isObjectExpression()) {
      return { node: value.node, path: value, params: [] };
    }

    if (value.isArrowFunctionExpression()) {
      const body = value.get("body");
      if (!body.isObjectExpression()) return null;

      const params: string[] = [];
      const firstParam = value.get("params.0");
      if (firstParam?.isObjectPattern()) {
        firstParam.get("properties").forEach((p) => {
          if (p.isObjectProperty()) {
            const k = p.get("key");
            if (k.isIdentifier()) params.push(k.node.name);
          }
        });
      }

      return { node: body.node, path: body, params };
    }
  }

  return null;
}

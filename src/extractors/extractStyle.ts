// plugins/src/extractors/extractStyle.ts
import { NodePath, types as t } from "@babel/core";

/**
 * Resultado do style extraído
 */
export type ExtractedStyle =
  | {
      type: "function";
      node: t.ObjectExpression;
      path: NodePath<t.ObjectExpression>;
      params: string[];
    }
  | {
      type: "object";
      node: t.ObjectExpression;
      path: NodePath<t.ObjectExpression>;
      params: [];
    };

/**
 * Extrai o style do config
 *
 * Suporta:
 * - style: ({ theme }) => ({ ... })
 * - style: { ... }
 */
export function extractStyle(
  config: NodePath<t.ObjectExpression>,
): ExtractedStyle | null {
  const properties = config.get("properties");

  for (const prop of properties) {
    if (!prop.isObjectProperty()) continue;

    const key = prop.get("key");
    if (!key.isIdentifier({ name: "style" })) continue;

    const value = prop.get("value");

    // ✅ Caso 1: style como objeto direto
    if (value.isObjectExpression()) {
      return {
        type: "object",
        node: value.node,
        path: value,
        params: [],
      };
    }

    // ✅ Caso 2: style como função
    if (value.isArrowFunctionExpression()) {
      const body = value.get("body");

      if (!body.isObjectExpression()) return null;

      const params: string[] = [];

      const firstParam = value.get("params.0");

      if (firstParam?.isObjectPattern()) {
        firstParam.get("properties").forEach((p) => {
          if (p.isObjectProperty()) {
            const key = p.get("key");
            if (key.isIdentifier()) {
              params.push(key.node.name);
            }
          }
        });
      }

      return {
        type: "function",
        node: body.node,
        path: body,
        params,
      };
    }

    return null;
  }

  return null;
}

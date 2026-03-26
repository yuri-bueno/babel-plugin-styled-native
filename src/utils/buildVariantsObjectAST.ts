import * as t from "@babel/types";

export function buildVariantsObjectAST(variants: any) {
  return t.objectExpression(
    Object.entries(variants).map(([variantName, variantValues]) =>
      t.objectProperty(
        t.identifier(variantName),
        t.objectExpression(
          Object.entries(variantValues as any).map(([key, value]: any) =>
            t.objectProperty(
              t.identifier(key),
              // 🔥 mantém função original
              value,
            ),
          ),
        ),
      ),
    ),
  );
}

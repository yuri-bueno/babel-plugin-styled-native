import * as t from "@babel/types";

export function buildDefaultVariantsAST(defaults: any) {
  return t.objectExpression(
    Object.entries(defaults).map(([key, value]) =>
      t.objectProperty(t.identifier(key), t.valueToNode(value)),
    ),
  );
}

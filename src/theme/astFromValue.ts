// plugins/src/theme/astFromValue.ts
import { types as t } from "@babel/core";

export function astFromValue(value: any): t.Expression {
  if (typeof value === "string") return t.stringLiteral(value);
  if (typeof value === "number") return t.numericLiteral(value);
  if (typeof value === "boolean") return t.booleanLiteral(value);

  if (typeof value === "object" && value !== null) {
    if (value.__platformSelect === true) {
      const optionProps = Object.entries(value.options as Record<string, any>).map(([key, val]) =>
        t.objectProperty(t.identifier(key), astFromValue(val))
      );
      return t.callExpression(
        t.memberExpression(t.identifier("Platform"), t.identifier("select")),
        [t.objectExpression(optionProps)],
      );
    }

    return t.objectExpression(
      Object.entries(value).map(([key, val]) =>
        t.objectProperty(t.identifier(key), astFromValue(val)),
      ),
    );
  }

  throw new Error("Unsupported theme value");
}

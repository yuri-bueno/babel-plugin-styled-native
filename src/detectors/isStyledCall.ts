// plugins/src/detectors/isStyledCall.ts
import { NodePath, types as t } from "@babel/core";

/**
 * Verifica se é uma chamada do tipo Styled.X(...)
 *
 * Exemplo:
 * Styled.View(...)
 * Styled.Text(...)
 */
export function isStyledCall(path: NodePath<t.CallExpression>): boolean {
  const callee = path.get("callee");

  if (!callee.isMemberExpression()) return false;

  const object = callee.get("object");
  const property = callee.get("property");

  return (
    object.isIdentifier({ name: "Styled" }) && property.isIdentifier() // qualquer componente
  );
}

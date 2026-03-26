// plugins/src/extractors/getStyledConfig.ts
import { NodePath, types as t } from "@babel/core";

/**
 * Extrai o objeto de configuração do Styled
 *
 * Ex:
 * Styled.View({ ... }) → retorna esse objeto
 */
export function getStyledConfig(
  path: NodePath<t.CallExpression>,
): NodePath<t.ObjectExpression> | null {
  const firstArg = path.get("arguments.0");

  if (!firstArg || !firstArg.isObjectExpression()) {
    return null;
  }

  return firstArg;
}

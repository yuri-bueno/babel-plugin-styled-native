// plugins/src/utils/replaceParamWithProps.ts
import { NodePath, types as t } from "@babel/core";

/**
 * Substitui variáveis vindas da função:
 * ({ disabled }) → props.disabled
 */
export function replaceParamWithProps(
  nodePath: NodePath<t.ObjectExpression>,
  paramNames: string[],
): t.ObjectExpression {
  nodePath.traverse({
    Identifier(path) {
      const name = path.node.name;

      if (!paramNames.includes(name)) return;

      // evita substituir key de objeto
      if (
        path.parent &&
        t.isObjectProperty(path.parent) &&
        path.parent.key === path.node
      ) {
        return;
      }

      // evita substituir property de MemberExpression não-computado (ex: props.disabled)
      if (
        path.parent &&
        t.isMemberExpression(path.parent) &&
        !path.parent.computed &&
        path.parent.property === path.node
      ) {
        return;
      }

      path.replaceWith(
        t.memberExpression(t.identifier("props"), t.identifier(name)),
      );
    },
  });

  return nodePath.node;
}

// plugins/src/theme/extractThemePath.ts
import { types as t } from "@babel/core";

/**
 * Extrai:
 * theme.colors.primary → ['colors','primary']
 */
export function extractThemePath(node: t.MemberExpression): string[] {
  const path: string[] = [];

  let current: any = node;

  while (t.isMemberExpression(current)) {
    if (t.isIdentifier(current.property)) {
      path.unshift(current.property.name);
    }
    current = current.object;
  }

  return path;
}

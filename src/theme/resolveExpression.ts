import { types as t } from "@babel/core";
import { isThemeAccess } from "../analyzer/isThemeAccess";
import { extractThemePath } from "./extractThemePath";
import { resolveThemePath } from "./resolveThemePath";
import { astFromValue } from "./astFromValue";
import { isDynamicThemePath } from "../config/loadStyledConfig";

/** Evita spam: avisa cada caminho não-resolvido apenas uma vez por processo. */
const warnedPaths = new Set<string>();

function warnUnresolved(pathKeys: string[]) {
  const key = pathKeys.join(".");
  if (warnedPaths.has(key)) return;
  warnedPaths.add(key);

  console.warn(
    `\x1b[33m[stampd] ⚠️  theme.${key} não encontrado em stampd.config.ts → será resolvido em runtime\x1b[0m`,
  );
}

/**
 * Resolve expressões parcialmente.
 * Loga um aviso quando um acesso a `theme.xxx` não pode ser resolvido em compile-time.
 */
export function resolveExpression(node: t.Expression): t.Expression {
  // 🔹 theme.xxx.xxx
  if (t.isMemberExpression(node) && isThemeAccess(node)) {
    const path = extractThemePath(node);
    const resolved = resolveThemePath(path);

    if (resolved !== undefined) {
      return astFromValue(resolved);
    }

    if (!isDynamicThemePath(path)) warnUnresolved(path);
    return node;
  }

  // 🔹 ternário (condicional)
  if (t.isConditionalExpression(node)) {
    return t.conditionalExpression(
      resolveExpression(node.test as t.Expression),
      resolveExpression(node.consequent as t.Expression),
      resolveExpression(node.alternate as t.Expression),
    );
  }

  // 🔹 binary (ex: theme.color + "66")
  if (t.isBinaryExpression(node)) {
    return t.binaryExpression(
      node.operator,
      resolveExpression(node.left as t.Expression),
      resolveExpression(node.right as t.Expression),
    );
  }

  // 🔹 mantém o resto (props, variáveis, etc)
  return node;
}

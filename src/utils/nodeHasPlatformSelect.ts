// plugins/src/utils/nodeHasPlatformSelect.ts
import { types as t } from "@babel/core";

const SKIP_KEYS = new Set(["type", "start", "end", "loc", "extra"]);

function isPlatformSelectCall(node: t.Node): boolean {
  return (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    t.isIdentifier((node.callee as t.MemberExpression).object, { name: "Platform" }) &&
    t.isIdentifier((node.callee as t.MemberExpression).property, { name: "select" })
  );
}

export function nodeHasPlatformSelect(node: t.Node): boolean {
  if (isPlatformSelectCall(node)) return true;
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const child = (node as any)[key];
    if (!child || typeof child !== "object") continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          if (nodeHasPlatformSelect(item as t.Node)) return true;
        }
      }
    } else if ("type" in child) {
      if (nodeHasPlatformSelect(child as t.Node)) return true;
    }
  }
  return false;
}

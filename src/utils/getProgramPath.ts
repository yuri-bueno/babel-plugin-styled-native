// plugins/src/utils/getProgramPath.ts
import { NodePath, types as t } from "@babel/core";

/**
 * Sobe na árvore AST até encontrar o Program (raiz do arquivo)
 */
export function getProgramPath(path: NodePath): NodePath<t.Program> | null {
  return path.findParent((p) => p.isProgram()) as NodePath<t.Program> | null;
}

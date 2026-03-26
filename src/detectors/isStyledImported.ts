// plugins/src/detectors/isStyledImported.ts
import { NodePath, types as t } from "@babel/core";

/**
 * Verifica se existe import do Styled vindo do useStyled
 *
 * Exemplo válido:
 * import { Styled } from '@/theme/useStyled'
 */
export function isStyledImported(program: NodePath<t.Program>): boolean {
  return program.node.body.some((node) => {
    if (!t.isImportDeclaration(node)) return false;

    // verifica se vem do arquivo correto
    const isCorrectSource = node.source.value.includes("useStyled");
    if (!isCorrectSource) return false;

    // verifica se importa Styled
    return node.specifiers.some((specifier) => {
      return (
        t.isImportSpecifier(specifier) &&
        t.isIdentifier(specifier.imported, { name: "Styled" })
      );
    });
  });
}

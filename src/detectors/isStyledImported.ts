// plugins/src/detectors/isStyledImported.ts
import { NodePath, types as t } from "@babel/core";

/**
 * Verifica se existe import do Styled vindo de stampd
 *
 * Exemplo válido:
 * import { Styled } from 'stampd/styled'
 */
export function isStyledImported(program: NodePath<t.Program>): boolean {
  return program.node.body.some((node) => {
    if (!t.isImportDeclaration(node)) return false;

    // verifica se vem do pacote correto
    const isCorrectSource = node.source.value.includes("stampd");
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

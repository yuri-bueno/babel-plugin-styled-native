// plugins/src/detectors/isStyledImported.ts
import { NodePath, types as t } from "@babel/core";

/**
 * Verifica se existe import do Styled vindo de babel-plugin-styled-native
 *
 * Exemplo válido:
 * import { Styled } from 'babel-plugin-styled-native/styled'
 */
export function isStyledImported(program: NodePath<t.Program>): boolean {
  return program.node.body.some((node) => {
    if (!t.isImportDeclaration(node)) return false;

    // verifica se vem do pacote correto
    const isCorrectSource = node.source.value.includes("babel-plugin-styled-native");
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

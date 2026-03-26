import { NodePath, types as t } from "@babel/core";

const CONTEXT_SOURCE = "stampd/context";

/**
 * Garante que useStampdUI está importado de stampd/context.
 * Se o import já existe, adiciona o specifier. Caso contrário, cria o import.
 */
export function ensureUseThemeImport(program: NodePath<t.Program>) {
  const alreadyImported = program.node.body.some((node) => {
    if (!t.isImportDeclaration(node)) return false;
    if (node.source.value !== CONTEXT_SOURCE) return false;
    return node.specifiers.some(
      (s) =>
        t.isImportSpecifier(s) &&
        t.isIdentifier(s.imported, { name: "useStampdUI" }),
    );
  });

  if (alreadyImported) return;

  // Add to existing context import if present
  for (const node of program.node.body) {
    if (!t.isImportDeclaration(node)) continue;
    if (node.source.value !== CONTEXT_SOURCE) continue;
    node.specifiers.push(
      t.importSpecifier(t.identifier("useStampdUI"), t.identifier("useStampdUI")),
    );
    return;
  }

  // No context import found — add a new one
  program.node.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier("useStampdUI"), t.identifier("useStampdUI"))],
      t.stringLiteral(CONTEXT_SOURCE),
    ),
  );
}

export function ensurePlatformImport(program: NodePath<t.Program>) {
  const alreadyImported = program.node.body.some((node) => {
    if (!t.isImportDeclaration(node)) return false;
    if (node.source.value !== "react-native") return false;
    return node.specifiers.some(
      (s) => t.isImportSpecifier(s) && t.isIdentifier(s.imported, { name: "Platform" }),
    );
  });
  if (alreadyImported) return;
  // Try to add to existing react-native import
  for (const node of program.node.body) {
    if (!t.isImportDeclaration(node)) continue;
    if (node.source.value !== "react-native") continue;
    node.specifiers.push(
      t.importSpecifier(t.identifier("Platform"), t.identifier("Platform")),
    );
    return;
  }
  // Add new import
  program.node.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier("Platform"), t.identifier("Platform"))],
      t.stringLiteral("react-native"),
    ),
  );
}

/**
 * Garante import:
 * import { View } from 'react-native'
 */
export function ensureReactNativeImport(
  program: NodePath<t.Program>,
  componentName: string,
) {
  const alreadyImported = program.node.body.some((node) => {
    if (!t.isImportDeclaration(node)) return false;

    if (node.source.value !== "react-native") return false;

    return node.specifiers.some(
      (s) =>
        t.isImportSpecifier(s) &&
        t.isIdentifier(s.imported, { name: componentName }),
    );
  });

  if (alreadyImported) return;

  program.node.body.unshift(
    t.importDeclaration(
      [
        t.importSpecifier(
          t.identifier(componentName),
          t.identifier(componentName),
        ),
      ],
      t.stringLiteral("react-native"),
    ),
  );
}

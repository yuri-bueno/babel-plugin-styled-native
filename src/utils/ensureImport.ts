import { NodePath, types as t } from "@babel/core";

/**
 * Garante que useTheme está importado de @/theme/useStyled.
 * Se o import já existe, adiciona o specifier. Caso contrário, cria o import.
 */
export function ensureUseThemeImport(program: NodePath<t.Program>) {
  const alreadyImported = program.node.body.some((node) => {
    if (!t.isImportDeclaration(node)) return false;
    if (!node.source.value.includes("useStyled")) return false;
    return node.specifiers.some(
      (s) =>
        t.isImportSpecifier(s) &&
        t.isIdentifier(s.imported, { name: "useTheme" }),
    );
  });

  if (alreadyImported) return;

  // Add to existing useStyled import if present
  for (const node of program.node.body) {
    if (!t.isImportDeclaration(node)) continue;
    if (!node.source.value.includes("useStyled")) continue;
    node.specifiers.push(
      t.importSpecifier(t.identifier("useTheme"), t.identifier("useTheme")),
    );
    return;
  }

  // No useStyled import found — add a new one
  program.node.body.unshift(
    t.importDeclaration(
      [t.importSpecifier(t.identifier("useTheme"), t.identifier("useTheme"))],
      t.stringLiteral("@/theme/useStyled"),
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

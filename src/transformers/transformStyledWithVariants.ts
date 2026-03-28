// plugins/src/transformers/transformStyledWithVariants.ts
import { NodePath, types as t } from "@babel/core";
import { ExtractedStyle } from "../extractors/extractStyle";
import { ExtractedVariants } from "../extractors/extractVariants";
import { ExtractedAttrs } from "../extractors/extractAttrs";
import { resolveThemeInStyle } from "../theme/resolveThemeInStyle";
import { nodeHasThemeAccess } from "../utils/nodeHasThemeAccess";
import { ensureReactNativeImport, ensureUseThemeImport, ensurePlatformImport } from "../utils/ensureImport";
import { nodeHasPlatformSelect } from "../utils/nodeHasPlatformSelect";
import { buildDefaultFontStyle } from "../utils/defaultFontStyle";

/**
 * Normaliza ({ theme }) => ({...}) para (theme) => ({...})
 */
function normalizeToThemeParam(
  node: t.ArrowFunctionExpression,
): t.ArrowFunctionExpression {
  return t.arrowFunctionExpression(
    [t.identifier("theme")],
    node.body,
    node.async,
  );
}

type VariantsResult = {
  ast: t.ObjectExpression;
  /** true se qualquer sub-variant do grupo ainda usa theme em runtime */
  groupNeedsTheme: Record<string, boolean>;
};

/**
 * Constrói __variants_X.
 * - Resolve theme em hardcode em cada função de variant.
 * - Emite como `(theme) => ({...})` se ainda houver acesso a theme,
 *   ou como plain object `{...}` se tudo foi resolvido.
 * - Rastreia por grupo se alguma sub-variant precisa de theme.
 */
function buildNormalizedVariantsAST(
  variantsPath: NodePath<t.ObjectExpression>,
): VariantsResult {
  const props: t.ObjectProperty[] = [];
  const groupNeedsTheme: Record<string, boolean> = {};

  for (const prop of variantsPath.get("properties")) {
    if (!prop.isObjectProperty()) continue;

    const groupKeyNode = prop.node.key;
    const groupName = t.isIdentifier(groupKeyNode) ? groupKeyNode.name : "";

    const value = prop.get("value");
    if (!value.isObjectExpression()) continue;

    let groupHasTheme = false;
    const subProps: t.ObjectProperty[] = [];

    for (const subProp of value.get("properties")) {
      if (!subProp.isObjectProperty()) continue;

      const subValue = subProp.node.value;

      // Resolve theme em hardcode no body da função de variant
      if (t.isArrowFunctionExpression(subValue) && t.isObjectExpression(subValue.body)) {
        resolveThemeInStyle(subValue.body);
        if (nodeHasThemeAccess(subValue.body)) {
          groupHasTheme = true;
        }
      }

      subProps.push(
        t.objectProperty(subProp.node.key, subValue as t.Expression),
      );
    }

    // Se o grupo inteiro não precisa de theme, converte funções para plain objects
    // Se alguma precisa, normaliza todas as funções para (theme) => ({...})
    const finalSubProps = subProps.map((sp) => {
      const val = sp.value as t.Expression;
      if (!t.isArrowFunctionExpression(val)) return sp;

      const normalized = groupHasTheme
        ? normalizeToThemeParam(val)
        : (t.isObjectExpression(val.body) ? val.body : val);

      return t.objectProperty(sp.key, normalized);
    });

    if (groupName) groupNeedsTheme[groupName] = groupHasTheme;

    props.push(
      t.objectProperty(groupKeyNode, t.objectExpression(finalSubProps)),
    );
  }

  return { ast: t.objectExpression(props), groupNeedsTheme };
}

/**
 * djb2 hash — retorna string base-36 de 5 chars, leve e determinístico.
 * Usado para tornar nomes de variáveis de módulo únicos entre arquivos.
 */
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).slice(0, 5);
}

/**
 * Obtém o nome semântico do Styled.X(...) a partir do AST:
 *   const ButtonText = Styled.Text(...)      → "ButtonText"
 *   export const GCS = { badge: Styled.View(...) }  → "badge"
 *   { a: { b: Styled.View(...) } }           → "b"
 * Sobe pela cadeia de ObjectProperty até encontrar VariableDeclarator ou esgotar.
 */
function getDeclarationName(
  path: NodePath<t.CallExpression>,
  fallback: string,
): string {
  let cur: NodePath | null = path.parentPath;

  while (cur) {
    if (cur.isVariableDeclarator() && t.isIdentifier(cur.node.id)) {
      return cur.node.id.name;
    }
    if (cur.isObjectProperty()) {
      const key = (cur.node as t.ObjectProperty).key;
      if (t.isIdentifier(key)) return key.name;
      if (t.isStringLiteral(key)) return key.value;
    }
    cur = cur.parentPath;
  }

  return fallback;
}

/**
 * Transforma Styled.X({...}) com variants:
 *
 * - Resolve tema em hardcode onde possível (stampd.config.ts)
 * - Emite `useStampdUI` e `(theme) => ({...})` SOMENTE quando necessário
 *
 * Caso tudo resolva:
 *   const __baseStyle_X = {...};
 *   const __variants_X = { variant: { outline: {...} } };
 *   const X = (props) => { const { variant, style, ...rest } = props; return <X ... />; };
 *
 * Caso haja valores runtime:
 *   const __baseStyle_X = (theme) => ({...});
 *   const __variants_X = { variant: { outline: (theme) => ({...}) } };
 *   const X = (props) => { const { theme } = useStampdUI(); ... };
 */
export function transformStyledWithVariants(
  path: NodePath<t.CallExpression>,
  componentName: string,
  style: ExtractedStyle,
  variants: ExtractedVariants,
  attrs: ExtractedAttrs | null = null,
  fileHash = "",
) {
  const varName = getDeclarationName(path, componentName);
  const suffix = fileHash ? `${varName}_${fileHash}` : varName;
  const baseStyleName = `__baseStyle_${suffix}`;
  const variantsName = `__variants_${suffix}`;
  const variantKeys = variants.keys;

  // ── 1. Resolve base style e verifica se ainda precisa de theme ──────────
  resolveThemeInStyle(style.node);
  const baseNeedsTheme = nodeHasThemeAccess(style.node);

  // ── 2. Resolve variants e verifica por grupo ─────────────────────────────
  const { ast: variantsAst, groupNeedsTheme } = buildNormalizedVariantsAST(variants.path);
  const anyVariantNeedsTheme = Object.values(groupNeedsTheme).some(Boolean);

  // ── 2b. Resolve attrs ────────────────────────────────────────────────────
  const attrsName = `__attrs_${suffix}`;
  let attrsDecl: t.VariableDeclaration | null = null;
  let attrsNeedsTheme = false;

  if (attrs) {
    resolveThemeInStyle(attrs.node);
    attrsNeedsTheme = nodeHasThemeAccess(attrs.node);
    const attrsValue = attrsNeedsTheme
      ? t.arrowFunctionExpression([t.identifier("theme")], attrs.node)
      : attrs.node;
    attrsDecl = t.variableDeclaration("const", [
      t.variableDeclarator(t.identifier(attrsName), attrsValue),
    ]);
  }

  const anyNeedsTheme = baseNeedsTheme || anyVariantNeedsTheme || attrsNeedsTheme;

  // ── 3. __baseStyle_X: função ou plain object ─────────────────────────────
  const baseStyleValue = baseNeedsTheme
    ? t.arrowFunctionExpression([t.identifier("theme")], style.node)
    : style.node;

  const baseStyleDecl = t.variableDeclaration("const", [
    t.variableDeclarator(t.identifier(baseStyleName), baseStyleValue),
  ]);

  // ── 4. __variants_X ──────────────────────────────────────────────────────
  const variantsDecl = t.variableDeclaration("const", [
    t.variableDeclarator(t.identifier(variantsName), variantsAst),
  ]);

  // ── 5. style={[...]} ─────────────────────────────────────────────────────
  // Base: __baseStyle_X(theme) se precisa, senão __baseStyle_X
  const baseStyleRef = baseNeedsTheme
    ? t.callExpression(t.identifier(baseStyleName), [t.identifier("theme")])
    : t.identifier(baseStyleName);

  const defaultFont = buildDefaultFontStyle(componentName);
  const styleArrayElements: t.Expression[] = [
    ...(defaultFont ? [defaultFont] : []),
    baseStyleRef,
    ...variantKeys.map((key) => {
      const lookup = t.memberExpression(
        t.memberExpression(t.identifier(variantsName), t.identifier(key)),
        t.identifier(key),
        true, // computed: __variants_X.key[key]
      );

      const variantValue = groupNeedsTheme[key]
        ? t.optionalCallExpression(lookup, [t.identifier("theme")], true) // ?.( theme)
        : lookup; // plain object — sem chamada

      return t.logicalExpression("&&", t.identifier(key), variantValue);
    }),
    t.identifier("style"),
  ];

  // ── 6. Corpo do componente ───────────────────────────────────────────────
  const destructureDecl = t.variableDeclaration("const", [
    t.variableDeclarator(
      t.objectPattern([
        ...variantKeys.map((key) =>
          t.objectProperty(t.identifier(key), t.identifier(key), false, true),
        ),
        t.objectProperty(t.identifier("style"), t.identifier("style"), false, true),
        t.restElement(t.identifier("rest")),
      ]),
      t.identifier("props"),
    ),
  ]);

  const jsxReturn = t.returnStatement(
    t.jsxElement(
      t.jsxOpeningElement(
        t.jsxIdentifier(componentName),
        [
          ...(attrs
            ? [
                t.jsxSpreadAttribute(
                  attrsNeedsTheme
                    ? t.callExpression(t.identifier(attrsName), [t.identifier("theme")])
                    : t.identifier(attrsName),
                ),
              ]
            : []),
          t.jsxSpreadAttribute(t.identifier("rest")),
          t.jsxAttribute(
            t.jsxIdentifier("style"),
            t.jsxExpressionContainer(t.arrayExpression(styleArrayElements)),
          ),
        ],
        true,
      ),
      null,
      [],
      true,
    ),
  );

  const bodyStatements: t.Statement[] = [];

  // useStampdUI só entra se necessário
  if (anyNeedsTheme) {
    bodyStatements.push(
      t.variableDeclaration("const", [
        t.variableDeclarator(
          t.objectPattern([
            t.objectProperty(
              t.identifier("theme"),
              t.identifier("theme"),
              false,
              true,
            ),
          ]),
          t.callExpression(t.identifier("useStampdUI"), []),
        ),
      ]),
    );
  }

  bodyStatements.push(destructureDecl, jsxReturn);

  const componentFn = t.arrowFunctionExpression(
    [t.identifier("props")],
    t.blockStatement(bodyStatements),
  );

  // ── 7. Hoist + imports ───────────────────────────────────────────────────
  const statementParent = path.getStatementParent();
  if (statementParent) {
    const hoisted: t.VariableDeclaration[] = [baseStyleDecl, variantsDecl];
    if (attrsDecl) hoisted.push(attrsDecl);
    statementParent.insertBefore(hoisted);
  }

  const program = path.findParent((p) => p.isProgram());
  const hasPlatformSelect = nodeHasPlatformSelect(style.node) || nodeHasPlatformSelect(variantsAst);
  if (program && program.isProgram()) {
    ensureReactNativeImport(program, componentName);
    if (anyNeedsTheme) ensureUseThemeImport(program);
    if (hasPlatformSelect) ensurePlatformImport(program);
  }

  path.replaceWith(componentFn);
}

// plugins/src/transformers/transformStyled.ts
import { NodePath, types as t } from "@babel/core";
import { getStyledConfig } from "../extractors/getStyledConfig";
import { extractStyle } from "../extractors/extractStyle";
import { extractVariants } from "../extractors/extractVariants";
import { resolveThemeInStyle } from "../theme/resolveThemeInStyle";
import { ensureReactNativeImport, ensurePlatformImport, ensureUseThemeImport } from "../utils/ensureImport";
import { nodeHasPlatformSelect } from "../utils/nodeHasPlatformSelect";
import { nodeHasThemeAccess } from "../utils/nodeHasThemeAccess";
import { replaceParamWithProps } from "../utils/replaceParamWithProps";
import { transformStyledWithVariants } from "./transformStyledWithVariants";

/**
 * Transforma:
 * Styled.View(...) → componente React
 */
export function transformStyled(path: NodePath<t.CallExpression>) {
  const callee = path.get("callee");

  if (!callee.isMemberExpression()) return;

  const componentName = callee.get("property");
  if (!componentName.isIdentifier()) return;

  const config = getStyledConfig(path);
  if (!config) return;

  const style = extractStyle(config);
  if (!style) return;

  // Se houver variants, delega para o transformer especializado
  const variants = extractVariants(config);
  if (variants) {
    transformStyledWithVariants(path, componentName.node.name, style, variants);
    return;
  }

  let styleNode = style.node;

  // Resolve tokens em compile time; valores de theme.light/dark permanecem como refs
  styleNode = resolveThemeInStyle(styleNode);

  // Verifica se ainda há acessos dinâmicos a theme (ex: theme.colors.primary)
  const needsTheme = style.type === "function" && nodeHasThemeAccess(styleNode);

  if (style.type === "function") {
    // Se needsTheme: filtra "theme" dos params para não virar props.theme
    // O `theme` ficará em escopo via useUI()
    const paramsToReplace = needsTheme
      ? style.params.filter((p) => p !== "theme")
      : style.params;
    styleNode = replaceParamWithProps(style.path, paramsToReplace);
  }

  const program = path.findParent((p) => p.isProgram());

  if (program && program.isProgram()) {
    ensureReactNativeImport(program, componentName.node.name);
    if (nodeHasPlatformSelect(styleNode)) ensurePlatformImport(program);
    if (needsTheme) ensureUseThemeImport(program);
  }

  const jsxElement = t.jsxElement(
    t.jsxOpeningElement(
      t.jsxIdentifier(componentName.node.name),
      [
        t.jsxAttribute(
          t.jsxIdentifier("style"),
          t.jsxExpressionContainer(styleNode),
        ),
        t.jsxSpreadAttribute(t.identifier("props")),
      ],
      true,
    ),
    null,
    [],
    true,
  );

  let componentFn: t.ArrowFunctionExpression;

  if (needsTheme) {
    /**
     * Gera:
     * (props) => {
     *   const { theme } = useUI();
     *   return <View style={...} {...props} />;
     * }
     */
    componentFn = t.arrowFunctionExpression(
      [t.identifier("props")],
      t.blockStatement([
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
            t.callExpression(t.identifier("useUI"), []),
          ),
        ]),
        t.returnStatement(jsxElement),
      ]),
    );
  } else {
    /**
     * Gera:
     * (props) => <View style={...} {...props} />
     */
    componentFn = t.arrowFunctionExpression(
      [t.identifier("props")],
      jsxElement,
    );
  }

  path.replaceWith(componentFn);
}

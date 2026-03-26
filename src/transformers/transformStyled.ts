// plugins/src/transformers/transformStyled.ts
import { NodePath, types as t } from "@babel/core";
import { getStyledConfig } from "../extractors/getStyledConfig";
import { extractStyle } from "../extractors/extractStyle";
import { extractVariants } from "../extractors/extractVariants";
import { resolveThemeInStyle } from "../theme/resolveThemeInStyle";
import { ensureReactNativeImport, ensurePlatformImport } from "../utils/ensureImport";
import { nodeHasPlatformSelect } from "../utils/nodeHasPlatformSelect";
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

  // 🔥 resolve theme
  styleNode = resolveThemeInStyle(styleNode);

  if (style.type === "function") {
    styleNode = replaceParamWithProps(style.path, style.params);
  }

  /**
   * Cria:
   * (props) => <View style={...} {...props} />
   */
  const jsx = t.arrowFunctionExpression(
    [t.identifier("props")],
    t.jsxElement(
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
    ),
  );

  const program = path.findParent((p) => p.isProgram());

  if (program && program.isProgram()) {
    ensureReactNativeImport(program, componentName.node.name);
    if (nodeHasPlatformSelect(styleNode)) {
      ensurePlatformImport(program);
    }
  }

  path.replaceWith(jsx);
}

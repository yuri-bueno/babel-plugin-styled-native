import { types as t } from "@babel/core";
import { loadStyledConfig } from "../config/loadStyledConfig";

const TEXT_COMPONENTS = new Set(["Text", "TextInput"]);

export function isTextComponent(name: string): boolean {
  return TEXT_COMPONENTS.has(name);
}

/**
 * Retorna um ObjectExpression com { fontFamily, fontSize } lidos de fonts.default,
 * ou null se o componente não for de texto ou se fonts.default não estiver configurado.
 */
export function buildDefaultFontStyle(
  componentName: string,
): t.ObjectExpression | null {
  if (!TEXT_COMPONENTS.has(componentName)) return null;

  const config = loadStyledConfig() as Record<string, any>;
  const defaultFont = config?.fonts?.default as
    | { family?: string; size?: number }
    | undefined;
  if (!defaultFont) return null;

  const props: t.ObjectProperty[] = [];

  if (typeof defaultFont.family === "string") {
    props.push(
      t.objectProperty(
        t.identifier("fontFamily"),
        t.stringLiteral(defaultFont.family),
      ),
    );
  }
  if (typeof defaultFont.size === "number") {
    props.push(
      t.objectProperty(
        t.identifier("fontSize"),
        t.numericLiteral(defaultFont.size),
      ),
    );
  }

  return props.length > 0 ? t.objectExpression(props) : null;
}

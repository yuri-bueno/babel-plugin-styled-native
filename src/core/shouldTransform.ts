// plugins/src/core/shouldTransform.ts
import { NodePath, types as t } from "@babel/core";
import { getProgramPath } from "../utils/getProgramPath";
import { isStyledImported } from "../detectors/isStyledImported";
import { isStyledCall } from "../detectors/isStyledCall";
import { getStyledConfig } from "../extractors/getStyledConfig";
import { extractStyle } from "../extractors/extractStyle";

/**
 * Decide se pode transformar com segurança
 */
export function shouldTransform(path: NodePath<t.CallExpression>): boolean {
  if (!isStyledCall(path)) return false;

  const program = getProgramPath(path);
  if (!program) return false;

  if (!isStyledImported(program)) return false;

  const config = getStyledConfig(path);
  if (!config) return false;

  const style = extractStyle(config);
  if (!style) return false;

  return true;
}

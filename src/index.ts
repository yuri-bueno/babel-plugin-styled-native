import { PluginObj } from "@babel/core";
import { shouldTransform } from "./core/shouldTransform";
import { transformStyled } from "./transformers/transformStyled";

export default function (): PluginObj {
  return {
    name: "styled-plugin",
    visitor: {
      CallExpression(path) {
        if (!shouldTransform(path)) return;

        try {
          transformStyled(path);
        } catch (err: any) {
          // Re-lança com contexto de arquivo + linha do Styled.X(...) que falhou
          throw path.buildCodeFrameError(
            `[styled-plugin] Falha ao transformar ${path.toString().slice(0, 80)}...\n${err?.message ?? err}`,
            err?.constructor ?? Error,
          );
        }
      },
    },
  };
}

import { PluginObj, NodePath, types as t } from "@babel/core";
import generate from "@babel/generator";
import { shouldTransform } from "./core/shouldTransform";
import { transformStyled } from "./transformers/transformStyled";

type PluginOptions = {
  debug?: boolean;
};

/** djb2 hash — 5 chars base-36, determinístico por caminho de arquivo */
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).slice(0, 5);
}

export default function (_api: unknown, options: PluginOptions = {}): PluginObj {
  const debug = options.debug ?? false;

  return {
    name: "stampd",
    visitor: {
      CallExpression(path: NodePath<t.CallExpression>, state: { filename?: string }) {
        if (!shouldTransform(path)) return;

        const fileHash = djb2(state.filename ?? "");
        const originalCode = debug ? path.toString() : "";

        try {
          transformStyled(path, fileHash);

          if (debug) {
            const generated = generate(path.node).code;
            console.log(
              `\n\x1b[36m[stampd:debug]\x1b[0m ${originalCode.slice(0, 60)}...\n` +
              `\x1b[32m→\x1b[0m ${generated}\n`,
            );
          }
        } catch (err: any) {
          const loc = path.node.loc
            ? `linha ${path.node.loc.start.line}, coluna ${path.node.loc.start.column}`
            : "posição desconhecida";
          throw path.buildCodeFrameError(
            `[stampd] Falha ao transformar (${loc})\n` +
            `  ${path.toString().slice(0, 120)}\n` +
            `  Erro: ${err?.message ?? err}`,
            err?.constructor ?? Error,
          );
        }
      },
    },
  };
}

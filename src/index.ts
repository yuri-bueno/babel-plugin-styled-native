import { PluginObj, NodePath, types as t } from "@babel/core";
import generate from "@babel/generator";
import { shouldTransform } from "./core/shouldTransform";
import { transformStyled } from "./transformers/transformStyled";

type PluginOptions = {
  debug?: boolean;
};

export default function (_api: unknown, options: PluginOptions = {}): PluginObj {
  const debug = options.debug ?? false;

  return {
    name: "stampd",
    visitor: {
      CallExpression(path: NodePath<t.CallExpression>) {
        if (!shouldTransform(path)) return;

        const originalCode = debug ? path.toString() : "";

        try {
          transformStyled(path);

          if (debug) {
            const generated = generate(path.node).code;
            console.log(
              `\n\x1b[36m[stampd:debug]\x1b[0m ${originalCode.slice(0, 60)}...\n` +
              `\x1b[32m→\x1b[0m ${generated}\n`,
            );
          }
        } catch (err: any) {
          throw path.buildCodeFrameError(
            `[stampd] Falha ao transformar ${path.toString().slice(0, 80)}...\n${err?.message ?? err}`,
            err?.constructor ?? Error,
          );
        }
      },
    },
  };
}

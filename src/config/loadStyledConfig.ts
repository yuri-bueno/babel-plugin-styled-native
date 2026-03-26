import * as fs from "fs";
import * as path from "path";
import * as babelCore from "@babel/core";
import { generateThemeTypes } from "./generateTypes";

// `_compile` e `_load` são internos ao Node mas não estão nos tipos públicos
type NodeModuleWithCompile = NodeModule & {
  _compile(code: string, filename: string): void;
};

// Mock mínimo de react-native para não quebrar módulos que o importam
const reactNativeMock = {
  Platform: {
    OS: "ios" as const,
    select: (obj: any) => ({ __platformSelect: true, options: obj }),
  },
  StyleSheet: { create: (s: any) => s },
};

let cachedTheme: Record<string, any> | null = null;
let cachedDynamicTheme: Record<string, any> | null = null;

/**
 * Executa fn() com:
 * - Handlers de `.ts`/`.tsx` que transpilam TypeScript via @babel/core
 * - Mock de `react-native` para evitar erros em tokens de design que importam Platform
 */
function withTsHandler<T>(fn: () => T): T {
  const NodeModule = require("module") as any;

  // Salva handlers anteriores
  const prevExt = {
    ".ts": (require.extensions as any)[".ts"],
    ".tsx": (require.extensions as any)[".tsx"],
  };

  // Salva _load original para restaurar depois
  const originalLoad = NodeModule._load.bind(NodeModule);

  // Handler que transpila TS → CJS via Babel
  const tsHandler = (m: NodeModuleWithCompile, filename: string) => {
    const code = fs.readFileSync(filename, "utf-8");
    const result = babelCore.transformSync(code, {
      filename,
      configFile: false,
      babelrc: false,
      presets: ["@babel/preset-typescript"],
      plugins: ["@babel/plugin-transform-modules-commonjs"],
      sourceType: "module",
    });
    if (result?.code) {
      m._compile(result.code, filename);
    }
  };

  // Intercepta react-native e pacotes Expo que não existem em Node.js
  const mockedModules = new Set([
    "react-native",
    "expo-asset",
    "expo-modules-core",
    "expo-font",
    "react-native/Libraries/Utilities/Platform",
  ]);

  NodeModule._load = function (
    request: string,
    parent: any,
    isMain: boolean,
  ) {
    if (request === "react-native" || request.startsWith("react-native/"))
      return reactNativeMock;
    if (mockedModules.has(request)) return {};
    return originalLoad(request, parent, isMain);
  };

  (require.extensions as any)[".ts"] = tsHandler;
  (require.extensions as any)[".tsx"] = tsHandler;

  try {
    return fn();
  } finally {
    NodeModule._load = originalLoad;
    if (prevExt[".ts"]) (require.extensions as any)[".ts"] = prevExt[".ts"];
    else delete (require.extensions as any)[".ts"];
    if (prevExt[".tsx"]) (require.extensions as any)[".tsx"] = prevExt[".tsx"];
    else delete (require.extensions as any)[".tsx"];
  }
}

/**
 * Procura `stampd.config.ts` (ou `.js`) na raiz do projeto (process.cwd()),
 * carrega dinamicamente e retorna `config.theme`.
 *
 * O resultado é cacheado — carrega apenas uma vez por processo.
 */
export function loadStyledConfig(): Record<string, any> {
  if (cachedTheme !== null) return cachedTheme;

  const cwd = process.cwd();
  const candidates = process.env.STYLED_CONFIG_PATH
    ? [process.env.STYLED_CONFIG_PATH]
    : [
        path.join(cwd, "stampd.config.ts"),
        path.join(cwd, "stampd.config.js"),
      ];

  for (const configPath of candidates) {
    if (!fs.existsSync(configPath)) continue;

    try {
      // Garante leitura fresca (sem cache de run anterior)
      delete require.cache[configPath];

      const mod = withTsHandler(() => require(configPath));
      const raw = mod?.config ?? mod?.default?.config ?? mod;
      // Novo formato: createTheme({ tokens, theme, fonts }) → usa tokens para compile-time
      // Formato legado: export const config = { theme: { spacing, ... } } → usa theme
      const tokens = raw?.tokens ?? raw?.theme ?? null;

      if (tokens) {
        // Inclui fonts em cachedTheme para que theme.fonts.* seja resolvido em compile-time
        const fonts = raw?.fonts ?? null;
        cachedTheme = fonts ? { ...tokens, fonts } : (tokens as Record<string, any>);
        cachedDynamicTheme = (raw?.theme?.light ?? null) as Record<string, any> | null;
        console.log(`[stampd] Config carregado de: ${configPath}`);
        generateThemeTypes(cachedTheme as Record<string, unknown>, (raw?.theme?.light ?? {}) as Record<string, unknown>, process.cwd());
        return cachedTheme!;
      }
    } catch (e) {
      console.warn(`[stampd] Falha ao carregar ${configPath}:`, e);
    }
  }

  console.warn(
    "[stampd] stampd.config.ts não encontrado — resolução de tema desabilitada",
  );
  cachedTheme = {};
  return cachedTheme;
}

/**
 * Verifica se um caminho (ex: ['colors', 'primary']) existe em theme.light.
 * Usado para suprimir avisos de paths que são intencionalmente dinâmicos (light/dark).
 */
export function isDynamicThemePath(pathKeys: string[]): boolean {
  loadStyledConfig(); // garante que cachedDynamicTheme foi populado
  if (!cachedDynamicTheme) return false;
  let node: any = cachedDynamicTheme;
  for (const key of pathKeys) {
    if (node === null || typeof node !== "object" || !(key in node)) return false;
    node = node[key];
  }
  return true;
}

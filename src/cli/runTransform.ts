// plugins/src/cli/runTransform.ts
import fs from "fs";
import path from "path";
import { transformSync } from "@babel/core";
import styledPlugin from "../index";

function parseArgs() {
  const [input, output, config] = process.argv.slice(2);
  return {
    inputPath:  path.resolve(input  || "test/input.tsx"),
    outputPath: path.resolve(output || "test/output.js"),
    configPath: config ? path.resolve(config) : undefined,
  };
}

function run() {
  const { inputPath, outputPath, configPath } = parseArgs();

  if (!fs.existsSync(inputPath)) {
    console.error("❌ Arquivo não encontrado:", inputPath);
    process.exit(1);
  }

  if (configPath) {
    if (!fs.existsSync(configPath)) {
      console.error("❌ Config não encontrado:", configPath);
      process.exit(1);
    }
    process.env.STYLED_CONFIG_PATH = configPath;
  }

  const code = fs.readFileSync(inputPath, "utf-8");

  const result = transformSync(code, {
    filename: inputPath,
    presets: [require.resolve("@babel/preset-typescript")],
    plugins: [styledPlugin],
    compact: false,
    comments: true,
    retainLines: true,
    assumptions: { setPublicClassFields: true },
    sourceMaps: false,
    babelrc: false,
    configFile: false,
  });

  if (!result?.code) {
    console.error("❌ Falha na transformação");
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result.code);

  console.log("✅ Transformado com sucesso!");
  console.log("📄 Output:", outputPath);
}

run();

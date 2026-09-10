import esbuild from "esbuild";
import { readFile } from "node:fs/promises";

const production = process.argv[2] === "production";
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

await esbuild.build({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: production,
  define: {
    "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development")
  }
});

console.log(`Built ${manifest.name} ${manifest.version}`);

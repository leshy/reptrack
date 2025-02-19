import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";

await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ["./clientside/test.ts"],
  outfile: "./static/js/test.js",
  bundle: true,
  format: "esm",
  conditions: ["browser"],
});

await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ["./clientside/clientside.ts"],
  outfile: "./static/js/clientside.js",
  bundle: true,
  format: "esm",
  conditions: ["browser"],
});

esbuild.stop();

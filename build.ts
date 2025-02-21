import * as esbuild from "npm:esbuild"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader"

await esbuild.build({
    plugins: [...denoPlugins()],
    conditions: ["browser", "deno", "node"],
    entryPoints: [
        "./clientside/clientside.ts",
    ],
    outfile: "./static/js/clientside.js",
    bundle: true,
    format: "esm",
    target: ["es2020"],
})

// await esbuild.build({
//     plugins: [...denoPlugins()],
//     entryPoints: ["./clientside/test.ts"],
//     outfile: "./static/js/test.js",
//     bundle: true,
//     format: "esm",
//     conditions: ["browser"],
// })

// await esbuild.build({
//     plugins: [...denoPlugins()],
//     entryPoints: ["./clientside/clientside_old.ts"],
//     outfile: "./static/js/clientside_old.js",
//     bundle: true,
//     format: "esm",
//     conditions: ["browser"],
// })

esbuild.stop()

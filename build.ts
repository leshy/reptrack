import * as esbuild from "npm:esbuild"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader"

await esbuild.build({
    plugins: [...denoPlugins()],
    conditions: ["browser", "deno", "node"],
    entryPoints: [
        "./src/init.ts",
    ],
    outfile: "./static/js/clientside.js",
    bundle: true,
    format: "esm",
    target: ["es2020"],
    define: {
        "import.meta.url": '""',
    },
})

esbuild.stop()

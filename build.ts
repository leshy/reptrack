import * as esbuild from "npm:esbuild"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader"

const args = Deno.args
const watchMode = args.includes("--watch")

const buildOptions = {
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
        "import.meta": "false",
    },
}

if (watchMode) {
    const context = await esbuild.context(buildOptions)
    await context.watch()
    console.log("Watching for changes...")
} else {
    await esbuild.build(buildOptions)
    esbuild.stop()
}

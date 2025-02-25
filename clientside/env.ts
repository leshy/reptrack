import Stats from "npm:stats.js"

export const STATE = {
    "runtime": "tfjs",
    "backend": "webgl",
    "flags": {
        "WEBGL_VERSION": 2,
        "WEBGL_CPU_FORWARD": true,
        "WEBGL_PACK": true,
        "WEBGL_FORCE_F16_TEXTURES": false,
        "WEBGL_RENDER_FLOAT32_CAPABLE": true,
        "WEBGL_FLUSH_THRESHOLD": -1,
    },
    "modelConfig": {
        "maxPoses": 1,
        "type": poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        "scoreThreshold": 0.2,
    },
    "model": "MoveNet",
    "lastTFJSBackend": "tfjs-webgl",
    "isModelChanged": false,
    "isFlagChanged": false,
    "isBackendChanged": false,
}

export class Env {
    stats: Stats = new Stats()
    private measurements: { [key: string]: number } = {}
    private panels: { [key: string]: Stats.panel } = {}
    private max: { [key: string]: number } = {}
    constructor(public document: Document) {
        this.document.body.appendChild(this.stats.dom)
        this.stats.showPanel(0)
    }

    fpsBegin() {
        this.stats.begin()
    }
    fpsEnd() {
        this.stats.end()
    }
    measureStart(name: string) {
        if (!this.panels[name]) {
            this.panels[name] = this.stats.addPanel(
                new Stats.Panel(name, "#ff0000", "#000000"),
            )
        }
        this.measurements[name] = performance.now()
    }
    measureEnd(name: string) {
        const value = (performance.now() - this.measurements[name]) * 100
        const max = this.max[name] || 100

        if (value > max) {
            this.max[name] = value
        }

        this.panels[name].update(
            value,
            max,
        )
    }
}

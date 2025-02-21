import { Point, TraceEmitter, TraceMap } from "./types.ts"

type TracerDrawSettings = {
    traceColor: string
    traceWidth: number
}

const defaultSettings: TracerDrawSettings = {
    traceColor: "#888888",
    traceWidth: 0.005,
}

export class TracerDraw {
    settings: TracerDrawSettings
    private tracerGroup: SVGGElement
    private pathMap: Map<string, SVGPathElement> = new Map()

    constructor(
        private traceEmitter: TraceEmitter,
        private svg: SVGSVGElement,
        settings: Partial<TracerDrawSettings> = {},
    ) {
        this.settings = { ...defaultSettings, ...settings }
        this.traceEmitter.on("trace", this.drawTrace)

        this.tracerGroup = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g",
        )
        this.tracerGroup.setAttribute("id", "tracer-group")
        this.svg.appendChild(this.tracerGroup)
    }

    drawTrace = (traceMap: TraceMap) => {
        const currentTraces = new Set<string>()

        traceMap.forEach((points, name) => {
            currentTraces.add(name)
            this.drawPath(name, points)
        })

        // Remove any paths that are no longer present
        this.pathMap.forEach((path, name) => {
            if (!currentTraces.has(name)) {
                this.tracerGroup.removeChild(path)
                this.pathMap.delete(name)
            }
        })
    }

    private drawPath(name: string, points: Point[]) {
        let path = this.pathMap.get(name)

        if (!path) {
            path = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path",
            )
            path.setAttribute("data-name", name)
            path.setAttribute("fill", "none")
            path.setAttribute("stroke", this.settings.traceColor)
            path.setAttribute("stroke-width", String(this.settings.traceWidth))
            this.tracerGroup.appendChild(path)
            this.pathMap.set(name, path)
        }

        const pathData = this.createPathData(points)
        path.setAttribute("d", pathData)
    }

    private createPathData(points: Point[]): string {
        if (points.length === 0) return ""

        const [startX, startY] = points[0]
        let pathData = `M ${startX} ${startY}`

        for (let i = 1; i < points.length; i++) {
            const [x, y] = points[i]
            pathData += ` L ${x} ${y}`
        }

        return pathData
    }
}

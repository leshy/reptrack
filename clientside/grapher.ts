import { EventEmitter } from "npm:eventemitter3"
import { MultiValueEvent } from "./types.ts"

type GrapherSettings = {
    lineColors: { [key: string]: string }
    lineWidth: number
    padding: number
}

const defaultSettings: GrapherSettings = {
    lineColors: {},
    lineWidth: 0.3,
    padding: 5,
}

export class Grapher {
    private settings: GrapherSettings
    private paths: { [name: string]: SVGPathElement } = {}
    private minValue: number = Infinity
    private maxValue: number = -Infinity

    constructor(
        private valueEmitter: EventEmitter<MultiValueEvent>,
        private svg: SVGSVGElement,
        settings: Partial<GrapherSettings> = {},
    ) {
        this.settings = { ...defaultSettings, ...settings }
        this.valueEmitter.on("values", this.updateGraph)
    }

    private createPath(name: string) {
        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
        )
        path.setAttribute("fill", "none")
        path.setAttribute(
            "stroke",
            this.settings.lineColors[name] || this.getRandomColor(),
        )
        path.setAttribute("stroke-width", String(this.settings.lineWidth))
        this.svg.appendChild(path)
        this.paths[name] = path
    }

    private getRandomColor(): string {
        return "#" + Math.floor(Math.random() * 16777215).toString(16)
    }

    private updateGraph = (values: MultiValueEvent) => {
        this.updateMinMax(values)

        for (const [name, data] of Object.entries(values)) {
            if (!this.paths[name]) {
                this.createPath(name)
            }
            const pathData = this.createPathData(data)
            this.paths[name].setAttribute("d", pathData)
        }
    }

    private updateMinMax(values: MultiValueEvent) {
        for (const data of Object.values(values)) {
            const min = Math.min(...data)
            const max = Math.max(...data)
            this.minValue = Math.min(this.minValue, min)
            this.maxValue = Math.max(this.maxValue, max)
        }
    }

    private createPathData(values: number[]): string {
        const { padding } = this.settings
        const graphWidth = 100 - 2 * padding

        const xStep = graphWidth / (values.length - 1)

        let pathData = `M ${padding} ${this.getY(values[0])}`

        for (let i = 1; i < values.length; i++) {
            const x = padding + i * xStep
            const y = this.getY(values[i])
            pathData += ` L ${x} ${y}`
        }

        return pathData
    }

    private getY(value: number): number {
        const { padding } = this.settings
        const graphHeight = 100 - 2 * padding
        const normalizedValue = (value - this.minValue) /
            (this.maxValue - this.minValue)
        return 100 - padding - normalizedValue * graphHeight
    }
}

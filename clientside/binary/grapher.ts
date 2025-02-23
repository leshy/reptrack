import { History } from "./history.ts" // Adjust import based on your file structure
import { KeypointName } from "./pose.ts" // Adjust import based on your file structure

type KeypointGrapherSettings = {
    padding: number
    minScore: number
    lineWidth: number
    lineColors: { [key in keyof typeof KeypointName]?: string }
    maxPoints: number
    zoomFactor: number
    statusEl?: HTMLElement
}

const defaultSettings: KeypointGrapherSettings = {
    padding: 10,
    minScore: 0.3,
    lineWidth: 1,
    lineColors: {},
    maxPoints: 500,
    zoomFactor: 0.15, // 15% zoom per scroll
}

const svgZoomListeners = new WeakMap<SVGSVGElement, boolean>()
const svgPaths = new WeakMap<
    SVGSVGElement,
    Map<
        string,
        {
            path: SVGPathElement
            keypoint: keyof typeof KeypointName
            coord: "x" | "y"
            start: number
            range: number
        }
    >
>()
export class KeypointGrapher {
    private history: History
    private settings: KeypointGrapherSettings
    private start: number
    private end: number

    constructor(
        history: History,
        settings: Partial<KeypointGrapherSettings> = {},
    ) {
        this.history = history
        this.settings = { ...defaultSettings, ...settings }
        this.start = 0
        this.end = history.count
    }

    private getRandomColor(): string {
        const hue = Math.floor(Math.random() * 360)
        const saturation = Math.floor(Math.random() * 30) + 70 // 70-100%
        const lightness = Math.floor(Math.random() * 30) + 60 // 60-90%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`
    }

    private downsamplePoints(points: [number, number][]): [number, number][] {
        const targetPoints = Math.min(this.settings.maxPoints, points.length)
        if (points.length <= targetPoints) return points

        const binSize = points.length / targetPoints
        const downsampled: [number, number][] = []

        for (let i = 0; i < targetPoints; i++) {
            const start = Math.floor(i * binSize)
            const end = Math.min(Math.floor((i + 1) * binSize), points.length)
            let timeSum = 0
            let coordSum = 0
            let count = 0

            for (let j = start; j < end; j++) {
                timeSum += points[j][0]
                coordSum += points[j][1]
                count++
            }

            if (count > 0) {
                downsampled.push([timeSum / count, coordSum / count])
            }
        }

        return downsampled
    }

    private getPathData(
        keypoint: keyof typeof KeypointName,
        coord: "x" | "y",
        start: number,
        range: number,
    ): string {
        const effectiveRange = Math.max(
            0,
            Math.min(range, this.history.count - start),
        )
        if (effectiveRange <= 0) return ""

        const points: [number, number][] = []
        const keypointIndex = KeypointName[keypoint]
        for (let i = 0; i < effectiveRange; i++) {
            const pose = this.history.getPoseAt(start + i)
            const [keypointCoords, score] = pose.getKeypointCoords(
                keypointIndex,
                this.settings.minScore,
            )
            if (keypointCoords) {
                const timestamp = pose.timestamp
                const coordValue = coord === "x"
                    ? keypointCoords[0]
                    : keypointCoords[1]
                points.push([timestamp, coordValue])
            }
        }

        if (points.length === 0) return ""

        const finalPoints = this.downsamplePoints(points)

        const minTime = finalPoints[0][0]
        const maxTime = finalPoints[finalPoints.length - 1][0]

        //const coordValues = finalPoints.map((p) => p[1])
        //const minCoord = Math.min(...coordValues)
        //const maxCoord = Math.max(...coordValues)

        const minCoord = 0
        const maxCoord = 255
        const timeDelta = maxTime - minTime
        const coordDelta = maxCoord - minCoord
        const graphWidth = 255 - 2 * this.settings.padding
        const graphHeight = 255 - 2 * this.settings.padding

        let pathData = ""
        for (const [timestamp, coordValue] of finalPoints) {
            const x = timeDelta === 0
                ? this.settings.padding + graphWidth / 2
                : this.settings.padding +
                    ((timestamp - minTime) / timeDelta) * graphWidth
            const y = coordDelta === 0
                ? this.settings.padding + graphHeight / 2
                : 255 - this.settings.padding -
                    ((coordValue - minCoord) / coordDelta) * graphHeight

            if (pathData === "") {
                pathData = `M ${x} ${y}`
            } else {
                pathData += ` L ${x} ${y}`
            }
        }

        return pathData
    }

    private updatePaths(svg: SVGSVGElement) {
        const paths = svgPaths.get(svg)
        if (!paths) return

        const range = this.end - this.start
        if (range <= 0) return

        if (this.settings.statusEl) {
            this.settings.statusEl.textContent = `${this.start} - ${this.end}`
        }

        for (const [_, { path, keypoint, coord }] of paths) {
            const pathData = this.getPathData(
                keypoint,
                coord,
                this.start,
                range,
            )
            path.setAttribute("d", pathData)
        }
    }

    setStart(newStart: number, svg: SVGSVGElement) {
        this.start = Math.max(0, newStart)
        this.updatePaths(svg)
    }

    setEnd(newEnd: number, svg: SVGSVGElement) {
        this.end = Math.min(this.history.count, newEnd)
        this.updatePaths(svg)
    }

    private setupZoom(svg: SVGSVGElement) {
        if (svgZoomListeners.has(svg)) return

        const handleScroll = (event: WheelEvent) => {
            event.preventDefault()

            const zoomIn = event.deltaY < 0
            const zoomChange = this.settings.zoomFactor
            const zoomFactor = zoomIn ? 1 - zoomChange : 1 + zoomChange

            const rect = svg.getBoundingClientRect()
            const cursorX = event.clientX - rect.left
            const cursorRatio = cursorX / rect.width

            const currentRange = this.end - this.start
            const newRange = Math.floor(currentRange * zoomFactor)
            const clampedRange = Math.max(
                1,
                Math.min(this.history.count, newRange),
            )

            const pivotIndex = this.start + cursorRatio * currentRange

            const newStart = Math.max(
                0,
                Math.floor(pivotIndex - cursorRatio * clampedRange),
            )
            const newEnd = Math.min(this.history.count, newStart + clampedRange)

            this.setStart(newStart, svg)
            this.setEnd(newEnd, svg)
        }

        svg.addEventListener("wheel", handleScroll, { passive: false })
        svgZoomListeners.set(svg, true)
    }

    drawKeypointGraph(
        svg: SVGSVGElement,
        keypoint: keyof typeof KeypointName,
        coord: "x" | "y",
    ): SVGPathElement | null {
        this.setupZoom(svg)

        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
        )
        path.setAttribute("fill", "none")
        const color = this.settings.lineColors[keypoint] ||
            this.getRandomColor()
        path.setAttribute("stroke", color)
        path.setAttribute("stroke-width", String(this.settings.lineWidth))
        svg.appendChild(path)

        if (!svgPaths.has(svg)) {
            svgPaths.set(svg, new Map())
        }
        const paths = svgPaths.get(svg)!
        const key = `${keypoint}-${coord}`
        paths.set(key, { path, keypoint, coord })

        this.updatePaths(svg)

        return path
    }
}

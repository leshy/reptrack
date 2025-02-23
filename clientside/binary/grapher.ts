import { History, Pose } from "./history.ts" // Adjust import based on your file structure
import { KeypointName } from "./pose.ts" // Adjust import based on your file structure

type KeypointGrapherSettings = {
    padding: number
    minScore: number
    lineWidth: number
    lineColors: { [key in keyof typeof KeypointName]?: string }
    maxPoints: number
    zoomFactor: number
}

const defaultSettings: KeypointGrapherSettings = {
    padding: 10,
    minScore: 0.3,
    lineWidth: 1,
    lineColors: {},
    maxPoints: 500,
    zoomFactor: 0.15, // 15% zoom per scroll
}

// Store event listeners and path data
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
    private initialStart: number // Original start index
    private initialRange: number // Original range
    private currentZoom: number // Zoom level (1 = no zoom, <1 = zoomed in, >1 = zoomed out)

    constructor(
        history: History,
        settings: Partial<KeypointGrapherSettings> = {},
    ) {
        this.history = history
        this.settings = { ...defaultSettings, ...settings }
        this.initialStart = 0
        this.initialRange = history.count
        this.currentZoom = 1 // Start at full view
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

        const timestamps = finalPoints.map((p) => p[0])
        const coordValues = finalPoints.map((p) => p[1])
        const minTime = Math.min(...timestamps)
        const maxTime = Math.max(...timestamps)
        const minCoord = Math.min(...coordValues)
        const maxCoord = Math.max(...coordValues)
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

    private setupZoom(svg: SVGSVGElement) {
        if (svgZoomListeners.has(svg)) return

        const handleScroll = (event: WheelEvent) => {
            event.preventDefault()

            // Adjust zoom level
            const zoomIn = event.deltaY < 0
            const zoomChange = this.settings.zoomFactor
            this.currentZoom *= zoomIn ? 1 - zoomChange : 1 + zoomChange

            // Clamp zoom level
            const minZoom = 0.01 // Show at least 10% of the original range
            const maxZoom = 1 // Full view
            this.currentZoom = Math.max(
                minZoom,
                Math.min(maxZoom, this.currentZoom),
            )

            // Update all paths
            this.updatePaths(svg)
        }

        svg.addEventListener("wheel", handleScroll, { passive: false })
        svgZoomListeners.set(svg, true)
    }

    private updatePaths(svg: SVGSVGElement) {
        const paths = svgPaths.get(svg)
        if (!paths) return

        // Calculate new start and range based on zoom
        const totalRange = Math.min(
            this.initialRange,
            this.history.count - this.initialStart,
        )
        const visibleRange = Math.floor(totalRange * this.currentZoom)
        const centerIndex = this.initialStart + totalRange / 2
        const newStart = Math.max(0, Math.floor(centerIndex - visibleRange / 2))
        const newRange = Math.min(visibleRange, this.history.count - newStart)

        // Update each path
        for (const [key, { path, keypoint, coord }] of paths) {
            const pathData = this.getPathData(
                keypoint,
                coord,
                newStart,
                newRange,
            )
            path.setAttribute("d", pathData)
            // Update stored start and range
            paths.set(key, {
                path,
                keypoint,
                coord,
                start: newStart,
                range: newRange,
            })
        }
    }

    drawKeypointGraph(
        svg: SVGSVGElement,
        keypoint: keyof typeof KeypointName,
        coord: "x" | "y",
        start: number,
        range: number,
    ): SVGPathElement | null {
        const pathData = this.getPathData(keypoint, coord, start, range)
        if (pathData === "") return null

        this.initialStart = start // Store initial bounds
        this.initialRange = range

        this.setupZoom(svg)

        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
        )
        path.setAttribute("d", pathData)
        path.setAttribute("fill", "none")
        const color = this.settings.lineColors[keypoint] ||
            this.getRandomColor()
        path.setAttribute("stroke", color)
        path.setAttribute("stroke-width", String(this.settings.lineWidth))
        svg.appendChild(path)

        // Store path data for updates
        if (!svgPaths.has(svg)) {
            svgPaths.set(svg, new Map())
        }
        const paths = svgPaths.get(svg)!
        const key = `${keypoint}-${coord}`
        paths.set(key, { path, keypoint, coord, start, range })

        return path
    }
}

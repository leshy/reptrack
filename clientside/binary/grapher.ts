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
    padding: 5,
    minScore: 0.3,
    lineWidth: 0.5,
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

        const keypointIndex = KeypointName[keypoint]
        const coordIndex = coord === "x" ? 0 : 1

        let minTime = Infinity
        let maxTime = -Infinity
        let minCoord = Infinity
        let maxCoord = -Infinity

        // First pass: find min and max values and count valid points
        let validPoints = 0
        for (let i = 0; i < effectiveRange; i++) {
            const pose = this.history.getPoseAt(start + i)
            const [keypointCoords, score] = pose.getKeypointCoords(
                keypointIndex,
                this.settings.minScore,
            )
            if (keypointCoords) {
                const timestamp = pose.timestamp
                const coordValue = keypointCoords[coordIndex]
                minTime = Math.min(minTime, timestamp)
                maxTime = Math.max(maxTime, timestamp)
                //minCoord = Math.min(minCoord, coordValue)
                //maxCoord = Math.max(maxCoord, coordValue)
                minCoord = 0
                maxCoord = 255
                validPoints++
            }
        }

        if (validPoints === 0) return ""

        const timeDelta = maxTime - minTime
        const coordDelta = maxCoord - minCoord
        const graphWidth = 255 - 2 * this.settings.padding
        const graphHeight = 255 - 2 * this.settings.padding

        // Determine downsampling factor
        const downsampleFactor = Math.ceil(
            validPoints / this.settings.maxPoints,
        )

        let pathData = ""
        let pointCount = 0
        let accumulatedX = 0
        let accumulatedY = 0
        let accumulatedPoints = 0

        // Second pass: generate downsampled path data
        for (let i = 0; i < effectiveRange; i++) {
            const pose = this.history.getPoseAt(start + i)
            const [keypointCoords, score] = pose.getKeypointCoords(
                keypointIndex,
                this.settings.minScore,
            )
            if (keypointCoords) {
                const timestamp = pose.timestamp
                const coordValue = keypointCoords[coordIndex]

                const x = timeDelta === 0
                    ? this.settings.padding + graphWidth / 2
                    : this.settings.padding +
                        ((timestamp - minTime) / timeDelta) * graphWidth
                const y = coordDelta === 0
                    ? this.settings.padding + graphHeight / 2
                    : 255 - this.settings.padding -
                        ((coordValue - minCoord) / coordDelta) * graphHeight

                accumulatedX += x
                accumulatedY += y
                accumulatedPoints++

                if (accumulatedPoints === downsampleFactor) {
                    const avgX = accumulatedX / accumulatedPoints
                    const avgY = accumulatedY / accumulatedPoints

                    if (pathData === "") {
                        pathData = `M ${avgX} ${avgY}`
                    } else {
                        pathData += ` L ${avgX} ${avgY}`
                    }

                    pointCount++
                    accumulatedX = 0
                    accumulatedY = 0
                    accumulatedPoints = 0
                }
            }
        }

        // Add any remaining accumulated points
        if (accumulatedPoints > 0) {
            const avgX = accumulatedX / accumulatedPoints
            const avgY = accumulatedY / accumulatedPoints
            pathData += ` L ${avgX} ${avgY}`
        }

        return pathData
    }
    private getRandomColor(): string {
        const hue = Math.floor(Math.random() * 360)
        const saturation = Math.floor(Math.random() * 30) + 70 // 70-100%
        const lightness = Math.floor(Math.random() * 30) + 60 // 60-90%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`
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

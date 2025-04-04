import { History } from "../binary/history.ts"
import { KeypointName } from "../binary/pose.ts"
import { SvgWindow } from "./wm.ts"
import { AnnotationManager } from "./annotations/manager.ts"
import { AnnotationOptions } from "./annotations/types.ts"
import { EventEmitter } from "npm:eventemitter3"

type KeypointGrapherSettings = {
    padding: number
    minScore: number
    lineColors: { [key in keyof typeof KeypointName]?: string }
    maxPoints: number
    zoomFactor: number
    title: string
    // We don't hardcode width/height anymore - use client dimensions
}

const defaultSettings: KeypointGrapherSettings = {
    padding: 10,
    minScore: 0.3,
    lineColors: {},
    maxPoints: 255,
    zoomFactor: 0.15, // 15% zoom per scroll
    title: "",
}

const svgZoomListeners = new WeakMap<SvgWindow, boolean>()

const svgPaths = new WeakMap<
    SvgWindow,
    Map<
        string,
        {
            path: SVGPathElement
            keypoint: keyof typeof KeypointName
            coord: "x" | "y"
        }
    >
>()

// Re-export annotation types from the annotations module
export * from "./annotations/types.ts"

// Window selection event types
export type WindowSelectionEvent = {
    startIndex: number
    endIndex: number
    history: History
    window: SvgWindow
}

export class KeypointGrapher extends EventEmitter {
    private history: History
    private settings: KeypointGrapherSettings
    private start: number
    private end: number
    private windows: Set<SvgWindow> = new Set()
    private annotationManager: AnnotationManager
    private selectionActive = false
    private selectionStart: number | null = null
    private selectionElement: SVGRectElement | null = null

    constructor(
        history: History,
        settings: Partial<KeypointGrapherSettings> = {},
    ) {
        super()
        this.history = history
        this.settings = { ...defaultSettings, ...settings }
        this.start = 0
        this.end = history.count
        this.annotationManager = new AnnotationManager(
            history,
            this.start,
            this.end,
            this.settings.padding,
        )
    }

    private getPathData(
        window: SvgWindow,
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

        // Get client dimensions of the SVG
        const rect = window.svg.getBoundingClientRect()
        const graphWidth = rect.width - 2 * this.settings.padding
        const graphHeight = rect.height - 2 * this.settings.padding

        // First pass: find min and max values and count valid points
        let validPoints = 0
        for (let i = 0; i < effectiveRange; i++) {
            const pose = this.history.getPoseAt(start + i)
            const [keypointCoords, _score] = pose.getKeypointCoords(
                keypointIndex,
                this.settings.minScore,
            )
            if (keypointCoords) {
                const timestamp = pose.timestamp
                const coordValue = keypointCoords[coordIndex]
                minTime = Math.min(minTime, timestamp)
                maxTime = Math.max(maxTime, timestamp)

                // Auto-scale the data values
                minCoord = Math.min(minCoord, coordValue)
                maxCoord = Math.max(maxCoord, coordValue)

                validPoints++
            }
        }

        if (validPoints === 0) return ""

        // If insufficient range in data, throw an error
        if (minCoord === maxCoord) {
            throw new Error(
                `Insufficient data range for ${keypoint}-${coord} graph - all values are ${minCoord}`,
            )
        }

        const timeDelta = maxTime - minTime
        const coordDelta = maxCoord - minCoord

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
            const [keypointCoords, _score] = pose.getKeypointCoords(
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
                    : graphHeight + this.settings.padding -
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

    private getRandomColor(str: string): string {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash)
        }
        const hue = Math.abs(hash % 360)
        const saturation = (hash % 31) + 70 // 70-100%
        const lightness = (hash % 31) + 60 // 60-90%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`
    }

    private updatePaths(window: SvgWindow) {
        const paths = svgPaths.get(window)
        if (!paths) return

        const range = this.end - this.start
        if (range <= 0) return

        window.title = `${this.settings.title} [${this.start}-${this.end}]`

        for (const [_, { path, keypoint, coord }] of paths) {
            const pathData = this.getPathData(
                window,
                keypoint,
                coord,
                this.start,
                range,
            )
            path.setAttribute("d", pathData)
        }
    }

    setStart(newStart: number) {
        this.start = Math.max(0, newStart)
        // Update annotation manager range
        this.annotationManager.setRange(this.start, this.end)
        // Update path visualizations
        for (const window of this.windows) {
            this.updatePaths(window)
        }
    }

    setEnd(newEnd: number) {
        this.end = Math.min(this.history.count, newEnd)
        // Update annotation manager range
        this.annotationManager.setRange(this.start, this.end)
        // Update path visualizations
        for (const window of this.windows) {
            this.updatePaths(window)
        }
    }

    /**
     * Convert mouse X coordinate to history index
     */
    private xToIndex(window: SvgWindow, x: number): number {
        const rect = window.svg.getBoundingClientRect()
        const graphWidth = rect.width - 2 * this.settings.padding
        const normalizedX = Math.max(
            0,
            Math.min(1, (x - this.settings.padding) / graphWidth),
        )

        const currentRange = this.end - this.start
        const index = Math.floor(this.start + normalizedX * currentRange)

        return Math.max(this.start, Math.min(this.end - 1, index))
    }

    private setupZoom(window: SvgWindow) {
        if (svgZoomListeners.has(window)) return

        const handleScroll = (event: WheelEvent) => {
            event.preventDefault()

            const zoomIn = event.deltaY < 0
            const zoomChange = this.settings.zoomFactor
            const zoomFactor = zoomIn ? 1 - zoomChange : 1 + zoomChange

            const rect = window.svg.getBoundingClientRect()
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

            this.setStart(newStart)
            this.setEnd(newEnd)
        }

        // Handle zoom via wheel events
        window.svg.addEventListener("wheel", handleScroll, { passive: false })

        // Set up selection interaction
        const handleMouseDown = (event: MouseEvent) => {
            if (event.button !== 0) return // Only respond to left mouse button

            // Start the selection
            this.selectionActive = true
            this.selectionStart = this.xToIndex(
                window,
                event.clientX - window.svg.getBoundingClientRect().left,
            )

            // Create or update selection rectangle
            if (!this.selectionElement) {
                this.selectionElement = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "rect",
                )
                this.selectionElement.setAttribute("class", "selection-area")
                this.selectionElement.setAttribute(
                    "fill",
                    "rgba(0, 123, 255, 0.2)",
                )
                this.selectionElement.setAttribute(
                    "stroke",
                    "rgba(0, 123, 255, 0.5)",
                )
                this.selectionElement.setAttribute("stroke-width", "1")
                this.selectionElement.setAttribute("pointer-events", "none")
                window.svg.appendChild(this.selectionElement)
            }

            const rect = window.svg.getBoundingClientRect()
            const y = this.settings.padding
            const height = rect.height - 2 * this.settings.padding

            // Position the rectangle at the initial position with zero width
            this.selectionElement.setAttribute(
                "x",
                `${event.clientX - rect.left}`,
            )
            this.selectionElement.setAttribute("y", `${y}`)
            this.selectionElement.setAttribute("width", "0")
            this.selectionElement.setAttribute("height", `${height}`)
            this.selectionElement.style.display = "block"
        }

        const handleMouseMove = (event: MouseEvent) => {
            if (
                !this.selectionActive || this.selectionStart === null ||
                !this.selectionElement
            ) return

            const rect = window.svg.getBoundingClientRect()
            const startX = this.selectionStart >= this.start
                ? this.settings.padding +
                    ((this.selectionStart - this.start) /
                            (this.end - this.start)) *
                        (rect.width - 2 * this.settings.padding)
                : this.settings.padding
            const currentX = event.clientX - rect.left

            // Calculate rectangle position and dimension
            const x = Math.min(startX, currentX)
            const width = Math.abs(startX - currentX)

            // Update rectangle
            this.selectionElement.setAttribute("x", `${x}`)
            this.selectionElement.setAttribute("width", `${width}`)
        }

        const handleMouseUp = (event: MouseEvent) => {
            if (!this.selectionActive || this.selectionStart === null) return

            // Get the current index where the mouse was released
            const currentIndex = this.xToIndex(
                window,
                event.clientX - window.svg.getBoundingClientRect().left,
            )

            // Hide the selection rectangle
            if (this.selectionElement) {
                this.selectionElement.style.display = "none"
            }

            // Finish selection only if we've moved at least 5 pixels
            const rect = window.svg.getBoundingClientRect()
            const startX = this.settings.padding +
                ((this.selectionStart - this.start) / (this.end - this.start)) *
                    (rect.width - 2 * this.settings.padding)
            const currentX = event.clientX - rect.left

            if (Math.abs(startX - currentX) >= 5) {
                // Sort indices to ensure start is always less than end
                const startIndex = Math.min(this.selectionStart, currentIndex)
                const endIndex = Math.max(this.selectionStart, currentIndex)

                // Emit the window selection event
                this.emit("window-selected", {
                    startIndex,
                    endIndex,
                    history: this.history,
                    window,
                })
            }

            // Reset selection state
            this.selectionActive = false
            this.selectionStart = null
        }

        // Add mouse event listeners for selection
        window.svg.addEventListener("mousedown", handleMouseDown)
        window.svg.addEventListener("mousemove", handleMouseMove)
        window.svg.addEventListener("mouseup", handleMouseUp)
        window.svg.addEventListener("mouseleave", () => {
            // Cancel selection if mouse leaves the SVG area
            if (this.selectionActive && this.selectionElement) {
                this.selectionElement.style.display = "none"
                this.selectionActive = false
                this.selectionStart = null
            }
        })

        // Handle window resize to redraw graphs
        const handleResize = () => {
            this.updatePaths(window)
        }

        // Add resize observer if available (not in tests)
        if (typeof ResizeObserver !== "undefined") {
            const resizeObserver = new ResizeObserver(() => {
                handleResize()
            })
            resizeObserver.observe(window.svg)
        }

        svgZoomListeners.set(window, true)
    }

    drawKeypointGraph(
        window: SvgWindow,
        keypoint: keyof typeof KeypointName,
        coord: "x" | "y",
    ): SVGPathElement | null {
        this.setupZoom(window)
        this.windows.add(window)

        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
        )
        // Use CSS class for styling
        path.setAttribute("class", "keypoint-path")

        // Set color as an attribute (will override the stroke in CSS)
        const color = this.settings.lineColors[keypoint] ||
            this.getRandomColor(keypoint)
        path.setAttribute("stroke", color)

        // Add data attributes for potential future styling
        path.setAttribute("data-keypoint", keypoint)
        path.setAttribute("data-coord", coord)

        window.svg.appendChild(path)

        if (!svgPaths.has(window)) {
            svgPaths.set(window, new Map())
        }
        const paths = svgPaths.get(window)!
        const key = `${keypoint}-${coord}`
        paths.set(key, { path, keypoint, coord })

        this.updatePaths(window)

        return path
    }

    addAnnotation(
        window: SvgWindow,
        options: AnnotationOptions & { id?: string },
    ): string {
        this.setupZoom(window)
        this.windows.add(window)

        return this.annotationManager.addAnnotation(window, options)
    }

    updateAnnotation(
        window: SvgWindow,
        id: string,
        options: Partial<Omit<AnnotationOptions, "type">>,
    ): boolean {
        return this.annotationManager.updateAnnotation(window, id, options)
    }
    removeAnnotation(window: SvgWindow, id: string): boolean {
        return this.annotationManager.removeAnnotation(window, id)
    }

    clearAnnotations(window: SvgWindow): void {
        this.annotationManager.clearAnnotations(window)
    }

    /**
     * Add a listener for window selection events
     * @param callback Function that receives selection details when user selects a window
     */
    onWindowSelected(callback: (event: WindowSelectionEvent) => void): void {
        this.on("window-selected", callback)
    }

    /**
     * Remove a listener for window selection events
     */
    offWindowSelected(callback: (event: WindowSelectionEvent) => void): void {
        this.off("window-selected", callback)
    }
}

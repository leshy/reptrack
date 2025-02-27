import { History } from "../binary/history.ts"
import { KeypointName } from "../binary/pose.ts"
import { SvgWindow } from "./wm.ts"

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

export type AnnotationOrientation = "horizontal" | "vertical"

export interface Annotation {
    id: string
    type: "line" | "point" | "region" | "text"
    orientation?: AnnotationOrientation
    value: number
    endValue?: number
    color: string
    label?: string
    opacity?: number
    dashArray?: string
    zIndex?: number
}

export type AnnotationOptions = Partial<Omit<Annotation, "id" | "type">> & {
    type: Annotation["type"]
    value: number
}

const svgAnnotations = new WeakMap<
    SvgWindow,
    Map<
        string,
        {
            elements: SVGElement[]
            annotation: Annotation
        }
    >
>()

export class KeypointGrapher {
    private history: History
    private settings: KeypointGrapherSettings
    private start: number
    private end: number
    private windows: Set<SvgWindow> = new Set()
    private lastAnnotationId = 0

    constructor(
        history: History,
        settings: Partial<KeypointGrapherSettings> = {},
    ) {
        this.history = history
        this.settings = { ...defaultSettings, ...settings }
        this.start = 0
        this.end = history.count
    }

    private generateAnnotationId(): string {
        return `annotation-${++this.lastAnnotationId}`
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

        // If insufficient range in data, set default range
        if (minCoord === maxCoord) {
            minCoord = 0
            maxCoord = 255
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
        for (const window of this.windows) {
            this.updatePaths(window)
        }
    }

    setEnd(newEnd: number) {
        this.end = Math.min(this.history.count, newEnd)
        for (const window of this.windows) {
            this.updatePaths(window)
        }
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

        // Handle window resize to redraw graphs and annotations
        const handleResize = () => {
            this.updatePaths(window)
            // Also redraw annotations
            const annotations = svgAnnotations.get(window)
            if (annotations) {
                // Create a copy of annotation entries to avoid mutation issues
                const entries = Array.from(annotations.entries())
                for (const [id, _] of entries) {
                    this.updateAnnotation(window, id, {}) // Update with same values to redraw
                }
            }
        }

        // No need to add a resize listener to window - we'll use ResizeObserver

        // Add resize event listener to window if ResizeObserver exists (doesn't in tests)
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

    /**
     * Adds an annotation to the graph
     * @param window The SvgWindow to add the annotation to
     * @param options The annotation options
     * @returns The ID of the created annotation
     */
    addAnnotation(
        window: SvgWindow,
        options: AnnotationOptions & { id?: string },
    ): string {
        this.setupZoom(window)
        this.windows.add(window)

        // Initialize annotations map for this window if it doesn't exist
        if (!svgAnnotations.has(window)) {
            svgAnnotations.set(window, new Map())
        }

        const id = options.id || this.generateAnnotationId()
        const annotation: Annotation = {
            id,
            type: options.type,
            orientation: options.orientation ||
                (options.type === "line" ? "vertical" : undefined),
            value: options.value,
            endValue: options.endValue,
            color: options.color || "#ff0000",
            label: options.label,
            opacity: options.opacity || 1,
            dashArray: options.dashArray,
            zIndex: options.zIndex || 10,
        }

        const elements: SVGElement[] = []

        // Create different SVG elements based on annotation type
        switch (annotation.type) {
            case "line": {
                const line = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "line",
                )

                // Get actual SVG dimensions
                const rect = window.svg.getBoundingClientRect()
                const svgWidth = rect.width
                const svgHeight = rect.height

                // Position the line based on orientation
                if (annotation.orientation === "vertical") {
                    const x = this.mapTimeToX(annotation.value, window)
                    line.setAttribute("x1", x.toString())
                    line.setAttribute("y1", this.settings.padding.toString())
                    line.setAttribute("x2", x.toString())
                    line.setAttribute(
                        "y2",
                        (svgHeight - this.settings.padding).toString(),
                    )
                } else {
                    // Horizontal line
                    const y = this.mapValueToY(annotation.value, window)
                    line.setAttribute("x1", this.settings.padding.toString())
                    line.setAttribute("y1", y.toString())
                    line.setAttribute(
                        "x2",
                        (svgWidth - this.settings.padding).toString(),
                    )
                    line.setAttribute("y2", y.toString())
                }

                // Use CSS class for styling
                line.setAttribute(
                    "class",
                    `annotation-line ${annotation.orientation || ""}`,
                )

                // Set color and dashArray as attributes (will override CSS)
                line.setAttribute("stroke", annotation.color)

                if (annotation.dashArray) {
                    line.setAttribute("stroke-dasharray", annotation.dashArray)
                }

                if (annotation.opacity !== undefined) {
                    line.setAttribute("opacity", annotation.opacity.toString())
                }

                elements.push(line)
                window.svg.appendChild(line)

                // Add label if specified
                if (annotation.label) {
                    const text = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "text",
                    )

                    if (annotation.orientation === "vertical") {
                        const x = this.mapTimeToX(annotation.value, window)
                        text.setAttribute("x", x.toString())
                        text.setAttribute(
                            "y",
                            (10 + this.settings.padding).toString(),
                        )
                        text.setAttribute("text-anchor", "middle")
                    } else {
                        const y = this.mapValueToY(annotation.value, window)
                        text.setAttribute(
                            "x",
                            (5 + this.settings.padding).toString(),
                        )
                        text.setAttribute("y", (y - 5).toString())
                        text.setAttribute("text-anchor", "start")
                    }

                    // Use CSS class for styling
                    text.setAttribute("class", "annotation-text")

                    // Set color as attribute (will override CSS)
                    text.setAttribute("fill", annotation.color)
                    text.textContent = annotation.label

                    elements.push(text)
                    window.svg.appendChild(text)
                }
                break
            }
            case "region": {
                if (annotation.endValue === undefined) {
                    console.error("Region annotation requires endValue")
                    break
                }

                const rect = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "rect",
                )

                // Get actual SVG dimensions
                const svgRect = window.svg.getBoundingClientRect()
                const svgHeight = svgRect.height

                const x1 = this.mapTimeToX(annotation.value, window)
                const x2 = this.mapTimeToX(annotation.endValue, window)

                rect.setAttribute("x", Math.min(x1, x2).toString())
                rect.setAttribute("y", this.settings.padding.toString())
                rect.setAttribute("width", Math.abs(x2 - x1).toString())
                rect.setAttribute(
                    "height",
                    (svgHeight - 2 * this.settings.padding).toString(),
                )
                // Use CSS class for styling
                rect.setAttribute("class", "annotation-region")

                // Set color as attribute (will override CSS)
                rect.setAttribute("fill", annotation.color)

                // Set custom opacity if provided
                if (annotation.opacity !== undefined) {
                    rect.setAttribute("opacity", annotation.opacity.toString())
                }

                elements.push(rect)
                window.svg.appendChild(rect)

                if (annotation.label) {
                    const text = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "text",
                    )

                    text.setAttribute("x", ((x1 + x2) / 2).toString())
                    text.setAttribute(
                        "y",
                        (15 + this.settings.padding).toString(),
                    )
                    text.setAttribute("text-anchor", "middle")

                    // Use CSS class for styling
                    text.setAttribute("class", "annotation-text")

                    // Set color as attribute (will override CSS)
                    text.setAttribute("fill", annotation.color)
                    text.textContent = annotation.label

                    elements.push(text)
                    window.svg.appendChild(text)
                }
                break
            }
            case "point": {
                const circle = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "circle",
                )

                const x = this.mapTimeToX(annotation.value, window)
                const y = annotation.endValue !== undefined
                    ? this.mapValueToY(annotation.endValue, window)
                    : 127.5 // Center of graph

                circle.setAttribute("cx", x.toString())
                circle.setAttribute("cy", y.toString())
                // Use CSS class for styling
                circle.setAttribute("class", "annotation-point")

                // Set color as attribute (will override CSS)
                circle.setAttribute("fill", annotation.color)

                // Set custom opacity if provided
                if (annotation.opacity !== undefined) {
                    circle.setAttribute(
                        "opacity",
                        annotation.opacity.toString(),
                    )
                }

                elements.push(circle)
                window.svg.appendChild(circle)

                if (annotation.label) {
                    const text = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "text",
                    )

                    text.setAttribute("x", (x + 6).toString())
                    text.setAttribute("y", (y - 6).toString())
                    text.setAttribute("text-anchor", "start")

                    // Use CSS class for styling
                    text.setAttribute("class", "annotation-text")

                    // Set color as attribute (will override CSS)
                    text.setAttribute("fill", annotation.color)
                    text.textContent = annotation.label

                    elements.push(text)
                    window.svg.appendChild(text)
                }
                break
            }
            case "text": {
                if (!annotation.label) {
                    console.error("Text annotation requires label")
                    break
                }

                const text = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "text",
                )

                const x = this.mapTimeToX(annotation.value, window)
                const y = annotation.endValue !== undefined
                    ? this.mapValueToY(annotation.endValue, window)
                    : 20 + this.settings.padding

                text.setAttribute("x", x.toString())
                text.setAttribute("y", y.toString())
                text.setAttribute("text-anchor", "middle")

                // Use CSS class for styling
                text.setAttribute("class", "annotation-text")

                // Set color as attribute (will override CSS)
                text.setAttribute("fill", annotation.color)

                text.textContent = annotation.label

                elements.push(text)
                window.svg.appendChild(text)
                break
            }
        }

        // Store the annotation
        svgAnnotations.get(window)!.set(id, { elements, annotation })

        return id
    }

    /**
     * Updates an existing annotation
     * @param window The SvgWindow containing the annotation
     * @param id The ID of the annotation to update
     * @param options New values for the annotation
     * @returns true if the annotation was updated, false if not found
     */
    updateAnnotation(
        window: SvgWindow,
        id: string,
        options: Partial<Omit<Annotation, "id" | "type">>,
    ): boolean {
        const annotations = svgAnnotations.get(window)
        if (!annotations || !annotations.has(id)) {
            return false
        }

        // Remove old elements
        const { elements, annotation: oldAnnotation } = annotations.get(id)!
        elements.forEach((el) => window.svg.removeChild(el))

        // Create updated annotation
        const updatedAnnotation: Annotation = {
            ...oldAnnotation,
            ...options,
        }

        // Add new annotation with same ID
        this.addAnnotation(window, {
            id,
            type: updatedAnnotation.type,
            orientation: updatedAnnotation.orientation,
            value: updatedAnnotation.value,
            endValue: updatedAnnotation.endValue,
            color: updatedAnnotation.color,
            label: updatedAnnotation.label,
            opacity: updatedAnnotation.opacity,
            dashArray: updatedAnnotation.dashArray,
            zIndex: updatedAnnotation.zIndex,
        })

        return true
    }

    /**
     * Removes an annotation from a window
     * @param window The SvgWindow containing the annotation
     * @param id The ID of the annotation to remove
     * @returns true if the annotation was removed, false if not found
     */
    removeAnnotation(window: SvgWindow, id: string): boolean {
        const annotations = svgAnnotations.get(window)
        if (!annotations || !annotations.has(id)) {
            return false
        }

        // Remove elements from SVG
        const { elements } = annotations.get(id)!
        elements.forEach((el) => window.svg.removeChild(el))

        // Remove from map
        annotations.delete(id)
        return true
    }

    /**
     * Remove all annotations from a window
     * @param window The SvgWindow to clear annotations from
     */
    clearAnnotations(window: SvgWindow): void {
        const annotations = svgAnnotations.get(window)
        if (!annotations) return

        // Remove all elements
        for (const [id, { elements }] of annotations.entries()) {
            elements.forEach((el) => window.svg.removeChild(el))
            annotations.delete(id)
        }
    }

    /**
     * Maps a timestamp to an X coordinate in the SVG
     */
    private mapTimeToX(timestamp: number, window: SvgWindow): number {
        if (this.history.count === 0) return this.settings.padding

        // Get actual SVG dimensions
        const rect = window.svg.getBoundingClientRect()
        const svgWidth = rect.width

        const startTime = this.history.getPoseAt(this.start).timestamp
        const endTime = this.history.getPoseAt(
            Math.min(this.end - 1, this.history.count - 1),
        ).timestamp

        const timeDelta = endTime - startTime
        if (timeDelta === 0) {
            return this.settings.padding +
                (svgWidth - 2 * this.settings.padding) / 2
        }

        return this.settings.padding +
            ((timestamp - startTime) / timeDelta) *
                (svgWidth - 2 * this.settings.padding)
    }

    /**
     * Maps a value to a Y coordinate in the SVG (inverted, as SVG y-axis is top-down)
     */
    private mapValueToY(value: number, window: SvgWindow): number {
        // Get actual SVG dimensions
        const rect = window.svg.getBoundingClientRect()
        const svgHeight = rect.height

        // Use auto-scaled values
        const minValue = 0
        const maxValue = 255

        return svgHeight - this.settings.padding -
            ((value - minValue) / (maxValue - minValue)) *
                (svgHeight - 2 * this.settings.padding)
    }
}

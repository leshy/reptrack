import { History } from "../binary/history.ts"
import { KeypointName } from "../binary/pose.ts"
import { SvgWindow } from "./wm.ts"

type KeypointGrapherSettings = {
    padding: number
    minScore: number
    lineWidth: number
    lineColors: { [key in keyof typeof KeypointName]?: string }
    maxPoints: number
    zoomFactor: number
    title: string
}

const defaultSettings: KeypointGrapherSettings = {
    padding: 0,
    minScore: 0.3,
    lineWidth: 0.5,
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
            const [keypointCoords, _score] = pose.getKeypointCoords(
                keypointIndex,
                this.settings.minScore,
            )
            if (keypointCoords) {
                const timestamp = pose.timestamp
                const _coordValue = keypointCoords[coordIndex]
                minTime = Math.min(minTime, timestamp)
                maxTime = Math.max(maxTime, timestamp)

                // maxCoord = Math.max(maxCoord, coordValue)
                // minCoord = Math.min(minCoord, coordValue)

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

        // Determine downsam    pling factor
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

        window.svg.addEventListener("wheel", handleScroll, { passive: false })
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
        path.setAttribute("fill", "none")
        const color = this.settings.lineColors[keypoint] ||
            this.getRandomColor(keypoint)
        path.setAttribute("stroke", color)
        path.setAttribute("stroke-width", String(this.settings.lineWidth))
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

                // Position the line based on orientation
                if (annotation.orientation === "vertical") {
                    const x = this.mapTimeToX(annotation.value, window)
                    line.setAttribute("x1", x.toString())
                    line.setAttribute("y1", this.settings.padding.toString())
                    line.setAttribute("x2", x.toString())
                    line.setAttribute(
                        "y2",
                        (255 - this.settings.padding).toString(),
                    )
                } else {
                    // Horizontal line
                    const y = this.mapValueToY(annotation.value, window)
                    line.setAttribute("x1", this.settings.padding.toString())
                    line.setAttribute("y1", y.toString())
                    line.setAttribute(
                        "x2",
                        (255 - this.settings.padding).toString(),
                    )
                    line.setAttribute("y2", y.toString())
                }

                line.setAttribute("stroke", annotation.color)
                line.setAttribute("stroke-width", "1")
                if (annotation.dashArray) {
                    line.setAttribute("stroke-dasharray", annotation.dashArray)
                }
                line.setAttribute(
                    "opacity",
                    annotation.opacity?.toString() || "1",
                )

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

                    text.setAttribute("fill", annotation.color)
                    text.setAttribute("font-size", "10")
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

                const x1 = this.mapTimeToX(annotation.value, window)
                const x2 = this.mapTimeToX(annotation.endValue, window)

                rect.setAttribute("x", Math.min(x1, x2).toString())
                rect.setAttribute("y", this.settings.padding.toString())
                rect.setAttribute("width", Math.abs(x2 - x1).toString())
                rect.setAttribute(
                    "height",
                    (255 - 2 * this.settings.padding).toString(),
                )
                rect.setAttribute("fill", annotation.color)
                rect.setAttribute(
                    "opacity",
                    annotation.opacity?.toString() || "0.3",
                )

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
                    text.setAttribute("fill", annotation.color)
                    text.setAttribute("font-size", "10")
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
                circle.setAttribute("r", "4")
                circle.setAttribute("fill", annotation.color)
                circle.setAttribute(
                    "opacity",
                    annotation.opacity?.toString() || "1",
                )

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
                    text.setAttribute("fill", annotation.color)
                    text.setAttribute("font-size", "10")
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
                text.setAttribute("fill", annotation.color)
                text.setAttribute("font-size", "12")
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
    private mapTimeToX(timestamp: number, _window: SvgWindow): number {
        if (this.history.count === 0) return this.settings.padding

        const startTime = this.history.getPoseAt(this.start).timestamp
        const endTime = this.history.getPoseAt(
            Math.min(this.end - 1, this.history.count - 1),
        ).timestamp

        const timeDelta = endTime - startTime
        if (timeDelta === 0) {
            return this.settings.padding + (255 - 2 * this.settings.padding) / 2
        }

        return this.settings.padding +
            ((timestamp - startTime) / timeDelta) *
                (255 - 2 * this.settings.padding)
    }

    /**
     * Maps a value to a Y coordinate in the SVG (inverted, as SVG y-axis is top-down)
     */
    private mapValueToY(value: number, _window: SvgWindow): number {
        // Assuming values typically range from 0-255
        const minValue = 0
        const maxValue = 255

        return 255 - this.settings.padding -
            ((value - minValue) / (maxValue - minValue)) *
                (255 - 2 * this.settings.padding)
    }
}

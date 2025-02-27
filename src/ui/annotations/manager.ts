/**
 * Main annotation manager for creating and updating annotations
 */
import { SvgWindow } from "../wm.ts"
import { Annotation, AnnotationOptions } from "./types.ts"
import { AnnotationStore } from "./store.ts"
import { CoordinateMapper } from "./coordinates.ts"
import { RendererFactory } from "./renderers.ts"
import { History } from "../../binary/history.ts"

/**
 * Manages annotations for multiple SVG windows
 */
export class AnnotationManager {
    private store: AnnotationStore = new AnnotationStore()
    private coordinateMapper: CoordinateMapper
    private zoomListeners = new WeakMap<SvgWindow, boolean>()
    private windows = new Set<SvgWindow>()
    private padding: number

    constructor(history: History, start = 0, end = history.count, padding = 5) {
        this.coordinateMapper = new CoordinateMapper(
            history,
            start,
            end,
            padding,
        )
        this.padding = padding
    }

    /**
     * Set the view range for all annotations
     */
    setRange(start: number, end: number): void {
        this.coordinateMapper.setRange(start, end)

        // Update all windows
        for (const window of this.windows) {
            this.redrawAnnotations(window)
        }
    }

    /**
     * Setup zoom and resize handling for a window
     */
    private setupWindow(window: SvgWindow): void {
        this.windows.add(window)

        // Skip if already setup
        if (this.zoomListeners.has(window)) return

        // Handle window resize to redraw annotations
        const handleResize = () => {
            this.redrawAnnotations(window)
        }

        // Add resize observer if available
        if (typeof ResizeObserver !== "undefined") {
            const resizeObserver = new ResizeObserver(() => {
                handleResize()
            })
            resizeObserver.observe(window.svg)
        }

        this.zoomListeners.set(window, true)
    }

    /**
     * Add a new annotation to a window
     */
    addAnnotation(
        window: SvgWindow,
        options: AnnotationOptions & { id?: string },
    ): string {
        this.setupWindow(window)

        // Generate or use provided ID
        const id = options.id || this.store.generateId()

        // Create annotation object with defaults
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

        // Render the annotation
        const renderer = RendererFactory.getRenderer(
            annotation.type,
            this.coordinateMapper,
            this.padding,
        )
        const elements = renderer.render(window, annotation)

        // Add elements to SVG
        elements.forEach((el) => window.svg.appendChild(el))

        // Store annotation data
        this.store.set(window, id, { elements, annotation })

        return id
    }

    /**
     * Update an existing annotation
     */
    updateAnnotation(
        window: SvgWindow,
        id: string,
        options: Partial<Omit<Annotation, "id" | "type">>,
    ): boolean {
        // Check if annotation exists
        if (!this.store.has(window, id)) {
            return false
        }

        // Get existing annotation
        const data = this.store.get(window, id)!

        // Remove elements from SVG
        data.elements.forEach((el) => window.svg.removeChild(el))

        // Create updated annotation
        const updatedAnnotation: Annotation = {
            ...data.annotation,
            ...options,
        }

        // Render with same ID
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
     * Remove an annotation from a window
     */
    removeAnnotation(window: SvgWindow, id: string): boolean {
        if (!this.store.has(window, id)) {
            return false
        }

        // Get elements and remove from SVG
        const data = this.store.get(window, id)!
        data.elements.forEach((el) => window.svg.removeChild(el))

        // Remove from store
        this.store.delete(window, id)
        return true
    }

    /**
     * Clear all annotations from a window
     */
    clearAnnotations(window: SvgWindow): void {
        const annotations = this.store.getAll(window)
        if (!annotations) return

        // Remove all elements
        for (const [id, data] of annotations) {
            data.elements.forEach((el) => window.svg.removeChild(el))
            this.store.delete(window, id)
        }
    }

    /**
     * Redraw all annotations for a window (used after resize, etc.)
     */
    private redrawAnnotations(window: SvgWindow): void {
        const annotations = this.store.getAll(window)
        if (!annotations) return

        // Create a copy of annotation entries to avoid mutation issues
        const entries = Array.from(annotations.entries())

        // Redraw each annotation
        for (const [id, _data] of entries) {
            this.updateAnnotation(window, id, {}) // Update with same values to redraw
        }
    }
}

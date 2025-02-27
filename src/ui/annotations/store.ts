/**
 * Storage for managing annotation data
 */
import { Annotation } from "./types.ts"
import { SvgWindow } from "../wm.ts"

/**
 * Annotation element data stored with each annotation
 */
export interface AnnotationData {
    elements: SVGElement[]
    annotation: Annotation
}

/**
 * Manages annotation storage and ID generation
 */
export class AnnotationStore {
    private store: WeakMap<SvgWindow, Map<string, AnnotationData>> =
        new WeakMap()
    private lastAnnotationId = 0

    /**
     * Generate a unique annotation ID
     */
    generateId(): string {
        return `annotation-${++this.lastAnnotationId}`
    }

    /**
     * Initialize store for a window if needed
     */
    initWindow(window: SvgWindow): Map<string, AnnotationData> {
        if (!this.store.has(window)) {
            this.store.set(window, new Map())
        }
        return this.store.get(window)!
    }

    /**
     * Add or update an annotation
     */
    set(window: SvgWindow, id: string, data: AnnotationData): void {
        const windowStore = this.initWindow(window)
        windowStore.set(id, data)
    }

    /**
     * Get annotation data by ID
     */
    get(window: SvgWindow, id: string): AnnotationData | undefined {
        const windowStore = this.store.get(window)
        return windowStore?.get(id)
    }

    /**
     * Check if an annotation exists
     */
    has(window: SvgWindow, id: string): boolean {
        const windowStore = this.store.get(window)
        return windowStore?.has(id) || false
    }

    /**
     * Delete an annotation
     */
    delete(window: SvgWindow, id: string): boolean {
        const windowStore = this.store.get(window)
        return windowStore?.delete(id) || false
    }

    /**
     * Get all annotations for a window
     */
    getAll(window: SvgWindow): Map<string, AnnotationData> | undefined {
        return this.store.get(window)
    }

    /**
     * Clear all annotations for a window
     */
    clear(window: SvgWindow): void {
        const windowStore = this.store.get(window)
        if (windowStore) {
            windowStore.clear()
        }
    }
}

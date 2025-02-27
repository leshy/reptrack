/**
 * Annotation system types used by the grapher component
 */

/**
 * Orientation type for annotations (horizontal or vertical)
 */
export type AnnotationOrientation = "horizontal" | "vertical"

/**
 * Base annotation interface with common properties
 */
export interface Annotation {
    /** Unique identifier for the annotation */
    id: string
    /** Type of annotation */
    type: "line" | "point" | "region" | "text"
    /** Optional orientation (required for lines) */
    orientation?: AnnotationOrientation
    /** Main value (typically time/x-coordinate) */
    value: number
    /** Secondary value (y-coordinate or end time) */
    endValue?: number
    /** Color for the annotation */
    color: string
    /** Optional text label */
    label?: string
    /** Optional opacity (0-1) */
    opacity?: number
    /** Optional SVG dash array pattern */
    dashArray?: string
    /** Optional z-index for layering */
    zIndex?: number
}

/**
 * Options for creating a new annotation
 */
export type AnnotationOptions = Partial<Omit<Annotation, "id" | "type">> & {
    type: Annotation["type"]
    value: number
}

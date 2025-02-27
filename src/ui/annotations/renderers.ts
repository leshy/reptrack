/**
 * SVG renderers for different annotation types
 */
import { SvgWindow } from "../wm.ts"
import { Annotation } from "./types.ts"
import { CoordinateMapper } from "./coordinates.ts"

/**
 * Base class for annotation renderers
 */
abstract class AnnotationRenderer {
    protected coordinateMapper: CoordinateMapper
    protected padding: number

    constructor(coordinateMapper: CoordinateMapper, padding = 5) {
        this.coordinateMapper = coordinateMapper
        this.padding = padding
    }

    /**
     * Render annotation to SVG elements
     */
    abstract render(window: SvgWindow, annotation: Annotation): SVGElement[]

    /**
     * Create a text label element
     */
    protected createLabel(
        _window: SvgWindow, // Not directly used but kept for API consistency
        x: number,
        y: number,
        text: string,
        color: string,
        anchor = "middle",
    ): SVGTextElement {
        const textElement = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
        )

        textElement.setAttribute("x", x.toString())
        textElement.setAttribute("y", y.toString())
        textElement.setAttribute("text-anchor", anchor)
        textElement.setAttribute("class", "annotation-text")
        textElement.setAttribute("fill", color)
        textElement.textContent = text

        return textElement
    }
}

/**
 * Renderer for line annotations
 */
export class LineAnnotationRenderer extends AnnotationRenderer {
    render(window: SvgWindow, annotation: Annotation): SVGElement[] {
        const elements: SVGElement[] = []
        const rect = window.svg.getBoundingClientRect()
        const svgWidth = rect.width
        const svgHeight = rect.height

        // Create line element
        const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line",
        )

        // Position based on orientation
        if (annotation.orientation === "vertical") {
            const x = this.coordinateMapper.mapTimeToX(annotation.value, window)
            line.setAttribute("x1", x.toString())
            line.setAttribute("y1", this.padding.toString())
            line.setAttribute("x2", x.toString())
            line.setAttribute("y2", (svgHeight - this.padding).toString())
        } else {
            // Horizontal line
            const y = this.coordinateMapper.mapValueToY(
                annotation.value,
                window,
            )
            line.setAttribute("x1", this.padding.toString())
            line.setAttribute("y1", y.toString())
            line.setAttribute("x2", (svgWidth - this.padding).toString())
            line.setAttribute("y2", y.toString())
        }

        // Set styling
        line.setAttribute(
            "class",
            `annotation-line ${annotation.orientation || ""}`,
        )
        line.setAttribute("stroke", annotation.color)

        if (annotation.dashArray) {
            line.setAttribute("stroke-dasharray", annotation.dashArray)
        }

        if (annotation.opacity !== undefined) {
            line.setAttribute("opacity", annotation.opacity.toString())
        }

        elements.push(line)

        // Add label if specified
        if (annotation.label) {
            let textX: number, textY: number, anchor: string

            if (annotation.orientation === "vertical") {
                textX = this.coordinateMapper.mapTimeToX(
                    annotation.value,
                    window,
                )
                textY = 10 + this.padding
                anchor = "middle"
            } else {
                textX = 5 + this.padding
                textY = this.coordinateMapper.mapValueToY(
                    annotation.value,
                    window,
                ) - 5
                anchor = "start"
            }

            const text = this.createLabel(
                window,
                textX,
                textY,
                annotation.label,
                annotation.color,
                anchor,
            )
            elements.push(text)
        }

        return elements
    }
}

/**
 * Renderer for region annotations
 */
export class RegionAnnotationRenderer extends AnnotationRenderer {
    render(window: SvgWindow, annotation: Annotation): SVGElement[] {
        const elements: SVGElement[] = []

        if (annotation.endValue === undefined) {
            console.error("Region annotation requires endValue")
            return elements
        }

        // Create rectangle element
        const rect = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect",
        )

        // Get SVG dimensions
        const svgRect = window.svg.getBoundingClientRect()
        const svgHeight = svgRect.height

        // Calculate positions
        const x1 = this.coordinateMapper.mapTimeToX(annotation.value, window)
        const x2 = this.coordinateMapper.mapTimeToX(annotation.endValue, window)

        // Set rectangle attributes
        rect.setAttribute("x", Math.min(x1, x2).toString())
        rect.setAttribute("y", this.padding.toString())
        rect.setAttribute("width", Math.abs(x2 - x1).toString())
        rect.setAttribute("height", (svgHeight - 2 * this.padding).toString())
        rect.setAttribute("class", "annotation-region")
        rect.setAttribute("fill", annotation.color)

        if (annotation.opacity !== undefined) {
            rect.setAttribute("opacity", annotation.opacity.toString())
        }

        elements.push(rect)

        // Add label if specified
        if (annotation.label) {
            const text = this.createLabel(
                window,
                (x1 + x2) / 2,
                15 + this.padding,
                annotation.label,
                annotation.color,
            )
            elements.push(text)
        }

        return elements
    }
}

/**
 * Renderer for point annotations
 */
export class PointAnnotationRenderer extends AnnotationRenderer {
    render(window: SvgWindow, annotation: Annotation): SVGElement[] {
        const elements: SVGElement[] = []

        // Create circle element
        const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle",
        )

        // Calculate position
        const x = this.coordinateMapper.mapTimeToX(annotation.value, window)
        const y = annotation.endValue !== undefined
            ? this.coordinateMapper.mapValueToY(annotation.endValue, window)
            : window.svg.clientHeight / 2 // Center of graph

        // Set circle attributes
        circle.setAttribute("cx", x.toString())
        circle.setAttribute("cy", y.toString())
        circle.setAttribute("class", "annotation-point")
        circle.setAttribute("fill", annotation.color)

        if (annotation.opacity !== undefined) {
            circle.setAttribute("opacity", annotation.opacity.toString())
        }

        elements.push(circle)

        // Add label if specified
        if (annotation.label) {
            const text = this.createLabel(
                window,
                x + 6,
                y - 6,
                annotation.label,
                annotation.color,
                "start",
            )
            elements.push(text)
        }

        return elements
    }
}

/**
 * Renderer for text annotations
 */
export class TextAnnotationRenderer extends AnnotationRenderer {
    render(window: SvgWindow, annotation: Annotation): SVGElement[] {
        const elements: SVGElement[] = []

        if (!annotation.label) {
            console.error("Text annotation requires label")
            return elements
        }

        // Calculate position
        const x = this.coordinateMapper.mapTimeToX(annotation.value, window)
        const y = annotation.endValue !== undefined
            ? this.coordinateMapper.mapValueToY(annotation.endValue, window)
            : 20 + this.padding

        // Create text element
        const text = this.createLabel(
            window,
            x,
            y,
            annotation.label,
            annotation.color,
        )

        elements.push(text)
        return elements
    }
}

/**
 * Factory to get the appropriate renderer for an annotation type
 */
export class RendererFactory {
    static getRenderer(
        type: Annotation["type"],
        coordinateMapper: CoordinateMapper,
        padding = 5,
    ): AnnotationRenderer {
        switch (type) {
            case "line":
                return new LineAnnotationRenderer(coordinateMapper, padding)
            case "region":
                return new RegionAnnotationRenderer(coordinateMapper, padding)
            case "point":
                return new PointAnnotationRenderer(coordinateMapper, padding)
            case "text":
                return new TextAnnotationRenderer(coordinateMapper, padding)
            default:
                throw new Error(`Unknown annotation type: ${type}`)
        }
    }
}

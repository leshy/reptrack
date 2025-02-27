/**
 * Utilities for mapping coordinates in the annotation system
 */
import { SvgWindow } from "../wm.ts"
import { History } from "../../binary/history.ts"

/**
 * Coordinate mapping utilities for annotations
 */
export class CoordinateMapper {
    private history: History
    private start: number
    private end: number
    private padding: number

    constructor(history: History, start: number, end: number, padding = 5) {
        this.history = history
        this.start = start
        this.end = end
        this.padding = padding
    }

    /**
     * Set the current view range
     */
    setRange(start: number, end: number): void {
        this.start = start
        this.end = end
    }

    /**
     * Maps a timestamp to an X coordinate in the SVG
     */
    mapTimeToX(timestamp: number, window: SvgWindow): number {
        if (this.history.count === 0) return this.padding

        // Get actual SVG dimensions
        const rect = window.svg.getBoundingClientRect()
        const svgWidth = rect.width

        const startTime = this.history.getPoseAt(this.start).timestamp
        const endTime = this.history.getPoseAt(
            Math.min(this.end - 1, this.history.count - 1),
        ).timestamp

        const timeDelta = endTime - startTime
        if (timeDelta === 0) {
            return this.padding + (svgWidth - 2 * this.padding) / 2
        }

        return this.padding +
            ((timestamp - startTime) / timeDelta) *
                (svgWidth - 2 * this.padding)
    }

    /**
     * Maps a value to a Y coordinate in the SVG (inverted, as SVG y-axis is top-down)
     * Values are expected to be pre-normalized between 0-1
     */
    mapValueToY(value: number, window: SvgWindow): number {
        // Get actual SVG dimensions
        const rect = window.svg.getBoundingClientRect()
        const svgHeight = rect.height

        // For now, we'll use a standard 0-1 normalization for values
        const minValue = 0
        const maxValue = 1

        return svgHeight - this.padding -
            ((value - minValue) / (maxValue - minValue)) *
                (svgHeight - 2 * this.padding)
    }
}

import { SvgWindow } from "./wm.ts"

// Types for the data series
export type DataSeries = {
    points: [number, number][] | number[] // Either [x,y] pairs or just y values
    options?: LineOptions
}

export interface LineOptions {
    color?: string
    width?: number
    style?: "solid" | "dashed" | "dotted"
    label?: string
    visible?: boolean
    opacity?: number
}

export interface GrapherSettings {
    padding: number
    autoScale: boolean
    enableZoom: boolean
    enableSelection: boolean
    zoomFactor: number
    downsampleThreshold: number // Max points before downsampling
    downsampleMethod: "average" | "minmax" | "decimate"
}

// Default settings
const defaultSettings: GrapherSettings = {
    padding: 10,
    autoScale: true,
    enableZoom: false,
    enableSelection: false,
    zoomFactor: 0.15,
    downsampleThreshold: 1000,
    downsampleMethod: "average",
}

/**
 * A graph component that extends SvgWindow to provide data visualization
 */
export class Grapher extends SvgWindow {
    // Core properties
    private settings: GrapherSettings
    private _xRange: [number, number] = [0, 100]
    private _yRange: [number, number] = [0, 100]
    private _data: { [key: string]: DataSeries } = {}

    // SVG elements
    private seriesElements: Map<string, SVGPathElement> = new Map()

    constructor(
        title: string = "",
        settings: Partial<GrapherSettings> = {},
    ) {
        super(title, { preserveRatio: false })
        this.settings = { ...defaultSettings, ...settings }

        // Initial setup of the SVG
        this.setupSvg()
    }

    /**
     * Set up the basic SVG structure
     */
    private setupSvg() {
        // SVG setup will be done via CSS
        // This method remains as a placeholder for future enhancements
    }

    /**
     * Set the x-axis range
     */
    set xRange(range: [number, number]) {
        this._xRange = range
        this.refreshAllSeries()
    }

    /**
     * Get the current x-axis range
     */
    get xRange(): [number, number] {
        return this._xRange
    }

    /**
     * Set the y-axis range
     */
    set yRange(range: [number, number]) {
        this._yRange = range
        this.refreshAllSeries()
    }

    /**
     * Get the current y-axis range
     */
    get yRange(): [number, number] {
        return this._yRange
    }

    /**
     * Set data series with a key-value dictionary
     */
    set data(dataDict: { [key: string]: DataSeries }) {
        // Track which series need to be updated
        const currentNames = new Set(Object.keys(this._data))
        const newNames = new Set(Object.keys(dataDict))

        // Identify which series to add, update, or remove
        const toAdd = [...newNames].filter((k) => !currentNames.has(k))
        const toUpdate = [...newNames].filter((k) => {
            // If we have the key, check if the array reference changed or length is different
            if (!currentNames.has(k)) return false

            const oldSeries = this._data[k]
            const newSeries = dataDict[k]

            // Check if array references are different or lengths are different
            return oldSeries.points !== newSeries.points ||
                oldSeries.points.length !== newSeries.points.length ||
                oldSeries.options !== newSeries.options
        })
        const toRemove = [...currentNames].filter((k) => !newNames.has(k))

        // Remove series that aren't in the new data
        for (const key of toRemove) {
            this.removeSeries(key)
        }

        // Update existing series that changed
        for (const key of toUpdate) {
            this.updateSeries(key, dataDict[key])
        }

        // Add new series
        for (const key of toAdd) {
            this.addSeries(key, dataDict[key])
        }

        // Update internal data store
        this._data = { ...dataDict }
    }

    /**
     * Get the current data dictionary
     */
    get data(): { [key: string]: DataSeries } {
        return { ...this._data }
    }

    /**
     * Private method to add a new series
     */
    private addSeries(key: string, series: DataSeries) {
        // Create SVG path element
        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
        )

        // Set initial attributes
        path.setAttribute("fill", "none")
        path.setAttribute(
            "stroke-width",
            series.options?.width?.toString() || "1",
        )
        path.setAttribute(
            "stroke",
            series.options?.color || this.getRandomColor(key),
        )

        if (series.options?.opacity) {
            path.setAttribute("opacity", series.options.opacity.toString())
        }

        if (series.options?.style === "dashed") {
            path.setAttribute("stroke-dasharray", "5,5")
        } else if (series.options?.style === "dotted") {
            path.setAttribute("stroke-dasharray", "2,2")
        }

        // Add the path to the SVG
        this.svg.appendChild(path)

        // Store the element reference
        this.seriesElements.set(key, path)

        // Generate and set the path data
        this.updateSeriesPath(key, series)
    }

    /**
     * Private method to update a series
     */
    private updateSeries(key: string, series: DataSeries) {
        // Get the existing path element
        const path = this.seriesElements.get(key)
        if (!path) return

        // Update attributes if options changed
        if (series.options) {
            if (series.options.width) {
                path.setAttribute(
                    "stroke-width",
                    series.options.width.toString(),
                )
            }

            if (series.options.color) {
                path.setAttribute("stroke", series.options.color)
            }

            if (series.options.style) {
                if (series.options.style === "dashed") {
                    path.setAttribute("stroke-dasharray", "5,5")
                } else if (series.options.style === "dotted") {
                    path.setAttribute("stroke-dasharray", "2,2")
                } else {
                    path.removeAttribute("stroke-dasharray")
                }
            }

            if (series.options.visible === false) {
                path.style.display = "none"
            } else {
                path.style.display = ""
            }
        }

        // Update the path data
        this.updateSeriesPath(key, series)
    }

    /**
     * Private method to remove a series
     */
    private removeSeries(key: string) {
        const path = this.seriesElements.get(key)
        if (path) {
            path.remove()
            this.seriesElements.delete(key)
        }
    }

    /**
     * Update the path data for a series
     */
    private updateSeriesPath(key: string, series: DataSeries) {
        const path = this.seriesElements.get(key)
        if (!path) return

        // Generate the path data based on the points
        const pathData = this.generatePathData(series.points)
        path.setAttribute("d", pathData)
    }

    /**
     * Generate SVG path data from data points
     */
    private generatePathData(points: [number, number][] | number[]): string {
        if (points.length === 0) return ""

        const rect = this.svg.getBoundingClientRect()
        const width = rect.width - 2 * this.settings.padding
        const height = rect.height - 2 * this.settings.padding

        const [xMin, xMax] = this._xRange
        const [yMin, yMax] = this._yRange
        const xRange = xMax - xMin
        const yRange = yMax - yMin

        if (xRange <= 0 || yRange <= 0) return ""

        let pathData = ""

        // Handle different input types
        if (typeof points[0] === "number") {
            // Array of y values with implicit x indices
            const yValues = points as number[]
            for (let i = 0; i < yValues.length; i++) {
                const x = this.settings.padding +
                    ((i / (yValues.length - 1)) * width)
                const y = height + this.settings.padding -
                    (((yValues[i] - yMin) / yRange) * height)

                if (i === 0) {
                    pathData = `M ${x} ${y}`
                } else {
                    pathData += ` L ${x} ${y}`
                }
            }
        } else {
            // Array of [x,y] pairs
            const xyPoints = points as [number, number][]
            for (let i = 0; i < xyPoints.length; i++) {
                const [xVal, yVal] = xyPoints[i]
                const x = this.settings.padding +
                    (((xVal - xMin) / xRange) * width)
                const y = height + this.settings.padding -
                    (((yVal - yMin) / yRange) * height)

                if (i === 0) {
                    pathData = `M ${x} ${y}`
                } else {
                    pathData += ` L ${x} ${y}`
                }
            }
        }

        return pathData
    }

    /**
     * Refresh all series paths (used after range changes)
     */
    private refreshAllSeries() {
        for (const [key, series] of Object.entries(this._data)) {
            this.updateSeriesPath(key, series)
        }
    }

    /**
     * Generate a random color from a string
     */
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
}

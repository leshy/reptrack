import { Window } from "./wm.ts"
import { AnyArray } from "../types/mod.ts"
import * as plotly from "npm:plotly.js-dist-min"

export type GraphPoints = [number, number][] | AnyArray<number> // Either [x,y] pairs or just y values

export interface LineOptions {
    color?: string
    width?: number
    style?: "solid" | "dashed" | "dotted"
    label?: string
    name?: string // Plotly specific name property for the trace
    visible?: boolean
    opacity?: number
    mode?: "lines" | "markers" | "lines+markers" | string
    fill?: "none" | "tozeroy" | "tozerox" | "tonexty" | "tonextx" | "toself"
    marker?: {
        size?: number
        symbol?: string
        color?: string
    }
}

// Types for the data series
export type DataSeries = {
    points: GraphPoints
    options?: LineOptions
}

// Plotly specific types
interface PlotlyConfig {
    responsive?: boolean
    displayModeBar?: boolean
    displaylogo?: boolean
    modeBarButtonsToRemove?: string[]
}

interface PlotlyLayout {
    title?: string | { text: string }
    showlegend?: boolean
    xaxis?: {
        title?: string | { text: string }
        range?: [number, number]
        gridcolor?: string
        zerolinecolor?: string
    }
    yaxis?: {
        title?: string | { text: string }
        range?: [number, number]
        gridcolor?: string
        zerolinecolor?: string
    }
    margin?: { t: number; r: number; l: number; b: number }
    hovermode?: string
    dragmode?: string
    legend?: {
        orientation?: string
        y?: number
        font?: {
            color?: string
        }
        bgcolor?: string
    }
    paper_bgcolor?: string
    plot_bgcolor?: string
    font?: {
        color?: string
    }
}

// Type for Plotly's data traces
interface PlotlyTrace {
    x: number[]
    y: number[]
    name?: string
    mode?: string
    type?: string
    opacity?: number
    line?: {
        color?: string
        width?: number
        dash?: string
    }
    marker?: {
        size?: number
        symbol?: string
        color?: string
    }
    fill?: string
    visible?: boolean | string
}

interface PlotlyInstance {
    newPlot: (
        element: HTMLElement,
        data: PlotlyTrace[],
        layout?: Partial<PlotlyLayout>,
        config?: Partial<PlotlyConfig>,
    ) => Promise<unknown>
    update: (
        element: HTMLElement,
        data?: PlotlyTrace[],
        layout?: Partial<PlotlyLayout>,
    ) => Promise<unknown>
    purge: (element: HTMLElement) => void
}

export interface GrapherSettings {
    padding: number
    autoScale: boolean
    enableZoom: boolean
    enableSelection: boolean
    xAxisTitle: string
    yAxisTitle: string
    showLegend: boolean
    plotConfig: Partial<PlotlyConfig>
    plotLayout: Partial<PlotlyLayout>
}

// Default settings
const defaultSettings: GrapherSettings = {
    padding: 10,
    autoScale: true,
    enableZoom: true,
    enableSelection: false,
    xAxisTitle: "",
    yAxisTitle: "",
    showLegend: true,
    plotConfig: {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["lasso2d", "select2d"],
    },
    plotLayout: {
        margin: { t: 50, r: 30, l: 60, b: 40 },
        hovermode: "closest",
        dragmode: "zoom",
    },
}

/**
 * A graph component that extends Window to provide data visualization with Plotly
 */
export class PlotlyGrapher extends Window {
    // Core properties
    private settings: GrapherSettings
    private _xRange: [number, number] = [0, 100]
    private _yRange: [number, number] = [0, 100]
    private _data: { [key: string]: DataSeries } = {}
    private plotDiv: HTMLDivElement

    // For Plotly
    private plotInstance: PlotlyInstance | null = null

    constructor(
        title: string = "",
        settings: Partial<GrapherSettings> = {},
    ) {
        super(title)

        // Merge settings with defaults
        this.settings = {
            ...defaultSettings,
            ...settings,
            // Merge nested objects
            plotConfig: {
                ...defaultSettings.plotConfig,
                ...(settings.plotConfig || {}),
            },
            plotLayout: {
                ...defaultSettings.plotLayout,
                ...(settings.plotLayout || {}),
            },
        }

        // Create plot container
        this.plotDiv = document.createElement("div")
        this.plotDiv.style.width = "100%"
        this.plotDiv.style.height = "100%"
        this.contentElement.appendChild(this.plotDiv)

        // Initialize the Plotly plot
        this.initPlot()
    }

    /**
     * Initialize the Plotly plot
     */
    private async initPlot() {
        const Plotly = plotly as unknown as PlotlyInstance

        // Initial layout configuration
        const layout: Partial<PlotlyLayout> = {
            ...this.settings.plotLayout,
            title: this.title,
            showlegend: this.settings.showLegend,
            xaxis: {
                title: this.settings.xAxisTitle,
                range: this._xRange,
            },
            yaxis: {
                title: this.settings.yAxisTitle,
                range: this._yRange,
            },
        }

        // Create empty plot
        try {
            await Plotly.newPlot(
                this.plotDiv,
                [],
                layout,
                this.settings.plotConfig,
            )

            // Store the plotly instance for future updates
            this.plotInstance = Plotly

            // Handle resize
            globalThis.addEventListener("resize", this.handleResize.bind(this))

            // Emit event when plot is ready
            this.emit("plotReady")
        } catch (error) {
            console.error("Failed to initialize Plotly:", error)
        }
    }

    /**
     * Handle window resize
     */
    private handleResize() {
        if (this.plotInstance) {
            this.plotInstance.update(this.plotDiv, undefined)
                .catch((err) =>
                    console.error("Failed to resize Plotly plot:", err)
                )
        }
    }

    /**
     * Set the x-axis range
     */
    set xRange(range: [number, number]) {
        this._xRange = range
        this.updateLayout({
            xaxis: {
                range,
            },
        })
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
        this.updateLayout({
            yaxis: {
                range,
            },
        })
    }

    /**
     * Get the current y-axis range
     */
    get yRange(): [number, number] {
        return this._yRange
    }

    /**
     * Update the Plotly layout
     */
    private updateLayout(layout: Partial<PlotlyLayout>) {
        if (!this.plotInstance) return

        this.plotInstance.update(this.plotDiv, undefined, layout)
            .catch((err) =>
                console.error("Failed to update Plotly layout:", err)
            )
    }

    /**
     * Set data series with a key-value dictionary
     */
    set data(dataDict: { [key: string]: DataSeries }) {
        // Currently not using these variables but keeping them for future enhancements
        const _currentNames = new Set(Object.keys(this._data))
        const _newNames = new Set(Object.keys(dataDict))

        // Update internal data store
        this._data = { ...dataDict }

        // Update the plot with new data
        this.updatePlot()

        // Auto-calculate ranges if autoScale is enabled
        if (this.settings.autoScale) {
            this.calculateRanges()
        }
    }

    /**
     * Get the current data dictionary
     */
    get data(): { [key: string]: DataSeries } {
        return { ...this._data }
    }

    /**
     * Calculate x and y ranges based on data
     */
    private calculateRanges() {
        if (Object.keys(this._data).length === 0) return

        let xMin = Infinity
        let xMax = -Infinity
        let yMin = Infinity
        let yMax = -Infinity

        for (const seriesData of Object.values(this._data)) {
            const points = seriesData.points

            if (points.length === 0) continue

            if (typeof points[0] === "number") {
                // Array of y values with implicit x indices
                const yValues = points as number[]
                xMin = Math.min(xMin, 0)
                xMax = Math.max(xMax, yValues.length - 1)

                for (let i = 0; i < yValues.length; i++) {
                    yMin = Math.min(yMin, yValues[i])
                    yMax = Math.max(yMax, yValues[i])
                }
            } else {
                // Array of [x,y] pairs
                const xyPoints = points as [number, number][]
                for (const [x, y] of xyPoints) {
                    xMin = Math.min(xMin, x)
                    xMax = Math.max(xMax, x)
                    yMin = Math.min(yMin, y)
                    yMax = Math.max(yMax, y)
                }
            }
        }

        // Add some padding
        const xPadding = (xMax - xMin) * 0.05
        const yPadding = (yMax - yMin) * 0.05

        this.xRange = [xMin - xPadding, xMax + xPadding]
        this.yRange = [yMin - yPadding, yMax + yPadding]
    }

    /**
     * Update the Plotly plot with current data
     */
    private updatePlot() {
        if (!this.plotInstance) {
            // If plot isn't initialized yet, wait for it
            this.once("plotReady", () => this.updatePlot())
            return
        }

        const plotlyData = this.convertDataToPlotlyFormat()

        this.plotInstance.update(this.plotDiv, plotlyData)
            .catch((err) => console.error("Failed to update Plotly data:", err))
    }

    /**
     * Convert internal data format to Plotly format
     */
    private convertDataToPlotlyFormat() {
        const plotlyData: PlotlyTrace[] = []

        for (const [key, series] of Object.entries(this._data)) {
            const points = series.points
            const options = series.options || {}

            let x: number[] = []
            let y: number[] = []

            // Process the points based on type
            if (points.length > 0) {
                if (typeof points[0] === "number") {
                    // Array of y values with implicit x indices
                    y = points as number[]
                    x = Array.from({ length: y.length }, (_, i) => i)
                } else {
                    // Array of [x,y] pairs
                    const xyPoints = points as [number, number][]
                    x = xyPoints.map((point) => point[0])
                    y = xyPoints.map((point) => point[1])
                }
            }

            // Create the trace
            const trace: PlotlyTrace = {
                x,
                y,
                name: options.name || options.label || key,
                mode: options.mode || "lines",
                type: "scatter",
                opacity: options.opacity !== undefined ? options.opacity : 1,
            }

            // Apply color if specified
            if (options.color) {
                // Apply color to line and markers
                if (!trace.line) trace.line = {}
                trace.line.color = options.color

                if (!trace.marker) trace.marker = {}
                trace.marker.color = options.color
            }

            // Apply line width
            if (options.width) {
                if (!trace.line) trace.line = {}
                trace.line.width = options.width
            }

            // Apply line style
            if (options.style) {
                if (!trace.line) trace.line = {}

                if (options.style === "dashed") {
                    trace.line.dash = "dash"
                } else if (options.style === "dotted") {
                    trace.line.dash = "dot"
                }
            }

            // Apply marker settings if provided
            if (options.marker) {
                trace.marker = {
                    ...(trace.marker || {}),
                    ...options.marker,
                }
            }

            // Apply fill option
            if (options.fill) {
                trace.fill = options.fill
            }

            // Apply visibility
            if (options.visible === false) {
                trace.visible = "legendonly"
            }

            plotlyData.push(trace)
        }

        return plotlyData
    }

    /**
     * Clean up event listeners on destroy
     */
    public dispose() {
        globalThis.removeEventListener("resize", this.handleResize.bind(this))

        // Clean up Plotly instance
        if (this.plotInstance && this.plotDiv) {
            this.plotInstance.purge(this.plotDiv)
        }
    }

    /**
     * Get a random color generated from a string seed
     */
    protected getRandomColor(str: string): string {
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

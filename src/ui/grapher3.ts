import { Window } from "./wm.ts"
import { AnyArray } from "../types/mod.ts"
import * as Plotly from "npm:plotly.js-dist-min"
import * as utils from "../utils/mod.ts"
import { omit } from "npm:lodash"

export type GraphPoints = [number, number][] | AnyArray<number> // Either [x,y] pairs or just y values

export interface PlotlyLineOptions {
    color?: string
    width?: number
    dash?: "solid" | "dot" | "dash" | "longdash" | "dashdot" | "longdashdot"
    shape?: "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv"
    smoothing?: number
    simplify?: boolean
    mode?: "lines" | "markers" | "lines+markers"
}

const defaultLineOptions: PlotlyLineOptions = {
    width: 1,
    shape: "spline",
}

export interface GrapherSettings {
    graph: Partial<Plotly.Config>
    layout: Partial<Plotly.Layout>
}

const defaultSettings: GrapherSettings = {
    graph: { displayModeBar: false, responsive: true },
    layout: {
        template: "plotly_dark",
        margin: { l: 35, r: 10, t: 10, b: 25 },
        autosize: true,
        paper_bgcolor: "black",
        plot_bgcolor: "black",
        dragmode: "x",
        font: {
            family: "monospace",
            size: "1.5rem",
            color: "white",
        },
        xaxis: {
            gridcolor: "rgba(255, 255, 255, 0)",
        },
        // time
        yaxis: {
            gridcolor: "rgba(255, 255, 255, 0)",
            fixedrange: true,
        },
        legend: {
            orientation: "h",
            xanchor: "right",
            yanchor: "bottom",
            x: 1,
            y: 0.05,
            bgcolor: "rgba(0,0,0,0)",
        },
    },
}

/**
 * A graph component that extends Window to provide data visualization with Plotly
 */
export class Grapher3 extends Window {
    // Core properties
    private settings: GrapherSettings

    constructor(
        title: string = "",
        settings: Partial<GrapherSettings> = {},
    ) {
        super(title)

        // Merge settings with defaults
        this.settings = utils.deepMerge(
            defaultSettings,
            settings,
        ) as GrapherSettings
    }

    linkGraph(other: Grapher3) {
        function applyZoom(
            // deno-lint-ignore no-explicit-any
            eventData: any,
            toGraph: Grapher3,
        ) {
            console.log(eventData)
            Plotly.relayout(toGraph.element, eventData)
        }

        // @ts-ignore
        this.element.on(
            "plotly_relayout",
            // deno-lint-ignore no-explicit-any
            (eventData: any) => applyZoom(eventData, other),
        )
    }

    /**
     * Initialize the plot with default data
     */
    initPlot = () => {
        Plotly.Plots.resize(this.element)
    }
    /**
     * Plot data from GraphPoints
     * @param data The GraphPoints data to plot
     * @param options Additional plot options
     */
    plotData(
        data: GraphPoints,
        options: {
            name?: string
        } & PlotlyLineOptions = {},
    ) {
        // Default options
        const {
            name = "",
        } = options

        const x: number[] = []
        const y: number[] = []

        let cnt = 0
        for (const item of data) {
            if (Array.isArray(item)) {
                y.push(item[1])
                x.push(item[0])
            } else {
                y.push(item)
                x.push(cnt++)
            }
        }

        // Create trace
        const trace = {
            x,
            y,
            name,
            type: "scatter",
            mode: options.mode || "lines",
            line: { ...defaultLineOptions, ...omit(options, "name", "mode") },
        }

        // Check if a plot already exists by checking if Plotly data exists
        const plotlyDiv = this.element as unknown as { data?: unknown[] }
        if (plotlyDiv.data && plotlyDiv.data.length > 0) {
            Plotly.addTraces(this.element, trace)
        } else {
            Plotly.newPlot(
                this.element,
                [trace],
                this.settings.layout,
                this.settings.graph,
            )
            requestAnimationFrame(this.initPlot)
        }
    }

    /**
     * Clear all data from the plot
     */
    clear() {
        Plotly.newPlot(
            this.element,
            [],
            this.settings.layout,
            this.settings.graph,
        )
    }
}

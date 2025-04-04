import { Window } from "./wm.ts"
import { AnyArray, isObject } from "../types/mod.ts"
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

type Range = [number, number]
/**
 * A graph component that extends Window to provide data visualization with Plotly
 */
export class Grapher3 extends Window {
    // Core properties
    private settings: GrapherSettings
    private drawn: boolean = false
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

    linkGraph(other: Grapher3, callback?: (range: Range) => void) {
        function applyZoom(
            // deno-lint-ignore no-explicit-any
            eventData: any,
            toGraph: Grapher3,
        ) {
            if (eventData["xaxis.range[0]"] && callback) {
                callback(
                    [eventData["xaxis.range[0]"], eventData["xaxis.range[1]"]],
                )
            }
            Plotly.relayout(toGraph.element, eventData)
        }

        // @ts-ignore
        this.element.on(
            "plotly_relayout",
            // deno-lint-ignore no-explicit-any
            (eventData: any) => applyZoom(eventData, other),
        )
    }

    setRange(range: Range) {
        Plotly.relayout(this.element, {
            "xaxis.range": range,
        })
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
    async plotData(
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

        const size: number[] = []
        const color: string[] = []
        
        let cnt = 0
        for (const item of data) {
            cnt++
            if (Array.isArray(item)) {
                y.push(item[1])
                x.push(item[0])
            } else if (isObject(item)) {
                x.push(item.x)
                if (item.y) y.push(item.y)
                else y.push(cnt)

                if (item.size) { size.push(item.size) }
                if (item.color) { color.push(item.color) }
            } else {
                y.push(item)
                x.push(cnt)
            }
        }

        // Create trace
        const trace = {
            x,
            y,
            name,
            marker: {size, color, opacity: 1, line: { width: 0 }},
            type: "scatter",
            mode: options.mode || "lines",
            line: { ...defaultLineOptions, ...omit(options, "name", "mode") },
        }

        // Check if a plot already exists by checking if Plotly data exists
        if (this.drawn) {
            Plotly.addTraces(this.element, trace)
        } else {
            this.drawn = true
            console.log(
                await Plotly.newPlot(
                    this.element,
                    [trace],
                    this.settings.layout,
                    this.settings.graph,
                ),
            )
        }
        //requestAnimationFrame(this.initPlot)
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

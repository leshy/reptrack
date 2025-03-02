import { Window } from "./wm.ts"
import { AnyArray } from "../types/mod.ts"
import * as Plotly from "npm:plotly.js-dist-min"
import * as utils from "../utils/mod.ts"

export type GraphPoints = [number, number][] | AnyArray<number> // Either [x,y] pairs or just y values

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

        this.initPlot()
    }

    /**
     * Initialize the plot with default data
     */
    initPlot() {
        // const trace1 = {
        //     x: [1, 2, 3, 4],
        //     y: [10, 15, 13, 17],
        //     type: "scatter",
        // }

        // const trace2 = {
        //     x: [1, 2, 3, 4],
        //     y: [16, 5, 11, 9],
        //     type: "scatter",
        // }

        // Plotly.newPlot(
        //     this.element,
        //     [trace1, trace2],
        //     this.settings.layout,
        //     this.settings.graph,
        // )

        setTimeout(() => Plotly.Plots.resize(this.element), 0)
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
            color?: string
            mode?: "lines" | "markers" | "lines+markers"
        } = {},
    ) {
        // Default options
        const {
            name = "",
            color = undefined,
            mode = "lines",
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
            mode,
            ...(color ? { line: { color, width: 1 } } : { width: 1 }),
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
        }

        setTimeout(() => Plotly.Plots.resize(this.element), 0)
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

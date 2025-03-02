import { Window } from "./wm.ts"
import * as Plotly from "npm:plotly.js-dist-min"
import * as utils from "../utils/mod.ts"

export interface GrapherSettings {
    padding: number
    graph: Partial<Plotly.Config>
    layout: Partial<Plotly.Layout>
}

const defaultSettings: GrapherSettings = {
    padding: 10,
    graph: { displayModeBar: false, responsive: true },
    layout: {
        template: "plotly_dark",
        margin: { l: 50, r: 30, t: 30, b: 50 },
        autosize: true,
        paper_bgcolor: "black",
        plot_bgcolor: "black",
        font: {
            family: "monospace",
            size: "1.2rem",
            color: "white",
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

    initPlot() {
        const trace1 = {
            x: [1, 2, 3, 4],
            y: [10, 15, 13, 17],
            type: "scatter",
        }

        const trace2 = {
            x: [1, 2, 3, 4],
            y: [16, 5, 11, 9],
            type: "scatter",
        }

        Plotly.newPlot(
            this.element,
            [trace1, trace2],
            this.settings.layout,
            this.settings.graph,
        )

        Plotly.Plots.resize(this.element)
    }
}

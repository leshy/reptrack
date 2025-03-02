import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import * as grapher3 from "../ui/grapher3.ts"
import { DataSeries, Grapher } from "../ui/grapher2.ts"
import { runFFT } from "../fft.ts"
import * as it from "../itransform/mod.ts"
import * as Plotly from "npm:plotly.js-dist-min"

export async function fft() {
    // Load the history file
    const euclidHistory = await binary.HistoryFile.load("../euclid10.bin.gz")

    // @ts-ignore
    globalThis.h = euclidHistory

    const root = new wm.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    // graph windows
    const graphsWindow = root.addWindow(new wm.Window("Euclidian History"))
    const sourceXgraph = graphsWindow.addWindow(
        new grapher3.Grapher3("X Positions"),
    )
    const sourceYgraph = graphsWindow.addWindow(
        new grapher3.Grapher3("Y Positions"),
        //        new wm.SvgWindow("Euclid Y Positions", { preserveRatio: false }),
    )

    const skeleton = new ui.Skeleton(euclidHistory, "Euclid", { minScore: 0 })
    const euclidInputSvg = root.addWindow(
        skeleton,
    )

    const poi: binary.KeypointNameType[] = [
        "nose",
        "left_wrist",
        "right_wrist",
        "left_knee",
        "right_knee",
        "left_ankle",
        "right_ankle",
    ]

    for (const name of poi) {
        sourceXgraph.plotData(
            [...euclidHistory.points(
                binary.KeypointName[name],
            )].map((
                point: binary.Point,
            ) => point[0]),
            { name: name, color: ui.getRandomColor(name) },
        )
        sourceYgraph.plotData(
            [...euclidHistory.points(
                binary.KeypointName[name],
            )].map((
                point: binary.Point,
            ) => point[1]),
            { name: name, color: ui.getRandomColor(name) },
        )
    }

    const g3 = root.addWindow(
        new grapher3.Grapher3("Grapher3", {
            layout: {
                legend: {
                    x: 0.95,
                    y: 1,
                },
            },
        }),
    )

    function FFTKeypoint(
        keypointId: number,
        from: number,
        to: number,
    ) {
        const name = binary.KeypointName[keypointId]

        const timeSeriesData = Array.from(it.pipe(
            euclidHistory.points(keypointId),
            it.skip(from),
            it.take(to - from),
            it.map((point: binary.Point) => point[1]),
        ))

        //        const fftMagnitudes = new Uint16Array((windowLen / 2) - 2)

        // we are smoothing and copying the data into fftMagnitudes in one pass
        const smoothFftMagnitudes = Uint16Array.from(it.pipe(
            runFFT(timeSeriesData),
            it.skip(1),
            //            it.copy(fftMagnitudes),
            //it.smooth(3),
        ) as Iterable<number>)

        // g3.plotData(fftMagnitudes, {
        //     //color: "rgba(233, 30, 99, 0.75)",
        //     name,
        //     color: ui.getRandomColor(name),
        // })

        g3.plotData(smoothFftMagnitudes, {
            //color: "rgb(233, 30, 99)",
            name,
            color: ui.getRandomColor(name),
            mode: "lines+markers",
            width: 3,
        })
    }

    skeleton.on("keypointClick", (event) => {
        fftWindow.title = "keypoint " + binary.KeypointName[event.index]
    })

    //FFTKeypoint(binary.KeypointName.left_knee)

    const euclidPlayer = new ui.HistoryControls(euclidHistory, euclidInputSvg)

    // sourceXgraph.linkGraph(sourceYgraph, ([from, to]) => {
    //     g3.clear()
    //     for (const keypointName of poi) {
    //         FFTKeypoint(binary.KeypointName[keypointName], from, to)
    //     }
    // })

    euclidPlayer.on("frameChanged", (frame: number) => {
        const windowSize = 64
        if (frame < windowSize) return

        g3.clear()

        for (const keypointName of poi) {
            FFTKeypoint(
                binary.KeypointName[keypointName],
                frame - windowSize,
                frame,
            )
        }

        sourceXgraph.setRange([frame - windowSize - 1, frame])
        sourceYgraph.setRange([frame - windowSize - 1, frame])

        g3.setRange([0, (windowSize / 2) - 2])
    })

    // // Update playhead position when frame changes
    // euclidPlayer.on("frameChanged", (frame: number) => {
    //     // Get the timestamp for the current frame
    //     const pose = euclidHistory.getPoseAt(frame)
    //     const timestamp = pose.timestamp

    //     // Update playhead position in both graphs
    //     euclidGrapher.updateAnnotation(sourceXgraph, playheadIdX, {
    //         value: timestamp,
    //     })

    //     euclidGrapher.updateAnnotation(sourceYgraph, playheadIdY, {
    //         value: timestamp,
    //     })
    // })

    euclidPlayer.nextFrame()
}

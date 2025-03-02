import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import * as grapher3 from "../ui/grapher3.ts"
import { DataSeries, Grapher } from "../ui/grapher2.ts"
import { runFFT } from "../fft.ts"
import * as it from "../itransform/mod.ts"
import { average } from "../types/mod.ts"

export async function fft() {
    // Load the history file
    const euclidHistory = await binary.HistoryFile.load("../euclid10.bin.gz")

    // @ts-ignore
    globalThis.h = euclidHistory

    const root = new wm.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    // graph windows
    const graphsWindow = root.addWindow(new wm.Window("graphs"))
    const euclidGrapherXWindow = graphsWindow.addWindow(
        new grapher3.Grapher3("Euclid X Positions"),
    )
    const euclidGrapherYWindow = graphsWindow.addWindow(
        new grapher3.Grapher3("Euclid Y Positions"),
        //        new wm.SvgWindow("Euclid Y Positions", { preserveRatio: false }),
    )

    // graph drawing
    const euclidGrapher = new ui.KeypointGrapher(euclidHistory, {})

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
        // euclidGrapher.drawKeypointGraph(
        //     euclidGrapherYWindow,
        //     name as keyof typeof binary.KeypointName,
        //     "y",
        // )

        //euclidGrapher.drawKeypointGraph(
        //    euclidGrapherXWindow,
        //    name as keyof typeof binary.KeypointName,
        //    "x",
        //)
        euclidGrapherXWindow.plotData(
            [...euclidHistory.points(
                binary.KeypointName[name],
            )].map((
                point: binary.Point,
            ) => point[0]),
            { name: name, color: ui.getRandomColor(name) },
        )
        euclidGrapherYWindow.plotData(
            [...euclidHistory.points(
                binary.KeypointName[name],
            )].map((
                point: binary.Point,
            ) => point[1]),
            { name: name, color: ui.getRandomColor(name) },
        )
    }

    // // Add playhead annotations to the graphs
    // const playheadIdX = euclidGrapher.addAnnotation(euclidGrapherXWindow, {
    //     type: "line",
    //     orientation: "vertical",
    //     value: 0,
    //     color: "#ff0000",
    //     opacity: 0.8,
    //     zIndex: 100,
    // })

    // const playheadIdY = euclidGrapher.addAnnotation(euclidGrapherYWindow, {
    //     type: "line",
    //     orientation: "vertical",
    //     value: 0,
    //     color: "#ff0000",
    //     opacity: 0.8,
    //     zIndex: 100,
    // })

    const fftWindow = root.addWindow(new wm.Window("FFT"))

    const timeSeriesGrapher = fftWindow.addWindow(
        new Grapher("Source Series", {
            autoScale: true,
            enableZoom: true,
        }),
    )

    const fftGrapher = fftWindow.addWindow(
        new Grapher("Output", {
            autoScale: true,
            enableZoom: true,
        }),
    )

    // // Extract time series data for plotting
    // const timeSeriesData: number[] = []
    // for (let i = 0; i < fftResult.windowSize; i++) {
    //     timeSeriesData.push(fftResult.keypointData[i][0]) // x-coordinate
    // }

    // //    Extract time series data for plotting
    // const timeSeriesData: number[] = fftResult.keypointData.map((
    //     point: binary.Point,
    // ) => point[0])

    // Filter out DC component (first value) and create filtered data series
    // const dcComponentCutoff = 5 // Skip the first few frequencies, including DC component
    // const filteredMagnitudes = fftMagnitudes.slice(dcComponentCutoff)

    const g3 = root.addWindow(new grapher3.Grapher3("Grapher3"))

    root.addWindow(new ui.Window("test"))

    function FFTKeypoint(keypointId: number) {
        const windowLen = 1024

        const timeSeriesData = Uint8Array.from(it.pipe(
            euclidHistory.points(keypointId),
            it.take(windowLen),
            it.map((point: binary.Point) => point[0]),
        ))

        const fftMagnitudes = new Uint16Array((windowLen / 2) - 2)

        // we are smoothing and copying the data into fftMagnitudes in one pass
        const smoothFftMagnitudes = Uint16Array.from(it.pipe(
            runFFT(timeSeriesData),
            it.skip(2),
            it.copy(fftMagnitudes),
            it.chunk(5),
            // @ts-ignore
            it.map(average) as it.Transform<number[], number>,
        ) as Iterable<number>)

        // Create data series for time series graph
        const timeSeriesDataSeries: { [key: string]: DataSeries } = {
            "right_wrist_x": {
                points: timeSeriesData,
                options: {
                    color: "#2196F3",
                    label: "Source: Right Wrist X Position",
                },
            },
        }

        // Create data series for both full and filtered FFT magnitude graphs
        const fftDataSeries: { [key: string]: DataSeries } = {
            "fft_magnitude": {
                points: fftMagnitudes,
                options: {
                    color: "#E91E63",
                    label: "FFT Magnitude (Raw)",
                    opacity: 0.5,
                    width: 2,
                },
            },
            "fft_magnitude_smoothed": {
                points: smoothFftMagnitudes,
                options: {
                    color: "#E91E63",
                    label: "FFT Magnitude (Smoothed)",
                    width: 3,
                },
            },
        }

        // Set data ranges
        timeSeriesGrapher.xRange = [0, timeSeriesData.length - 1]
        timeSeriesGrapher.yRange = [
            Math.min(...timeSeriesData) - 10,
            Math.max(...timeSeriesData) + 10,
        ]

        fftGrapher.xRange = [0, fftMagnitudes.length - 1]
        fftGrapher.yRange = [0, Math.max(...fftMagnitudes) * 1.1]

        g3.plotData(fftMagnitudes, {
            name: "raw",
            color: "rgba(233, 30, 99, 0.5)",
        })
        g3.plotData(smoothFftMagnitudes, {
            name: "smooth",
            color: "rgb(233, 30, 99)",
        })

        // Update the graphs with data
        timeSeriesGrapher.data = timeSeriesDataSeries
        fftGrapher.data = fftDataSeries
    }

    skeleton.on("keypointClick", (event) => {
        FFTKeypoint(event.index)
        timeSeriesGrapher.title = "keypoint " + binary.KeypointName[event.index]
    })

    FFTKeypoint(binary.KeypointName.left_knee)

    const euclidPlayer = new ui.HistoryControls(euclidHistory, euclidInputSvg)

    // // Update playhead position when frame changes
    // euclidPlayer.on("frameChanged", (frame: number) => {
    //     // Get the timestamp for the current frame
    //     const pose = euclidHistory.getPoseAt(frame)
    //     const timestamp = pose.timestamp

    //     // Update playhead position in both graphs
    //     euclidGrapher.updateAnnotation(euclidGrapherXWindow, playheadIdX, {
    //         value: timestamp,
    //     })

    //     euclidGrapher.updateAnnotation(euclidGrapherYWindow, playheadIdY, {
    //         value: timestamp,
    //     })
    // })

    euclidPlayer.nextFrame()
}

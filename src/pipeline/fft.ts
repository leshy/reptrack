import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import { DataSeries, Grapher } from "../ui/grapher2.ts"
import { runFFT } from "../fft.ts"
import * as t from "../transform/transform.ts"
import * as utils from "../utils/mod.ts"

export async function fft() {
    // Load the history file
    const euclidHistory = await binary.HistoryFile.load("euclid10.bin.gz")

    // @ts-ignore
    globalThis.h = euclidHistory

    const root = new wm.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    const euclidInputSvg = root.addWindow(
        new wm.SvgWindow("euclid history"),
    )

    // graph windows
    const graphsWindow = root.addWindow(new wm.Window("graphs"))
    const euclidGrapherXWindow = graphsWindow.addWindow(
        new wm.SvgWindow("Euclid X Positions", { preserveRatio: false }),
    )
    const euclidGrapherYWindow = graphsWindow.addWindow(
        new wm.SvgWindow("Euclid Y Positions", { preserveRatio: false }),
    )

    // graph drawing
    const euclidGrapher = new ui.KeypointGrapher(euclidHistory, {})

    const poi = [
        "nose",
        "left_wrist",
        "right_wrist",
        "left_knee",
        "right_knee",
        "left_ankle",
        "right_ankle",
    ]

    for (const name of poi) {
        euclidGrapher.drawKeypointGraph(
            euclidGrapherYWindow,
            name as keyof typeof binary.KeypointName,
            "y",
        )
        euclidGrapher.drawKeypointGraph(
            euclidGrapherXWindow,
            name as keyof typeof binary.KeypointName,
            "x",
        )
    }

    new ui.Skeleton(euclidHistory, euclidInputSvg, { minScore: 0 })

    // Add playhead annotations to the graphs
    const playheadIdX = euclidGrapher.addAnnotation(euclidGrapherXWindow, {
        type: "line",
        orientation: "vertical",
        value: 0,
        color: "#ff0000",
        opacity: 0.8,
        zIndex: 100,
    })

    const playheadIdY = euclidGrapher.addAnnotation(euclidGrapherYWindow, {
        type: "line",
        orientation: "vertical",
        value: 0,
        color: "#ff0000",
        opacity: 0.8,
        zIndex: 100,
    })

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

    const pointData = Array.from(
        utils.takeN(
            1024,
            euclidHistory.keypoints(binary.KeypointName.right_wrist),
        ),
    )

    const timeSeriesData: number[] = pointData.map((
        point: [number, [number, number, number]],
    ) => point[1][0])

    const fftResult = await runFFT(timeSeriesData)

    // // Extract time series data for plotting
    // const timeSeriesData: number[] = []
    // for (let i = 0; i < fftResult.windowSize; i++) {
    //     timeSeriesData.push(fftResult.keypointData[i][0]) // x-coordinate
    // }

    // //    Extract time series data for plotting
    // const timeSeriesData: number[] = fftResult.keypointData.map((
    //     point: binary.Point,
    // ) => point[0])

    // Calculate FFT magnitudes
    const fftMagnitudes: number[] = []
    for (let i = 0; i < timeSeriesData.length / 2; i++) {
        const real = fftResult[i * 2]
        const imag = fftResult[i * 2 + 1]
        const magnitude = Math.sqrt(real * real + imag * imag)
        fftMagnitudes.push(magnitude)
    }

    // Filter out DC component (first value) and create filtered data series
    const dcComponentCutoff = 5 // Skip the first few frequencies, including DC component
    const filteredMagnitudes = fftMagnitudes.slice(dcComponentCutoff)

    // Create data series for time series graph
    const timeSeriesDataSeries: { [key: string]: DataSeries } = {
        "right_wrist_x": {
            points: timeSeriesData,
            options: {
                color: "#2196F3",
                label: "Right Wrist X Position",
            },
        },
    }

    // Apply averaging smoother to FFT magnitudes
    const smoothedMagnitudes = fftMagnitudes.map(t.pipe(t.avg(5))) as number[]

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
            points: smoothedMagnitudes,
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
    fftGrapher.yRange = [0, Math.max(...filteredMagnitudes) * 1.1]

    // Update the graphs with data
    timeSeriesGrapher.data = timeSeriesDataSeries
    fftGrapher.data = fftDataSeries

    const euclidPlayer = new ui.HistoryControls(euclidHistory, euclidInputSvg)

    // Update playhead position when frame changes
    euclidPlayer.on("frameChanged", (frame: number) => {
        // Get the timestamp for the current frame
        const pose = euclidHistory.getPoseAt(frame)
        const timestamp = pose.timestamp

        // Update playhead position in both graphs
        euclidGrapher.updateAnnotation(euclidGrapherXWindow, playheadIdX, {
            value: timestamp,
        })

        euclidGrapher.updateAnnotation(euclidGrapherYWindow, playheadIdY, {
            value: timestamp,
        })
    })

    euclidPlayer.nextFrame()
}

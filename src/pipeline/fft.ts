import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import { DataSeries, Grapher } from "../ui/grapher2.ts"
import { runFFT } from "../fft.ts"

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

    // Add FFT analysis and visualization using the new Grapher2 component
    const fftWindow = root.addWindow(new wm.Window("FFT Analysis"))

    // Create windows for FFT graphs
    const timeSeriesWindow = fftWindow.addWindow(
        new wm.SvgWindow("Time Series Data", { preserveRatio: false }),
    )

    const fftResultsWindow = fftWindow.addWindow(
        new wm.SvgWindow("FFT Results", { preserveRatio: false }),
    )

    // Create new Grapher2 instances for plotting
    const timeSeriesGrapher = new Grapher("Time Series", {
        autoScale: true,
        enableZoom: true,
    })
    timeSeriesGrapher.appendTo(timeSeriesWindow.contentElement)

    const fftGrapher = new Grapher("FFT Magnitude", {
        autoScale: true,
        enableZoom: true,
    })
    fftGrapher.appendTo(fftResultsWindow.contentElement)

    // Run FFT analysis on keypoint data
    const keypointIndex = binary.KeypointName.right_wrist
    const fftResult = await runFFT(keypointIndex, "x", 1024)

    // Extract time series data for plotting
    const timeSeriesData: number[] = []
    for (let i = 0; i < fftResult.windowSize; i++) {
        timeSeriesData.push(fftResult.keypointData[i][0]) // x-coordinate
    }

    // Calculate FFT magnitudes
    const fftMagnitudes: number[] = []
    for (let i = 0; i < fftResult.windowSize / 2; i++) {
        const real = fftResult.fftOutput[i * 2]
        const imag = fftResult.fftOutput[i * 2 + 1]
        const magnitude = Math.sqrt(real * real + imag * imag)
        fftMagnitudes.push(magnitude)
    }

    // Create data series for time series graph
    const timeSeriesDataSeries: { [key: string]: DataSeries } = {
        "right_wrist_x": {
            points: timeSeriesData,
            options: {
                color: "#2196F3",
                width: 2,
                label: "Right Wrist X Position",
            },
        },
    }

    // Create data series for FFT magnitude graph
    const fftDataSeries: { [key: string]: DataSeries } = {
        "fft_magnitude": {
            points: fftMagnitudes,
            options: {
                color: "#E91E63",
                width: 2,
                label: "FFT Magnitude",
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

    // Update the graphs with data
    timeSeriesGrapher.data = timeSeriesDataSeries
    fftGrapher.data = fftDataSeries

    const euclidPlayer = new ui.HistoryControls(euclidHistory, euclidInputSvg)

    // Update playhead position when frame changes
    euclidPlayer.on("frameChanged", (frame) => {
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

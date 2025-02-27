import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"

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

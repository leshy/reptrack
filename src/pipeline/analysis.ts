import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import * as grapher3 from "../ui/grapher3.ts"

export async function analysis() {
    // Load the history file
    const euclidHistory = await binary.HistoryFile.load("euclid10.bin.gz")

    // @ts-ignore
    globalThis.h = euclidHistory

    const root = new wm.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    // graph windows
    const graphsWindow = root.addWindow(new wm.Window("Euclidian History"))

    const skeleton = root.addWindow(
        new ui.Skeleton(euclidHistory, "Euclid"),
    )

    const bla = root.addWindow(new wm.Window("Test"))

    const xgraph = graphsWindow.addWindow(
        new grapher3.Grapher3("X Positions"),
    )

    const ygraph = graphsWindow.addWindow(
        new grapher3.Grapher3("Y Positions"),
    )

    const euclidPlayer = new ui.HistoryControls(euclidHistory, skeleton)

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
        xgraph.plotData(
            [...euclidHistory.points(
                binary.KeypointName[name],
            )].map((
                point: binary.Point,
            ) => point[0]),
            { name: name, color: ui.getRandomColor(name) },
        )
        ygraph.plotData(
            [...euclidHistory.points(
                binary.KeypointName[name],
            )].map((
                point: binary.Point,
            ) => point[1]),
            { name: name, color: ui.getRandomColor(name) },
        )
    }

    euclidPlayer.nextFrame()
}

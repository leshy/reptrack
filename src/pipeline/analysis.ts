import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import { KeypointName } from "../binary/mod.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import * as grapher3 from "../ui/grapher3.ts"
import * as fft from "../fft.ts"
import * as t from "../itransform/mod.ts"

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

    skeleton.element.style["min-width"] = "50vw"

    //    const controlsWindow = root.addWindow(new wm.Window("Keypoint Selection"))
    //new ui.KeypointControls(controlsWindow)
    const scatter = root.addWindow(
        new grapher3.Grapher3("dominant frequencies"),
    )
    // @ts-ignore
    //scatter.element.style["min-height"] = "50vh"

    const xgraph = graphsWindow.addWindow(
        new grapher3.Grapher3("X Positions", {}),
    )

    const ygraph = graphsWindow.addWindow(
        new grapher3.Grapher3("Y Positions"),
    )

    const euclidPlayer = new ui.HistoryControls(euclidHistory, skeleton)

    // Initial keypoints of interest
    const poi: KeypointName[] = [
        KeypointName.nose,
        KeypointName.left_wrist,
        KeypointName.right_wrist,
        KeypointName.left_knee,
        KeypointName.right_knee,
        KeypointName.right_shoulder,
        KeypointName.left_shoulder,
        KeypointName.left_ankle,
        KeypointName.right_ankle,
    ]

    const windowSize = 32
    function fftMap(keypoint: KeypointName) {
        return t.pipe(
            euclidHistory.points(keypoint),
            t.map((point: Point) => point[1]),
            t.chunk(windowSize),
            t.map((w: number[]) => fft.findDominant(fft.runFFT(w))),
        )
    }

    for (const kp of poi) {
        const name = KeypointName[kp]
        let index = 0
        const data = [
            ...fftMap(kp).map(([freq, magnitude]) => {
                index++
                const mag = magnitude / (windowSize / 3)
                return {
                    x: index,
                    y: kp + 1,
                    size: mag,
                    color: ui.getRangedColor(windowSize / 2, freq + 4),
                }
            }),
        ]

        console.log(name, data)
        scatter.plotData(
            data,
            {
                name: name,
                //color: ui.getRandomColor(name),
                mode: "lines+markers",
            },
        )
    }

    // Plot initial data
    for (const kp of poi) {
        const name = KeypointName[kp]
        xgraph.plotData(
            [...euclidHistory.points(
                kp,
            )].map((
                point: binary.Point,
            ) => point[0]),
            { name: name, color: ui.getRandomColor(name) },
        )
        ygraph.plotData(
            [...euclidHistory.points(
                kp,
            )].map((
                point: binary.Point,
            ) => point[1]),
            { name: name, color: ui.getRandomColor(name) },
        )
    }

    euclidPlayer.nextFrame()
}

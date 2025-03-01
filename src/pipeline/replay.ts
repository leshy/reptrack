import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import * as pt from "../transform/mod.ts"

export async function replay() {
    const history = await binary.HistoryFile.load("longlightning.bin.gz")
    // @ts-ignore
    globalThis.h = history

    const root = new wm.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    // Create skeleton windows directly

    // actually need per keypoint pure transforms as well
    const smoother = pt.node(
        history,
        pt.avg(10),
        pt.scoreFilter(0.4),
    )

    //const euclidean1 = pt.node(history, pt.euclideanFilter(10))

    const euclideanSpy = (state: unknown) => {
        if (!state) return
        const confState = state as pt.ConfidentEuclideanState
        euclideanSvg.title = `euclidean [${confState.frame}]`
        return state
    }

    const euclidean2 = pt.node(
        smoother,
        pt.spyStateEmit(
            pt.confidentEuclideanFilter(10),
            euclideanSpy,
        ),
    )

    const recorder = new binary.HistoryFile(50000)
    recorder.record(euclidean2)
    // @ts-ignore
    globalThis.recorder = recorder

    const graphWindow = root.addWindow(new wm.Window())

    const grapherXWindow = graphWindow.addWindow(
        new wm.SvgWindow("grapher X", { preserveRatio: false }),
    )

    const grapherYWindow = graphWindow.addWindow(
        new wm.SvgWindow("grapher Y", { preserveRatio: false }),
    )

    const grapher = new ui.KeypointGrapher(history, {
        title: "history graph",
    })

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
        grapher.drawKeypointGraph(
            grapherYWindow,
            name as keyof typeof binary.KeypointName,
            "y",
        )
        grapher.drawKeypointGraph(
            grapherXWindow,
            name as keyof typeof binary.KeypointName,
            "x",
        )
    }

    const inputSvg = root.addWindow(
        new ui.Skeleton(history, "history", { minScore: 0 }),
    )
    root.addWindow(
        new ui.Skeleton(smoother, "smoother", { minScore: 0.2 }),
    )
    const euclideanSvg = root.addWindow(
        new ui.Skeleton(euclidean2, "euclidean", { minScore: 0.2 }),
    )

    const player = new ui.HistoryControls(history, inputSvg)

    player.nextFrame()
}

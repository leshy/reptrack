import webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import * as pt from "../pureTransform.ts"

export async function replay() {
    const history = await binary.HistoryFile.load("longlightning.bin.gz")
    // @ts-ignore
    window.h = history

    const root = new wm.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    const inputSvg = root.addWindow(
        new wm.SvgWindow("history", "0 0 255 255", true),
    )
    const smootherSvg = root.addWindow(
        new wm.SvgWindow("smoother", "0 0 255 255", true),
    )
    const euclideanSvg = root.addWindow(
        new wm.SvgWindow("euclidean", "0 0 255 255", true),
    )

    // actually need per keypoint pure transforms as well
    const smoother = pt.node(
        history,
        pt.avg(10),
        pt.scoreFilter(0.4),
    )

    //const euclidean1 = pt.node(history, pt.euclideanFilter(10))

    const euclideanSpy = (state: pt.ConfidentEuclideanState | undefined) => {
        if (!state) return
        else euclideanSvg.title = `euclidean [${state.frame}]`
    }

    const euclidean2 = pt.node(
        smoother,
        pt.spyStateEmit(pt.confidentEuclideanFilter(10), euclideanSpy),
    )

    const graphWindow = root.addWindow(new wm.Window())

    const grapherXWindow = graphWindow.addWindow(
        new wm.SvgWindow("grapher X", "0 0 255 255", false),
    )

    const grapherYWindow = graphWindow.addWindow(
        new wm.SvgWindow("grapher Y", "0 0 255 255", false),
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

    new ui.Skeleton(history, inputSvg, { minScore: 0 })
    new ui.Skeleton(smoother, smootherSvg, { minScore: 0.2 })
    new ui.Skeleton(euclidean2, euclideanSvg, { minScore: 0.2 })

    const player = new ui.HistoryControls(history, inputSvg)

    player.nextFrame()
}

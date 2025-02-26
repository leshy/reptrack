import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import * as pt from "../pureTransform.ts"

export async function replay() {
    const history = await binary.HistoryFile.load("longlightning.bin.gz")

    // actually need per keypoint pure transforms as well
    const smoother = pt.node(
        history,
        pt.avg(10),
        pt.scoreFilter(0.4),
    )
    const euclidean1 = pt.node(history, pt.euclideanFilter(10))

    const euclidean2 = pt.node(
        smoother,
        pt.confidentEuclideanFilter(10),
    )

    const root = new wm.Window()

    document.getElementById("window-container")?.appendChild(root.element)

    const svg1 = root.addWindow(
        new wm.SvgWindow("history", "0 0 255 255", true),
    )
    const svg2 = root.addWindow(
        new wm.SvgWindow("smoother", "0 0 255 255", true),
    )
    const svg3 = root.addWindow(
        new wm.SvgWindow("euclidian distance", "0 0 255 255", true),
    )
    const svg4 = root.addWindow(
        new wm.SvgWindow(
            "confident euclidian distance",
            "0 0 255 255",
            true,
        ),
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

    new ui.SkeletonDraw(history, svg1.svg, { minScore: 0 })
    new ui.SkeletonDraw(smoother, svg2.svg, { minScore: 0.2 })
    new ui.SkeletonDraw(euclidean1, svg3.svg, { minScore: 0.2 })
    new ui.SkeletonDraw(euclidean2, svg4.svg, { minScore: 0.2 })

    const player = new binary.HistoryPlayer(history)
    new binary.HistoryControls(svg1, player)
    new binary.HistoryDisplay(svg1, player)

    player.nextFrame()
}

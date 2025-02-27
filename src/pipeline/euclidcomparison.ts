import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import * as pt from "../transform.ts"

export async function euclidcomparison() {
    // Load both history files
    const euclidHistory = await binary.HistoryFile.load("euclid10.bin.gz")
    const lightningHistory = await binary.HistoryFile.load(
        "longlightning.bin.gz",
    )

    // @ts-ignore
    globalThis.h = euclidHistory
    // @ts-ignore
    globalThis.lightningH = lightningHistory

    const root = new wm.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    // Euclid windows
    const euclidInputSvg = root.addWindow(
        new wm.SvgWindow("euclid history"),
    )
    const euclidSmootherSvg = root.addWindow(
        new wm.SvgWindow("euclid smoother"),
    )
    const euclideanSvg = root.addWindow(
        new wm.SvgWindow("euclid euclidean"),
    )

    // No window display for lightning, only graphs

    // Euclid pipeline
    const euclidSmoother = pt.node(
        euclidHistory,
        pt.avg(10),
        pt.scoreFilter(0.4),
    )

    const euclideanSpy = (state: pt.ConfidentEuclideanState | undefined) => {
        if (!state) return
        else euclideanSvg.title = `euclid euclidean [${state.frame}]`
    }

    const euclidEuclidean = pt.node(
        euclidSmoother,
        pt.spyStateEmit(pt.confidentEuclideanFilter(10), euclideanSpy),
    )

    const euclidRecorder = new binary.HistoryFile(50000)
    euclidRecorder.record(euclidEuclidean)
    globalThis.euclidRecorder = euclidRecorder

    // Lightning pipeline
    const lightningSmoother = pt.node(
        lightningHistory,
        pt.avg(10),
        pt.scoreFilter(0.4),
    )

    // No need for a UI spy for lightning

    const lightningEuclidean = pt.node(
        lightningSmoother,
        pt.confidentEuclideanFilter(10),
    )

    const lightningRecorder = new binary.HistoryFile(50000)
    lightningRecorder.record(lightningEuclidean)
    globalThis.lightningRecorder = lightningRecorder

    // Create graph containers
    const xGraphsWindow = root.addWindow(new wm.Window("X Position Graphs"))
    const yGraphsWindow = root.addWindow(new wm.Window("Y Position Graphs"))

    // Create X graph windows (one above the other)
    const euclidGrapherXWindow = xGraphsWindow.addWindow(
        new wm.SvgWindow(
            "Euclid X Positions",
            { preserveRatio: false },
        ),
    )

    const lightningGrapherXWindow = xGraphsWindow.addWindow(
        new wm.SvgWindow(
            "Lightning X Positions",
            { preserveRatio: false },
        ),
    )

    // Create Y graph windows (one above the other)
    const euclidGrapherYWindow = yGraphsWindow.addWindow(
        new wm.SvgWindow("Euclid Y Positions", { preserveRatio: false }),
    )

    const lightningGrapherYWindow = yGraphsWindow.addWindow(
        new wm.SvgWindow("Lightning Y Positions", { preserveRatio: false }),
    )

    const euclidGrapher = new ui.KeypointGrapher(euclidHistory, {})

    const lightningGrapher = new ui.KeypointGrapher(lightningHistory, {})

    const poi = [
        "nose",
        "left_wrist",
        "right_wrist",
        "left_knee",
        "right_knee",
        "left_ankle",
        "right_ankle",
    ]

    // Draw graphs for both datasets
    for (const name of poi) {
        // Euclid graphs
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

        // Lightning graphs
        lightningGrapher.drawKeypointGraph(
            lightningGrapherYWindow,
            name as keyof typeof binary.KeypointName,
            "y",
        )
        lightningGrapher.drawKeypointGraph(
            lightningGrapherXWindow,
            name as keyof typeof binary.KeypointName,
            "x",
        )
    }

    // Set up skeletons (only for euclid)
    new ui.Skeleton(euclidHistory, euclidInputSvg, { minScore: 0 })
    new ui.Skeleton(euclidSmoother, euclidSmootherSvg, { minScore: 0.2 })
    new ui.Skeleton(euclidEuclidean, euclideanSvg, { minScore: 0.2 })

    // Set up player controls only for euclid
    const euclidPlayer = new ui.HistoryControls(euclidHistory, euclidInputSvg)
    euclidPlayer.nextFrame()
}

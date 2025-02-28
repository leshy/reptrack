import webfft from "npm:webfft"
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

    const inputSvg = root.addWindow(
        new wm.SvgWindow("history", {
            viewbox: "0 0 255 255",
            preserveRatio: true,
        }),
    )
    const fpspegSvg = root.addWindow(
        new wm.SvgWindow("fpspeg", {
            viewbox: "0 0 255 255",
            preserveRatio: true,
        }),
    )
    const euclideanSvg = root.addWindow(
        new wm.SvgWindow("euclidean", {
            viewbox: "0 0 255 255",
            preserveRatio: true,
        }),
    )

    const fpsPegSpy = (state: pt.FPState | undefined) => {
        if (!state) return
        else fpspegSvg.title = `fps [15] frm [${state[0]}] win [${state[2]}]`
    }

    // actually need per keypoint pure transforms as well
    const fpspeg = pt.node(
        history,
        pt.spyStateEmit(pt.fpsPeg(15), fpsPegSpy),
        pt.scoreFilter(0.4),
    )

    //const euclidean1 = pt.node(history, pt.euclideanFilter(10))

    const euclidean2 = pt.node(
        fpspeg,
        pt.confidentEuclideanFilter(10),
    )

    const graphWindow = root.addWindow(new wm.Window())

    const grapherXWindow = graphWindow.addWindow(
        new wm.SvgWindow("grapher X", {
            viewbox: "0 0 255 255",
            preserveRatio: false,
        }),
    )

    const grapherYWindow = graphWindow.addWindow(
        new wm.SvgWindow("grapher Y", {
            viewbox: "0 0 255 255",
            preserveRatio: false,
        }),
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
    new ui.Skeleton(fpspeg, fpspegSvg, { minScore: 0.2 })
    new ui.Skeleton(euclidean2, euclideanSvg, { minScore: 0.2 })

    const player = new ui.HistoryControls(history, inputSvg)

    player.nextFrame()

    const fftsize = 1024 // must be power of 2
    const fft = new webfft(fftsize)

    fft.profile()

    const target = Array.from(history.keypoints(5)).slice(0, 1024 * 2)
    console.log(target)
    console.log(fft.fft(target.map((x) => x[1][1])))
    // Profile
}

import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "./ui/wm.ts"
import * as binary from "./binary/mod.ts"
import * as ui from "./ui/mod.ts"
import * as pt from "./pureTransform.ts"

//import { Camera, Video } from "./source.ts"
//import { PoseEstimator } from "./node.ts"

async function init() {
    //frame 4376

    // store history
    // const video = new Video("sample.mp4")
    // const poseEstimator = new PoseEstimator(env, video)
    // const history = new binary.History()
    // history.record(poseEstimator)
    // window.hist = history
    // new SkeletonDraw(poseEstimator, video.overlay)
    // await poseEstimator.init()
    // await video.el.play()

    //load history

    //const env = new Env(document)
    //const video = new Video("sample.mp4")
    //const video = new Camera()
    //const poseEstimator = new PoseEstimator(env, video)
    //const smoother1 = new binary.Smoother(poseEstimator, 20, 0.1)

    const history1 = await binary.HistoryFile.load("lightning.bin.gz")

    // actually need per keypoint pure transforms as well
    const smoother1 = pt.node(
        history1,
        pt.avg(10),
        pt.scoreFilter(0.4),
    )
    const euclidean1 = pt.node(history1, pt.euclideanFilter(10))

    const euclidean2 = pt.node(
        smoother1,
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

    const grapher = new ui.KeypointGrapher(history1, {
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

    //svg1.style.height = "99vh"
    // new SkeletonDraw(center1, svg1, {
    //     lineWidth: "4",
    //     keypointRadius: "1.5",
    //     color: colorInterpolator([100, 100, 100], [55, 5 node)

    //const center2 = pt.node(smoother1, pt.center())
    //const center3 = new pt.Center(euclidean1)
    //const center4 = new pt.Center(euclidean2)

    new ui.SkeletonDraw(history1, svg1.svg, { minScore: 0.2 })
    new ui.SkeletonDraw(smoother1, svg2.svg, { minScore: 0.2 })
    new ui.SkeletonDraw(euclidean1, svg3.svg, { minScore: 0.2 })
    new ui.SkeletonDraw(euclidean2, svg4.svg, { minScore: 0.2 })

    //await poseEstimator.init()
    //await video.el.play()

    const player = new binary.HistoryPlayer(history1)
    new binary.HistoryControls(svg1, player)
    new binary.HistoryDisplay(svg1, player)

    //player.play()
    //history2.play()

    //    poseEstimator.on("pose", console.log)

    // const poseCenter = new PoseCenter(poseEstimator)
    // const svg = wm.createSvgWindow()

    // const smoother = new Smoother(poseCenter, { targetKeypoints: allTargets })
    // new SkeletonDraw(smoother, svg)

    // const tracer = new Tracer(env, smoother)
    // window.tracer = tracer
    // const tracerSvg = wm.createSvgWindow()

    // new TracerDraw(env, tracer, svg)
    // const graph = wm.createSvgWindow("0 0 100 100", false)
    // new Grapher(tracer, graph)
}

init()

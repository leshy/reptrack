import "npm:@tensorflow/tfjs-backend-webgl"
import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { EventEmitter } from "npm:eventemitter3"
import * as tf from "npm:@tensorflow/tfjs-core"
import { allTargets, Keypoint, Pose, PoseEvent, STATE } from "./types.ts"
import { colorInterpolator, SkeletonDraw } from "./skeleton.ts"
import { Tracer } from "./tracer.ts"
import { Grapher } from "./grapher.ts"
import { Smoother } from "./smoother.ts"
import { TracerDraw } from "./tracerDraw.ts"
import * as wm from "./wm.ts"
import { Camera, Video } from "./source.ts"
import { FFTDetector } from "./fft.ts"
import { Env } from "./env.ts"

import * as pt from "./binary/pureTransform.ts"

import * as binary from "./binary/mod.ts"
import { BinaryPoseEvent } from "./types2.ts"

class PoseEstimator extends EventEmitter<BinaryPoseEvent> {
    private detector?: poseDetection.PoseDetector
    private height: number = 0
    private width: number = 0
    constructor(private env: Env, private video: Video) {
        super()
    }

    async init() {
        console.log("initializing estimator")
        tf.env().setFlags(STATE.flags)
        await tf.setBackend("webgl")
        await tf.ready()

        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
            enableSmoothing: false,
        }

        const detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            detectorConfig,
        )
        this.detector = detector
        this.video.el.onplay = this.loop
        this.height = this.video.el.videoHeight
        this.width = this.video.el.videoWidth
        console.log("ready")

        this.loop()
    }

    loop = () => {
        if (this.video.el.paused) return
        if (!this.detector) throw new Error("not initialized")
        this.env.fpsBegin()
        const timestamp = performance.now()
        this.detector.estimatePoses(this.video.el, {}, timestamp).then(
            (poses: poseDetection.Pose[]) => {
                if (poses.length) {
                    this.emit(
                        "pose",
                        binary.Pose.fromEvent(
                            { timestamp, ...poses[0] },
                            this.width,
                            this.height,
                        ),
                    )
                }
                this.env.fpsEnd()
                requestAnimationFrame(this.loop)
            },
        )
    }
}

class PoseCenter extends EventEmitter<PoseEvent> {
    constructor(private poseEmitter: PoseEstimator) {
        super()
        this.poseEmitter.on("pose", this.pose)
    }

    pose = (pose: Pose) => {
        this.emit("pose", {
            ...pose,
            keypoints: this.calculateRelativeKeypoints(pose.keypoints),
        })
    }

    calculateBodyCenter(keypoints: Keypoint[]) {
        const leftShoulder = keypoints.find((kp) => kp.name === "left_shoulder")
        const rightShoulder = keypoints.find((kp) =>
            kp.name === "right_shoulder"
        )
        const leftHip = keypoints.find((kp) => kp.name === "left_hip")
        const rightHip = keypoints.find((kp) => kp.name === "right_hip")

        // Check if all required keypoints are detected
        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            console.warn(
                "Not all required keypoints detected for body center calculation",
            )
            return null
        }

        // Calculate the average x and y coordinates
        const centerX =
            (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) /
            4
        const centerY =
            (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) /
            4

        // Calculate the average score
        const averageScore =
            // @ts-ignore
            (leftShoulder.score + rightShoulder.score + leftHip.score +
                // @ts-ignore
                rightHip.score) / 4

        return {
            x: centerX,
            y: centerY,
            score: averageScore,
        }
    }

    calculateRelativeKeypoints(keypoints: Keypoint[]) {
        // First, calculate the body center
        const bodyCenter = this.calculateBodyCenter(keypoints)

        if (!bodyCenter) {
            console.warn(
                "Couldn't calculate body center. Returning original keypoints.",
            )
            return keypoints
        }

        // Find the maximum distance from the center to any keypoint
        let maxDistance = 0
        keypoints.forEach((keypoint: Keypoint) => {
            const distanceX = Math.abs(keypoint.x - bodyCenter.x)
            const distanceY = Math.abs(keypoint.y - bodyCenter.y)
            const distance = Math.sqrt(
                distanceX * distanceX + distanceY * distanceY,
            )
            if (distance > maxDistance) {
                maxDistance = distance
            }
        })

        // Create a new array to store the recalculated keypoints
        const relativeKeypoints = keypoints.map((keypoint: Keypoint) => {
            // Calculate the relative position
            const relativeX = (keypoint.x - bodyCenter.x) / maxDistance
            const relativeY = (keypoint.y - bodyCenter.y) / maxDistance

            // Return a new object with the normalized relative coordinates
            return {
                ...keypoint,
                x: relativeX,
                y: relativeY,
            }
        })

        // Add the body center as a new keypoint
        relativeKeypoints.push({
            name: "body_center",
            x: 0,
            y: 0,
            score: bodyCenter.score,
        })

        return relativeKeypoints
    }
}

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

    const history1 = await binary.HistoryFile.load("thundernew.bin.gz")

    //const smoother1 = new pt.Avg(new pt.ScoreFilter(history1, 0.7), 20)
    const smoother1 = new pt.Node(
        history1,
        pt.pipe(pt.scoreFilter(0.2), pt.attachState(pt.avg(10)))
    )

    const euclidian1 = new binary.EuclidianFilter(history1, 10)
    const euclidian2 = new binary.ConfidentEuclidianFilter(smoother1, 10)

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

    const graph = root.addWindow(new wm.Window())

    const grapherX = graph.addWindow(
        new wm.SvgWindow("grapher X", "0 0 255 255", false),
    )

    const grapherY = graph.addWindow(
        new wm.SvgWindow("grapher Y", "0 0 255 255", false),
    )

    //@ts-ignore
    //svg5.parentElement.style["min-width"] = "50vw"

    const grapher = new binary.KeypointGrapher(history1, {
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
            grapherY,
            name as keyof typeof binary.KeypointName,
            "y",
        )
        grapher.drawKeypointGraph(
            grapherX,
            name as keyof typeof binary.KeypointName,
            "x",
        )
    }

    //svg1.style.height = "99vh"
    // new SkeletonDraw(center1, svg1, {
    //     lineWidth: "4",
    //     keypointRadius: "1.5",
    //     color: colorInterpolator([100, 100, 100], [55, 55, 55]),
    // })

    //    const center1 = new binary.Center(history1)

    const center2 = new pt.Center(smoother1)
    const center3 = new pt.Center(euclidian1)
    const center4 = new pt.Center(euclidian2)

    new SkeletonDraw(history1, svg1.svg, { minScore: 0.2 })
    new SkeletonDraw(center2, svg2.svg, { minScore: 0.2 })
    new SkeletonDraw(center3, svg3.svg, { minScore: 0.2 })
    new SkeletonDraw(center4, svg4.svg, { minScore: 0.2 })

    //await poseEstimator.init()
    //await video.el.play()

    const player = new binary.HistoryPlayer(history1)
    new binary.HistoryControls(svg1, player)
    new binary.HistoryDisplay(svg1, player)

    player.play()
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

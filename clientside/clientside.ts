import "npm:@tensorflow/tfjs-backend-webgl"
import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { EventEmitter } from "npm:eventemitter3"
import * as tf from "npm:@tensorflow/tfjs-core"
import Stats from "npm:stats.js"
import { Keypoint, Pose, PoseEvent, STATE } from "./types.ts"
import { SkeletonDraw } from "./skeleton.ts"
import { Tracer } from "./tracer.ts"
import { Grapher } from "./grapher.ts"
import { Smoother } from "./smoother.ts"
import { TracerDraw } from "./tracerDraw.ts"
import * as wm from "./wm.ts"
import { Video } from "./source.ts"

import { FFTDetector } from "./fft.ts"

class PoseEstimator extends EventEmitter<PoseEvent> {
    private detector?: poseDetection.PoseDetector
    private stats = Stats
    constructor(private video: Video) {
        super()
        this.stats = new Stats()
    }

    async init() {
        document.body.appendChild(this.stats.dom)
        this.stats.showPanel(0)
        tf.env().setFlags(STATE.flags)
        await tf.setBackend("webgl")
        await tf.ready()

        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
            enableSmoothing: true,
            minPoseScore: 0.1,
            //modelUrl: "/model/saved_model.pb",
        }

        const detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            detectorConfig,
        )
        this.detector = detector

        this.video.el.onplay = this.loop
        this.loop()
    }

    loop = () => {
        if (this.video.el.paused) return
        if (!this.detector) throw new Error("not initialized")
        this.stats.begin()
        this.detector.estimatePoses(this.video.el, {}, performance.now()).then(
            (poses: poseDetection.Pose[]) => {
                if (poses.length) this.emit("pose", poses[0])
                this.stats.end()
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
        // TODO this is terribly inefficient
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
    const video = new Video("./jazz.mp4")
    const poseEstimator = new PoseEstimator(video)
    const poseCenter = new PoseCenter(poseEstimator)
    const svg = wm.createSvgWindow()
    new SkeletonDraw(poseCenter, svg)
    //new FFTDetector(poseCenter)
    const smoother = new Smoother(poseCenter)
    const tracer = new Tracer(smoother)
    const tracerSvg = wm.createSvgWindow()
    new TracerDraw(tracer, svg)
    const graph = wm.createSvgWindow("0 0 100 100", false)
    const grapher = new Grapher(tracer, graph)
    window.tracer = tracer
    await poseEstimator.init()
    await video.el.play()
}

init()

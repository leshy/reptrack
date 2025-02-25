import "npm:@tensorflow/tfjs-backend-webgl"
import * as tf from "npm:@tensorflow/tfjs-core"
import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { EventEmitter } from "npm:eventemitter3"
import { BinaryPoseEvent } from "./types.ts"
import { Env, STATE } from "./env.ts"
import { Video } from "./source.ts"

export class PoseEstimator extends EventEmitter<BinaryPoseEvent> {
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

import "npm:@tensorflow/tfjs-backend-webgl"
import * as tf from "npm:@tensorflow/tfjs-core"
import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { EventEmitter } from "npm:eventemitter3"
import { BinaryPoseEvent } from "../types.ts"
import { Env, STATE } from "../env.ts"
import { GenericVideoWindow } from "./source.ts"
import * as binary from "../binary/mod.ts"

export class PoseEstimator extends EventEmitter<BinaryPoseEvent> {
    private detector?: poseDetection.PoseDetector
    private height: number = 0
    private width: number = 0

    constructor(private env: Env, private video: GenericVideoWindow) {
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
        console.log("THIS VIDEO", this.video)
        this.video.video.onplay = this.loop
        this.height = this.video.video.videoHeight
        this.width = this.video.video.videoWidth
        console.log("ready")

        this.loop()
    }

    loop = () => {
        if (this.video.video.paused) return
        if (!this.detector) throw new Error("not initialized")
        this.env.fpsBegin()
        const timestamp = performance.now()
        this.detector.estimatePoses(this.video.video, {}, timestamp).then(
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

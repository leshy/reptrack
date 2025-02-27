import { EventEmitter } from "npm:eventemitter3"
import {
    defaultTarget,
    KeypointName,
    Point,
    Pose,
    PoseEmitter,
    PoseEvent,
} from "./types.ts"

type SmootherSettings = {
    windowSize: number
    targetKeypoints: Partial<Record<KeypointName, boolean>>
}

const defaultSmootherSettings: SmootherSettings = {
    windowSize: 10,
    targetKeypoints: defaultTarget,
}

export class Smoother extends EventEmitter<PoseEvent> {
    private settings: SmootherSettings
    private history: Map<KeypointName, Point[]> = new Map()

    constructor(
        private poseEmitter: PoseEmitter,
        settings: Partial<SmootherSettings> = {},
    ) {
        super()
        this.settings = {
            ...defaultSmootherSettings,
            ...settings,
            targetKeypoints: {
                ...defaultSmootherSettings.targetKeypoints,
                ...settings.targetKeypoints,
            },
        }
        this.poseEmitter.on("pose", this.smoothPose)
    }

    private getHistory(name: KeypointName): Point[] {
        let history = this.history.get(name)
        if (!history) {
            history = []
            this.history.set(name, history)
        }
        return history
    }

    private addToHistory(name: KeypointName, point: Point) {
        const history = this.getHistory(name)
        history.push(point)
        if (history.length > this.settings.windowSize) {
            history.shift()
        }
    }

    private calculateSmoothedPoint(history: Point[]): Point {
        const sum: Point = [0, 0]
        history.forEach((point) => {
            sum[0] += point[0]
            sum[1] += point[1]
        })
        return [sum[0] / history.length, sum[1] / history.length]
    }

    private round(num: number): number {
        return Math.round(num * 100) / 100
    }

    private smoothPose = (pose: Pose) => {
        const smoothedPose: Pose = { ...pose, keypoints: [] }

        pose.keypoints.forEach((keypoint) => {
            if (keypoint.name) {
                const keypointEnum =
                    KeypointName[keypoint.name as keyof typeof KeypointName]
                const point: Point = [keypoint.x, keypoint.y]

                if (this.settings.targetKeypoints[keypointEnum]) {
                    this.addToHistory(keypointEnum, point)
                    const history = this.getHistory(keypointEnum)
                    const smoothedPoint = this.calculateSmoothedPoint(history)

                    smoothedPose.keypoints.push({
                        ...keypoint,
                        x: this.round(smoothedPoint[0]),
                        y: this.round(smoothedPoint[1]),
                    })
                } else {
                    smoothedPose.keypoints.push(keypoint)
                }
            }
        })

        this.emit("pose", smoothedPose)
    }
}

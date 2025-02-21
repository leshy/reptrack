import { EventEmitter } from "npm:eventemitter3"
import {
    KeypointName,
    Point,
    Pose,
    PoseEmitter,
    TraceEvent,
    TraceMap,
} from "./types.ts"

type TracerSettings = {
    logLen: number
    traceKeypoints: Partial<Record<KeypointName, boolean>>
}

export const defaultTraces = {
    [KeypointName.nose]: true,
    [KeypointName.left_wrist]: true,
    [KeypointName.right_wrist]: true,
    [KeypointName.left_ankle]: true,
    [KeypointName.right_ankle]: true,
    [KeypointName.body_center]: true,
}

const defaultSettings: TracerSettings = {
    logLen: 50,
    traceKeypoints: defaultTraces,
}

export class Tracer extends EventEmitter<TraceEvent> {
    settings: TracerSettings
    private log: TraceMap = new Map()
    private logLen: number

    constructor(
        private poseEmitter: PoseEmitter,
        settings: Partial<TracerSettings> = {},
    ) {
        super()
        this.settings = {
            ...defaultSettings,
            ...settings,
            traceKeypoints: {
                ...defaultSettings.traceKeypoints,
                ...settings.traceKeypoints,
            },
        }
        this.log = new Map()
        this.logLen = this.settings.logLen
        this.poseEmitter.on("pose", this.receivePose)
    }

    getLog(name: KeypointName): Point[] {
        const storedLog = this.log.get(KeypointName[name])
        if (storedLog) return storedLog
        const newLog: Point[] = []
        this.log.set(KeypointName[name], newLog)
        return newLog
    }

    pushLog(name: KeypointName, entry: Point) {
        const log = this.getLog(name)
        log.push(entry)
        if (log.length > this.logLen) {
            log.shift()
        }
    }

    receivePose = (pose: Pose) => {
        pose.keypoints.forEach((keypoint) => {
            if (keypoint.name) {
                const keypointEnum =
                    KeypointName[keypoint.name as keyof typeof KeypointName]
                if (this.settings.traceKeypoints[keypointEnum]) {
                    this.pushLog(keypointEnum, [keypoint.x, keypoint.y])
                }
            }
        })
        this.emit("trace", this.log)
    }
}

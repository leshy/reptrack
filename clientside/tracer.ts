import { Env } from "./env.ts"
import { EventEmitter } from "npm:eventemitter3"
import {
    defaultTarget,
    KeypointName,
    MultiValueEvent,
    Point,
    Pose,
    PoseEmitter,
    TraceEvent,
    TraceMap,
} from "./types.ts"

type TracerSettings = {
    logLen: number
    targetKeypoints: Partial<Record<KeypointName, boolean>>
    measure: boolean
}

const defaultSettings: TracerSettings = {
    logLen: 300,
    targetKeypoints: defaultTarget,
    measure: false,
}

export class Tracer extends EventEmitter<TraceEvent & MultiValueEvent> {
    settings: TracerSettings
    private log: TraceMap = new Map()
    private logLen: number
    constructor(
        private env: Env,
        private poseEmitter: PoseEmitter,
        settings: Partial<TracerSettings> = {},
    ) {
        super()
        this.settings = {
            ...defaultSettings,
            ...settings,
            targetKeypoints: {
                ...defaultSettings.targetKeypoints,
                ...settings.targetKeypoints,
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
        if (this.settings.measure) this.env.measureStart("tracer")
        pose.keypoints.forEach((keypoint) => {
            if (keypoint.name) {
                const keypointEnum =
                    KeypointName[keypoint.name as keyof typeof KeypointName]
                if (this.settings.targetKeypoints[keypointEnum]) {
                    this.pushLog(keypointEnum, [keypoint.x, keypoint.y])
                }
            }
        })
        this.emit("trace", this.log)

        const collapse = (point: Point) => point[0] + point[1]

        this.emit(
            "values",
            Object.fromEntries(
                Array.from(this.log.entries()).map(([key, value]) => [
                    key,
                    value.map(collapse) || [],
                ]),
            ),
        )
    }
}

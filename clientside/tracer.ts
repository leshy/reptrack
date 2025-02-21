import { EventEmitter } from "npm:eventemitter3"
import { Point, Pose, PoseEmitter, TraceEvent, TraceMap } from "./types.ts"
type TracerSettings = {
    logLen: number
}

const defaultSettings: TracerSettings = {
    logLen: 50,
}

export class Tracer extends EventEmitter<TraceEvent> {
    settings: TracerSettings
    private log: TraceMap = new Map()
    private logLen: number
    constructor(
        private poseEmitter: PoseEmitter,
        private svg: SVGSVGElement,
        settings: Partial<TracerSettings> = {},
    ) {
        super()
        this.settings = { ...defaultSettings, ...settings }
        this.log = new Map()
        this.logLen = this.settings.logLen
        this.poseEmitter.on("pose", this.receivePose)
    }

    getLog(name: string | undefined): Point[] {
        if (name === undefined) name = "unnamed"
        const storedLog = this.log.get(name)
        if (storedLog) return storedLog
        const newLog: Point[] = []
        this.log.set(name, newLog)
        return newLog
    }

    pushLog(name: string | undefined, entry: Point) {
        const log = this.getLog(name)
        log.push(entry)
        if (log.length > this.logLen) {
            log.shift()
        }
    }

    receivePose = (pose: Pose) => {
        pose.keypoints.forEach(
            (keypoint) => this.pushLog(keypoint.name, [keypoint.x, keypoint.y]),
        )
        this.emit("trace", this.log)
    }
}

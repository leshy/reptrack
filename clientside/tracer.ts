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
    minDist: number
    targetKeypoints: Partial<Record<KeypointName, boolean>>
}

const defaultSettings: TracerSettings = {
    minDist: 0.1,
    logLen: 200,
    targetKeypoints: defaultTarget,
}

export class Tracer extends EventEmitter<TraceEvent & MultiValueEvent> {
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

    // TODO we should not be checking the dist from last point, but maybe change the last point to avg of the two?
    dist(a: Point, b: Point): number {
        return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
    }

    pushLog(name: KeypointName, entry: Point) {
        const log = this.getLog(name)
        const latestElement: Point = log.length > 0
            ? log[log.length - 1]
            : [0, 0]

        if (this.dist(latestElement, entry) < this.settings.minDist) {
            // store avg
            log[log.length - 1] = [
                (latestElement[0] + entry[0]) / 2,
                (latestElement[1] + entry[1]) / 2,
            ]
        }

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
                if (this.settings.targetKeypoints[keypointEnum]) {
                    this.pushLog(keypointEnum, [keypoint.x, keypoint.y])
                }
            }
        })
        this.emit("trace", this.log)

        //     this.emit(
        //         "values",
        //         {
        //             "left_wrist_x":
        //                 this.log.get("left_wrist").map((x: Point) => x[0]) || [],
        //             "left_wrist_y":
        //                 this.log.get("left_wrist").map((x: Point) => x[1]) || [],
        //             "right_wrist_x":
        //                 this.log.get("right_wrist").map((x: Point) => x[0]) || [],
        //             "right_wrist_y":
        //                 this.log.get("right_wrist").map((x: Point) => x[1]) || [],
        //             "left_ankle_x":
        //                 this.log.get("left_ankle").map((x: Point) => x[0]) || [],
        //             "left_ankle_y":
        //                 this.log.get("left_ankle").map((x: Point) => x[1]) || [],
        //             "right_ankle_x":
        //                 this.log.get("right_ankle").map((x: Point) => x[0]) || [],
        //             "right_ankle_y":
        //                 this.log.get("right_ankle").map((x: Point) => x[1]) || [],
        //         },
        //     )
        // }

        const collapse = (point: Point): number => point[0] + point[1]
        //Math.sqrt(point[0] ** 2 + point[1] ** 2)

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

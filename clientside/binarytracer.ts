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
    private trackedKeypoints: KeypointName[] // Sorted array of tracked keypoint enum values
    private keypointIndexMap: Map<KeypointName, number> // Maps KeypointName to index in trackedKeypoints
    private buffer: Float32Array // Preallocated buffer for all keypoints' x, y data
    private currentIndex: number = 0 // Next slot to write to
    private numFrames: number = 0 // Number of frames recorded
    private K: number // Number of tracked keypoints
    private logLen: number // Maximum log length

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
        this.logLen = this.settings.logLen

        // Identify and sort tracked keypoints (enum values)
        this.trackedKeypoints = Object.entries(this.settings.targetKeypoints)
            .filter(([_, v]) => v)
            .map(([k]) => KeypointName[k as keyof typeof KeypointName])
            .sort((a, b) => a - b)

        this.K = this.trackedKeypoints.length

        // Map each keypoint to its index in trackedKeypoints for O(1) lookup
        this.keypointIndexMap = new Map(
            this.trackedKeypoints.map((kp, i) => [kp, i]),
        )

        // Preallocate buffer: logLen slots, each with K keypoints' [x, y] (2 floats each)
        this.buffer = new Float32Array(this.logLen * this.K * 2)

        this.poseEmitter.on("pose", this.receivePose)
    }

    // Handle incoming pose data
    receivePose = (pose: Pose) => {
        if (this.settings.measure) this.env.measureStart("tracer")

        // Prepare data for all tracked keypoints in this frame
        const newData = new Float32Array(this.K * 2)

        pose.keypoints.forEach((keypoint) => {
            if (keypoint.name) {
                const keypointEnum =
                    KeypointName[keypoint.name as keyof typeof KeypointName]
                if (this.settings.targetKeypoints[keypointEnum]) {
                    const i = this.keypointIndexMap.get(keypointEnum)!
                    newData[2 * i] = keypoint.x
                    newData[2 * i + 1] = keypoint.y
                }
            }
        })

        // Write data to the current slot
        const offset = this.currentIndex * this.K * 2
        this.buffer.set(newData, offset)

        // Update circular buffer state
        this.currentIndex = (this.currentIndex + 1) % this.logLen
        if (this.numFrames < this.logLen) this.numFrames++

        // Emit events
        this.emit("trace", this.getTraceMap())
        this.emit("values", this.getValuesObj())
    }

    // Get ordered slot indices (oldest to newest)
    private getSlotIndices(): number[] {
        if (this.numFrames < this.logLen) {
            // Buffer not yet full: slots 0 to numFrames-1
            return Array.from({ length: this.numFrames }, (_, k) => k)
        } else {
            // Buffer full: slots from currentIndex to currentIndex-1, wrapping around
            return Array.from(
                { length: this.logLen },
                (_, k) => (this.currentIndex + k) % this.logLen,
            )
        }
    }

    // Generate TraceMap for "trace" event
    private getTraceMap(): TraceMap {
        const slotIndices = this.getSlotIndices()
        const traceMap = new Map<KeypointName, Point[]>()

        for (let i = 0; i < this.K; i++) {
            const keypoint = this.trackedKeypoints[i]
            const points: Point[] = slotIndices.map((slot) => [
                this.buffer[slot * this.K * 2 + 2 * i],
                this.buffer[slot * this.K * 2 + 2 * i + 1],
            ])
            traceMap.set(keypoint, points)
        }

        return (traceMap as unknown) as TraceMap
    }

    // Generate values object for "values" event
    private getValuesObj(): Record<number, number[]> {
        const slotIndices = this.getSlotIndices()
        return Object.fromEntries(
            this.trackedKeypoints.map((kp) => {
                const i = this.keypointIndexMap.get(kp)!
                const values = slotIndices.map((slot) =>
                    this.buffer[slot * this.K * 2 + 2 * i] +
                    this.buffer[slot * this.K * 2 + 2 * i + 1]
                )
                return [kp, values]
            }),
        )
    }
}

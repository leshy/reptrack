import * as poseDetection from "npm:@tensorflow-models/pose-detection"

export type Point = [number, number, number]

export type PoseEvent = poseDetection.Pose & { timestamp: number }

export enum KeypointName {
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
}

export function isEmpty([x, y, score]: Point, minScore: number = 0): boolean {
    if (score < minScore) return true
    return x === 0 && y === 0 && score === 0
}

export class Pose {
    // 4 bytes for timestamp, 1 byte for overall score, plus 3 bytes per keypoint.
    static keypointCount = 18
    static RECORD_SIZE = 4 + 1 + 3 * Pose.keypointCount

    public buffer: ArrayBuffer
    public view: DataView

    constructor(buffer?: ArrayBuffer) {
        this.buffer = buffer || new ArrayBuffer(Pose.RECORD_SIZE)
        this.view = new DataView(this.buffer)
    }

    get timestamp(): number {
        return this.view.getUint32(0, true)
    }
    set timestamp(val: number) {
        this.view.setUint32(0, Math.round(val), true)
    }

    get score(): number {
        return this.view.getUint8(4) / 255
    }
    set score(val: number) {
        this.view.setUint8(4, Math.round(val * 255))
    }

    // Computes the byte offset for a given keypoint index.
    private getKeypointOffset(index: number): number {
        return 5 + index * 3
    }

    // Primary access: get keypoint by index.
    getKeypoint(index: number): [number, number, number] {
        const offset = this.getKeypointOffset(index)
        const x = this.view.getUint8(offset)
        const y = this.view.getUint8(offset + 1)
        const score = this.view.getUint8(offset + 2) / 255
        return [x, y, score]
    }

    // Primary access: get keypoint coords by index.
    getKeypointCoords(
        index: number,
        minScore: number = 0,
    ): [[number, number], number] | [false, false] {
        const [x, y, score] = this.getKeypoint(index)
        return score > minScore ? [[x, y], score] : [false, false]
    }

    // Primary access: set keypoint by index.
    setKeypoint(index: number, point: [number, number, number]): void {
        const offset = this.getKeypointOffset(index)
        const [x, y, s] = point
        this.view.setUint8(offset, Math.round(x))
        this.view.setUint8(offset + 1, Math.round(y))
        this.view.setUint8(offset + 2, Math.round(s * 255))
    }

    // For backwards compatibility: get or set keypoints by name.
    getKeypointByName(
        name: keyof typeof KeypointName,
    ): [number, number, number] {
        return this.getKeypoint(KeypointName[name])
    }

    setKeypointByName(
        name: keyof typeof KeypointName,
        point: [number, number, number],
    ): void {
        this.setKeypoint(KeypointName[name], point)
    }

    // Build a Pose instance from a PoseEvent.
    static fromEvent(event: PoseEvent): Pose {
        const pose = new Pose()
        pose.timestamp = event.timestamp
        pose.score = Number(event.score)
        for (const kp of event.keypoints) {
            const index = KeypointName[kp.name as keyof typeof KeypointName]
            pose.setKeypoint(index, [kp.x, kp.y, kp.score as number])
        }
        return pose
    }

    // Expose the underlying ArrayBuffer.
    getBuffer(): ArrayBuffer {
        return this.buffer
    }

    *iterKeypoints(): IterableIterator<[number, [number, number, number]]> {
        for (let i = 0; i < Pose.keypointCount; i++) {
            const kp = this.getKeypoint(i)
            // Skip if keypoint is unset (i.e. default [0, 0, 0])
            if (isEmpty(kp)) continue
            yield [i, kp]
        }
    }
}

// Optional: create dynamic getters/setters for keypoint names if needed.
for (const key of Object.keys(KeypointName).filter((k) => isNaN(Number(k)))) {
    Object.defineProperty(Pose.prototype, key, {
        get: function (this: Pose) {
            const index = KeypointName[key as keyof typeof KeypointName]
            return this.getKeypoint(index)
        },
        set: function (this: Pose, point: [number, number, number]) {
            const index = KeypointName[key as keyof typeof KeypointName]
            this.setKeypoint(index, point)
        },
        enumerable: true,
        configurable: true,
    })
}

// Declare the additional keypoint properties.
export interface Pose {
    nose: [number, number, number]
    left_eye: [number, number, number]
    right_eye: [number, number, number]
    left_ear: [number, number, number]
    right_ear: [number, number, number]
    left_shoulder: [number, number, number]
    right_shoulder: [number, number, number]
    left_elbow: [number, number, number]
    right_elbow: [number, number, number]
    left_wrist: [number, number, number]
    right_wrist: [number, number, number]
    left_hip: [number, number, number]
    right_hip: [number, number, number]
    left_knee: [number, number, number]
    right_knee: [number, number, number]
    left_ankle: [number, number, number]
    right_ankle: [number, number, number]
    body_center: [number, number, number]
}

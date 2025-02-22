import { KeypointName, Point, PoseEvent } from "../types2.ts"

export class Pose {
    // 4 bytes for timestamp (ms) + 1 for overall score + 18 * 3 for keypoints = 59 bytes.
    static RECORD_SIZE = 4 + 1 + 3 * 18
    public buffer: ArrayBuffer
    public view: DataView

    constructor(buffer?: ArrayBuffer) {
        this.buffer = buffer || new ArrayBuffer(Pose.RECORD_SIZE)
        this.view = new DataView(this.buffer)
    }

    // Timestamp stored as Uint32 (ms) after rounding.
    get timestamp(): number {
        return this.view.getUint32(0, true)
    }
    set timestamp(val: number) {
        this.view.setUint32(0, Math.round(val), true)
    }

    // Overall score stored as Uint8 at offset 4; quantized from [0,1] → [0,255].
    get score(): number {
        return this.view.getUint8(4) / 255
    }
    set score(val: number) {
        this.view.setUint8(4, Math.round(val * 255))
    }

    // Keypoints start at offset 5.
    private getKeypointOffset(index: number): number {
        return 5 + index * 3
    }

    getKeypoint(name: keyof typeof KeypointName): Point {
        const index = KeypointName[name]
        const offset = this.getKeypointOffset(index)
        const x = this.view.getUint8(offset)
        const y = this.view.getUint8(offset + 1)
        const score = this.view.getUint8(offset + 2) / 255
        return [x, y, score]
    }

    setKeypoint(name: keyof typeof KeypointName, point: Point) {
        const index = KeypointName[name]
        const offset = this.getKeypointOffset(index)
        const [x, y, s] = point
        this.view.setUint8(offset, Math.round(x))
        this.view.setUint8(offset + 1, Math.round(y))
        this.view.setUint8(offset + 2, Math.round(s * 255))
    }

    // Build a Pose instance from a JSON event.
    static fromEvent(event: PoseEvent): Pose {
        const pose = new Pose()
        pose.timestamp = event.timestamp // Rounds to ms.
        pose.score = Number(event.score)
        for (const kp of event.keypoints) {
            pose.setKeypoint(
                (kp.name as unknown) as keyof typeof KeypointName,
                [kp.x, kp.y, kp.score as number],
            )
        }
        return pose
    }

    // Expose the underlying buffer if needed.
    getBuffer(): ArrayBuffer {
        return this.buffer
    }
}

// Dynamically define getters and setters for each keypoint
// so you can do: pose.nose, pose.left_eye, etc.
for (const key of Object.keys(KeypointName).filter((k) => isNaN(Number(k)))) {
    Object.defineProperty(Pose.prototype, key, {
        get: function (this: Pose) {
            return this.getKeypoint(key as keyof typeof KeypointName)
        },
        set: function (this: Pose, point: Point) {
            this.setKeypoint(key as keyof typeof KeypointName, point)
        },
        enumerable: true,
        configurable: true,
    })
}

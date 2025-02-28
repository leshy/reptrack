import { aget, compose } from "../utils/mod.ts"
import { AveragableObj } from "../transform/mod.ts"
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

export type KeypointNameType = keyof typeof KeypointName

export const keypointNames: KeypointNameType[] = Object.keys(
    KeypointName,
)
    .filter(
        (key) => isNaN(Number(key)),
    ) as KeypointNameType[]

export function isEmpty(
    point: Point | undefined,
    minScore: number = 0,
): boolean {
    if (!point) return true
    const [x, y, score] = point
    if (score < minScore) return true
    return x === 0 && y === 0 && score === 0
}

export const isEmptyIndexed: (point: [number, Point]) => boolean = compose(
    aget(1),
    isEmpty,
)

export class Pose implements AveragableObj<Pose> {
    // 4 bytes for timestamp, 1 byte for overall score, plus 3 bytes per keypoint.
    static KEYPOINT_COUNT = 18
    static RECORD_SIZE = 4 + 1 + 3 * Pose.KEYPOINT_COUNT

    public buffer: ArrayBuffer
    public view: DataView

    constructor(buffer?: ArrayBuffer) {
        this.buffer = buffer || new ArrayBuffer(Pose.RECORD_SIZE)
        this.view = new DataView(this.buffer)
    }

    avg(others: Pose[]): Pose {
        if (!others || others.length === 0) return this

        // Move weightedAverage function to Pose class
        const allPoses = [this, ...others]
        const avgPose = new Pose()

        // Weighted average timestamp
        let totalPoseScore = 0
        let sumTimestamp = 0
        for (const pose of allPoses) {
            totalPoseScore += pose.score
            sumTimestamp += pose.timestamp * pose.score
        }

        avgPose.timestamp = totalPoseScore ? sumTimestamp / totalPoseScore : 0

        // For each keypoint: compute position and score with agreement
        for (let i = 0; i < Pose.KEYPOINT_COUNT; i++) {
            const keypoints: Point[] = []
            for (const pose of allPoses) {
                keypoints.push(pose.getKeypoint(i))
            }

            avgPose.setKeypoint(i, this.aggregateKeypoints(keypoints))
        }

        // Overall pose score as average of keypoint scores
        avgPose.score = Array.from(avgPose.keypoints())
            .filter((kp) => !isEmpty(kp))
            .reduce((sum, kp) => sum + kp[2], 0) / Pose.KEYPOINT_COUNT

        return avgPose
    }

    private aggregateKeypoints(keypoints: Point[]): Point {
        const n = keypoints.length
        if (n === 0) {
            throw new Error("Cannot aggregate an empty array of keypoints")
        }

        // First pass: compute sums for weighted averages
        let sum_s = 0 // Sum of scores
        let sum_sx = 0 // Sum of score * x
        let sum_sy = 0 // Sum of score * y

        for (const [x, y, s] of keypoints) {
            sum_s += s
            sum_sx += s * x
            sum_sy += s * y
        }

        // Handle case where all scores are zero
        if (sum_s === 0) {
            return [0, 0, 0]
        }

        // Compute weighted average coordinates
        const x_avg = sum_sx / sum_s
        const y_avg = sum_sy / sum_s

        // Second pass: compute weighted variances for spread
        let sum_s_dx2 = 0 // Sum of score * (x - x_avg)^2
        let sum_s_dy2 = 0 // Sum of score * (y - y_avg)^2

        for (const [x, y, s] of keypoints) {
            const dx = x - x_avg
            const dy = y - y_avg
            sum_s_dx2 += s * dx * dx
            sum_s_dy2 += s * dy * dy
        }

        const var_x = sum_s_dx2 / sum_s // Weighted variance in x
        const var_y = sum_s_dy2 / sum_s // Weighted variance in y
        const spread = (var_x + var_y) * 0.001 // Total spread as sum of variances

        // Compute aggregated score
        const avg_s = sum_s / n // Average score
        const aggregated_score = avg_s / (1 + spread) // Score decreases with spread

        return [x_avg, y_avg, aggregated_score]
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

    distance(b: Pose): number {
        let weightedSum = 0
        for (let i = 0; i < Pose.KEYPOINT_COUNT; i++) {
            const [x1, y1, score1] = this.getKeypoint(i)
            const [x2, y2, score2] = b.getKeypoint(i)
            const weight = score1 * score2
            const dx = x1 - x2
            const dy = y1 - y2
            weightedSum += weight * (dx * dx + dy * dy)
        }
        return Math.sqrt(weightedSum)
    }

    // Primary access: get keypoint by index.
    getKeypoint(index: number): Point {
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
    setKeypoint(index: number, point: Point): void {
        const offset = this.getKeypointOffset(index)
        const [x, y, s] = point
        this.view.setUint8(offset, Math.round(x))
        this.view.setUint8(offset + 1, Math.round(y))
        this.view.setUint8(offset + 2, Math.round(s * 255))
    }

    // For backwards compatibility: get or set keypoints by name.
    getKeypointByName(
        name: keyof typeof KeypointName,
    ): Point {
        return this.getKeypoint(KeypointName[name])
    }

    setKeypointByName(
        name: keyof typeof KeypointName,
        point: Point,
    ): void {
        this.setKeypoint(KeypointName[name], point)
    }

    // Build a Pose instance from a PoseEvent.
    static fromEvent(
        event: PoseEvent,
        width: number = 255,
        height: number = 255,
    ): Pose {
        const scaleX = 255 / width
        const scaleY = 255 / height
        const pose = new Pose()
        pose.timestamp = event.timestamp
        pose.score = Number(event.score)
        for (const kp of event.keypoints) {
            const index = KeypointName[kp.name as keyof typeof KeypointName]
            pose.setKeypoint(index, [
                kp.x * scaleX,
                kp.y * scaleY,
                kp.score as number,
            ])
        }
        return pose
    }

    // Expose the underlying ArrayBuffer.
    getBuffer(): ArrayBuffer {
        return this.buffer
    }

    *keypoints(): IterableIterator<Point> {
        for (let i = 0; i < Pose.KEYPOINT_COUNT - 1; i++) {
            yield this.getKeypoint(i)
        }
    }

    *indexedKeypoints(): IterableIterator<[number, Point]> {
        for (let i = 0; i < Pose.KEYPOINT_COUNT - 1; i++) {
            yield [i, this.getKeypoint(i)]
        }
    }

    // returns a multiline string, for cli debug, with nice title, coordinates,
    // name of the keypoint etc
    keypointStr(index: number): string {
        const kp = this.getKeypoint(index)
        const title = `Keypoint ${index} ${KeypointName[index]}`
        return [
            title,
            "─".repeat(title.length + 4),
            `CRD: [${kp[0]}, ${kp[1]}]`,
            `SCR: ${Math.round(kp[2] * 1000) / 1000}`,
        ].join("\n")
    }
}

// Optional: create dynamic getters/setters for keypoint names if needed.
for (const key of Object.keys(KeypointName).filter((k) => isNaN(Number(k)))) {
    Object.defineProperty(Pose.prototype, key, {
        get: function (this: Pose) {
            const index = KeypointName[key as keyof typeof KeypointName]
            return this.getKeypoint(index)
        },
        set: function (this: Pose, point: Point) {
            const index = KeypointName[key as keyof typeof KeypointName]
            this.setKeypoint(index, point)
        },
        enumerable: true,
        configurable: true,
    })
}

// Declare the additional keypoint properties.
export interface Pose {
    nose: Point
    left_eye: Point
    right_eye: Point
    left_ear: Point
    right_ear: Point
    left_shoulder: Point
    right_shoulder: Point
    left_elbow: Point
    right_elbow: Point
    left_wrist: Point
    right_wrist: Point
    left_hip: Point
    right_hip: Point
    left_knee: Point
    right_knee: Point
    left_ankle: Point
    right_ankle: Point
}

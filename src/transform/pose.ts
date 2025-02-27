import { EventEmitter } from "npm:eventemitter3"
import { Pose } from "../binary/pose.ts"
import { BinaryPoseEmitter, BinaryPoseEvent } from "../types.ts"
import {
    attachState,
    GenericStateTransform,
    GenericTransform,
    pipe,
} from "./transform.ts"

// Legacy non-generic transform types (preserved for compatibility)
export type PoseTransform = GenericTransform<Pose>

export type PoseStateTransform<STATE> = GenericStateTransform<Pose, STATE>

export type PoseWindowTransform = PoseStateTransform<Pose[]>

// Legacy node class (preserved for compatibility)
export class Node extends EventEmitter<BinaryPoseEvent> {
    constructor(
        private poseEmitter: BinaryPoseEmitter,
        private transform: PoseTransform,
    ) {
        super()
        this.poseEmitter.on("pose", this.process)
    }

    private process = (pose: Pose): void => {
        const transformedPose = this.transform(pose)
        if (transformedPose) {
            this.emit("pose", transformedPose)
        }
    }
}

// Legacy function (preserved for compatibility)
function isSimple(
    t:
        | PoseTransform
        // @ts-ignore
        | PoseStateTransform<unknown>,
): t is PoseTransform {
    return t.length === 1
}

// Node factory using generic pipe
export const node = (
    poseEmitter: BinaryPoseEmitter,
    ...transforms: Array<
        // @ts-ignore
        PoseTransform | PoseStateTransform<unknown>
    >
) => new Node(
    poseEmitter,
    pipe<Pose>(
        ...transforms.map((t): PoseTransform =>
            isSimple(t) ? t : attachState(t)
        ),
    ),
)

export class Center extends Node {
    constructor(poseEmitter: BinaryPoseEmitter, rescale: boolean = true) {
        super(poseEmitter, center(rescale))
    }
}

export function scoreFilter(score: number = 0.2): PoseTransform {
    return (pose: Pose) => {
        if (pose.score > score) {
            return pose
        }
    }
}

export type FPState = [
    number | undefined, // current frame number
    Pose[], // pose bucket
    number, // prev bucket length
]

export function fpsPeg(fps: number = 10): PoseStateTransform<FPState> {
    // Frame interval in milliseconds (e.g., 100 ms for 10 fps)
    const interval = 1000 / fps
    return (
        pose: Pose,
        state: FPState | undefined,
    ): [Pose | undefined, FPState] => {
        // Calculate the frame number for this pose based on its timestamp
        const frame = Math.floor(pose.timestamp / interval)

        if (!state) {
            return [undefined, [frame, [pose], 0]]
        }

        const [bucketFrame, bucket] = state

        if (frame === bucketFrame) {
            return [undefined, [frame, [pose, ...bucket], 0]]
        }

        return [
            bucket.length > 0 ? bucket[0].avg(bucket.slice(1)) : undefined,
            [frame, [pose], bucket.length],
        ]
    }
}

export function center(rescale: boolean = true): PoseTransform {
    return (pose: Pose): Pose | undefined => {
        // Variables for weighted average of detected keypoints
        let sumX = 0
        let sumY = 0
        let sumScore = 0

        // Compute the center as a weighted average based on keypoint scores
        for (const kp of pose.keypoints()) {
            const [x, y, score] = kp
            sumX += x * score
            sumY += y * score
            sumScore += score
        }

        // If no keypoints are detected (all are [0,0,0]), return undefined
        if (sumScore === 0) {
            return undefined
        }

        // Calculate the center coordinates
        const cx = sumX / sumScore
        const cy = sumY / sumScore

        // Create a new Pose instance for the adjusted keypoints
        const adjustedPose = new Pose()
        adjustedPose.timestamp = pose.timestamp
        adjustedPose.score = pose.score

        // Find the maximum deviation from the center for scaling if rescale is true
        let maxDeviation = 0
        if (rescale) {
            for (const kp of pose.keypoints()) {
                const [x, y, __] = kp
                const dx = Math.abs(x - cx)
                const dy = Math.abs(y - cy)
                maxDeviation = Math.max(maxDeviation, dx, dy)
            }
        }

        // Scaling factor: aim to make the max deviation 127, but prevent division by zero
        const s = maxDeviation > 0 ? 127 / maxDeviation : 1

        // Adjust each keypoint to center at (127, 127), with optional scaling
        for (let i = 0; i < Pose.KEYPOINT_COUNT - 1; i++) {
            const [x, y, score] = pose.getKeypoint(i)
            // Skip adjustment for unset keypoints ([0,0,0])
            if (x === 0 && y === 0 && score === 0) {
                adjustedPose.setKeypoint(i, [0, 0, 0])
            } else {
                // Shift and scale relative to center, then move center to 127
                const scaledX = 127 + s * (x - cx)
                const scaledY = 127 + s * (y - cy)
                // Round to nearest integer and clip to [0, 255]
                const newX = Math.max(0, Math.min(255, Math.round(scaledX)))
                const newY = Math.max(0, Math.min(255, Math.round(scaledY)))
                adjustedPose.setKeypoint(i, [newX, newY, score])
            }
        }

        return adjustedPose
    }
}

export function euclideanFilter(
    threshold: number = 5,
): PoseStateTransform<Pose | undefined> {
    return (
        pose: Pose,
        lastPose: Pose | undefined,
    ): [Pose | undefined, Pose | undefined] => {
        if (lastPose === undefined) {
            return [pose, pose]
        }

        const distance = lastPose.distance(pose)

        if (distance > threshold) {
            return [pose, pose]
        } else {
            return [undefined, lastPose]
        }
    }
}

export type ConfidentEuclideanState = {
    lastPose: Pose | undefined
    previously: Pose[]
    frame: number
}

export function confidentEuclideanFilter(
    threshold: number = 5,
): PoseStateTransform<ConfidentEuclideanState> {
    return (
        pose: Pose,
        state: ConfidentEuclideanState | undefined,
    ): [Pose | undefined, ConfidentEuclideanState] => {
        if (!state) {
            state = {
                lastPose: undefined,
                previously: [],
                frame: 0,
            }
        }

        if (state.lastPose === undefined) {
            // First pose: set lastPose to pose, do not output
            return [undefined, { lastPose: pose, previously: [], frame: 0 }]
        } else {
            const distance = state.lastPose.distance(pose)
            if (distance > threshold) {
                // Compute average if previously is not empty
                const average = state.previously.length > 0
                    ? state.previously[0].avg(state.previously.slice(1))
                    : undefined
                // Output the average (if exists), update state
                if (average) average.timestamp = state.frame
                return [average, {
                    lastPose: pose,
                    previously: [],
                    frame: state.frame + 1,
                }]
            } else {
                // Add pose to previously, do not output
                const newPreviously = [...state.previously, pose]
                return [undefined, {
                    lastPose: state.lastPose,
                    previously: newPreviously,
                    frame: state.frame,
                }]
            }
        }
    }
}

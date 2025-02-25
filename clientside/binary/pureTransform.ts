import { EventEmitter } from "npm:eventemitter3"
import { Pose } from "./pose.ts"
import { BinaryPoseEmitter, BinaryPoseEvent } from "../types2.ts"

export type SimpleTransform = (pose: Pose) => Pose | undefined

export type StateTransform<STATE> = (
    pose: Pose,
    state: STATE | undefined,
) => [Pose | undefined, STATE | undefined]

type PoseWindow = Pose[]

export type WindowTransform = StateTransform<PoseWindow>

export function pipe(
    ...transforms: SimpleTransform[]
): SimpleTransform {
    return (pose: Pose): Pose | undefined => {
        for (const transform of transforms) {
            // @ts-ignore
            pose = transform(pose)
            if (!pose) return undefined
        }
        return pose
    }
}

export class Node extends EventEmitter<BinaryPoseEvent> {
    constructor(
        private poseEmitter: BinaryPoseEmitter,
        private transform: SimpleTransform,
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

export class Center extends Node {
    constructor(poseEmitter: BinaryPoseEmitter, rescale: boolean = true) {
        super(poseEmitter, center(rescale))
    }
}

export function attachState<T>(transform: StateTransform<T>): SimpleTransform {
    let state: T | undefined
    return (pose: Pose): Pose | undefined => {
        const [newPose, newState] = transform(pose, state)
        state = newState
        return newPose
    }
}

export function scoreFilter(score: number = 0.2): SimpleTransform {
    return (pose: Pose) => {
        if (pose.score > score) return pose
    }
}

export function weightedAveragePoses(poses: Pose[]): Pose {
    const avgPose = new Pose()
    if (poses.length === 0) return avgPose

    // Compute weighted average for timestamp using pose score as weight.
    let totalPoseScore = 0
    let sumTimestamp = 0
    for (const pose of poses) {
        totalPoseScore += pose.score
        sumTimestamp += pose.timestamp * pose.score
    }
    avgPose.timestamp = totalPoseScore ? sumTimestamp / totalPoseScore : 0

    // Combine overall score (using square-root of average squared scores).
    const sumScoreSq = poses.reduce((sum, pose) => sum + pose.score ** 2, 0)
    avgPose.score = Math.min(1, Math.sqrt(sumScoreSq / poses.length))

    // For each keypoint, compute weighted average positions.
    for (let i = 0; i < Pose.keypointCount; i++) {
        let totalKeypointScore = 0
        let sumX = 0
        let sumY = 0
        let sumKeypointScoreSq = 0

        for (const pose of poses) {
            const [x, y, s] = pose.getKeypoint(i)
            totalKeypointScore += s
            sumX += x * s
            sumY += y * s
            sumKeypointScoreSq += s * s
        }
        const avgX = totalKeypointScore ? sumX / totalKeypointScore : 0
        const avgY = totalKeypointScore ? sumY / totalKeypointScore : 0
        const avgS = totalKeypointScore
            ? Math.min(1, Math.sqrt(sumKeypointScoreSq / poses.length))
            : 0

        avgPose.setKeypoint(i, [avgX, avgY, avgS])
    }

    return avgPose
}

export function avg(windowSize: number = 10): StateTransform<PoseWindow> {
    return (
        pose: Pose,
        window: PoseWindow = [],
    ): [Pose | undefined, PoseWindow] => {
        window.push(pose)
        if (window.length > windowSize) {
            window.shift()
        }
        return [weightedAveragePoses(window), window]
    }
}

export function center(rescale: boolean = true): SimpleTransform {
    return (pose: Pose): Pose | undefined => {
        // Variables for weighted average of detected keypoints
        let sumX = 0
        let sumY = 0
        let sumScore = 0

        // Compute the center as a weighted average based on keypoint scores
        for (const [_, kp] of pose.iterKeypoints()) {
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
            for (const [i, kp] of pose.iterKeypoints()) {
                const [x, y, _] = kp
                const dx = Math.abs(x - cx)
                const dy = Math.abs(y - cy)
                maxDeviation = Math.max(maxDeviation, dx, dy)
            }
        }
        // Scaling factor: aim to make the max deviation 127, but prevent division by zero
        const s = maxDeviation > 0 ? 127 / maxDeviation : 1

        // Adjust each keypoint to center at (127, 127), with optional scaling
        for (let i = 0; i < Pose.keypointCount; i++) {
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

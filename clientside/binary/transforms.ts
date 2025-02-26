import { EventEmitter } from "npm:eventemitter3"
import { Pose } from "./pose.ts"
import { BinaryPoseEmitter, BinaryPoseEvent } from "../types.ts"

export class Center extends EventEmitter<BinaryPoseEvent> {
    constructor(
        private poseEmitter: BinaryPoseEmitter,
        private rescale: boolean = true,
    ) {
        super()
        this.poseEmitter.on("pose", this.process)
    }

    private process = (pose: Pose): void => {
        // Variables for weighted average of detected keypoints
        let sumX = 0
        let sumY = 0
        let sumScore = 0

        // Compute the center as a weighted average based on keypoint scores
        for (const kp of pose.iterKeypoints()) {
            const [x, y, score] = kp
            sumX += x * score
            sumY += y * score
            sumScore += score
        }

        // If no keypoints are detected (all are [0,0,0]), emit the original pose
        if (sumScore === 0) {
            this.emit("pose", pose)
            return
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
        if (this.rescale) {
            for (const [i, kp] of pose.iterKeypoints()) {
                const [x, y, score] = kp
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

        // Emit the adjusted pose
        this.emit("pose", adjustedPose)
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

export class Smoother extends EventEmitter<BinaryPoseEvent> {
    private window: Pose[] = []
    constructor(
        private poseEmitter: BinaryPoseEmitter,
        private windowSize: number = 5,
    ) {
        super()
        this.poseEmitter.on("pose", this.process.bind(this))
    }

    private process(pose: Pose): void {
        this.window.push(pose)
        if (this.window.length > this.windowSize) this.window.shift()
        this.emit("pose", weightedAveragePoses(this.window))
    }
}

export class EuclidianFilter extends EventEmitter<BinaryPoseEvent> {
    private lastPose: Pose | null = null

    constructor(
        poseEmitter: BinaryPoseEmitter,
        private threshold: number = 5,
    ) {
        super()
        this.threshold = threshold
        poseEmitter.on("pose", this.process)
    }

    process = (pose: Pose) => {
        if (!this.lastPose) {
            this.lastPose = pose
            return pose
        }
        const distance = this.lastPose.distance(pose)

        if (distance > this.threshold) {
            this.lastPose = pose
            this.emit("pose", pose)
        }
    }
}

export class ConfidentEuclidianFilter extends EventEmitter<BinaryPoseEvent> {
    private lastPose: Pose | null = null
    private previously: Pose[] = []

    constructor(
        poseEmitter: BinaryPoseEmitter,
        private threshold: number = 5,
    ) {
        super()
        this.threshold = threshold
        poseEmitter.on("pose", this.process)
    }

    process = (pose: Pose) => {
        if (!this.lastPose) {
            this.lastPose = pose
            return
        }

        const distance = this.lastPose.distance(pose)

        if (distance > this.threshold) {
            this.lastPose = pose
            this.emit("pose", weightedAveragePoses(this.previously))
            this.previously = []
        } else {
            this.previously.push(pose)
        }
    }
}

import { EventEmitter } from "npm:eventemitter3"
import { Pose } from "./pose.ts"
import { BinaryPoseEmitter, BinaryPoseEvent } from "../types2.ts"

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
        for (const [i, kp] of pose.iterKeypoints()) {
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

export class Smoother extends EventEmitter<BinaryPoseEvent> {
    // History for each keypoint: array of [x, y, score] tuples
    private history: [number, number, number][][] = Array.from(
        { length: Pose.keypointCount },
        () => [],
    )

    constructor(
        private poseEmitter: BinaryPoseEmitter,
        private windowSize: number = 5,
        private minScore: number = 0.2,
    ) {
        super()
        this.poseEmitter.on("pose", this.process.bind(this))
    }

    private process(pose: Pose): void {
        const smoothedPose = new Pose()
        smoothedPose.timestamp = pose.timestamp
        smoothedPose.score = pose.score // Preserve overall pose score

        for (let i = 0; i < Pose.keypointCount; i++) {
            const [x, y, score] = pose.getKeypoint(i) // Assuming getKeypoint returns [x, y, score]

            // Update history for detected keypoints
            const keypointHistory = this.history[i]
            if (score > this.minScore) {
                keypointHistory.push([x, y, score])
                if (keypointHistory.length > this.windowSize) {
                    keypointHistory.shift() // Remove oldest
                }
            }

            // Compute smoothed position
            if (keypointHistory.length > 0) {
                let sumX = 0, sumY = 0, sumWeights = 0
                for (const [hx, hy, hs] of keypointHistory) {
                    sumX += hx * hs
                    sumY += hy * hs
                    sumWeights += hs
                }
                const smoothedX = sumX / sumWeights
                const smoothedY = sumY / sumWeights
                smoothedPose.setKeypoint(i, [smoothedX, smoothedY, score])
            } else {
                smoothedPose.setKeypoint(i, [0, 0, 0]) // Undetected keypoint
            }
        }

        this.emit("pose", smoothedPose)
    }
}

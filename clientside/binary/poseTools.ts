import { filter, reduce } from "npm:itertools"
import { isEmpty, Point, Pose } from "./pose.ts"

/**
 * Aggregates an array of keypoints into a single keypoint.
 * The position is the weighted average of coordinates, with weights based on scores.
 * The score is the average score adjusted by the weighted spread (variance),
 * decreasing as the spread increases to reflect lower confidence in scattered measurements.
 *
 * @param keypoints - Array of keypoints, where each keypoint is [x, y, score]
 * @returns Aggregated keypoint [x_avg, y_avg, aggregated_score]
 * @throws Error if the input array is empty
 */
function aggregateKeypoints(keypoints: Point[]): Point {
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

export function weightedAverage(poses: Pose[]): Pose {
    const avgPose = new Pose()
    if (poses.length === 0) return avgPose

    // Weighted average timestamp (unchanged)
    let totalPoseScore = 0
    let sumTimestamp = 0
    for (const pose of poses) {
        totalPoseScore += pose.score
        sumTimestamp += pose.timestamp * pose.score
    }

    avgPose.timestamp = totalPoseScore ? sumTimestamp / totalPoseScore : 0

    // For each keypoint: compute position and score with agreement
    for (let i = 0; i < Pose.keypointCount; i++) {
        const keypoints = []
        for (const pose of poses) {
            keypoints.push(pose.getKeypoint(i))
        }

        avgPose.setKeypoint(i, aggregateKeypoints(keypoints))
    }

    // Overall pose score as average of keypoint scores
    //avgPose.score = avgPose.keypoints.reduce((sum, kp) => sum + kp[2], 0) /
    //    Pose.keypointCount

    avgPose.score = reduce(
        filter(avgPose.iterKeypoints(), isEmpty),
        (sum: number, kp: Point) => sum + kp[2],
        0,
    ) / Pose.keypointCount

    return avgPose
}

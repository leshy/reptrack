import { Pose } from "./pose.ts"

export function weightedAverage(poses: Pose[]): Pose {
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

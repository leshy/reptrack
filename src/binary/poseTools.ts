import { Pose } from "./pose.ts"

/**
 * @deprecated Use Pose.prototype.avg() instead
 */
export function weightedAverage(poses: Pose[]): Pose {
    if (poses.length === 0) return new Pose()

    // Use the first pose's avg method to handle the averaging
    return poses[0].avg(poses.slice(1))
}

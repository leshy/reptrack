import { Pose } from "../binary/pose.ts"
import { pipe, PoseTransform } from "./mod.ts"
import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"

Deno.test("pipe function works correctly with pose transforms", () => {
    // Create some test transforms
    const addOneToAllCoords: PoseTransform = (
        pose: Pose,
    ): Pose | undefined => {
        const newPose = new Pose()
        newPose.timestamp = pose.timestamp
        newPose.score = pose.score

        for (let i = 0; i < Pose.KEYPOINT_COUNT - 1; i++) {
            const [x, y, score] = pose.getKeypoint(i)
            if (x === 0 && y === 0 && score === 0) {
                newPose.setKeypoint(i, [0, 0, 0])
            } else {
                newPose.setKeypoint(i, [x + 1, y + 1, score])
            }
        }

        return newPose
    }

    const filterLowScore: PoseTransform = (pose: Pose): Pose | undefined => {
        return pose.score > 0.5 ? pose : undefined
    }

    // Create a test pose
    const testPose = new Pose()
    testPose.score = 0.8
    testPose.timestamp = 1000
    testPose.setKeypoint(0, [100, 100, 0.9])
    testPose.setKeypoint(1, [120, 110, 0.8])

    // Test with one transform
    const pipedSingle = pipe<Pose>(addOneToAllCoords)(testPose)

    // Make sure the transform did what we expected
    const [x, y, score] = pipedSingle?.getKeypoint(0) || [0, 0, 0]
    assertEquals(x, 101, "X coordinate should be increased by 1")
    assertEquals(y, 101, "Y coordinate should be increased by 1")
    assertEquals(Math.round(score * 10) / 10, 0.9, "Score should be preserved")

    // Test with multiple transforms
    const pipedMulti = pipe<Pose>(addOneToAllCoords, filterLowScore)(testPose)

    // Verify that both transforms were applied
    const [x2, y2, score2] = pipedMulti?.getKeypoint(0) || [0, 0, 0]
    assertEquals(x2, 101, "X coordinate should be increased by 1")
    assertEquals(y2, 101, "Y coordinate should be increased by 1")
    assertEquals(Math.round(score2 * 10) / 10, 0.9, "Score should be preserved")

    // Test with filter that returns undefined
    const testPoseLowScore = new Pose()
    testPoseLowScore.score = 0.3
    testPoseLowScore.setKeypoint(0, [100, 100, 0.9])

    const pipedFiltered = pipe<Pose>(filterLowScore)(testPoseLowScore)

    // Verify filter works
    assertEquals(
        pipedFiltered,
        undefined,
        "Filter transform should return undefined for low scores",
    )
})

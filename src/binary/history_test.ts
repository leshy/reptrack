import { History } from "./history.ts"
import { Pose } from "./pose.ts"
import {
    assertAlmostEquals,
    assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts"
import { KeypointName, Point } from "./pose.ts"

// Test utilities
interface TestPoseConfig {
    timestamp: number
    keypoints: Array<[keyof typeof KeypointName, Point]>
}

/**
 * Creates a new Pose with the specified timestamp and keypoints
 */
function createTestPose(config: TestPoseConfig): Pose {
    const pose = new Pose()
    pose.timestamp = config.timestamp
    for (const [name, point] of config.keypoints) {
        pose.setKeypointByName(name, point)
    }
    return pose
}

/**
 * Creates a History with the specified capacity and fills it with test poses
 */
function createTestHistory(
    capacity: number,
    poseConfigs: TestPoseConfig[],
): History {
    const history = new History(capacity)
    for (const config of poseConfigs) {
        history.push(createTestPose(config))
    }
    return history
}

/**
 * Reusable test pose configurations with reasonable defaults
 */
const TEST_POSES: { basic: TestPoseConfig[] } = {
    basic: [
        {
            timestamp: 100,
            keypoints: [
                ["nose", [10, 20, 0.9]],
                ["left_eye", [15, 18, 0.85]],
                ["right_eye", [5, 18, 0.87]],
            ],
        },
        {
            timestamp: 200,
            keypoints: [
                ["nose", [30, 40, 0.8]],
                ["left_eye", [35, 38, 0.75]],
                ["right_eye", [25, 38, 0.77]],
            ],
        },
        {
            timestamp: 300,
            keypoints: [
                ["nose", [50, 60, 0.7]],
                ["left_eye", [55, 58, 0.65]],
                ["right_eye", [45, 58, 0.67]],
            ],
        },
        {
            timestamp: 400,
            keypoints: [
                ["nose", [70, 80, 0.6]],
                ["left_eye", [75, 78, 0.55]],
                ["right_eye", [65, 78, 0.57]],
            ],
        },
    ],
}

Deno.test("History push and iteration order", () => {
    const history = createTestHistory(3, TEST_POSES.basic.slice(0, 3))

    const poses = Array.from(history.poses())
    assertEquals(poses.length, 3)
    assertEquals(poses[0].timestamp, 100)
    assertEquals(poses[1].timestamp, 200)
    assertEquals(poses[2].timestamp, 300)

    const nose1 = poses[0].getKeypointByName("nose")
    assertEquals(nose1[0], 10)
    assertEquals(nose1[1], 20)
    assertAlmostEquals(nose1[2], 0.9, 0.01)
})

Deno.test("History circular buffer overwrite", () => {
    // Use all 4 test poses with capacity of 3, so one will be overwritten
    const history = createTestHistory(3, TEST_POSES.basic)

    const poses = Array.from(history.poses())
    // Expect first pose to be overwritten; order should be: pose2, pose3, pose4.
    assertEquals(poses.length, 3)
    assertEquals(poses[0].timestamp, 200)
    assertEquals(poses[1].timestamp, 300)
    assertEquals(poses[2].timestamp, 400)
})

Deno.test("HistoryPose view reflects mutations", () => {
    const history = createTestHistory(3, [TEST_POSES.basic[0]])

    const [view] = Array.from(history.poses())
    view.setKeypointByName("nose", [99, 88, 0.7])

    const [viewAgain] = Array.from(history.poses())
    const nose = viewAgain.getKeypointByName("nose")
    assertEquals(nose[0], 99)
    assertEquals(nose[1], 88)
    assertAlmostEquals(nose[2], 0.7, 0.01)
})

Deno.test("History keypoints iteration", () => {
    const history = createTestHistory(3, TEST_POSES.basic.slice(0, 2))

    // Test iteration over a specific keypoint across all poses
    const noseIndex = 0 // Index for "nose" keypoint
    const keypointsArray = Array.from(history.keypoints(noseIndex))

    assertEquals(keypointsArray.length, 2)

    // Check first keypoint
    assertEquals(keypointsArray[0][0], 100) // timestamp
    assertEquals(keypointsArray[0][1][0], 10) // x
    assertEquals(keypointsArray[0][1][1], 20) // y
    assertAlmostEquals(keypointsArray[0][1][2], 0.9, 0.01) // score

    // Check second keypoint
    assertEquals(keypointsArray[1][0], 200) // timestamp
    assertEquals(keypointsArray[1][1][0], 30) // x
    assertEquals(keypointsArray[1][1][1], 40) // y
    assertAlmostEquals(keypointsArray[1][1][2], 0.8, 0.01) // score
})

Deno.test("Pose keypoints iteration through History", () => {
    const history = createTestHistory(2, [TEST_POSES.basic[0]])

    const [historyPose] = Array.from(history.poses())

    // Test iterating through all keypoints in a pose
    const keypoints = Array.from(historyPose.keypoints())

    // Should have KEYPOINT_COUNT-1 keypoints
    assertEquals(keypoints.length, Pose.KEYPOINT_COUNT - 1)

    // Check first three keypoints we set
    assertEquals(keypoints[0][0], 10) // nose x
    assertEquals(keypoints[0][1], 20) // nose y
    assertAlmostEquals(keypoints[0][2], 0.9, 0.01) // nose score

    assertEquals(keypoints[1][0], 15) // left_eye x
    assertEquals(keypoints[1][1], 18) // left_eye y
    assertAlmostEquals(keypoints[1][2], 0.85, 0.01) // left_eye score

    assertEquals(keypoints[2][0], 5) // right_eye x
    assertEquals(keypoints[2][1], 18) // right_eye y
    assertAlmostEquals(keypoints[2][2], 0.87, 0.01) // right_eye score
})

Deno.test("Pose indexed keypoints iteration through History", () => {
    const poseConfig: TestPoseConfig = {
        timestamp: 100,
        keypoints: [
            ["nose", [10, 20, 0.9]],
            ["left_eye", [15, 18, 0.85]],
        ],
    }

    const history = createTestHistory(2, [poseConfig])

    const [historyPose] = Array.from(history.poses())

    // Test iterating through indexed keypoints
    const indexedKeypoints = Array.from(historyPose.indexedKeypoints())

    // Should have KEYPOINT_COUNT-1 keypoints
    assertEquals(indexedKeypoints.length, Pose.KEYPOINT_COUNT - 1)

    // Check that the indexes match expected values
    assertEquals(indexedKeypoints[0][0], 0) // nose index
    assertEquals(indexedKeypoints[1][0], 1) // left_eye index

    // Check first two keypoints data
    assertEquals(indexedKeypoints[0][1][0], 10) // nose x
    assertEquals(indexedKeypoints[0][1][1], 20) // nose y
    assertAlmostEquals(indexedKeypoints[0][1][2], 0.9, 0.01) // nose score

    assertEquals(indexedKeypoints[1][1][0], 15) // left_eye x
    assertEquals(indexedKeypoints[1][1][1], 18) // left_eye y
    assertAlmostEquals(indexedKeypoints[1][1][2], 0.85, 0.01) // left_eye score
})

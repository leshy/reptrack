import { History, HistoryPose } from "./history.ts"
import { Pose } from "./pose.ts"
import {
    assertAlmostEquals,
    assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

Deno.test("History push and iteration order", () => {
    const history = new History(3)
    const pose1 = new Pose()
    pose1.timestamp = 100
    pose1.setKeypointByName("nose", [10, 20, 0.9])

    const pose2 = new Pose()
    pose2.timestamp = 200
    pose2.setKeypointByName("nose", [30, 40, 0.8])

    const pose3 = new Pose()
    pose3.timestamp = 300
    pose3.setKeypointByName("nose", [50, 60, 0.7])

    history.push(pose1)
    history.push(pose2)
    history.push(pose3)

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
    const history = new History(3)
    const pose1 = new Pose()
    pose1.timestamp = 100
    const pose2 = new Pose()
    pose2.timestamp = 200
    const pose3 = new Pose()
    pose3.timestamp = 300
    const pose4 = new Pose()
    pose4.timestamp = 400

    history.push(pose1)
    history.push(pose2)
    history.push(pose3)
    history.push(pose4)

    const poses = Array.from(history.poses())
    // Expect pose1 to be overwritten; order should be: pose2, pose3, pose4.
    assertEquals(poses.length, 3)
    assertEquals(poses[0].timestamp, 200)
    assertEquals(poses[1].timestamp, 300)
    assertEquals(poses[2].timestamp, 400)
})

Deno.test("HistoryPose view reflects mutations", () => {
    const history = new History(3)
    const pose = new Pose()
    pose.timestamp = 123
    pose.setKeypointByName("nose", [10, 20, 0.5])
    history.push(pose)

    const [view] = Array.from(history.poses())
    view.setKeypointByName("nose", [99, 88, 0.7])

    const [viewAgain] = Array.from(history.poses())
    const nose = viewAgain.getKeypointByName("nose")
    assertEquals(nose[0], 99)
    assertEquals(nose[1], 88)
    assertAlmostEquals(nose[2], 0.7, 0.01)
})

Deno.test("Replay iterator respects timestamp differences", async () => {
    const history = new History(2)
    const pose1 = new Pose()
    pose1.timestamp = 100
    const pose2 = new Pose()
    pose2.timestamp = 300 // 200ms gap

    history.push(pose1)
    history.push(pose2)

    const times: number[] = []
    const startTime = performance.now()
    for await (const _ of history.iterate()) {
        times.push(performance.now() - startTime)
    }
    // Expect ~200ms delay between poses (allow tolerance)
    const delay = times[1] - times[0]
    if (Math.abs(delay - 200) > 50) {
        throw new Error(`Expected ~200ms delay, got ${delay.toFixed(0)}ms`)
    }
})

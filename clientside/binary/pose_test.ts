import { Pose } from "./pose.ts"
import {
    assertAlmostEquals,
    assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

Deno.test("timestamp rounding to milliseconds", () => {
    const pose = new Pose()
    const inputTimestamp = 12345.678
    pose.timestamp = inputTimestamp
    const expected = Math.round(inputTimestamp)
    assertEquals(pose.timestamp, expected)
})

Deno.test("overall score quantization", () => {
    const pose = new Pose()
    const inputScore = 0.5
    pose.score = inputScore
    const storedScore = pose.score
    assertAlmostEquals(storedScore, inputScore, 0.01)
})

Deno.test("keypoint set and get", () => {
    const pose = new Pose()
    const point: [number, number, number] = [100.7, 150.2, 0.8]
    pose.setKeypoint("nose", point)
    const [x, y, score] = pose.getKeypoint("nose")
    assertEquals(x, Math.round(point[0]))
    assertEquals(y, Math.round(point[1]))
    assertAlmostEquals(score, point[2], 0.01)
})

Deno.test("conversion from PoseEvent", () => {
    const event = {
        timestamp: 98765.4321,
        score: 0.75,
        keypoints: [
            { name: "nose" as "nose", x: 120.3, y: 130.7, score: 0.9 },
            { name: "left_eye" as "left_eye", x: 121.3, y: 131.7, score: 0.8 },
        ],
    }
    const pose = Pose.fromEvent(event)
    assertEquals(pose.timestamp, Math.round(event.timestamp))
    assertAlmostEquals(pose.score, event.score, 0.01)

    const nose = pose.getKeypoint("nose")
    console.log("nose", nose)
    assertEquals(nose[0], Math.round(event.keypoints[0].x))
    assertEquals(nose[1], Math.round(event.keypoints[0].y))
    assertAlmostEquals(nose[2], event.keypoints[0].score, 0.01)

    const leftEye = pose.getKeypoint("left_eye")
    console.log("left eye", nose)
    assertEquals(leftEye[0], Math.round(event.keypoints[1].x))
    assertEquals(leftEye[1], Math.round(event.keypoints[1].y))
    assertAlmostEquals(leftEye[2], event.keypoints[1].score, 0.01)
})

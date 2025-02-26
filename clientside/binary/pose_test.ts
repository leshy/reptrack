import { KeypointName, Pose } from "./pose.ts"
import {
    assert,
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
    pose.setKeypointByName("nose", point)
    const [x, y, score] = pose.getKeypointByName("nose")
    assertEquals(x, Math.round(point[0]))
    assertEquals(y, Math.round(point[1]))
    assertAlmostEquals(score, point[2], 0.01)
})

Deno.test("conversion from PoseEvent", () => {
    const event = {
        timestamp: 98765.4321,
        score: 0.75,
        keypoints: [
            { name: "nose" as const, x: 120.3, y: 130.7, score: 0.9 },
            { name: "left_eye" as const, x: 121.3, y: 131.7, score: 0.8 },
        ],
    }
    const pose = Pose.fromEvent(event)
    assertEquals(pose.timestamp, Math.round(event.timestamp))
    assertAlmostEquals(pose.score, event.score, 0.01)

    // Access using the dynamic getter
    const nose = pose.nose
    assertEquals(nose[0], Math.round(event.keypoints[0].x))
    assertEquals(nose[1], Math.round(event.keypoints[0].y))
    assertAlmostEquals(nose[2], event.keypoints[0].score, 0.01)

    // Also test via the getKeypointByName method
    const leftEye = pose.getKeypointByName("left_eye")
    assertEquals(leftEye[0], Math.round(event.keypoints[1].x))
    assertEquals(leftEye[1], Math.round(event.keypoints[1].y))
    assertAlmostEquals(leftEye[2], event.keypoints[1].score, 0.01)
})

Deno.test("dynamic getters vs. getKeypointByName", () => {
    const pose = new Pose()
    const testKey: keyof typeof KeypointName = "right_wrist"
    const point: [number, number, number] = [200.5, 250.5, 0.95]
    pose.setKeypointByName(testKey, point)
    const viaMethod = pose.getKeypointByName(testKey)
    // @ts-ignore: dynamic property access is defined at runtime
    const viaDynamic = pose[testKey]
    assertEquals(viaDynamic, viaMethod)
})

Deno.test("all dynamic keypoint getters exist", () => {
    const pose = new Pose()
    // Verify that each key defined in KeypointName exists as a property.
    for (
        const key of Object.keys(KeypointName).filter((k) => isNaN(Number(k)))
    ) {
        // @ts-ignore: checking dynamic properties
        assert(key in pose, `Property ${key} should exist on pose instance`)
    }
})

Deno.test("missing keypoints default to zero", () => {
    // Create a PoseEvent with only some keypoints provided (e.g., no ankles)
    const event = {
        timestamp: 11111.111,
        score: 0.8,
        keypoints: [
            { name: "nose" as const, x: 100.5, y: 100.5, score: 0.9 },
            { name: "left_eye" as const, x: 101.5, y: 101.5, score: 0.85 },
            // Other keypoints are missing, e.g., left_ankle and right_ankle.
        ],
    }

    const pose = Pose.fromEvent(event)

    // Provided keypoints are set correctly.
    const nose = pose.nose
    assertEquals(nose[0], Math.round(100.5))
    assertEquals(nose[1], Math.round(100.5))
    assertAlmostEquals(nose[2], 0.9, 0.01)

    // Missing keypoints default to [0, 0, 0]
    const leftAnkle = pose.getKeypointByName("left_ankle")
    const rightAnkle = pose.getKeypointByName("right_ankle")
    assertEquals(leftAnkle, [0, 0, 0])
    assertEquals(rightAnkle, [0, 0, 0])
})

// nonEmptyKeypoints iterator
Deno.test("nonEmptyKeypoints iterator", () => {
    const pose = new Pose()

    // Initialize all keypoints with predictable values.
    for (let i = 0; i < Pose.KEYPOINT_COUNT - 1; i++) {
        const point: [number, number, number] = [
            i + 0.2,
            i + 0.7,
            (i % 256) / 255,
        ]
        pose.setKeypoint(i, point)
    }

    const iterator = pose.nonEmptyKeypoints()
    for (const [i, point] of iterator) {
        const expected: [number, number, number] = [
            Math.round(i + 0.2),
            Math.round(i + 0.7),
            (i % 256) / 255,
        ]
        console.log(i, point)
    }
})

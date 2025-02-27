import { Pose } from "./binary/pose.ts"
import {
    attachState,
    avg,
    center,
    confidentEuclideanFilter,
    ConfidentEuclideanState,
    pipe,
    spyState,
} from "./transform/mod.ts"
import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"

Deno.test("pipe with multiple transform types works correctly", () => {
    // Create a test pose
    const testPose = new Pose()
    testPose.score = 0.8
    testPose.timestamp = 1000
    testPose.setKeypoint(0, [100, 100, 0.9])
    testPose.setKeypoint(1, [120, 110, 0.8])

    // Create a simple transform pipeline with multiple transform types
    const centerTransform = center()
    const avgTransform = attachState(avg<Pose>())

    // Verify the transformations
    let spyValue: Pose[] | undefined
    const spyTransform = spyState(avg<Pose>(), (state) => {
        spyValue = state
    })

    // First run with just one pose
    const result1 = pipe<Pose>(centerTransform, avgTransform, spyTransform)(
        testPose,
    )

    // Check that center worked (result should have keypoints scaled around 127,127)
    const [x, y] = result1?.getKeypoint(0) || [0, 0, 0]
    assertEquals(Math.abs(x - 127) < 50, true, "X should be near 127")
    assertEquals(Math.abs(y - 127) < 50, true, "Y should be near 127")

    // Check that avg worked (window should contain the transformed pose)
    assertEquals(spyValue?.length, 1, "Window should contain 1 pose")

    // Create complex pipeline with confidentEuclideanFilter
    let euclidSpyValue: ConfidentEuclideanState | undefined
    const euclidSpy = spyState(
        confidentEuclideanFilter(10),
        (state) => {
            euclidSpyValue = state
        },
    )

    // First pose will be stored but not emitted
    const euclidResult1 = pipe<Pose>(euclidSpy)(testPose)
    assertEquals(euclidResult1, undefined, "First pose should not be emitted")
    assertEquals(
        euclidSpyValue?.lastPose?.timestamp,
        1000,
        "State should store the pose",
    )

    // All the transform functions should be working together
    const pipeline = pipe<Pose>(centerTransform, avgTransform, euclidSpy)

    // The result will be undefined because euclidean filter needs two poses
    const pipelineResult = pipeline(testPose)
    assertEquals(
        pipelineResult,
        undefined,
        "Complex pipeline should handle undefined returns",
    )
})

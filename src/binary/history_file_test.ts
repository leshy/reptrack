import { HistoryFile } from "./history.ts"
import { Pose } from "./pose.ts"
import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

// Basic test for class structure - no file access needed
Deno.test("HistoryFile class structure and interfaces", () => {
    // Test the class functionality
    assertEquals(typeof HistoryFile.load, "function")

    // Check instance methods
    const history = new HistoryFile(100, "test-url")
    assertExists(history)
    assertEquals(history.constructor.name, "HistoryFile")
    assertEquals(history.name, "test-url")

    // Verify buffer initialization
    assertEquals(history.capacity, 100)
    assertEquals(history.buffer.byteLength, 100 * Pose.RECORD_SIZE)
    assertEquals(history.count, 0)
    assertEquals(history.writeIndex, 0)

    // Download method exists
    assertEquals(typeof history.download, "function")

    // Verify capacity initialization works
    const smallHistory = new HistoryFile(10)
    assertEquals(smallHistory.capacity, 10)
    assertEquals(smallHistory.buffer.byteLength, 10 * Pose.RECORD_SIZE)
})

// Test for actually loading a file from disk
Deno.test("HistoryFile.load can load a file from disk", async () => {
    // Using a file from static directory - no need to manually create URL
    const history = await HistoryFile.load("../../static/euclid10.bin.gz")

    assertExists(history)
    assertEquals(history.constructor.name, "HistoryFile")

    // Verify name matches the URL
    const expectedUrl = new URL("../../static/euclid10.bin.gz", import.meta.url)
        .toString()
    assertEquals(history.name, expectedUrl)

    // Make sure we have poses
    assertExists(history.count)
    console.log(`Loaded ${history.count} poses from file`)

    // If we've loaded poses, make sure they're valid
    if (history.count > 0) {
        const firstPose = history.getPoseAt(0)
        assertExists(firstPose)

        // Check if timestamps are valid
        assertExists(history.startTime)
        assertExists(history.endTime)

        // The end time should be later than the start time
        assertEquals(history.startTime <= history.endTime, true)

        // Check keypoints to verify data integrity
        const keypoints = Array.from(firstPose.keypoints())
        assertEquals(keypoints.length, Pose.KEYPOINT_COUNT - 1)

        // Check at least one keypoint to verify it has valid coordinates
        const firstKeypoint = keypoints[0]
        assertEquals(firstKeypoint.length, 3) // [x, y, score]

        // x and y should be in range 0-255 (see pose.ts)
        assertEquals(firstKeypoint[0] >= 0 && firstKeypoint[0] <= 255, true)
        assertEquals(firstKeypoint[1] >= 0 && firstKeypoint[1] <= 255, true)

        // score should be in range 0-1
        assertEquals(firstKeypoint[2] >= 0 && firstKeypoint[2] <= 1, true)
    }
})

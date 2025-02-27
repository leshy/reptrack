import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"
import { attachState, Averagable, avg, pipe } from "./transform.ts"

// Define a 2D Vector class that implements Averagable
export class Vector2D implements Averagable<Vector2D> {
    constructor(public x: number, public y: number) {}

    avg(others: Vector2D[]): Vector2D {
        if (!others || others.length === 0) return this

        const allVectors = [this, ...others]
        let sumX = 0
        let sumY = 0

        for (const vector of allVectors) {
            sumX += vector.x
            sumY += vector.y
        }

        return new Vector2D(
            sumX / allVectors.length,
            sumY / allVectors.length,
        )
    }

    // Add vector magnitude for testing
    get magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }
}

Deno.test("Vector2D implements Averagable correctly", () => {
    const v1 = new Vector2D(1, 2)
    const v2 = new Vector2D(3, 4)
    const v3 = new Vector2D(5, 6)

    // Test single value
    const avgSingle = v1.avg([])
    assertEquals(avgSingle.x, 1, "Single vector x should be itself")
    assertEquals(avgSingle.y, 2, "Single vector y should be itself")

    // Test with multiple values
    const avgMultiple = v1.avg([v2, v3])
    assertEquals(
        avgMultiple.x,
        3,
        "Average x of [(1,2), (3,4), (5,6)] should be 3",
    )
    assertEquals(
        avgMultiple.y,
        4,
        "Average y of [(1,2), (3,4), (5,6)] should be 4",
    )
})

Deno.test("avg transform works with Vector2D", () => {
    const vectorAvg = avg<Vector2D>(3)
    const attachedAvg = attachState(vectorAvg)

    // Test with sequence of vectors
    const v1 = new Vector2D(1, 2)
    const result1 = attachedAvg(v1)
    assertEquals(result1?.x, 1, "First vector x should be itself")
    assertEquals(result1?.y, 2, "First vector y should be itself")

    // Second vector
    const v2 = new Vector2D(3, 4)
    const result2 = attachedAvg(v2)
    // Average of [v1, v2, v2] (since v2 is both in the window and the current item)
    assertEquals(
        result2?.x,
        2.3333333333333335,
        "Average x should be calculated correctly",
    )
    assertEquals(
        result2?.y,
        3.3333333333333335,
        "Average y should be calculated correctly",
    )

    // Third vector
    const v3 = new Vector2D(5, 6)
    const result3 = attachedAvg(v3)
    // Average of [v1, v2, v3, v3]
    assertEquals(result3?.x, 3.5, "Average x should be calculated correctly")
    assertEquals(result3?.y, 4.5, "Average y should be calculated correctly")

    // Fourth vector (should push out the first)
    const v4 = new Vector2D(7, 8)
    const result4 = attachedAvg(v4)
    // Average of [v2, v3, v4, v4]
    assertEquals(result4?.x, 5.5, "Average x should be calculated correctly")
    assertEquals(result4?.y, 6.5, "Average y should be calculated correctly")
})

Deno.test("pipe works with Vector2D", () => {
    const scaleUp = (v: Vector2D) => new Vector2D(v.x * 2, v.y * 2)
    const addOne = (v: Vector2D) => new Vector2D(v.x + 1, v.y + 1)

    const v1 = new Vector2D(1, 2)

    const result = pipe<Vector2D>(scaleUp, addOne)(v1)
    assertEquals(result?.x, 3, "Vector x should be (1*2)+1 = 3")
    assertEquals(result?.y, 5, "Vector y should be (2*2)+1 = 5")
})

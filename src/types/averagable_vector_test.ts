import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"
import { AveragableObj, average } from "./averagable.ts"

// Helper function to get a property from an object
const getProperty = <T, K extends keyof T>(key: K) => (obj: T): T[K] => obj[key]

// Define a 2D Vector class that implements Averagable
export class Vector2D implements AveragableObj {
    public x: number
    public y: number

    constructor(x: number, y: number) {
        // Store normalized values
        const magnitude = Math.sqrt(x * x + y * y)
        if (magnitude === 0) {
            this.x = 0
            this.y = 0
        } else {
            this.x = x / magnitude
            this.y = y / magnitude
        }
    }

    // Calculate the magnitude of the vector
    get magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    // Calculate dot product with another vector
    dot(other: Vector2D): number {
        return this.x * other.x + this.y * other.y
    }

    avg(others: AveragableObj[]): AveragableObj {
        if (!others || others.length === 0) return this

        const vectors = [this, ...others] as Vector2D[]

        return new Vector2D(
            average(vectors.map(getProperty<Vector2D, "x">("x"))),
            average(vectors.map(getProperty<Vector2D, "y">("y"))),
        )
    }
}

Deno.test("Vector2D.avg averages normalized vectors correctly", () => {
    // Create unit vectors in different directions
    const v1 = new Vector2D(1, 0) // Unit vector along x-axis
    const v2 = new Vector2D(0, 1) // Unit vector along y-axis

    // Average them
    const avgResult = v1.avg([v2]) as Vector2D

    // Expected: 1/√2 in both x and y (≈ 0.7071)
    // Since we're averaging [1,0] and [0,1], and then normalizing
    const expectedValue = 1 / Math.sqrt(2)

    // Use rounded comparison due to floating point precision
    assertEquals(
        Math.round(avgResult.x * 10000) / 10000,
        Math.round(expectedValue * 10000) / 10000,
        "Vector avg x coordinate should be 1/√2",
    )
    assertEquals(
        Math.round(avgResult.y * 10000) / 10000,
        Math.round(expectedValue * 10000) / 10000,
        "Vector avg y coordinate should be 1/√2",
    )
})

Deno.test("Vector2D normalizes vectors correctly", () => {
    // Test case 1: Standard vector
    const v1 = new Vector2D(3, 4)
    assertEquals(
        v1.magnitude,
        1,
        "Vector magnitude should be 1 after normalization",
    )
    assertEquals(v1.x, 3 / 5, "X component should be 3/5")
    assertEquals(v1.y, 4 / 5, "Y component should be 4/5")

    // Test case 2: Already normalized vector
    const v2 = new Vector2D(1, 0)
    assertEquals(v2.magnitude, 1, "Unit vector magnitude should remain 1")
    assertEquals(v2.x, 1, "X component should be 1")
    assertEquals(v2.y, 0, "Y component should be 0")

    // Test case 3: Large values
    const v3 = new Vector2D(1000, 1000)
    assertEquals(
        Math.round(v3.magnitude * 10000) / 10000,
        1,
        "Large vector should normalize to magnitude 1",
    )
    assertEquals(
        Math.round(v3.x * 10000) / 10000,
        Math.round((1 / Math.sqrt(2)) * 10000) / 10000,
        "X component should be 1/√2",
    )

    // Test case 4: Zero vector
    const v4 = new Vector2D(0, 0)
    assertEquals(v4.magnitude, 0, "Zero vector should have magnitude 0")
    assertEquals(v4.x, 0, "X component should be 0")
    assertEquals(v4.y, 0, "Y component should be 0")
})

Deno.test("Vector2D.avg handles edge cases correctly", () => {
    // Test case 1: Averaging with empty array
    const v1 = new Vector2D(1, 0)
    const avgEmpty = v1.avg([]) as Vector2D
    assertEquals(
        avgEmpty.x,
        v1.x,
        "Averaging with empty array should return the original vector's x",
    )
    assertEquals(
        avgEmpty.y,
        v1.y,
        "Averaging with empty array should return the original vector's y",
    )

    // Test case 2: Averaging same vector
    const v2 = new Vector2D(0, 1)
    const avgSame = v2.avg([v2, v2]) as Vector2D
    assertEquals(
        avgSame.x,
        0,
        "Averaging same vector should maintain direction",
    )
    assertEquals(
        avgSame.y,
        1,
        "Averaging same vector should maintain direction",
    )

    // Test case 3: Averaging opposite vectors
    const v3 = new Vector2D(1, 0)
    const v3Opposite = new Vector2D(-1, 0)
    const avgOpposite = v3.avg([v3Opposite]) as Vector2D
    assertEquals(
        avgOpposite.x,
        0,
        "Averaging opposite vectors should result in zero x",
    )
    assertEquals(
        avgOpposite.y,
        0,
        "Averaging opposite vectors should result in zero y",
    )
})

Deno.test("Vector2D dot product works correctly", () => {
    // Dot product of perpendicular vectors should be 0
    const vHorizontal = new Vector2D(1, 0)
    const vVertical = new Vector2D(0, 1)
    assertEquals(
        vHorizontal.dot(vVertical),
        0,
        "Perpendicular vectors should have dot product of 0",
    )

    // Dot product of parallel vectors should be 1 (since they're normalized)
    const v1 = new Vector2D(3, 4) // Will be normalized to [0.6, 0.8]
    const v2 = new Vector2D(6, 8) // Will also be normalized to [0.6, 0.8]
    assertEquals(
        Math.round(v1.dot(v2) * 10000) / 10000,
        1,
        "Parallel vectors should have dot product of 1",
    )

    // Dot product of opposite vectors should be -1
    const v3 = new Vector2D(1, 1)
    const v3Opposite = new Vector2D(-1, -1)
    assertEquals(
        Math.round(v3.dot(v3Opposite) * 10000) / 10000,
        -1,
        "Opposite vectors should have dot product of -1",
    )

    // Dot product with self should be 1 (for non-zero vectors)
    const v4 = new Vector2D(5, 12)
    assertEquals(
        Math.round(v4.dot(v4) * 10000) / 10000,
        1,
        "Dot product with self should be 1",
    )
})

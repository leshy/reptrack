import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"
import { GenericTransform, pipe } from "./transform.ts"
import { AveragableNumber } from "./averagable_number.ts"
import { Vector2D } from "./vector2d.ts"

// Main transform test file - most tests have been moved to specific test files
// This file demonstrates how to use the pipe() helper with different types

Deno.test("Complex transform chains with pipe()", () => {
    // Test with AveragableNumber
    const addFive: GenericTransform<AveragableNumber> = (num) => {
        return new AveragableNumber(num.value + 5)
    }

    const multiplyByTwo: GenericTransform<AveragableNumber> = (num) => {
        return new AveragableNumber(num.value * 2)
    }

    const subtractThree: GenericTransform<AveragableNumber> = (num) => {
        return new AveragableNumber(num.value - 3)
    }

    const num = new AveragableNumber(10)

    // Chain multiple transforms using pipe
    const result = pipe<AveragableNumber>(
        addFive, // 10 + 5 = 15
        multiplyByTwo, // 15 * 2 = 30
        subtractThree, // 30 - 3 = 27
    )(num)

    assertEquals(result?.value, 27, "Transforms should be applied in order")

    // Test with Vector2D
    const scale: GenericTransform<Vector2D> = (v) => {
        return new Vector2D(v.x * 2, v.y * 2)
    }

    const translate: GenericTransform<Vector2D> = (v) => {
        return new Vector2D(v.x + 1, v.y + 1)
    }

    const rotate90Degrees: GenericTransform<Vector2D> = (v) => {
        // Simple 90-degree rotation
        return new Vector2D(-v.y, v.x)
    }

    const vector = new Vector2D(1, 2)

    // Chain vector transforms
    const transformedVector = pipe<Vector2D>(
        scale, // (2, 4)
        translate, // (3, 5)
        rotate90Degrees, // (-5, 3)
    )(vector)

    assertEquals(
        transformedVector?.x,
        -5,
        "Vector x transform should be correct",
    )
    assertEquals(
        transformedVector?.y,
        3,
        "Vector y transform should be correct",
    )

    // Test with primitive numbers
    const add10 = (n: number) => n + 10
    const double = (n: number) => n * 2
    const negate = (n: number) => -n

    const numPipe = pipe<number>(add10, double, negate)
    const numResult = numPipe(5)

    assertEquals(
        numResult,
        -30,
        "Number transforms: (5 + 10) * 2 = 30, then negate to -30",
    )
})

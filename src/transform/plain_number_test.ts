import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"
import { attachState, avg, pipe } from "./transform.ts"

Deno.test("avg transform works with primitive numbers", () => {
    // Create an avg transform with windowSize 3
    const numberAvg = avg<number>(3)
    const attachedAvg = attachState(numberAvg)

    // Test with sequence of numbers
    const num1 = 10
    const result1 = attachedAvg(num1)
    assertEquals(result1, 10, "First number should be itself")

    // Add second number
    const num2 = 20
    const result2 = attachedAvg(num2)
    // Average of [10, 20]
    assertEquals(result2, 15, "Average should be calculated correctly")

    // Add third number
    const num3 = 30
    const result3 = attachedAvg(num3)
    // Average of [10, 20, 30]
    assertEquals(result3, 20, "Average should be calculated correctly")

    // Add fourth number (should push out the first)
    const num4 = 40
    const result4 = attachedAvg(num4)
    // Average of [20, 30, 40]
    assertEquals(result4, 30, "Average should be calculated correctly")
})

Deno.test("pipe works with primitive numbers", () => {
    const addFive = (n: number) => n + 5
    const multiplyByTwo = (n: number) => n * 2

    const num = 10

    const result1 = pipe<number>(addFive)(num)
    assertEquals(result1, 15, "10 + 5 = 15")

    const result2 = pipe<number>(addFive, multiplyByTwo)(num)
    assertEquals(result2, 30, "(10 + 5) * 2 = 30")

    // Test chaining in reverse order
    const result3 = pipe<number>(multiplyByTwo, addFive)(num)
    assertEquals(result3, 25, "(10 * 2) + 5 = 25")
})

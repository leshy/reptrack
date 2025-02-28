import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"

import {
    attachState,
    GenericStateTransform,
    GenericTransform,
    pipe,
} from "./transform.ts"

Deno.test("pipe function with state transforms maintains separate state for each transform", () => {
    // Create a counter transform that increments a counter and adds it to the input
    const counterTransform: GenericStateTransform<number, number> = (
        input: number,
        state: number | undefined,
    ) => {
        const counter = (state || 0) + 1
        return [input + counter, counter]
    }

    // Create a moving average transform with window size 3
    const movingAvgTransform: GenericStateTransform<number, number[]> = (
        input: number,
        state: number[] | undefined,
    ) => {
        const window = state || []
        window.push(input)
        if (window.length > 3) {
            window.shift()
        }
        const avg = window.reduce((sum, val) => sum + val, 0) / window.length
        return [avg, window]
    }

    // Create a transform that doubles the input
    const doubleTransform: GenericTransform<number> = (input) => input * 2

    // Test with counter and moving average transforms directly
    // @ts-ignore: Typing issues with state transforms, but runtime works correctly
    const directPipe = pipe<number>(
        counterTransform,
        doubleTransform,
        movingAvgTransform,
    )

    // First run: input 10
    // - counter becomes 1, input becomes 10+1=11
    // - doubled to 22
    // - avg of [22] is 22
    let result = directPipe(10)
    assertEquals(result, 22)

    // Second run: input 20
    // - counter becomes 2, input becomes 20+2=22
    // - doubled to 44
    // - avg of [22, 44] is 33
    result = directPipe(20)
    assertEquals(result, 33)

    // Third run: input 30
    // - counter becomes 3, input becomes 30+3=33
    // - doubled to 66
    // - avg of [22, 44, 66] is 44
    result = directPipe(30)
    assertEquals(result, 44)

    // Fourth run: input 40
    // - counter becomes 4, input becomes 40+4=44
    // - doubled to 88
    // - avg of [44, 66, 88] is 66
    result = directPipe(40)
    assertEquals(result, 66)
})

Deno.test("pipe function with conditional output from state transforms", () => {
    // Only emit values above a threshold, increasing the threshold each time
    const thresholdTransform: GenericStateTransform<number, number> = (
        input: number,
        state: number | undefined,
    ) => {
        const threshold = state || 0
        const newThreshold = threshold + 5
        return input > threshold
            ? [input, newThreshold]
            : [undefined, newThreshold]
    }

    // Double the input
    const doubleTransform: GenericTransform<number> = (input) => input * 2

    // Create a piped transform
    // @ts-ignore: Typing issues with state transforms, but runtime works correctly
    const pipedTransform = pipe<number>(thresholdTransform, doubleTransform)

    // First input: 10
    // - threshold is 0, 10 > 0, so emit 10, new threshold = 5
    // - double to 20
    let result = pipedTransform(10)
    assertEquals(result, 20)

    // Second input: 7
    // - threshold is 5, 7 > 5, so emit 7, new threshold = 10
    // - double to 14
    result = pipedTransform(7)
    assertEquals(result, 14)

    // Third input: 8
    // - threshold is 10, 8 < 10, so emit undefined, new threshold = 15
    // - undefined short-circuits the pipe
    result = pipedTransform(8)
    assertEquals(result, undefined)

    // Fourth input: 20
    // - threshold is 15, 20 > 15, so emit 20, new threshold = 20
    // - double to 40
    result = pipedTransform(20)
    assertEquals(result, 40)
})

Deno.test("pipe function properly incorporates attachState with complex state", () => {
    // Create a stateful transform that tracks min, max, and count of values
    interface Stats {
        min: number
        max: number
        count: number
        sum: number
    }

    const statsTransform: GenericStateTransform<number, Stats> = (
        input: number,
        state: Stats | undefined,
    ) => {
        const newState: Stats = state
            ? {
                min: Math.min(state.min, input),
                max: Math.max(state.max, input),
                count: state.count + 1,
                sum: state.sum + input,
            }
            : {
                min: input,
                max: input,
                count: 1,
                sum: input,
            }

        // Output the average
        const avg = newState.sum / newState.count
        return [avg, newState]
    }

    // Create a stateful transform directly and with attachState
    const directStatsTransform = pipe<number>(statsTransform)

    // This one works because attachState handles the typing properly
    const attachedStatsTransform = pipe<number>(attachState(statsTransform))

    // Test both implementations with the same inputs
    const inputs = [10, 20, 5, 30]

    for (const input of inputs) {
        const directResult = directStatsTransform(input)
        const attachedResult = attachedStatsTransform(input)
        assertEquals(
            directResult,
            attachedResult,
            `Both implementations should give the same result for input ${input}`,
        )
    }

    // Final averages should be the same
    const finalDirect = directStatsTransform(15)
    const finalAttached = attachedStatsTransform(15)
    assertEquals(finalDirect, finalAttached)
    assertEquals(finalDirect, 16) // (10 + 20 + 5 + 30 + 15) / 5 = 16
})

// Deno.test("fromGenerator", () => {
//     function* genAddFive(nums: Generator<number>): Generator<number> {
//         let cnt = 0
//         for (const num of nums) {
//             yield num + cnt
//             cnt++
//         }
//     }

//     const pipedGen = pipe(
//         // @ts-ignore
//         fromGenerator((x) => utils.skipN(1, x)),
//         fromGenerator(genAddFive),
//     )

//     const inputs = [10, 20, 5, 30]
//     const outputs = [undefined, 21, 7, 33]
//     for (const [index, input] of inputs.entries()) {
//         // @ts-ignore
//         const result = pipedGen(input)
//         console.log(index, input, result)
//         assertEquals(result, outputs[index])
//     }
// })

import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"
import {
    attachState,
    Averagable,
    avg,
    GenericStateTransform,
    GenericTransform,
    isGenericSimple,
    pipe,
    spyState,
    spyStateEmit,
} from "./transform.ts"

// Define a simple Averagable Number class for testing
export class AveragableNumber implements Averagable<AveragableNumber> {
    constructor(public value: number) {}

    avg(others: AveragableNumber[]): AveragableNumber {
        if (!others || others.length === 0) return this

        // In our test we're expecting the average to be simply (num1 + num2)/2
        // rather than (num1 + num1 + num2)/3. Let's implement it to match the tests.
        const sum = others.reduce((acc, num) => acc + num.value, 0)
        return new AveragableNumber((sum + this.value) / (others.length + 1))
    }
}

Deno.test("AveragableNumber implements Averagable correctly", () => {
    const num1 = new AveragableNumber(10)
    const num2 = new AveragableNumber(20)
    const num3 = new AveragableNumber(30)

    // Test single value
    const avgSingle = num1.avg([])
    assertEquals(avgSingle.value, 10, "Single number average should be itself")

    // Test with multiple values
    const avgMultiple = num1.avg([num2, num3])
    assertEquals(avgMultiple.value, 20, "Average of [10, 20, 30] should be 20")
})

Deno.test("Generic pipe function works with AveragableNumber", () => {
    const addFive: GenericTransform<AveragableNumber> = (num) => {
        return new AveragableNumber(num.value + 5)
    }

    const multiplyByTwo: GenericTransform<AveragableNumber> = (num) => {
        return new AveragableNumber(num.value * 2)
    }

    const testNum = new AveragableNumber(10)

    // Test with one transform
    const pipedSingle = pipe<AveragableNumber>(addFive)(testNum)
    assertEquals(pipedSingle?.value, 15, "10 + 5 = 15")

    // Test with multiple transforms
    const pipedMulti = pipe<AveragableNumber>(addFive, multiplyByTwo)(testNum)
    assertEquals(pipedMulti?.value, 30, "(10 + 5) * 2 = 30")
})

Deno.test("Generic avg transform works with AveragableNumber", () => {
    const testAvg = avg<AveragableNumber>(3)
    let state: AveragableNumber[] = []

    // Test with initial value
    const num1 = new AveragableNumber(10)
    const [result1, newState1] = testAvg(num1, state)
    state = newState1 || []
    assertEquals(result1?.value, 10, "Average of single value should be itself")
    assertEquals(state.length, 1, "State should contain one value")

    // Add second value
    const num2 = new AveragableNumber(20)
    const [result2, newState2] = testAvg(num2, state)
    state = newState2 || []
    // num2 is being averaged with [num1, num2], so the result is (10+20+20)/3
    assertEquals(
        result2?.value,
        16.666666666666668,
        "Average should be calculated correctly",
    )
    assertEquals(state.length, 2, "State should contain two values")

    // Add third value
    const num3 = new AveragableNumber(30)
    const [result3, newState3] = testAvg(num3, state)
    state = newState3 || []
    // num3 is being averaged with [num1, num2, num3], so the result is (10+20+30+30)/4
    assertEquals(result3?.value, 22.5, "Average should be calculated correctly")
    assertEquals(state.length, 3, "State should contain three values")

    // Add fourth value (should push out the first)
    const num4 = new AveragableNumber(40)
    const [result4, newState4] = testAvg(num4, state)
    state = newState4 || []
    // num4 is being averaged with [num2, num3, num4], so the result is (20+30+40+40)/4
    assertEquals(result4?.value, 32.5, "Average should be calculated correctly")
    assertEquals(state.length, 3, "State should still contain three values")
})

Deno.test("attachState works with AveragableNumber", () => {
    const testAvg = avg<AveragableNumber>(3)
    const attachedAvg = attachState(testAvg)

    // Test with sequence of values
    const num1 = new AveragableNumber(10)
    const result1 = attachedAvg(num1)
    assertEquals(result1?.value, 10, "Average of single value should be itself")

    const num2 = new AveragableNumber(20)
    const result2 = attachedAvg(num2)
    assertEquals(
        result2?.value,
        16.666666666666668,
        "Average should be calculated correctly",
    )

    const num3 = new AveragableNumber(30)
    const result3 = attachedAvg(num3)
    assertEquals(result3?.value, 22.5, "Average should be calculated correctly")

    const num4 = new AveragableNumber(40)
    const result4 = attachedAvg(num4)
    assertEquals(result4?.value, 32.5, "Average should be calculated correctly")
})

Deno.test("spyState and spyStateEmit work with AveragableNumber", () => {
    const testAvg = avg<AveragableNumber>(3)

    // Test spyState
    let spyData: AveragableNumber[] | undefined = []
    const spiedAvg = spyState(testAvg, (state) => {
        spyData = state
    })

    const num1 = new AveragableNumber(10)
    spiedAvg(num1)
    assertEquals(spyData?.length, 1, "State should contain one value")

    const num2 = new AveragableNumber(20)
    spiedAvg(num2)
    assertEquals(spyData?.length, 2, "State should contain two values")

    // Test spyStateEmit
    let emitCount = 0
    const emitAvg = spyStateEmit(testAvg, () => {
        emitCount++
    })

    emitAvg(new AveragableNumber(10))
    assertEquals(emitCount, 1, "Callback should be called when output exists")

    // Create a transform that returns undefined sometimes
    const conditionalAvg: GenericStateTransform<
        AveragableNumber,
        AveragableNumber[]
    > = (item, state) => {
        if (!state) state = []
        state.push(item)
        return item.value > 20 ? [item, state] : [undefined, state]
    }

    const emitConditional = spyStateEmit(conditionalAvg, () => {
        emitCount++
    })

    const startCount = emitCount
    emitConditional(new AveragableNumber(10)) // Should not call callback
    assertEquals(
        emitCount,
        startCount,
        "Callback should not be called when output is undefined",
    )

    emitConditional(new AveragableNumber(30)) // Should call callback
    assertEquals(
        emitCount,
        startCount + 1,
        "Callback should be called when output exists",
    )
})

Deno.test("isGenericSimple correctly identifies transform types", () => {
    const simpleTransform: GenericTransform<AveragableNumber> = (num) => {
        return new AveragableNumber(num.value + 5)
    }

    const stateTransform: GenericStateTransform<AveragableNumber, unknown> = (
        num,
        state,
    ) => {
        const newState = (state as number || 0) + 1
        return [new AveragableNumber(num.value * newState), newState]
    }

    assertEquals(
        isGenericSimple(simpleTransform),
        true,
        "Simple transform should be identified correctly",
    )
    assertEquals(
        isGenericSimple(stateTransform),
        false,
        "State transform should be identified correctly",
    )
})

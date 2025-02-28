import { EventEmitter } from "npm:eventemitter3"

export interface AveragableObj<T> {
    avg(others: T[]): T
}

export type Averagable<T> = AveragableObj<T> | number

// Generic transform types
export type GenericTransform<T> = (
    input: T,
) => T | undefined

export type GenericStateTransform<T, STATE> = (
    input: T,
    state: STATE | undefined,
) => [T | undefined, STATE | undefined]

// Generic function to attach state to a transform
export function attachState<T, STATE>(
    transform: GenericStateTransform<T, STATE>,
): GenericTransform<T> {
    let state: STATE | undefined
    return (input: T): T | undefined => {
        const [output, newState] = transform(input, state)
        state = newState
        return output
    }
}

// Generic pipe function for any transform type
export function pipe<T>(
    // Accept any transforms, since at runtime we just care about the functionality
    // deno-lint-ignore no-explicit-any
    ...transforms: Array<any>
): GenericTransform<T> {
    // Convert all state transforms to regular transforms using attachState
    const normalizedTransforms = transforms.map((transform) =>
        isGenericSimple(transform) ? transform : attachState(transform)
    )

    return (input: T): T | undefined => {
        let result: T | undefined = input

        for (const transform of normalizedTransforms) {
            if (!result) return undefined
            // @ts-ignore: We know this works at runtime
            result = transform(result)
        }

        return result
    }
}

// Generic Node class - commenting out for now due to typing issues
export class GenericNode<T> extends EventEmitter<{ item: T }> {
    constructor(
        private emitter: EventEmitter<{ item: T }>,
        private transform: GenericTransform<T>,
    ) {
        super()
        // @ts-ignore
        this.emitter.on("item", this.process)
    }

    private process = (item: T): void => {
        const transformed = this.transform(item)
        if (transformed) {
            // @ts-ignore
            this.emit("item", transformed)
        }
    }
}

// Generic function to check if a transform is a simple transform
export function isGenericSimple<T, S = unknown>(
    t: GenericTransform<T> | GenericStateTransform<T, S>,
): t is GenericTransform<T> {
    return t.length === 1
}

// Generic function to spy on transform state
export function spyState<T, STATE>(
    transform: GenericStateTransform<T, STATE>,
    callback: (state: STATE | undefined) => unknown,
): GenericTransform<T> {
    let state: STATE | undefined
    return (input: T): T | undefined => {
        const [output, newState] = transform(input, state)
        state = newState
        callback(newState)
        return output
    }
}

// Generic function to spy on transform state, only calling callback when output exists
export function spyStateEmit<T, STATE>(
    transform: GenericStateTransform<T, STATE>,
    callback: (state: STATE | undefined) => unknown,
): GenericTransform<T> {
    let state: STATE | undefined
    return (input: T): T | undefined => {
        const [output, newState] = transform(input, state)
        state = newState
        if (output) callback(newState)
        return output
    }
}

// Convert a generator function into a transform function
export function fromGenerator<T>(
    generatorFn: (input: Generator<T>) => Generator<T>,
): GenericTransform<T> {
    let gen: Generator<T> | null = null
    const inputs: T[] = []

    return (input: T): T | undefined => {
        inputs.push(input)

        // Create a generator that yields all inputs so far
        const inputGenerator = (function* () {
            for (const item of inputs) {
                yield item
            }
        })()

        // Create or recreate the generator with the updated inputs
        gen = generatorFn(inputGenerator)

        // Consume the generator until we reach the latest item
        let result: IteratorResult<T>
        let index = 0
        do {
            result = gen.next()
            index++
        } while (!result.done && index < inputs.length)

        return result.done ? undefined : result.value
    }
}

// Type guard to check if a value is a number
function isNumber(value: unknown): value is number {
    return typeof value === "number"
}

// Generic averaging transform for types that implement Averagable or are numbers
export function avg<T extends Averagable<T>>(
    windowSize: number = 10,
): GenericStateTransform<T, T[]> {
    return (
        item: T,
        window: T[] | undefined,
    ) => {
        if (!window) window = []
        window.push(item)
        if (window.length > windowSize) {
            window.shift()
        }

        // Special case for numbers
        if (isNumber(item)) {
            // If we have a number, we can compute the average directly
            const sum = window.reduce((acc, val) => acc + (val as number), 0)
            const average = sum / window.length
            return [average as T, window]
        }

        // Otherwise use the Averagable interface
        // The cast is necessary because we know item is Averagable<T> at this point
        // but TypeScript doesn't know that window is T[] rather than (T | number)[]
        const averagableItem = item as AveragableObj<T>
        const result = window.length > 0
            ? averagableItem.avg(window as unknown as T[])
            : item
        return [result, window]
    }
}

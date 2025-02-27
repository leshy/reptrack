import { EventEmitter } from "npm:eventemitter3"

export interface Averagable<T> {
    avg(others: T[]): T
}

// Generic transform types
export type GenericTransform<T> = (
    input: T,
) => T | undefined

export type GenericStateTransform<T, STATE> = (
    input: T,
    state: STATE | undefined,
) => [T | undefined, STATE | undefined]

// Generic pipe function for any transform type
export function pipe<T>(
    ...transforms: GenericTransform<T>[]
): GenericTransform<T> {
    return (input: T): T | undefined => {
        let result: T | undefined = input
        for (const transform of transforms) {
            result = transform(result)
            if (!result) return undefined
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
export function isGenericSimple<T>(
    t: GenericTransform<T> | GenericStateTransform<T, unknown>,
): t is GenericTransform<T> {
    return t.length === 1
}

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

// Generic averaging transform for types that implement Averagable
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
        const result = window.length > 0 ? item.avg(window) : item
        return [result, window]
    }
}

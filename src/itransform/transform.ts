import { Averagable, average } from "../types/mod.ts"

export type Transform<X, Y> = (input: Iterable<X>) => Iterable<Y>

// data generators
export function* range(
    min: number,
    max: number,
): Iterable<number> {
    for (let i = min; i <= max; i++) {
        yield i
    }
}

// transforms
export function smooth(windowSize: number): Transform<Averagable, Averagable>
export function smooth(
    windowSize: number,
    input: Iterable<Averagable>,
): Iterable<Averagable>
export function smooth(
    windowSize: number,
    input?: Iterable<Averagable>,
): Transform<Averagable, Averagable> | Iterable<Averagable> {
    const smoothFn = function* (
        input: Iterable<Averagable>,
    ): Iterable<Averagable> {
        const window: Averagable[] = []

        for (const item of input) {
            window.push(item)
            if (window.length > windowSize) {
                window.shift()
            }
            // @ts-ignore
            yield average(window)
        }
    }

    if (input === undefined) {
        return smoothFn
    }
    return smoothFn(input)
}

// skip N elements
export function skip<T>(n: number): Transform<T, T>
export function skip<T>(n: number, input: Iterable<T>): Iterable<T>
export function skip<T>(
    n: number,
    input?: Iterable<T>,
): Transform<T, T> | Iterable<T> {
    const skipFn = function* (input: Iterable<T>): Iterable<T> {
        let cnt = 0
        for (const item of input) {
            if (cnt < n) {
                cnt++
            } else {
                yield item
            }
        }
    }

    if (input === undefined) {
        return skipFn
    }
    return skipFn(input)
}

export function map<T, U>(fn: (item: T) => U): Transform<T, U>
export function map<T, U>(fn: (item: T) => U, input: Iterable<T>): Iterable<U>
export function map<T, U>(
    fn: (item: T) => U,
    input?: Iterable<T>,
): Transform<T, U> | Iterable<U> {
    const mapFn = function* (input: Iterable<T>): Iterable<U> {
        for (const item of input) {
            yield fn(item)
        }
    }

    if (input === undefined) {
        return mapFn
    }
    return mapFn(input)
}

// just for chunk implementation below
export function mutableClear<T>(array: T[]): T[] {
    const copy = [...array]
    array.length = 0
    return copy
}

export function chunk<T>(windowSize: number): Transform<T, T[]>
export function chunk<T>(windowSize: number, input: Iterable<T>): Iterable<T[]>
export function chunk<T>(
    windowSize: number,
    input?: Iterable<T>,
): Transform<T, T[]> | Iterable<T[]> {
    const chunkFn = function* (input: Iterable<T>): Iterable<T[]> {
        const window: T[] = []
        for (const item of input) {
            window.push(item)
            if (window.length == windowSize) {
                yield mutableClear(window)
            }
        }
    }

    if (input === undefined) {
        return chunkFn
    }
    return chunkFn(input)
}

export function pipe<A, B, C>(
    t1: Transform<A, B>,
    t2: Transform<B, C>,
): Transform<A, C>
export function pipe<A, B, C, D>(
    t1: Transform<A, B>,
    t2: Transform<B, C>,
    t3: Transform<C, D>,
): Transform<A, D>
export function pipe<A, B, C, D, E>(
    t1: Transform<A, B>,
    t2: Transform<B, C>,
    t3: Transform<C, D>,
    t4: Transform<D, E>,
): Transform<A, E>
export function pipe(
    // deno-lint-ignore no-explicit-any
    ...transforms: Transform<any, any>[]
    // deno-lint-ignore no-explicit-any
): Transform<any, any> {
    // deno-lint-ignore no-explicit-any
    return (input: Iterable<any>): Iterable<any> => {
        let result = input
        for (const transform of transforms) {
            result = transform(result)
        }
        return result
    }
}

import { AnyArray, Averagable, average, TypedArray } from "../types/mod.ts"

export type Transform<X, Y> = (input: Iterable<X>) => Iterable<Y>

// this is so fucking stupid
export function join<A, B, C>(
    t1: Transform<A, B>,
    t2: Transform<B, C>,
): Transform<A, C>
export function join<A, B, C, D>(
    t1: Transform<A, B>,
    t2: Transform<B, C>,
    t3: Transform<C, D>,
): Transform<A, D>
export function join<A, B, C, D, E>(
    t1: Transform<A, B>,
    t2: Transform<B, C>,
    t3: Transform<C, D>,
    t4: Transform<D, E>,
): Transform<A, E>
export function join(
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

// unbeliveable
export function pipe<A, B>(
    i: Iterable<A>,
    t1: Transform<A, B>,
): Iterable<B>

export function pipe<A, B, C>(
    i: Iterable<A>,
    t1: Transform<A, B>,
    t2: Transform<B, C>,
): Iterable<C>

export function pipe<A, B, C, D>(
    i: Iterable<A>,
    t1: Transform<A, B>,
    t2: Transform<B, C>,
    t3: Transform<C, D>,
): Iterable<D>

export function pipe<A, B, C, D, E>(
    i: Iterable<A>,
    t1: Transform<A, B>,
    t2: Transform<B, C>,
    t3: Transform<C, D>,
    t4: Transform<D, E>,
): Iterable<E>

export function pipe<A, B, C, D, E, F>(
    i: Iterable<A>,
    t1: Transform<A, B>,
    t2: Transform<B, C>,
    t3: Transform<C, D>,
    t4: Transform<D, E>,
    t5: Transform<E, F>,
): Iterable<F>

export function* pipe<X, Y>(
    iterable: Iterable<X>,
    ...transforms: Transform<unknown, unknown>[]
): Iterable<Y> {
    // @ts-ignore
    for (const item of join(...transforms)(iterable)) {
        yield item as Y
    }
}

// data generators
export function* range(start: number, end: number): Generator<number> {
    for (let i = start; i < end; i++) {
        yield i
    }
}

// transforms
export const smooth = (
    windowSize: number,
): Transform<Averagable, Averagable> =>
    function* (
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

// skip N elements
export const skip = <T>(n: number): Transform<T, T> =>
    function* (input: Iterable<T>): Iterable<T> {
        let cnt = 0
        for (const item of input) {
            if (cnt < n) {
                cnt++
            } else {
                yield item
            }
        }
    }

// take N elements
export const take = <T>(n: number): Transform<T, T> =>
    function* (input: Iterable<T>): Iterable<T> {
        let cnt = 0
        for (const item of input) {
            if (cnt < n) {
                cnt++
                yield item
            } else break
        }
    }

export const map = <T, U>(fn: (item: T) => U): Transform<T, U> =>
    function* (input: Iterable<T>): Iterable<U> {
        for (const item of input) {
            yield fn(item)
        }
    }

// just for chunk implementation below
export function mutableClear<T>(array: T[]): T[] {
    const copy = [...array]
    array.length = 0
    return copy
}

export const chunk = <T>(windowSize: number): Transform<T, T[]> =>
    function* (input: Iterable<T>): Iterable<T[]> {
        const window: T[] = []
        for (const item of input) {
            window.push(item)
            if (window.length == windowSize) {
                yield mutableClear(window)
            }
        }
    }

export const copy = <T>(array: AnyArray<T>): Transform<T, T> =>
    function* (input: Iterable<T>): Iterable<T> {
        let index = 0
        for (const item of input) {
            array[index++] = item
            yield item
        }
    }

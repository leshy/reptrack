import { Averagable, average } from "../types/mod.ts"

export type Transform<T> = (input: Iterable<T>) => Iterable<T>

export function smooth(
    windowSize: number = 10,
): Transform<Averagable> {
    return function* (input: Iterable<Averagable>): Iterable<Averagable> {
        const window: Averagable[] = []

        for (const item of input) {
            window.push(item)
            if (window.length > windowSize) {
                window.shift()
            }
            yield average(window)
        }
    }
}

export function* range(
    min: number,
    max: number,
): Iterable<number> {
    for (let i = min; i <= max; i++) {
        yield i
    }
}

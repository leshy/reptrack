export function* range(start: number, end: number): Generator<number> {
    for (let i = start; i < end; i++) {
        yield i
    }
}

export function* filter<T>(
    predicate: (item: T) => boolean,
    iter: Iterable<T>,
): Iterable<T> {
    for (const item of iter) {
        if (predicate(item)) {
            yield item
        }
    }
}

export function* map<T, U>(
    fn: (item: T) => U,
    iter: Iterable<T>,
): Iterable<U> {
    for (const item of iter) {
        yield fn(item)
    }
}

export function aget<T extends unknown[], I extends keyof T>(index: I) {
    return (arr: T): T[I] => arr[index]
}

export function negate<T>(fn: (item: T) => boolean) {
    return (item: T) => !fn(item)
}

export function compose<T, U, V>(
    fn1: (item: T) => U,
    fn2: (item: U) => V,
): (item: T) => V {
    return (item: T) => fn2(fn1(item))
}

export function* takeN<T>(
    n: number,
    iterator: Iterable<T>,
): Iterable<T> {
    for (const item of iterator) {
        if (n <= 0) break
        yield item
        n--
    }
}

export function* skipN<T>(
    n: number,
    iterator: Iterable<T>,
): Iterable<T> {
    for (const item of iterator) {
        if (n > 0) {
            n--
            continue
        }
        yield item
    }
}

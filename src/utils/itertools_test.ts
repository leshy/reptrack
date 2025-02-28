import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import {
    aget,
    compose,
    filter,
    map,
    negate,
    range,
    skipN,
    takeN,
} from "./itertools.ts"

Deno.test("range function generates correct sequence", () => {
    const result = [...range(0, 5)]
    assertEquals(result, [0, 1, 2, 3, 4])

    const emptyResult = [...range(5, 5)]
    assertEquals(emptyResult, [])

    const negativeResult = [...range(-3, 2)]
    assertEquals(negativeResult, [-3, -2, -1, 0, 1])
})

Deno.test("filter function correctly filters iterable", () => {
    const isEven = (n: number): boolean => n % 2 === 0
    const numbers = range(0, 10)

    const result = [...filter(isEven, numbers)]
    assertEquals(result, [0, 2, 4, 6, 8])

    const noMatchResult = [...filter((n) => n > 10, numbers)]
    assertEquals(noMatchResult, [])
})

Deno.test("map function correctly transforms iterable", () => {
    const double = (n: number): number => n * 2
    const numbers = range(1, 6)

    // Convert to array before passing to map
    const result = [...map(double, numbers)]
    assertEquals(result, [2, 4, 6, 8, 10])

    // Create a new generator for string mapping
    const stringResult = [...map((n) => `num${n}`, range(1, 6))]
    assertEquals(stringResult, ["num1", "num2", "num3", "num4", "num5"])
})

Deno.test("aget function correctly returns array accessor", () => {
    const getFirst = aget(0)
    const getSecond = aget(1)

    const arr = [10, 20, 30]
    assertEquals(getFirst(arr), 10)
    assertEquals(getSecond(arr), 20)

    type Person = [string, number, boolean]
    const getName = aget<Person, 0>(0)
    const getAge = aget<Person, 1>(1)
    const person: Person = ["Alice", 30, true]

    assertEquals(getName(person), "Alice")
    assertEquals(getAge(person), 30)
})

Deno.test("negate function correctly negates predicates", () => {
    const isEven = (n: number): boolean => n % 2 === 0
    const isOdd = negate(isEven)

    assertEquals(isEven(2), true)
    assertEquals(isOdd(2), false)

    assertEquals(isEven(3), false)
    assertEquals(isOdd(3), true)

    // Generate fresh iterators for each filter to avoid consuming the same one
    const evenNumbers = [...filter(isEven, range(0, 5))]
    assertEquals(evenNumbers, [0, 2, 4])

    const oddNumbers = [...filter(isOdd, range(0, 5))]
    assertEquals(oddNumbers, [1, 3])
})

Deno.test("compose function correctly chains functions", () => {
    const double = (n: number): number => n * 2
    const addFive = (n: number): number => n + 5

    const doubleThenAddFive = compose(double, addFive)
    const addFiveThenDouble = compose(addFive, double)

    assertEquals(doubleThenAddFive(3), 11) // (3*2) + 5 = 11
    assertEquals(addFiveThenDouble(3), 16) // (3+5) * 2 = 16

    const stringify = (n: number): string => `Number: ${n}`
    const doubleStringify = compose(double, stringify)

    assertEquals(doubleStringify(7), "Number: 14")
})

Deno.test("takeN function correctly limits iterables", () => {
    const numbers = range(0, 100)

    const firstFive = [...takeN(5, numbers)]
    assertEquals(firstFive, [0, 1, 2, 3, 4])

    const tooMany = [...takeN(10, range(0, 5))]
    assertEquals(tooMany, [0, 1, 2, 3, 4])

    const none = [...takeN(0, numbers)]
    assertEquals(none, [])
})

Deno.test("skipN function correctly skips elements", () => {
    const numbers = range(0, 10)

    const skipThree = [...skipN(3, numbers)]
    assertEquals(skipThree, [3, 4, 5, 6, 7, 8, 9])

    const skipAll = [...skipN(20, range(0, 5))]
    assertEquals(skipAll, [])

    const skipNone = [...skipN(0, range(5, 10))]
    assertEquals(skipNone, [5, 6, 7, 8, 9])
})

Deno.test("combining itertools functions", () => {
    // Create a pipeline to get the doubled values of the first 3 odd numbers starting from 5
    const numbers = range(0, 20)
    const isOdd = (n: number): boolean => n % 2 !== 0
    const double = (n: number): number => n * 2

    const oddNumbers = filter(isOdd, numbers)
    const oddNumbersFrom5 = skipN(2, oddNumbers) // Skip 1 and 3 to start from 5
    const firstThreeOddFrom5 = takeN(3, oddNumbersFrom5) // Take 5, 7, 9
    const doubledResult = map(double, firstThreeOddFrom5) // Double to 10, 14, 18

    const result = [...doubledResult]
    assertEquals(result, [10, 14, 18])
})

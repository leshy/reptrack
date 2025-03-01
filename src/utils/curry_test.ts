import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { curried } from "./curry.ts"

Deno.test("basic curry", () => {
    const add = curried((a: number, b: number) => a + b)
    const add1 = add(1)
    assertEquals(add1(2), 3)
    assertEquals(add1(3), 4)
    assertEquals(add(2)(3), 5)
})

Deno.test("generator curry", () => {
    const add = curried(
        function* (x: number, iterable: Iterable<number>): Iterable<number> {
            for (const n of iterable) {
                yield x + n
            }
        },
    )

    const add1 = add(1)
    assertEquals(Array.from(add1([2, 3, 4])), [3, 4, 5])
    assertEquals(Array.from(add(1, [2, 3, 4])), [3, 4, 5])
})

Deno.test("multiple partial applications", () => {
    const concat = curried((a: string, b: string, c: string) => a + b + c)
    const withA = concat("A")
    const withAB = withA("B")
    assertEquals(withAB("C"), "ABC")
    assertEquals(concat("X")("Y")("Z"), "XYZ")
})

Deno.test("currying with this context", () => {
    class Calculator {
        base: number

        constructor(base: number) {
            this.base = base
        }

        calculate = curried(function (this: Calculator, a: number, b: number) {
            return this.base + a + b
        })
    }

    const calc = new Calculator(10)
    const calcWith5 = calc.calculate(5)
    assertEquals(calcWith5(3), 18) // 10 + 5 + 3
})

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { curry } from "./curry.ts"

Deno.test("basic curry", () => {
    const add = curry((a: number, b: number) => a + b)
    const add1 = add(1)
    assertEquals(add1(2), 3)
    assertEquals(add1(3), 4)
    assertEquals(add(2)(3), 5)
})

Deno.test("curry generator", () => {
    function* add(x: number, iterable: Iterable<number>): Iterable<number> {
        for (const n of iterable) {
            yield x + n
        }
    }

    const cadd = curry(add)
    const add1 = cadd(1)
    const iter = add1([2, 3, 4])
    assertEquals(Array.from(iter), [3, 4, 5])
})

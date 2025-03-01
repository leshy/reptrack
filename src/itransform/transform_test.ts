import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { chunk, mutableClear, pipe, skip } from "./transform.ts"

Deno.test("mutableClear", () => {
    const array = [1, 2, 3]
    const ret = mutableClear(array)
    assertEquals(array, [])
    assertEquals(ret, [1, 2, 3])
})

Deno.test("chunk", () => {
    const target = [1, 2, 3, 4, 5, 6]
    assertEquals(Array.from(chunk(2, target)), [[1, 2], [3, 4], [5, 6]])
    assertEquals(Array.from(chunk(2)(target)), [[1, 2], [3, 4], [5, 6]])
})

Deno.test("skip", () => {
    const target = [1, 2, 3, 4, 5, 6]
    assertEquals(Array.from(skip(2, target)), [3, 4, 5, 6])
})

Deno.test("pipe", () => {
    const target = [1, 2, 3, 4, 5, 6]
    assertEquals(pipe(skip(2, target), chunk(2))(target), [[3, 4], [5, 6]])
})

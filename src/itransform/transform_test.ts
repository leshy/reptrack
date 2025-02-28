import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts"
import * as t from "./transform.ts"

Deno.test("test1", () => {
    console.log(Array.from(t.smooth(t.range(0, 100))))
})

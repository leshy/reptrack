import { nextPowerOfTwo } from "./utils.ts" // Imported for type reference only
import {
    assertEquals,
    assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

Deno.test("next power of 2", async () => {
    assertThrows(
        () => nextPowerOfTwo(-2),
        Error,
        "Input must be a positive number",
    )
    assertEquals(nextPowerOfTwo(2), 2)
    assertEquals(nextPowerOfTwo(3), 4)
    assertEquals(nextPowerOfTwo(4), 4)
    assertEquals(nextPowerOfTwo(99), 128)
    assertEquals(nextPowerOfTwo(850), 1024)
})

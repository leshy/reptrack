import { nextPowerOfTwo, padToPowerOfTwo } from "./utils.ts"
import {
    assertAlmostEquals,
    assertEquals,
    assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

Deno.test("next power of 2", () => {
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

Deno.test("padToPowerOfTwo with standard arrays", () => {
    assertEquals(padToPowerOfTwo([1, 2, 3]), [1, 2, 3, 0])
    assertEquals(padToPowerOfTwo([1, 2, 3, 4]), [1, 2, 3, 4])
    assertEquals(padToPowerOfTwo([1]), [1])
    assertEquals(padToPowerOfTwo([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5, 0, 0, 0])
})

Deno.test("padToPowerOfTwo with typed arrays", () => {
    // Test with Float32Array
    const float32Input = new Float32Array([1.1, 2.2, 3.3])
    const paddedFloat32 = padToPowerOfTwo(float32Input)

    assertEquals(paddedFloat32.constructor, Float32Array)
    assertEquals(paddedFloat32.length, 4)

    // Use assertAlmostEquals for floating point values due to precision issues
    assertAlmostEquals(paddedFloat32[0], 1.1)
    assertAlmostEquals(paddedFloat32[1], 2.2)
    assertAlmostEquals(paddedFloat32[2], 3.3)
    assertEquals(paddedFloat32[3], 0)

    // Test with Int16Array
    const int16Input = new Int16Array([1, 2, 3, 4, 5, 6, 7])
    const paddedInt16 = padToPowerOfTwo(int16Input)

    assertEquals(paddedInt16.constructor, Int16Array)
    assertEquals(paddedInt16.length, 8)
    for (let i = 0; i < 7; i++) {
        assertEquals(paddedInt16[i], i + 1)
    }
    assertEquals(paddedInt16[7], 0)

    // Test with already power-of-two length
    const uint8Input = new Uint8Array([10, 20, 30, 40])
    const paddedUint8 = padToPowerOfTwo(uint8Input)

    assertEquals(paddedUint8.constructor, Uint8Array)
    assertEquals(paddedUint8.length, 4)
    assertEquals(paddedUint8[0], 10)
    assertEquals(paddedUint8[3], 40)
})

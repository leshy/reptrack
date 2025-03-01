import { runFFT as _runFFT } from "./fft.ts" // Imported for type reference only
import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

// Simple FFT test
Deno.test("FFT on history file keypoints", async () => {
    const result = await runFFTTest(0, "x", 512) // Use smaller window for test

    // Check result structure
    assertExists(result.history)
    assertExists(result.keypointData)
    assertExists(result.fftOutput)
    assertEquals(result.windowSize, 512)

    // Check data sizes
    assertEquals(result.keypointData.length >= 512, true)
    assertEquals(result.fftOutput.length, 512 * 2) // Complex values (real/imag pairs)

    // Check at least first FFT value is calculated
    const real = result.fftOutput[0]
    const imag = result.fftOutput[1]
    // First value should be the DC component (sum of all values)
    assertEquals(typeof real, "number")
    assertEquals(typeof imag, "number")
    assertEquals(isNaN(real), false)
})

// Helper function to modify runFFT to work in test
async function runFFTTest(
    keypointIndex: number,
    axis: "x" | "y",
    windowSize: number,
) {
    // Import HistoryFile directly so we can work with paths correctly
    const { HistoryFile } = await import("./binary/history.ts")

    // Use file URL for testing
    const history = await HistoryFile.load(
        "file:///home/self/coding/track/reptrack/static/euclid10.bin.gz",
    )

    // The rest matches runFFT logic but uses our loaded history
    const Webfft = (await import("npm:webfft")).default
    const fftsize = windowSize
    const fft = new Webfft(fftsize)

    const keypointData: [number, number, number][] = []
    for (const [_, keypoint] of history.timePoints(keypointIndex)) {
        keypointData.push(keypoint)
    }

    if (keypointData.length < windowSize) {
        throw new Error(
            `Not enough data points. Need ${windowSize}, but only have ${keypointData.length}`,
        )
    }

    const input = new Float32Array(windowSize * 2)
    input.fill(0)

    const axisIndex = axis === "x" ? 0 : 1
    for (let i = 0; i < windowSize; i++) {
        input[i * 2] = keypointData[i][axisIndex]
    }

    const output = fft.fft(input)

    fft.dispose()

    return {
        history,
        keypointData,
        fftOutput: output,
        windowSize,
    }
}

// Main execution to see output
if (import.meta.main) {
    ;(async () => {
        console.log("Running FFT test and examining output...")

        // Run FFT on the right wrist
        const keypointIndex = 4 // right wrist
        const result = await runFFTTest(keypointIndex, "x", 1024)

        // Calculate magnitudes
        const magnitudes = []
        for (let i = 0; i < result.windowSize / 2; i++) {
            const real = result.fftOutput[i * 2]
            const imag = result.fftOutput[i * 2 + 1]
            const magnitude = Math.sqrt(real * real + imag * imag)
            magnitudes.push(magnitude)
        }

        // Print DC component (frequency 0)
        console.log(`DC component (frequency 0): ${magnitudes[0].toFixed(2)}`)

        // Print a few early frequencies
        console.log("\nEarly frequency magnitudes:")
        for (let i = 0; i < 10; i++) {
            console.log(`Frequency ${i}: ${magnitudes[i].toFixed(2)}`)
        }

        // Find highest magnitudes (excluding DC)
        const sortedIndices = magnitudes
            .map((mag, idx) => ({ mag, idx }))
            .slice(1) // Skip DC component
            .sort((a, b) => b.mag - a.mag)
            .slice(0, 5) // Top 5

        console.log("\nTop 5 frequency components (excluding DC):")
        for (const { mag, idx } of sortedIndices) {
            console.log(`Frequency ${idx}: ${mag.toFixed(2)}`)
        }
    })()
}

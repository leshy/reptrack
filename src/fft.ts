import Webfft from "npm:webfft"
import { HistoryFile } from "./binary/history.ts"

export async function runFFT(
    keypointIndex: number = 0,
    axis: "x" | "y" = "x",
    windowSize: number = 1024,
) {
    // Load history file
    const history = await HistoryFile.load("euclid10.bin.gz")

    // Create FFT processor
    const fftsize = windowSize // must be power of 2
    const fft = new Webfft(fftsize)

    // Get keypoint data for analysis
    const keypointData: [number, number, number][] = []
    for (const [_, keypoint] of history.keypoints(keypointIndex)) {
        keypointData.push(keypoint)
    }

    if (keypointData.length < windowSize) {
        throw new Error(
            `Not enough data points. Need ${windowSize}, but only have ${keypointData.length}`,
        )
    }

    // Prepare input data - extract x or y coordinate
    const input = new Float32Array(windowSize * 2) // interleaved complex array (IQIQIQIQ...)
    input.fill(0) // Initialize with zeros

    // Fill real parts with the coordinate values (x or y)
    const axisIndex = axis === "x" ? 0 : 1
    for (let i = 0; i < windowSize; i++) {
        input[i * 2] = keypointData[i][axisIndex] // Real part = coordinate value
        // Imaginary part stays 0
    }

    // Run FFT
    const output = fft.fft(input)

    // Clean up
    fft.dispose()

    return {
        history,
        keypointData,
        fftOutput: output,
        windowSize,
    }
}

// Example usage
if (import.meta.main) {
    ;(async () => {
        const result = await runFFT(0, "x", 1024)
        console.log(`Analyzed ${result.keypointData.length} keypoints`)
        console.log(
            `FFT output size: ${result.fftOutput.length / 2} complex values`,
        )

        // Print first few FFT results
        console.log("\nFirst 10 FFT magnitude values:")
        for (let i = 0; i < 10; i++) {
            const real = result.fftOutput[i * 2]
            const imag = result.fftOutput[i * 2 + 1]
            const magnitude = Math.sqrt(real * real + imag * imag)
            console.log(`${i}: ${magnitude.toFixed(2)}`)
        }
    })()
}

// // Add a simple test
// import {
//     assertEquals,
//     assertExists,
// } from "https://deno.land/std@0.224.0/assert/mod.ts"

// Deno.test("FFT on history file keypoints", async () => {
//     const result = await runFFT(0, "x", 512) // Use smaller window for test

//     // Check result structure
//     assertExists(result.history)
//     assertExists(result.keypointData)
//     assertExists(result.fftOutput)
//     assertEquals(result.windowSize, 512)

//     // Check data sizes
//     assertEquals(result.keypointData.length >= 512, true)
//     assertEquals(result.fftOutput.length, 512 * 2) // Complex values (real/imag pairs)

//     // Check at least first FFT value is calculated
//     const real = result.fftOutput[0]
//     const imag = result.fftOutput[1]
//     // First value should be the DC component (sum of all values)
//     assertEquals(typeof real, "number")
//     assertEquals(typeof imag, "number")
//     assertEquals(isNaN(real), false)
// })

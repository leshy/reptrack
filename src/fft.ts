import Webfft from "npm:webfft"

export async function runFFT(
    data: number[],
) {
    const windowSize = data.length
    const fft = new Webfft(windowSize)

    // Prepare input data - extract x or y coordinate
    const input = new Float32Array(windowSize * 2) // interleaved complex array (IQIQIQIQ...)
    input.fill(0) // Initialize with zeros

    // Fill real parts with the coordinate values (x or y)
    for (let i = 0; i < windowSize; i++) {
        input[i * 2] = data[i] // Real part = coordinate value
        // Imaginary part stays 0
    }

    // Run FFT
    const output = fft.fft(input)

    // Clean up
    fft.dispose()

    return output
}

import Webfft from "npm:webfft"

// array type guard
function ensureArray<T>(data: Iterable<T>): T[] {
    if (!Array.isArray(data)) {
        return [...data]
    } else return data
}

export function* runFFT(
    data: Iterable<number>,
) {
    // check if we are an array or iterator, build array if needed
    const dataArray = ensureArray(data)

    console.log(dataArray)
    const windowSize = dataArray.length
    const fft = new Webfft(windowSize)

    // Prepare input data - extract x or y coordinate
    const input = new Float32Array(windowSize * 2) // interleaved complex array (IQIQIQIQ...)
    input.fill(0) // Initialize with zeros

    // Fill real parts with the coordinate values (x or y)
    for (let i = 0; i < windowSize; i++) {
        input[i * 2] = dataArray[i] // Real part = coordinate value
        // Imaginary part stays 0
    }

    // Run FFT
    const output = fft.fft(input)

    // Clean up
    fft.dispose()

    // Calculate FFT magnitudes
    for (let i = 0; i < dataArray.length / 2; i++) {
        const real = output[i * 2]
        const imag = output[i * 2 + 1]
        const magnitude = Math.sqrt(real * real + imag * imag)
        yield magnitude
    }
}

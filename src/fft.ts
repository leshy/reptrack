import Webfft from "npm:webfft"

// array type guard
function ensureArray<T>(data: Iterable<T>): T[] {
    if (!Array.isArray(data)) {
        return [...data]
    } else return data
}

function nextPowerOfTwo(n: number): number {
    if (n <= 0) {
        throw new Error("Input must be a positive number")
    }

    // If n is already a power of 2, return it
    if ((n & (n - 1)) === 0) {
        return n
    }

    // Subtract 1 to handle the case where n is already a power of 2
    n--

    // Set all bits after the highest set bit
    n |= n >> 1
    n |= n >> 2
    n |= n >> 4
    n |= n >> 8
    n |= n >> 16

    // Add 1 to get the next power of 2
    return n + 1
}

function ensure2(data: number[]): number[] {
    const size = nextPowerOfTwo(data.length)
    if (size === data.length) {
        return data
    }
    return data.concat(new Array(size - data.length).fill(0))
}

const fftInstances = {}

export function* runFFT(data: Iterable<number>) {
    // Ensure data is an array
    //@ts-ignore
    const dataArray = ensure2(ensureArray(data))
    const windowSize = dataArray.length
    // @ts-ignore
    if (!fftInstances[windowSize]) {
        console.log("CREATE NEW", windowSize)
        // @ts-ignore
        fftInstances[windowSize] = new Webfft(windowSize)
    }

    // @ts-ignore
    const fft = fftInstances[windowSize]

    const input = new Float32Array(windowSize * 2)
    input.fill(0)

    // Fill the real parts; imaginary parts remain 0.
    for (let i = 0; i < windowSize; i++) {
        input[i * 2] = dataArray[i]
    }

    // Run FFT and clean up.
    const output = fft.fft(input)

    // Determine number of unique bins:
    // For even windowSize, unique bins = windowSize/2 + 1, else (windowSize+1)/2.
    const hasNyquist = windowSize % 2 === 0
    const uniqueBins = Math.floor(windowSize / 2) + 1

    for (let i = 0; i < uniqueBins; i++) {
        const real = output[i * 2]
        const imag = output[i * 2 + 1]
        let magnitude = Math.sqrt(real * real + imag * imag)
        // Double bins except DC and Nyquist (for even lengths)
        if (i > 0 && !(hasNyquist && i === windowSize / 2)) {
            magnitude *= 2
        }
        yield magnitude
    }
}

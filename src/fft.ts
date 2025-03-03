import Webfft from "npm:webfft"
import { AnyArray } from "./types/mod.ts"
import { collect, padToPowerOfTwo } from "./utils/mod.ts"

const fftInstances = {}

export function runFFT(data: Iterable<number> | AnyArray<number>) {
    // Ensure data is an array
    //@ts-ignore
    const dataArray = padToPowerOfTwo(collect(data))
    const windowSize = dataArray.length
    // @ts-ignore
    if (!fftInstances[windowSize]) {
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
    return fft.fft(input)
}

export function* magnitudes(output: Float32Array): Generator<number> {
    for (let i = 0; i < output.length; i++) {
        const real = output[i * 2]
        const imag = output[i * 2 + 1]
        yield Math.sqrt(real * real + imag * imag)
    }
}

export function findDominant(output: Float32Array): [number, number] {
    // Determine number of unique bins:
    // For even windowSize, unique bins = windowSize/2 + 1, else (windowSize+1)/2.
    let maxMagnitude = 0
    let maxFrequency = 0
    for (let i = 0; i < output.length; i++) {
        const real = output[i * 2]
        const imag = output[i * 2 + 1]
        const magnitude = Math.sqrt(real * real + imag * imag)
        if (magnitude > maxMagnitude) {
            maxMagnitude = magnitude
            maxFrequency = i
        }
    }

    return [maxFrequency, maxMagnitude]
}

import Webfft from "npm:webfft"
import { AnyArray } from "./types/mod.ts"
import { collect, padToPowerOfTwo, setValue } from "./utils/mod.ts"

const fftInstances: { [key: string]: Webfft } = {}

export function getFFT(windowSize: number): Webfft {
    const fft = fftInstances[windowSize]
    if (fft) return fft
    return setValue(windowSize, new Webfft(windowSize), fftInstances)
}

export function runFFT(data: Iterable<number> | AnyArray<number>) {
    const dataArray = padToPowerOfTwo(collect(data))
    const windowSize = dataArray.length
    if (!fftInstances[windowSize]) {
        fftInstances[windowSize] = new Webfft(windowSize)
    }

    const fft = fftInstances[windowSize]

    const input = new Float32Array(windowSize * 2)
    input.fill(0)

    for (let i = 0; i < windowSize; i++) {
        input[i * 2] = dataArray[i]
    }

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

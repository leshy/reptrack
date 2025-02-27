import Webfft from "npm:webfft"

// Instantiate
const fftsize = 1024 // must be power of 2
const fft = new Webfft(fftsize)

// Profile
fft.profile()

// Create Input
const input = new Float32Array(2048) // interleaved complex array (IQIQIQIQ...), so it's twice the size
input.fill(0)

// Run FFT
const out = fft.fft(input) // out will be a Float32Array of size 2048

console.log(out)

fft.dispose() // release Wasm memory

import FFT from "https://esm.sh/fft.js"
import { Pose, PoseEmitter, STATE } from "./types.ts"
import Plotly from "https://cdn.plot.ly/plotly-latest.min.js"
import { createWindow } from "./wm.ts"

type Keypoint = {
    name: string
    x: number
    y: number
    score: number
}

export class FFTDetector {
    private keypoints: Record<string, { x: number[]; y: number[] }> = {}
    private bufferSize: number
    private samplingRate: number
    private thresholdMagnitude: number
    private minFrequency: number
    private maxFrequency: number
    private fft: FFT
    private el: HTMLElement
    constructor(
        private poseEmitter: PoseEmitter,
        minFrequency: number = 0.1,
        maxFrequency: number = 4,
        bufferSize: number = 128,
        samplingRate: number = 30,
        thresholdMagnitude: number = 50,
    ) {
        this.minFrequency = minFrequency
        this.maxFrequency = maxFrequency
        this.bufferSize = bufferSize
        this.samplingRate = samplingRate
        this.thresholdMagnitude = thresholdMagnitude
        this.fft = new FFT(this.bufferSize)

        this.poseEmitter.on("pose", (pose) => this.processFrame(pose.keypoints))

        this.el = document.createElement("div")
        createWindow(this.el)
    }

    processFrame(keypoints: Keypoint[]): string[] {
        this.updateKeypoints(keypoints)
        this.detectRepetitiveMovement()
        this.graphFFTResults()
    }

    updateKeypoints(newKeypoints: Keypoint[]): void {
        newKeypoints.forEach((kp) => {
            if (!this.keypoints[kp.name]) {
                this.keypoints[kp.name] = { x: [], y: [] }
            }

            this.keypoints[kp.name].x.push(kp.x)
            this.keypoints[kp.name].y.push(kp.y)

            // Keep buffer size constant
            if (this.keypoints[kp.name].x.length > this.bufferSize) {
                this.keypoints[kp.name].x.shift()
                this.keypoints[kp.name].y.shift()
            }
        })
    }

    detectRepetitiveMovement(): string[] {
        const repetitiveKeypoints: string[] = []
        const minFrequencyBin = Math.ceil(
            this.minFrequency * this.bufferSize / this.samplingRate,
        )
        const maxFrequencyBin = Math.floor(
            this.maxFrequency * this.bufferSize / this.samplingRate,
        )

        for (const [name, data] of Object.entries(this.keypoints)) {
            if (data.x.length === this.bufferSize) {
                const magnitudesX = this.computeFFTMagnitudes(data.x)
                const magnitudesY = this.computeFFTMagnitudes(data.y)

                // Combine X and Y magnitudes, using the specified frequency range
                const combinedMagnitudes = magnitudesX.slice(
                    minFrequencyBin,
                    maxFrequencyBin + 1,
                )
                    .map((x, i) => x + magnitudesY[i + minFrequencyBin])

                // Find the maximum combined magnitude
                const maxCombinedMag = Math.max(...combinedMagnitudes)

                if (maxCombinedMag > this.thresholdMagnitude) {
                    const dominantFrequency =
                        (combinedMagnitudes.indexOf(maxCombinedMag) +
                            minFrequencyBin) *
                        (this.samplingRate / this.bufferSize)
                    repetitiveKeypoints.push(
                        `${name} (${dominantFrequency.toFixed(2)} Hz)`,
                    )
                }
            }

            if (repetitiveKeypoints.length > 4) {
                return repetitiveKeypoints
            }
        }

        return repetitiveKeypoints.length > 0 ? repetitiveKeypoints : []
    }

    private computeFFTMagnitudes(data: number[]): number[] {
        const out = new Float64Array(this.bufferSize * 2)
        this.fft.realTransform(out, data)

        const maxFrequencyBin = Math.floor(
            this.maxFrequency * this.bufferSize / this.samplingRate,
        )
        const magnitudes = new Array(maxFrequencyBin + 1)
        for (let i = 0; i <= maxFrequencyBin; i++) {
            const re = out[2 * i]
            const im = out[2 * i + 1]
            magnitudes[i] = Math.sqrt(re * re + im * im)
        }
        return magnitudes
    }

    graphFFTResults(): void {
        const plots: Plotly.Data[] = []
        const minFrequencyBin = Math.ceil(
            this.minFrequency * this.bufferSize / this.samplingRate,
        )
        const maxFrequencyBin = Math.floor(
            this.maxFrequency * this.bufferSize / this.samplingRate,
        )

        for (const [name, data] of Object.entries(this.keypoints)) {
            // check if name is one of the ones mentioned in the set
            if (
                name === "left_eye" || name === "right_eye" ||
                name === "left_ear" ||
                name === "right_ear"
            ) {
                continue
            }

            if (data.x.length === this.bufferSize) {
                const magnitudesX = this.computeFFTMagnitudes(data.x)
                const magnitudesY = this.computeFFTMagnitudes(data.y)

                const frequencies = Array.from(
                    { length: maxFrequencyBin - minFrequencyBin + 1 },
                    (_, i) =>
                        (i + minFrequencyBin) *
                        (this.samplingRate / this.bufferSize),
                )

                plots.push({
                    x: frequencies,
                    y: magnitudesX.slice(minFrequencyBin, maxFrequencyBin + 1),
                    type: "scatter",
                    mode: "lines",
                    name: `${name} (X)`,
                })

                plots.push({
                    x: frequencies,
                    y: magnitudesY.slice(minFrequencyBin, maxFrequencyBin + 1),
                    type: "scatter",
                    mode: "lines",
                    name: `${name} (Y)`,
                })
            }
        }
        const layout: Partial<Plotly.Layout> = {
            title: {
                text:
                    `FFT Magnitudes for Keypoints (${this.minFrequency}-${this.maxFrequency} Hz)`,
                font: { color: "#ffffff" },
            },
            xaxis: {
                title: "Frequency (Hz)",
                range: [this.minFrequency, this.maxFrequency],
                color: "#ffffff",
                gridcolor: "#444444",
            },
            yaxis: {
                title: "Magnitude",
                color: "#ffffff",
                gridcolor: "#444444",
            },
            paper_bgcolor: "#000000",
            plot_bgcolor: "#000000",
            margin: { t: 50, r: 20, l: 50, b: 50 },
            autosize: true,
            height: 400, // Adjust as needed
            width: 600, // Adjust as needed
            font: {
                color: "#ffffff",
            },
            showlegend: false,
            legend: {
                font: { color: "#ffffff" },
                bgcolor: "rgba(0,0,0,0)",
            },
        }

        Plotly.newPlot(this.el, plots, layout)
    }
}

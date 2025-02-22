import { EventEmitter } from "npm:eventemitter3"
import { createWindow } from "./wm.ts"

interface VideoEvents {
    resized: { width: number; height: number }
}

export class Video extends EventEmitter<VideoEvents> {
    public width: number
    public height: number
    public el: HTMLVideoElement
    public overlay: SVGSVGElement

    constructor(private src: string) {
        super()
        const video = document.createElement("video")
        video.src = this.src
        video.autoplay = true
        video.controls = true

        const svgOverlay = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
        )

        svgOverlay.style.position = "absolute"
        svgOverlay.style.top = "0"
        svgOverlay.style.left = "0"
        svgOverlay.style.width = "100%"
        svgOverlay.style.height = "100%"

        svgOverlay.style.pointerEvents = "none"

        const resized = () => {
            this.width = video.videoWidth
            this.height = video.videoHeight
            this.emit("resized", { width: this.width, height: this.height })

            // set viewbox
            svgOverlay.setAttribute(
                "viewBox",
                `0 0 ${this.width} ${this.height}`,
            )
        }

        video.addEventListener("loadedmetadata", resized)
        video.addEventListener("resize", resized)

        createWindow([video, svgOverlay])

        this.overlay = svgOverlay
        this.el = video
        this.width = video.videoWidth
        this.height = video.videoHeight
        resized()
    }
}

export class Camera extends EventEmitter<VideoEvents> {
    public width: number
    public height: number
    public el: HTMLVideoElement
    public overlay: SVGSVGElement

    constructor() {
        super()
        const video = document.createElement("video")
        video.autoplay = true
        video.playsInline = true // Important for mobile devices

        const resized = () => {
            this.width = video.videoWidth
            this.height = video.videoHeight
            this.emit("resized", { width: this.width, height: this.height })
            svgOverlay.style.width = String(this.width)
            svgOverlay.style.height = String(this.height)
        }

        video.addEventListener("loadedmetadata", resized)
        video.addEventListener("resize", resized)

        const svgOverlay = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
        )

        svgOverlay.style.position = "absolute"
        svgOverlay.style.top = "0"
        svgOverlay.style.left = "0"
        svgOverlay.style.pointerEvents = "none"

        createWindow([video, svgOverlay])

        this.overlay = svgOverlay
        this.el = video
        this.width = video.videoWidth
        this.height = video.videoHeight
        resized()

        // Start the webcam
        this.startWebcam()
    }

    private async startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" }, // This ensures we use the front-facing camera
            })
            this.el.srcObject = stream
        } catch (error) {
            console.error("Error accessing the webcam:", error)
        }
    }
}

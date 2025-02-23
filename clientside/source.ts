import { EventEmitter } from "npm:eventemitter3"
import { createWindow } from "./wm.ts"

export class Video {
    public el: HTMLVideoElement
    public overlay: SVGSVGElement

    constructor(private src: string) {
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

        svgOverlay.style.pointerEvents = "none"
        svgOverlay.setAttributeNS(null, "preserveAspectRatio", "none")
        svgOverlay.setAttribute(
            "viewBox",
            "0 0 255 255",
        )

        const resize = () => {
            svgOverlay.style.width = String(video.clientWidth)
            svgOverlay.style.height = String(video.clientHeight)
        }

        video.addEventListener("loadedmetadata", resize)
        video.addEventListener("resize", resize)
        window.addEventListener("resize", resize)

        createWindow([video, svgOverlay])

        this.overlay = svgOverlay
        this.el = video
        resize()
    }
}

export class Camera {
    public width: number
    public height: number
    public el: HTMLVideoElement
    public overlay: SVGSVGElement

    constructor() {
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

import { EventEmitter as _EventEmitter } from "npm:eventemitter3"
import { SvgWindow } from "../ui/wm.ts"

// SvgWindow subclass
export class GenericVideoWindow extends SvgWindow {
    private videoElement: HTMLVideoElement

    constructor(
        title: string = "video",
    ) {
        super(title)
        const video = document.createElement("video")
        video.autoplay = true
        video.controls = true
        this.videoElement = video
        this.contentElement.appendChild(video)
    }

    // Getter for the SVG element
    get video(): HTMLVideoElement {
        return this.videoElement
    }
}

export class VideoWindow extends GenericVideoWindow {
    constructor(private src: string) {
        super(src)
        this.video.src = src
    }
}

export class GenericVideo {
    public el: HTMLVideoElement

    constructor() {
        const video = document.createElement("video")
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
            svgOverlay.setAttribute(
                "viewBox",
                "0 0 255 255",
            )
        }

        video.addEventListener("loadedmetadata", resize)
        video.addEventListener("resize", resize)
        globalThis.addEventListener("resize", resize)

        //createWindow([video, svgOverlay], "auto", "source")

        //this.overlay = svgOverlay
        this.el = video
        resize()
    }
}

export class Camera extends GenericVideo {
    constructor() {
        super()
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

export class Video extends GenericVideo {
    constructor(private src: string) {
        super()
        this.el.src = src
    }
}

import { EventEmitter } from "npm:eventemitter3"
import { insertElement } from "./wm.ts"

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

        const resized = () => {
            this.width = video.videoWidth
            this.height = video.videoHeight
            this.emit("resized", { width: this.width, height: this.height })
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
        svgOverlay.style.width = "100%"
        svgOverlay.style.height = "100%"
        svgOverlay.style.pointerEvents = "none"

        // set svgOverlay viewbox
        svgOverlay.setAttribute("viewBox", `-1 -1 2 2`)

        insertElement([video, svgOverlay])

        this.overlay = svgOverlay
        this.el = video
        this.width = video.videoWidth
        this.height = video.videoHeight
    }
}

import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { BinaryPoseEmitter, Pose } from "../types.ts"
import { center } from "../transform/mod.ts"
import { SvgWindow } from "./wm.ts"
import { colorInterpolator, quickDisplay } from "./helpers.ts"

type SkeletonDrawSettings = {
    stats: boolean
    keypoints: boolean
    skeleton: boolean
    center: boolean
    focus: boolean
    relative: boolean
    minScore: number
    color: (score: number) => string
    keypointRadius: string
    lineWidth: string
    interactive: boolean
}

const defaultSettings: SkeletonDrawSettings = {
    relative: true,
    minScore: 0.3,
    stats: true,
    keypoints: true,
    skeleton: true,
    center: true,
    focus: true,
    keypointRadius: "5",
    lineWidth: "2",
    color: colorInterpolator([0, 255, 0], [255, 0, 0]),
    interactive: true,
}

export class Skeleton extends SvgWindow {
    private skeletonGroup: SVGGElement
    private lineMap = new Map<string, Element>()
    private keypointMap = new Map<number, Element>()
    private settings: SkeletonDrawSettings
    private pose?: Pose

    constructor(
        private poseEmitter: BinaryPoseEmitter,
        title: string,
        settings: Partial<SkeletonDrawSettings> = {},
    ) {
        super(title, { preserveRatio: true })

        this.settings = { ...defaultSettings, ...settings }
        this.poseEmitter.on("pose", this.drawPose)

        this.skeletonGroup = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g",
        )

        this.skeletonGroup.setAttribute("id", "skeleton-group")
        this.svg.appendChild(this.skeletonGroup)
    }

    private drawPose = (pose: Pose) => {
        if (this.settings.focus) pose = center()(pose) as Pose
        this.pose = pose
        if (this.settings.skeleton) this.drawSkeleton(pose)
        if (this.settings.keypoints) this.drawKeypoints(pose)
    }

    private drawSkeleton = (pose: Pose) => {
        const namespace = "http://www.w3.org/2000/svg"
        const pairs = poseDetection.util.getAdjacentPairs(
            poseDetection.SupportedModels.MoveNet,
        )
        const currentLines = new Set<string>()
        const minScore = this.settings.minScore

        pairs.forEach(([i, j]) => {
            const [kp1, kp1score] = pose.getKeypointCoords(i)
            const [kp2, kp2score] = pose.getKeypointCoords(j)

            if (!kp1 || !kp2) return
            if ((kp1score < minScore) || (kp2score < minScore)) return

            const lineName = `${i}_${j}`
            currentLines.add(lineName)

            let line = this.lineMap.get(lineName)
            if (!line) {
                line = this.createLine(namespace, lineName)
            }

            this.setLineAttributes(
                line,
                kp1,
                kp2,
                this.settings.color((kp1score + kp2score) / 2),
            )
        })

        this.removeStaleLines(currentLines)
    }

    private createLine(namespace: string, lineName: string): Element {
        const line = document.createElementNS(namespace, "line")
        line.setAttribute("data-name", lineName)
        line.setAttribute("stroke-width", this.settings.lineWidth)
        this.skeletonGroup.appendChild(line)
        this.lineMap.set(lineName, line)
        return line
    }

    private setLineAttributes(
        line: Element,
        kp1: [number, number],
        kp2: [number, number],
        color: string = "white",
    ) {
        // Scale coordinates to SVG client dimensions
        const width = this.svg.clientWidth
        const height = this.svg.clientHeight

        // Scale from normalized 0-255 range to actual SVG dimensions
        const x1 = (kp1[0] / 255) * width
        const y1 = (kp1[1] / 255) * height
        const x2 = (kp2[0] / 255) * width
        const y2 = (kp2[1] / 255) * height

        line.setAttribute("x1", String(x1))
        line.setAttribute("y1", String(y1))
        line.setAttribute("x2", String(x2))
        line.setAttribute("y2", String(y2))
        line.setAttribute("stroke", color)
    }

    private removeStaleLines(currentLines: Set<string>) {
        this.lineMap.forEach((line, name) => {
            if (!currentLines.has(name)) {
                this.skeletonGroup.removeChild(line)
                this.lineMap.delete(name)
            }
        })
    }

    private drawKeypoints = (pose: Pose) => {
        const namespace = "http://www.w3.org/2000/svg"
        const currentIndices = new Set<number>()
        for (const [i, kp] of pose.indexedKeypoints()) {
            if (kp[2] < this.settings.minScore) continue
            currentIndices.add(i)
            let circle = this.keypointMap.get(i)
            if (!circle) {
                circle = this.createCircle(namespace, i)
            }
            this.setCircleAttributesFromKP(circle, kp)
        }

        this.removeStaleKeypoints(currentIndices)
    }

    private createCircle(namespace: string, index: number): Element {
        const circle = document.createElementNS(namespace, "circle")
        circle.setAttribute("data-index", index.toString())
        circle.setAttribute("r", this.settings.keypointRadius)

        this.skeletonGroup.appendChild(circle)
        this.keypointMap.set(index, circle)

        if (this.settings.interactive) {
            circle.classList.add("clickable-keypoint")
            circle.addEventListener("click", (event: Event) => {
                this.emit("keypointClick", {
                    pose: this.pose,
                    index: index,
                })
                quickDisplay(
                    (event as unknown) as MouseEvent,
                    // @ts-ignore
                    this.pose.keypointStr(index),
                )

                // @ts-ignore
                console.log(this.pose.keypointStr(index))
                // @ts-ignore
                console.log(this.pose, this.pose.getKeypoint(index))
                // @ts-ignore
                globalThis.pose = this.pose
                // @ts-ignore
                globalThis.kp = this.pose.getKeypoint(index)
            })
        }

        return circle
    }

    private setCircleAttributesFromKP(
        circle: Element,
        [x, y, score]: [number, number, number],
    ) {
        this.setCircleAttributes(circle, [x, y], this.settings.color(score))
    }

    private setCircleAttributes(
        circle: Element,
        kp: [number, number],
        color: string,
    ) {
        // Scale coordinates to SVG client dimensions
        const width = this.svg.clientWidth
        const height = this.svg.clientHeight

        // Scale from normalized 0-255 range to actual SVG dimensions
        const cx = (kp[0] / 255) * width
        const cy = (kp[1] / 255) * height

        circle.setAttribute("cx", String(cx))
        circle.setAttribute("cy", String(cy))
        circle.setAttribute("fill", color)
    }

    private removeStaleKeypoints(currentIndices: Set<number>) {
        this.keypointMap.forEach((circle, index) => {
            if (!currentIndices.has(index)) {
                this.skeletonGroup.removeChild(circle)
                this.keypointMap.delete(index)
            }
        })
    }

    // private drawCenter = (pose: Pose) => {
    //     const namespace = "http://www.w3.org/2000/svg"
    //     const centerIndex = KeypointName.body_center
    //     const center = pose.getKeypoint(centerIndex)

    //     if (center) {
    //         if (!this.centerPoint) {
    //             this.centerPoint = this.createCenterCircle(
    //                 namespace,
    //                 centerIndex,
    //             )
    //         }
    //         this.setCircleAttributes(this.centerPoint, center)
    //     } else {
    //         this.removeCenterPoint()
    //     }
    // }

    // private createCenterCircle(
    //     namespace: string,
    //     centerIndex: KeypointName,
    // ): Element {
    //     const centerPoint = document.createElementNS(namespace, "circle")
    //     centerPoint.setAttribute("data-index", centerIndex.toString())
    //     centerPoint.setAttribute("r", "0.02")
    //     centerPoint.setAttribute("fill", "#FF0000")
    //     this.skeletonGroup.appendChild(centerPoint)
    //     return centerPoint
    // }

    // private removeCenterPoint() {
    //     if (this.centerPoint) {
    //         this.skeletonGroup.removeChild(this.centerPoint)
    //         this.centerPoint = null
    //     }
    // }
}

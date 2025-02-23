import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { BinaryPoseEmitter, KeypointName, Pose } from "./types2.ts"

type SkeletonDrawSettings = {
    stats: boolean
    keypoints: boolean
    skeleton: boolean
    center: boolean
    relative: boolean
    minScore: number
}

const defaultSettings: SkeletonDrawSettings = {
    relative: true,
    minScore: 0,
    stats: true,
    keypoints: true,
    skeleton: true,
    center: true,
}

function getColorFromScore(score: number): string {
    const clampedScore = Math.max(0, Math.min(1, score))
    const red = 255
    const greenBlue = Math.round(255 * clampedScore)
    return `rgb(${red}, ${greenBlue}, ${greenBlue})`
}

export class SkeletonDraw {
    private skeletonGroup: SVGGElement

    private lineMap = new Map<string, Element>()
    private keypointMap = new Map<number, SVGCircleElement>()

    private centerPoint: SVGCircleElement | null = null

    constructor(
        private poseEmitter: BinaryPoseEmitter,
        private svg: SVGSVGElement,
        private settings: SkeletonDrawSettings = { ...defaultSettings },
    ) {
        this.poseEmitter.on("pose", this.drawPose)

        this.skeletonGroup = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g",
        )
        this.skeletonGroup.setAttribute("id", "skeleton-group")
        this.svg.appendChild(this.skeletonGroup)
    }

    private drawPose = (pose: Pose) => {
        if (this.settings.skeleton) this.drawSkeleton(pose)
        if (this.settings.keypoints) this.drawKeypoints(pose)
        if (this.settings.center) this.drawCenter(pose)
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
                getColorFromScore((kp1score + kp2score) / 2),
            )
        })

        this.removeStaleLines(currentLines)
    }

    private createLine(namespace: string, lineName: string): Element {
        const line = document.createElementNS(namespace, "line")
        line.setAttribute("data-name", lineName)
        line.setAttribute("stroke-width", "1")
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
        line.setAttribute("x1", String(kp1[0]))
        line.setAttribute("y1", String(kp1[1]))
        line.setAttribute("x2", String(kp2[0]))
        line.setAttribute("y2", String(kp2[1]))
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

        for (const [i, kp] of pose.iterKeypoints()) {
            currentIndices.add(i)
            let circle = this.keypointMap.get(i)
            if (!circle) {
                circle = this.createCircle(namespace, i)
            }
            this.setCircleAttributesFromKP(circle, kp)
        }

        this.removeStaleKeypoints(currentIndices)
    }

    private createCircle(namespace: string, index: number): SVGCircleElement {
        const circle = document.createElementNS(namespace, "circle")
        circle.setAttribute("data-index", index.toString())
        circle.setAttribute("r", "1.5")
        this.skeletonGroup.appendChild(circle)
        this.keypointMap.set(index, circle)
        return circle
    }

    private setCircleAttributesFromKP(
        circle: SVGCircleElement,
        kp: [number, number, number],
    ) {
        this.setCircleAttributes(circle, kp, getColorFromScore(kp[2]))
    }

    private setCircleAttributes(
        circle: SVGCircleElement,
        kp: [number, number],
        color: string,
    ) {
        circle.setAttribute("cx", String(kp[0]))
        circle.setAttribute("cy", String(kp[1]))
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

    private drawCenter = (pose: Pose) => {
        const namespace = "http://www.w3.org/2000/svg"
        const centerIndex = KeypointName.body_center
        const center = pose.getKeypoint(centerIndex)

        if (center) {
            if (!this.centerPoint) {
                this.centerPoint = this.createCenterCircle(
                    namespace,
                    centerIndex,
                )
            }
            this.setCircleAttributes(this.centerPoint, center)
        } else {
            this.removeCenterPoint()
        }
    }

    private createCenterCircle(
        namespace: string,
        centerIndex: KeypointName,
    ): SVGCircleElement {
        const centerPoint = document.createElementNS(namespace, "circle")
        centerPoint.setAttribute("data-index", centerIndex.toString())
        centerPoint.setAttribute("r", "0.02")
        centerPoint.setAttribute("fill", "#FF0000")
        this.skeletonGroup.appendChild(centerPoint)
        return centerPoint
    }

    private removeCenterPoint() {
        if (this.centerPoint) {
            this.skeletonGroup.removeChild(this.centerPoint)
            this.centerPoint = null
        }
    }
}

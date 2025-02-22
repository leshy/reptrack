import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { BinaryPoseEmitter, KeypointName, Pose } from "./types2.ts"
import { isEmpty } from "./binary/pose.ts"

type SkeletonDrawSettings = {
    stats: boolean
    keypoints: boolean
    skeleton: boolean
    center: boolean
    relative: boolean
}

const defaultSettings: SkeletonDrawSettings = {
    relative: true,
    stats: true,
    keypoints: true,
    skeleton: true,
    center: true,
}

export class SkeletonDraw {
    settings: SkeletonDrawSettings
    private skeletonGroup: SVGGElement
    private lineMap: Map<string, SVGLineElement> = new Map()

    // Use numeric keys (indexes) for keypoints.
    private keypointMap: Map<number, SVGCircleElement> = new Map()
    private centerPoint: SVGCircleElement | null = null

    constructor(
        private poseEmitter: BinaryPoseEmitter,
        private svg: SVGSVGElement,
        settings: Partial<SkeletonDrawSettings> = {},
    ) {
        this.settings = { ...defaultSettings, ...settings }
        this.poseEmitter.on("pose", this.drawPose)

        this.skeletonGroup = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g",
        )
        this.skeletonGroup.setAttribute("id", "skeleton-group")
        this.svg.appendChild(this.skeletonGroup)
    }

    drawPose = (pose: Pose) => {
        window.pose = pose
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

        pairs.forEach(([i, j]) => {
            const kp1 = pose.getKeypoint(i)
            const kp2 = pose.getKeypoint(j)

            if (isEmpty(kp1) || isEmpty(kp2)) return

            const lineName = `${i}_${j}`
            currentLines.add(lineName)

            let line = this.lineMap.get(lineName)
            if (!line) {
                line = document.createElementNS(namespace, "line")
                line.setAttribute("data-name", lineName)
                line.setAttribute("stroke", "white")
                line.setAttribute(
                    "stroke-width",
                    this.settings.relative ? "0.01" : "1",
                )
                this.skeletonGroup.appendChild(line)
                this.lineMap.set(lineName, line)
            }

            line.setAttribute("x1", String(kp1[0]))
            line.setAttribute("y1", String(kp1[1]))
            line.setAttribute("x2", String(kp2[0]))
            line.setAttribute("y2", String(kp2[1]))
        })

        // Remove any stale lines.
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
                circle = document.createElementNS(namespace, "circle")
                circle.setAttribute("data-index", i.toString())
                circle.setAttribute("r", "0.02")
                circle.setAttribute("fill", "#00FF00")
                this.skeletonGroup.appendChild(circle)
                this.keypointMap.set(i, circle)
            }
            circle.setAttribute("cx", String(kp[0]))
            circle.setAttribute("cy", String(kp[1]))
        }

        // Remove keypoint circles that no longer exist in the current pose.
        for (const [i, circle] of this.keypointMap.entries()) {
            if (!currentIndices.has(i)) {
                this.skeletonGroup.removeChild(circle)
                this.keypointMap.delete(i)
            }
        }
    }

    private drawCenter = (pose: Pose) => {
        const namespace = "http://www.w3.org/2000/svg"
        // Assume 'body_center' is at the index defined by the enum.
        const centerIndex = KeypointName.body_center
        const center = pose.getKeypoint(centerIndex)
        if (center) {
            if (!this.centerPoint) {
                this.centerPoint = document.createElementNS(namespace, "circle")
                this.centerPoint.setAttribute(
                    "data-index",
                    centerIndex.toString(),
                )
                this.centerPoint.setAttribute("r", "0.02")
                this.centerPoint.setAttribute("fill", "#FF0000")
                this.skeletonGroup.appendChild(this.centerPoint)
            }
            this.centerPoint.setAttribute("cx", String(center[0]))
            this.centerPoint.setAttribute("cy", String(center[1]))
        } else if (this.centerPoint) {
            this.skeletonGroup.removeChild(this.centerPoint)
            this.centerPoint = null
        }
    }
}

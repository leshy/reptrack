import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { Pose, PoseEmitter } from "./types.ts"

type SkeletonDrawSettings = {
    stats: boolean
    keypoints: boolean
    skeleton: boolean
    center: boolean
}

const defaultSettings: SkeletonDrawSettings = {
    stats: true,
    keypoints: true,
    skeleton: true,
    center: true,
}

export class SkeletonDraw {
    settings: SkeletonDrawSettings
    private skeletonGroup: SVGGElement
    private lineMap: Map<string, SVGLineElement> = new Map()
    private keypointMap: Map<string, SVGCircleElement> = new Map()
    private centerPoint: SVGCircleElement | null = null

    constructor(
        private poseEmitter: PoseEmitter,
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
        if (this.settings.skeleton) {
            this.drawSkeleton(pose)
        }
        if (this.settings.keypoints) {
            this.drawKeypoints(pose)
        }
        if (this.settings.center) {
            this.drawCenter(pose)
        }
    }

    private drawSkeleton = (pose: Pose) => {
        const keypoints = pose.keypoints
        const namespace = "http://www.w3.org/2000/svg"

        const pairs = poseDetection.util.getAdjacentPairs(
            poseDetection.SupportedModels.MoveNet,
        )

        const currentLines = new Set<string>()

        pairs.forEach(([i, j]) => {
            const kp1 = keypoints[i]
            const kp2 = keypoints[j]

            const lineName = `${kp1.name}_${kp2.name}`
            currentLines.add(lineName)

            let line = this.lineMap.get(lineName)

            if (!line) {
                line = document.createElementNS(namespace, "line")
                line.setAttribute("data-name", lineName)
                line.setAttribute("stroke", "white")
                line.setAttribute("stroke-width", "0.01")
                this.skeletonGroup.appendChild(line)
                this.lineMap.set(lineName, line)
            }

            line.setAttribute("x1", String(kp1.x))
            line.setAttribute("y1", String(kp1.y))
            line.setAttribute("x2", String(kp2.x))
            line.setAttribute("y2", String(kp2.y))
        })

        this.lineMap.forEach((line, name) => {
            if (!currentLines.has(name)) {
                this.skeletonGroup.removeChild(line)
                this.lineMap.delete(name)
            }
        })
    }

    private drawKeypoints = (pose: Pose) => {
        const namespace = "http://www.w3.org/2000/svg"

        pose.keypoints.forEach((keypoint) => {
            let circle = this.keypointMap.get(keypoint.name)

            if (!circle) {
                circle = document.createElementNS(namespace, "circle")
                circle.setAttribute("data-name", keypoint.name)
                circle.setAttribute("r", "0.01")
                circle.setAttribute("fill", "#00FF00")
                this.skeletonGroup.appendChild(circle)
                this.keypointMap.set(keypoint.name, circle)
            }

            circle.setAttribute("cx", String(keypoint.x))
            circle.setAttribute("cy", String(keypoint.y))
        })

        // Remove any keypoints that are no longer present
        this.keypointMap.forEach((circle, name) => {
            if (!pose.keypoints.some((kp) => kp.name === name)) {
                this.skeletonGroup.removeChild(circle)
                this.keypointMap.delete(name)
            }
        })
    }

    private drawCenter = (pose: Pose) => {
        const centerKeypoint = pose.keypoints.find((kp) =>
            kp.name === "body_center"
        )

        if (centerKeypoint) {
            const namespace = "http://www.w3.org/2000/svg"

            if (!this.centerPoint) {
                this.centerPoint = document.createElementNS(namespace, "circle")
                this.centerPoint.setAttribute("data-name", "body_center")
                this.centerPoint.setAttribute("r", "0.02")
                this.centerPoint.setAttribute("fill", "#FF0000")
                this.skeletonGroup.appendChild(this.centerPoint)
            }

            this.centerPoint.setAttribute("cx", String(centerKeypoint.x))
            this.centerPoint.setAttribute("cy", String(centerKeypoint.y))
        } else if (this.centerPoint) {
            // Remove center point if it's no longer present
            this.skeletonGroup.removeChild(this.centerPoint)
            this.centerPoint = null
        }
    }
}

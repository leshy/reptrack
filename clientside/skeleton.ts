import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { Pose, PoseEmitter, STATE } from "./types.ts"

type SkeletonDrawSettings = {
    stats: boolean
}

const defaultSettings: SkeletonDrawSettings = {
    stats: true,
}

export class SkeletonDraw {
    settings: SkeletonDrawSettings
    private skeletonGroup: SVGGElement
    private lineMap: Map<string, SVGLineElement> = new Map()

    constructor(
        private poseEmitter: PoseEmitter,
        private svg: SVGSVGElement,
        settings: Partial<SkeletonDrawSettings> = {},
    ) {
        this.settings = { ...defaultSettings, ...settings }
        this.poseEmitter.on("pose", this.drawSkeletonSVG)

        // Create a single parent group element for all skeleton elements
        this.skeletonGroup = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g",
        )
        this.skeletonGroup.setAttribute("id", "skeleton-group")
        this.svg.appendChild(this.skeletonGroup)
    }

    drawSkeletonSVG = (pose: Pose) => {
        const keypoints = pose.keypoints
        const namespace = "http://www.w3.org/2000/svg"

        const pairs = poseDetection.util.getAdjacentPairs(
            poseDetection.SupportedModels.MoveNet,
        )

        const currentLines = new Set<string>()

        // Draw or update lines
        pairs.forEach(([i, j]) => {
            const kp1 = keypoints[i]
            const kp2 = keypoints[j]

            const lineName = `${kp1.name}_${kp2.name}`
            currentLines.add(lineName)

            let line = this.lineMap.get(lineName)

            if (!line) {
                // Create new line if it doesn't exist
                line = document.createElementNS(namespace, "line")
                line.setAttribute("data-name", lineName)
                line.setAttribute("stroke", "white")
                line.setAttribute("stroke-width", "0.01")
                this.skeletonGroup.appendChild(line)
                this.lineMap.set(lineName, line)
            }

            // Update line position
            line.setAttribute("x1", String(kp1.x))
            line.setAttribute("y1", String(kp1.y))
            line.setAttribute("x2", String(kp2.x))
            line.setAttribute("y2", String(kp2.y))
        })

        // Remove any lines that are no longer needed
        this.lineMap.forEach((line, name) => {
            if (!currentLines.has(name)) {
                this.skeletonGroup.removeChild(line)
                this.lineMap.delete(name)
            }
        })
    }
}

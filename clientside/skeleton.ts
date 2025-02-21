import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { Pose, PoseEmitter, STATE } from "./types.ts"

export class SkeletonOverlay {
    constructor(private poseEmitter: PoseEmitter, private svg: SVGSVGElement) {
        this.poseEmitter.on("pose", this.drawSkeletonSVG)
    }

    drawSkeletonSVG = (pose: Pose) => {
        const keypoints = pose.keypoints
        const namespace = "http://www.w3.org/2000/svg"

        // Define the pairs of keypoints that form the skeleton
        const pairs = poseDetection.util.getAdjacentPairs(
            poseDetection.SupportedModels.MoveNet,
        )

        // Ensure we have the correct number of lines
        while (this.svg.children.length < pairs.length) {
            const line = document.createElementNS(namespace, "line")
            line.setAttribute("stroke", "white")
            line.setAttribute("stroke-width", "0.01")
            this.svg.appendChild(line)
        }

        // Remove extra lines if any
        while (this.svg.children.length > pairs.length) {
            // @ts-ignore
            this.svg.removeChild(this.svg.lastChild)
        }

        // Update each line
        pairs.forEach(([i, j], index: number) => {
            const kp1 = keypoints[i]
            const kp2 = keypoints[j]

            const score1 = kp1.score != null ? kp1.score : 1
            const score2 = kp2.score != null ? kp2.score : 1
            const scoreThreshold = STATE.modelConfig.scoreThreshold || 0

            const line = this.svg.children[index]

            if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
                line.setAttribute("x1", String(kp1.x))
                line.setAttribute("y1", String(kp1.y))
                line.setAttribute("x2", String(kp2.x))
                line.setAttribute("y2", String(kp2.y))
                line.setAttribute("visibility", "visible")
            } else {
                line.setAttribute("visibility", "hidden")
            }
        })

        // Optionally, draw keypoints
        keypoints.forEach((keypoint, index) => {
            if (keypoint.name === "body_center") return // Skip body_center as it's already drawn

            let keypointElement = this.svg.querySelector(`#keypoint-${index}`)
            if (!keypointElement) {
                keypointElement = document.createElementNS(namespace, "circle")
                keypointElement.setAttribute("id", `keypoint-${index}`)
                keypointElement.setAttribute("r", "0.01") // Adjust this value as needed
                keypointElement.setAttribute("fill", "#00FF00")
                this.svg.appendChild(keypointElement)
            }

            keypointElement.setAttribute("cx", String(keypoint.x))
            keypointElement.setAttribute("cy", String(keypoint.y))
            keypointElement.setAttribute(
                "visibility",
                keypoint.score >= (STATE.modelConfig.scoreThreshold || 0)
                    ? "visible"
                    : "hidden",
            )
        })
    }
}

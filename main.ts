import * as tf from "npm:@tensorflow/tfjs"
import { setThreadsCount } from "npm:@tensorflow/tfjs-backend-wasm"

await tf.setBackend("wasm")

import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { decode } from "https://deno.land/x/imagescript/mod.ts"
import { drawSkeleton } from "./draw.ts"

interface ImageData {
    data: Uint8Array
    width: number
    height: number
}

setThreadsCount(8)

async function initDetector(): Promise<poseDetection.PoseDetector> {
    const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        //    enableSmoothing: true,
        //    multiPoseMaxDimension: 256,
        //    enableTracking: true,
        //    trackerType: poseDetection.TrackerType.BoundingBox,
    }

    const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig,
    )
    return detector
}

async function createImageData(imageBuffer: Uint8Array): Promise<ImageData> {
    const image = await decode(imageBuffer)
    return {
        // @ts-ignore
        data: new Uint8Array(image.bitmap.buffer),
        width: image.width,
        height: image.height,
    }
}

async function detect(
    detector: poseDetection.PoseDetector,
    imageData: ImageData,
) {
    const estimationConfig = { flipHorizontal: false }

    const pose = (await detector.estimatePoses(
        imageData,
        estimationConfig,
        performance.now(),
    ))[0]

    const normalized = poseDetection.calculators
        .keypointsToNormalizedKeypoints(
            pose.keypoints,
            imageData,
        )

    return { ...pose, normalized: normalized }
}

const detector = await initDetector()

Deno.args.forEach(async (filename) => {
    console.log(filename)
    const name = filename.split(".")[0]
    const imageData = await createImageData(await Deno.readFile(filename))
    const pose = await detect(detector, imageData)

    const skeletonDrawing = drawSkeleton(
        pose.normalized,
        imageData.width,
        imageData.height,
    )

    Deno.writeFileSync(`${name}_skeleton.png`, skeletonDrawing)
})

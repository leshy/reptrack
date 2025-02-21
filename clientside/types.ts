import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { EventEmitter } from "npm:eventemitter3"

export type Pose = poseDetection.Pose
export type Keypoint = poseDetection.Keypoint

export interface PoseEvent {
    pose: Pose
}

export type PoseEmitter = EventEmitter<PoseEvent>

export const STATE = {
    "runtime": "tfjs",
    "backend": "webgl",
    "flags": {
        "WEBGL_VERSION": 2,
        "WEBGL_CPU_FORWARD": true,
        "WEBGL_PACK": true,
        "WEBGL_FORCE_F16_TEXTURES": false,
        "WEBGL_RENDER_FLOAT32_CAPABLE": true,
        "WEBGL_FLUSH_THRESHOLD": -1,
    },
    "modelConfig": {
        "maxPoses": 1,
        "type": poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        "scoreThreshold": 0.2,
    },
    "model": "MoveNet",
    "lastTFJSBackend": "tfjs-webgl",
    "isModelChanged": false,
    "isFlagChanged": false,
    "isBackendChanged": false,
}

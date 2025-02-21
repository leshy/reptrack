import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { EventEmitter } from "npm:eventemitter3"

export type Pose = poseDetection.Pose
export type Keypoint = poseDetection.Keypoint

export interface PoseEvent {
    pose: Pose
}

export type Point = [number, number]
export type TraceMap = Map<string, Point[]>
export interface TraceEvent {
    trace: TraceMap
}

export type TraceEmitter = EventEmitter<TraceEvent>

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

export enum KeypointName {
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "body_center",
}

export const defaultTarget = {
    [KeypointName.nose]: true,
    [KeypointName.left_wrist]: true,
    [KeypointName.right_wrist]: true,
    [KeypointName.left_ankle]: true,
    [KeypointName.right_ankle]: true,
    [KeypointName.left_knee]: true,
    [KeypointName.right_knee]: true,
    [KeypointName.left_shoulder]: true,
    [KeypointName.right_shoulder]: true,
}

export const allTargets = {
    [KeypointName.nose]: true,
    [KeypointName.left_eye]: true,
    [KeypointName.right_eye]: true,
    [KeypointName.left_ear]: true,
    [KeypointName.right_ear]: true,
    [KeypointName.left_shoulder]: true,
    [KeypointName.right_shoulder]: true,
    [KeypointName.left_elbow]: true,
    [KeypointName.right_elbow]: true,
    [KeypointName.left_wrist]: true,
    [KeypointName.right_wrist]: true,
    [KeypointName.left_hip]: true,
    [KeypointName.right_hip]: true,
    [KeypointName.left_knee]: true,
    [KeypointName.right_knee]: true,
    [KeypointName.left_ankle]: true,
    [KeypointName.right_ankle]: true,
    [KeypointName.body_center]: true,
}

export interface ValueEvent {
    values: number[]
}

export interface MultiValueEvent {
    values: { [name: string]: number[] }
}

import { EventEmitter } from "npm:eventemitter3"
import * as poseDetection from "npm:@tensorflow-models/pose-detection"
import { Pose } from "./binary/pose.ts"
export { Pose } from "./binary/pose.ts"

export type Point = [number, number, number]

export type PoseEvent = poseDetection.Pose & { timestamp: number }

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

export type BinaryPoseEvent = { pose: Pose }
export type BinaryPoseEmitter = EventEmitter<BinaryPoseEvent>

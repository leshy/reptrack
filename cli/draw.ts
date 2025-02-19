import { createCanvas } from "https://deno.land/x/canvas/mod.ts";
import { encode } from "https://deno.land/x/pngs/mod.ts";

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

export function drawSkeleton(
  keypoints: Keypoint[],
  width: number,
  height: number,
  threshold = 0.5,
): Uint8Array {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Set up the canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  // Define the connections between keypoints
  const connections = [
    ["left_ear", "left_eye"],
    ["left_eye", "nose"],
    ["nose", "right_eye"],
    ["right_eye", "right_ear"],
    ["left_shoulder", "right_shoulder"],
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
    ["left_hip", "right_hip"],
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
  ];

  // Draw the connections
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  for (const [start, end] of connections) {
    const startPoint = keypoints.find((kp) => kp.name === start);
    const endPoint = keypoints.find((kp) => kp.name === end);
    if (
      startPoint && endPoint && startPoint.score > threshold &&
      endPoint.score > threshold
    ) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x * width, startPoint.y * height);
      ctx.lineTo(endPoint.x * width, endPoint.y * height);
      ctx.stroke();
    }
  }

  // Draw the keypoints
  ctx.fillStyle = "red";
  for (const keypoint of keypoints) {
    if (keypoint.score > threshold) {
      ctx.beginPath();
      ctx.arc(keypoint.x * width, keypoint.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Get the image data
  const imageData = ctx.getImageData(0, 0, width, height);

  // Encode the image data to PNG
  return encode(imageData.data, width, height);
}

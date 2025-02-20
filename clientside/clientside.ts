import "npm:@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "npm:@tensorflow-models/pose-detection";
import * as tf from "npm:@tensorflow/tfjs-core";
import { RepetitiveMovementDetector } from "./fft.ts";

const STATE = {
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
};

async function initDetector(): Promise<poseDetection.PoseDetector> {
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
    enableSmoothing: true,
    minPoseScore: 0.1,
    //modelUrl: "/model/saved_model.pb",
  };

  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig,
  );
  return detector;
}

// @ts-ignore
const video = document.getElementById("video");

async function init() {
  console.log("initializing");
  tf.env().setFlags(STATE.flags);
  await tf.setBackend("webgl");
  await tf.ready();

  const detector = await initDetector();
  const warmUpTensor = tf.fill(
    [video.height, video.width, 3],
    0,
    "float32",
  );
  await detector.estimatePoses(
    warmUpTensor,
    { maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false },
  );
  warmUpTensor.dispose();
  console.log("initialized");
  return detector;
}

async function detect(detector) {
  const pose = (await detector.estimatePoses(
    video,
    { maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false },
    performance.now(),
  ))[0];
  if (pose) {
    pose.normalized = poseDetection.calculators
      .keypointsToNormalizedKeypoints(
        pose.keypoints,
        { height: video.clientHeight, width: video.clientWidth },
      );
  }
  return pose;
}

function drawResult(pose) {
  if (pose.keypoints != null) {
    const relative = calculateRelativeKeypoints(pose.keypoints);
    drawRelativeSkeletonSVG(
      relative,
      svgElementRelative,
    );
    drawSkeletonSVG(pose.keypoints, svgElement);
    const repetitiveKeypoints = repetitionDetector.processFrame(relative);
    if (repetitiveKeypoints.length > 0) {
      console.log(
        "Repetitive movement detected in keypoints:",
        repetitiveKeypoints,
      );
    }

    repetitionDetector.graphFFTResults();
  }
}

function drawSkeletonSVG(keypoints, svgElement) {
  const namespace = "http://www.w3.org/2000/svg";

  // Define the pairs of keypoints that form the skeleton
  const pairs = poseDetection.util.getAdjacentPairs(STATE.model);

  // Ensure we have the correct number of lines
  while (svgElement.children.length < pairs.length) {
    const line = document.createElementNS(namespace, "line");
    line.setAttribute("stroke", "white");
    line.setAttribute("stroke-width", "2");
    svgElement.appendChild(line);
  }

  // Remove extra lines if any
  while (svgElement.children.length > pairs.length) {
    svgElement.removeChild(svgElement.lastChild);
  }

  // Update each line
  pairs.forEach(([i, j], index) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];

    const score1 = kp1.score != null ? kp1.score : 1;
    const score2 = kp2.score != null ? kp2.score : 1;
    const scoreThreshold = STATE.modelConfig.scoreThreshold || 0;

    const line = svgElement.children[index];

    if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
      line.setAttribute("x1", kp1.x);
      line.setAttribute("y1", kp1.y);
      line.setAttribute("x2", kp2.x);
      line.setAttribute("y2", kp2.y);
      line.setAttribute("visibility", "visible");
    } else {
      line.setAttribute("visibility", "hidden");
    }
  });
}

function drawRelativeSkeletonSVG(relativeKeypoints, svgElement) {
  const namespace = "http://www.w3.org/2000/svg";
  //console.log(relativeKeypoints);
  // Define the pairs of keypoints that form the skeleton
  const pairs = poseDetection.util.getAdjacentPairs(STATE.model);

  // Ensure we have the correct number of lines
  while (svgElement.children.length < pairs.length) {
    const line = document.createElementNS(namespace, "line");
    line.setAttribute("stroke", "white");
    line.setAttribute("stroke-width", "0.01"); // Adjust this value as needed
    svgElement.appendChild(line);
  }

  // Remove extra lines if any
  while (svgElement.children.length > pairs.length) {
    svgElement.removeChild(svgElement.lastChild);
  }

  // Update each line
  pairs.forEach(([i, j], index) => {
    const kp1 = relativeKeypoints[i];
    const kp2 = relativeKeypoints[j];

    const score1 = kp1.score != null ? kp1.score : 1;
    const score2 = kp2.score != null ? kp2.score : 1;
    const scoreThreshold = STATE.modelConfig.scoreThreshold || 0;

    const line = svgElement.children[index];

    if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
      line.setAttribute("x1", kp1.x);
      line.setAttribute("y1", kp1.y);
      line.setAttribute("x2", kp2.x);
      line.setAttribute("y2", kp2.y);
      line.setAttribute("visibility", "visible");
    } else {
      line.setAttribute("visibility", "hidden");
    }
  });

  // Draw the body center point
  let centerPoint = svgElement.querySelector("#bodyCenter");
  if (!centerPoint) {
    centerPoint = document.createElementNS(namespace, "circle");
    centerPoint.setAttribute("id", "bodyCenter");
    centerPoint.setAttribute("r", "0.02"); // Adjust this value as needed
    centerPoint.setAttribute("fill", "red");
    svgElement.appendChild(centerPoint);
  }
  centerPoint.setAttribute("cx", 0);
  centerPoint.setAttribute("cy", 0);

  // Optionally, draw keypoints
  relativeKeypoints.forEach((keypoint, index) => {
    if (keypoint.name === "body_center") return; // Skip body_center as it's already drawn

    let keypointElement = svgElement.querySelector(`#keypoint-${index}`);
    if (!keypointElement) {
      keypointElement = document.createElementNS(namespace, "circle");
      keypointElement.setAttribute("id", `keypoint-${index}`);
      keypointElement.setAttribute("r", "0.01"); // Adjust this value as needed
      keypointElement.setAttribute("fill", "#00FF00");
      svgElement.appendChild(keypointElement);
    }

    keypointElement.setAttribute("cx", keypoint.x);
    keypointElement.setAttribute("cy", keypoint.y);
    keypointElement.setAttribute(
      "visibility",
      keypoint.score >= (STATE.modelConfig.scoreThreshold || 0)
        ? "visible"
        : "hidden",
    );
  });
}

function calculateBodyCenter(keypoints) {
  // Find the keypoints for shoulders and hips
  const leftShoulder = keypoints.find((kp) => kp.name === "left_shoulder");
  const rightShoulder = keypoints.find((kp) => kp.name === "right_shoulder");
  const leftHip = keypoints.find((kp) => kp.name === "left_hip");
  const rightHip = keypoints.find((kp) => kp.name === "right_hip");

  // Check if all required keypoints are detected
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    console.warn(
      "Not all required keypoints detected for body center calculation",
    );
    return null;
  }

  // Calculate the average x and y coordinates
  const centerX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) /
    4;
  const centerY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) /
    4;

  // Calculate the average score
  const averageScore =
    (leftShoulder.score + rightShoulder.score + leftHip.score +
      rightHip.score) / 4;

  return {
    x: centerX,
    y: centerY,
    score: averageScore,
  };
}

function calculateRelativeKeypoints(keypoints) {
  // First, calculate the body center
  const bodyCenter = calculateBodyCenter(keypoints);

  if (!bodyCenter) {
    console.warn(
      "Couldn't calculate body center. Returning original keypoints.",
    );
    return keypoints;
  }

  // Find the maximum distance from the center to any keypoint
  let maxDistance = 0;
  keypoints.forEach((keypoint) => {
    const distanceX = Math.abs(keypoint.x - bodyCenter.x);
    const distanceY = Math.abs(keypoint.y - bodyCenter.y);
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  });

  // Create a new array to store the recalculated keypoints
  const relativeKeypoints = keypoints.map((keypoint) => {
    // Calculate the relative position
    const relativeX = (keypoint.x - bodyCenter.x) / maxDistance;
    const relativeY = (keypoint.y - bodyCenter.y) / maxDistance;

    // Return a new object with the normalized relative coordinates
    return {
      ...keypoint,
      x: relativeX,
      y: relativeY,
    };
  });

  // Add the body center as a new keypoint
  relativeKeypoints.push({
    name: "body_center",
    x: 0,
    y: 0,
    score: bodyCenter.score,
  });

  return relativeKeypoints;
}

async function run() {
  console.log("hi", STATE);

  const detector = await init();
  function loop() {
    if (video.paused) {
      console.log("paused");
      video.onplay = loop;
      return;
    }

    detect(detector).then((pose) => {
      if (pose) {
        drawResult(pose);
      }
      //@ts-ignore
      requestAnimationFrame(loop);
    });
  }

  loop();
}

const svgElement = document.getElementById("skeletonSvg");
const svgElementRelative = document.getElementById("relativeSkeletonSvg");

function resizeSVG() {
  svgElement.setAttribute(
    "viewBox",
    `0 0 ${video.videoWidth} ${video.videoHeight}`,
  );
}
const repetitionDetector = new RepetitiveMovementDetector();
// Resize the SVG when the video loads metadata and when the window resizes
video.addEventListener("loadedmetadata", resizeSVG);
window.addEventListener("resize", resizeSVG);

resizeSVG();

run();

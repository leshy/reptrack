import "npm:@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "npm:@tensorflow-models/pose-detection";
import * as tf from "npm:@tensorflow/tfjs-core";

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
    drawSkeletonSVG(pose.keypoints, svgElement);
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

function resizeSVG() {
  svgElement.setAttribute(
    "viewBox",
    `0 0 ${video.videoWidth} ${video.videoHeight}`,
  );
}

// Resize the SVG when the video loads metadata and when the window resizes
video.addEventListener("loadedmetadata", resizeSVG);
window.addEventListener("resize", resizeSVG);

resizeSVG();

run();

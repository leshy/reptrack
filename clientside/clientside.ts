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
    "scoreThreshold": 0.1,
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
    modelUrl: "/model/saved_model.pb",
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
  return (await detector.estimatePoses(
    video,
    { maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false },
    performance.now(),
  ))[0];
}

function clearCanvas() {
  ctx.clearRect(0, 0, this.video.videoWidth, this.video.videoHeight);
}

function drawResult(pose) {
  clearCanvas();
  if (pose.keypoints != null) {
    drawKeypoints(pose.keypoints);
    drawSkeleton(pose.keypoints);
  }
}
function drawSkeleton(keypoints) {
  ctx.fillStyle = "White";
  ctx.strokeStyle = "White";
  ctx.lineWidth = 2;

  poseDetection.util.getAdjacentPairs(STATE.model).forEach(([
    i,
    j,
  ]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];

    // If score is null, just show the keypoint.
    const score1 = kp1.score != null ? kp1.score : 1;
    const score2 = kp2.score != null ? kp2.score : 1;
    const scoreThreshold = STATE.modelConfig.scoreThreshold || 0;

    if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  });
}

function drawKeypoint(keypoint) {
  // If score is null, just show the keypoint.
  const score = keypoint.score != null ? keypoint.score : 1;
  const scoreThreshold = STATE.modelConfig.scoreThreshold || 0;

  if (score >= scoreThreshold) {
    const circle = new Path2D();
    circle.arc(keypoint.x, keypoint.y, 2, 0, 2 * Math.PI);
    ctx.fill(circle);
    ctx.stroke(circle);
  }
}

function drawKeypoints(keypoints) {
  ctx.fillStyle = "White";
  ctx.strokeStyle = "White";
  ctx.lineWidth = 1;

  const keypointInd = poseDetection.util.getKeypointIndexBySide(STATE.model);

  for (const i of keypointInd.middle) {
    drawKeypoint(keypoints[i]);
  }

  ctx.fillStyle = "Green";
  for (const i of keypointInd.left) {
    drawKeypoint(keypoints[i]);
  }

  ctx.fillStyle = "Orange";
  for (const i of keypointInd.right) {
    drawKeypoint(keypoints[i]);
  }
}

async function run() {
  console.log("hi", STATE);

  const detector = await init();
  //video.play();
  function loop() {
    if (video.paused) {
      console.log("paused");
      video.onplay = loop;
      return;
    }

    detect(detector).then((pose) => {
      if (pose && (pose.keypoints)) {
        drawResult(pose);
      }
      //@ts-ignore
      requestAnimationFrame(loop);
    });
  }

  loop();
}

const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
// Function to resize the canvas to match the video dimensions
function resizeCanvas() {
  canvas.width = video.clientWidth;
  canvas.height = video.clientHeight;
}

// Resize the canvas when the video loads and when the window resizes
video.addEventListener("loadedmetadata", resizeCanvas);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();

ctx.fillStyle = "Red";
ctx.strokeStyle = "Red";
ctx.lineWidth = 1;
// draw a center circle
ctx.beginPath();
ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, 2 * Math.PI);
ctx.fill();
ctx.stroke();
ctx.closePath();

run();

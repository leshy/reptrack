import "npm:@tensorflow/tfjs-backend-webgl";
import "npm:@tensorflow/tfjs-backend-webgpu";
import * as mpPose from "npm:@mediapipe/pose";

import * as tfjsWasm from "npm:@tensorflow/tfjs-backend-wasm";

tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`,
);

import * as posedetection from "npm:@tensorflow-models/pose-detection";
import * as tf from "npm:@tensorflow/tfjs-core";

import { setupStats } from "./stats_panel.js";
import { Context } from "./camera.ts";
import { setupDatGui } from "./option_panel.ts";
import { STATE } from "./params.js";
import { setBackendAndEnvFlags } from "./util.ts";

let detector, camera, stats;
let startInferenceTime, numInferences = 0;
let inferenceTimeSum = 0, lastPanelUpdate = 0;
let rafId;
const statusElement = document.getElementById("status");

async function createDetector() {
  switch (STATE.model) {
    case posedetection.SupportedModels.PoseNet:
      return posedetection.createDetector(STATE.model, {
        quantBytes: 4,
        architecture: "MobileNetV1",
        outputStride: 16,
        inputResolution: { width: 500, height: 500 },
        multiplier: 0.75,
      });
    case posedetection.SupportedModels.BlazePose:
      const runtime = STATE.backend.split("-")[0];
      if (runtime === "mediapipe") {
        return posedetection.createDetector(STATE.model, {
          runtime,
          modelType: STATE.modelConfig.type,
          solutionPath:
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${mpPose.VERSION}`,
        });
      } else if (runtime === "tfjs") {
        return posedetection.createDetector(
          STATE.model,
          { runtime, modelType: STATE.modelConfig.type },
        );
      }
    case posedetection.SupportedModels.MoveNet:
      const modelType = STATE.modelConfig.type == "lightning"
        ? posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        : posedetection.movenet.modelType.SINGLEPOSE_THUNDER;
      return posedetection.createDetector(STATE.model, { modelType });
  }
}

async function checkGuiUpdate() {
  if (STATE.isModelChanged || STATE.isFlagChanged || STATE.isBackendChanged) {
    STATE.isModelChanged = true;

    window.cancelAnimationFrame(rafId);

    detector.dispose();

    if (STATE.isFlagChanged || STATE.isBackendChanged) {
      await setBackendAndEnvFlags(STATE.flags, STATE.backend);
    }

    detector = await createDetector(STATE.model);
    STATE.isFlagChanged = false;
    STATE.isBackendChanged = false;
    STATE.isModelChanged = false;
  }
}

function beginEstimatePosesStats() {
  startInferenceTime = (performance || Date).now();
}

function endEstimatePosesStats() {
  const endInferenceTime = (performance || Date).now();
  inferenceTimeSum += endInferenceTime - startInferenceTime;
  ++numInferences;

  const panelUpdateMilliseconds = 1000;
  if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
    const averageInferenceTime = inferenceTimeSum / numInferences;
    inferenceTimeSum = 0;
    numInferences = 0;
    stats.customFpsPanel.update(
      1000.0 / averageInferenceTime,
      120, /* maxValue */
    );
    lastPanelUpdate = endInferenceTime;
  }
}

async function renderResult() {
  // FPS only counts the time it takes to finish estimatePoses.
  beginEstimatePosesStats();

  const poses = await detector.estimatePoses(
    camera.video,
    { maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false },
  );

  endEstimatePosesStats();

  camera.drawCtx();

  // The null check makes sure the UI is not in the middle of changing to a
  // different model. If during model change, the result is from an old
  // model, which shouldn't be rendered.
  if (poses.length > 0 && !STATE.isModelChanged) {
    camera.drawResults(poses);
  }
}

async function updateVideo(event) {
  // Clear reference to any previous uploaded video.
  URL.revokeObjectURL(camera.video.currentSrc);
  const file = event.target.files[0];
  camera.source.src = URL.createObjectURL(file);

  // Wait for video to be loaded.
  camera.video.load();
  await new Promise((resolve) => {
    camera.video.onloadeddata = () => {
      resolve(video);
    };
  });

  const videoWidth = camera.video.videoWidth;
  const videoHeight = camera.video.videoHeight;
  // Must set below two lines, otherwise video element doesn't show.
  camera.video.width = videoWidth;
  camera.video.height = videoHeight;
  camera.canvas.width = videoWidth;
  camera.canvas.height = videoHeight;

  statusElement.innerHTML = "Video is loaded.";
}

async function runFrame() {
  await checkGuiUpdate();
  if (video.paused) {
    // video has finished.
    camera.mediaRecorder.stop();
    camera.clearCtx();
    camera.video.style.visibility = "visible";
    return;
  }
  await renderResult();
  rafId = requestAnimationFrame(runFrame);
}

async function run() {
  statusElement.innerHTML = "Warming up model.";
  // Warming up pipeline.
  const [runtime, $backend] = STATE.backend.split("-");

  if (runtime === "tfjs") {
    const warmUpTensor = tf.fill(
      [camera.video.height, camera.video.width, 3],
      0,
      "float32",
    );
    await detector.estimatePoses(
      warmUpTensor,
      { maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false },
    );
    warmUpTensor.dispose();
    statusElement.innerHTML = "Model is warmed up.";
  }

  camera.video.style.visibility = "hidden";
  video.pause();
  video.currentTime = 0;
  video.play();
  camera.mediaRecorder.start();

  await new Promise((resolve) => {
    camera.video.onseeked = () => {
      resolve(video);
    };
  });

  await runFrame();
}

async function app() {
  // Gui content will change depending on which model is in the query string.
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has("model")) {
    alert("Cannot find model in the query string.");
    return;
  }

  await setupDatGui(urlParams);
  stats = setupStats();
  camera = new Context();

  await setBackendAndEnvFlags(STATE.flags, STATE.backend);
  await tf.ready();
  detector = await createDetector();

  const runButton = document.getElementById("submit");
  runButton.onclick = run;

  const uploadButton = document.getElementById("videofile");
  uploadButton.onchange = updateVideo;
}

app();

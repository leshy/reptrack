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
    circle.arc(keypoint.x, keypoint.y, 3, 0, 2 * Math.PI);
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
  ctx.strokeStyle = "Green";
  for (const i of keypointInd.left) {
    drawKeypoint(keypoints[i]);
  }

  ctx.fillStyle = "Orange";
  ctx.strokeStyle = "Orange";
  for (const i of keypointInd.right) {
    drawKeypoint(keypoints[i]);
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

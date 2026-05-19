import type { LandmarkPoint } from "./types";

// Finger joint triplet definitions: [mcp, pip, dip, tip] indices per finger
// We compute 3 angles per finger at the PIP, DIP, and TIP joints
const FINGER_CHAINS = [
  [0, 1, 2, 3, 4],    // thumb
  [0, 5, 6, 7, 8],    // index
  [0, 9, 10, 11, 12], // middle
  [0, 13, 14, 15, 16], // ring
  [0, 17, 18, 19, 20], // pinky
];

function norm3(p: LandmarkPoint): number {
  return Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
}

function sub3(a: LandmarkPoint, b: LandmarkPoint): LandmarkPoint {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot3(a: LandmarkPoint, b: LandmarkPoint): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function angle3(p1: LandmarkPoint, p2: LandmarkPoint, p3: LandmarkPoint): number {
  const v1 = sub3(p1, p2);
  const v2 = sub3(p3, p2);
  const n1 = norm3(v1);
  const n2 = norm3(v2);
  if (n1 < 1e-9 || n2 < 1e-9) return 0.0;
  const cosA = dot3(v1, v2) / (n1 * n2);
  return Math.acos(Math.max(-1, Math.min(1, cosA)));
}

function extractHandFeatures(
  hand: LandmarkPoint[],
  out: Float32Array,
  offset: number
): void {
  const wrist = hand[0];
  const middleMcp = hand[9];
  const scaleVec = sub3(wrist, middleMcp);
  const scale = Math.max(norm3(scaleVec), 1e-6);

  // 21 landmarks × 3 coords starting at offset
  for (let i = 0; i < 21; i++) {
    const rel = sub3(hand[i], wrist);
    out[offset + i * 3 + 0] = rel.x / scale;
    out[offset + i * 3 + 1] = rel.y / scale;
    out[offset + i * 3 + 2] = rel.z / scale;
  }

  // 15 joint angles starting at offset + 63
  const angOffset = offset + 63;
  let ai = 0;
  for (const chain of FINGER_CHAINS) {
    // 3 angles per finger: at joints [1,2], [2,3], [3,4] in the chain
    out[angOffset + ai++] = angle3(hand[chain[0]], hand[chain[1]], hand[chain[2]]);
    out[angOffset + ai++] = angle3(hand[chain[1]], hand[chain[2]], hand[chain[3]]);
    out[angOffset + ai++] = angle3(hand[chain[2]], hand[chain[3]], hand[chain[4]]);
  }
}

/**
 * Extracts a 162-element feature vector from one frame of MediaPipe Holistic output.
 * Indices [162:168] (wrist velocities) are filled by the hook after all 40 frames are collected.
 *
 * Returns null if pose is absent AND both hands are absent (tracking lost frame).
 */
export function extractKeypoints(
  poseLandmarks: LandmarkPoint[] | null | undefined,
  leftHandLandmarks: LandmarkPoint[] | null | undefined,
  rightHandLandmarks: LandmarkPoint[] | null | undefined
): Float32Array | null {
  const hasPose = poseLandmarks && poseLandmarks.length >= 33;
  const hasLeft = leftHandLandmarks && leftHandLandmarks.length === 21;
  const hasRight = rightHandLandmarks && rightHandLandmarks.length === 21;

  if (!hasPose && !hasLeft && !hasRight) return null;

  const features = new Float32Array(162); // wrist velocities [162:168] appended later

  if (hasPose) {
    const nose = poseLandmarks[0];
    const leftShoulder = poseLandmarks[11];
    const rightShoulder = poseLandmarks[12];
    const leftWrist = poseLandmarks[15];
    const rightWrist = poseLandmarks[16];

    const shoulderVec = sub3(leftShoulder, rightShoulder);
    const poseScale = Math.max(norm3(shoulderVec), 1e-6);

    const lw = sub3(leftWrist, nose);
    features[0] = lw.x / poseScale;
    features[1] = lw.y / poseScale;
    features[2] = lw.z / poseScale;

    const rw = sub3(rightWrist, nose);
    features[3] = rw.x / poseScale;
    features[4] = rw.y / poseScale;
    features[5] = rw.z / poseScale;
  }

  if (hasLeft) {
    extractHandFeatures(leftHandLandmarks, features, 6);
  }

  if (hasRight) {
    extractHandFeatures(rightHandLandmarks, features, 84);
  }

  return features;
}

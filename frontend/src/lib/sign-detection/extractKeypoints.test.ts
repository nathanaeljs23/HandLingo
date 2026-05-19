import { describe, it, expect } from "vitest";
import { extractKeypoints } from "./extractKeypoints";
import type { LandmarkPoint } from "./types";

// Generates a simple non-zero landmark array for smoke tests
function makeLandmarks(count: number, val = 0.1): LandmarkPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    x: val * (i + 1),
    y: val * (i + 1) * 0.5,
    z: val * (i + 1) * 0.1,
  }));
}

const pose33 = makeLandmarks(33);
const hand21 = makeLandmarks(21);

describe("extractKeypoints", () => {
  it("returns null when pose and both hands are absent", () => {
    expect(extractKeypoints(null, null, null)).toBeNull();
    expect(extractKeypoints(undefined, undefined, undefined)).toBeNull();
  });

  it("returns a 162-element Float32Array when pose is present", () => {
    const result = extractKeypoints(pose33, null, null);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(162);
  });

  it("produces non-zero wrist pose features when pose is present", () => {
    const result = extractKeypoints(pose33, null, null)!;
    // Indices 0-5 are left/right wrist relative to nose, scaled by shoulder dist
    const wristFeatures = Array.from(result.slice(0, 6));
    expect(wristFeatures.some((v) => v !== 0)).toBe(true);
  });

  it("keeps hand indices [6:84] all zero when left hand is missing", () => {
    const result = extractKeypoints(pose33, null, hand21)!;
    const leftHandSection = Array.from(result.slice(6, 84));
    expect(leftHandSection.every((v) => v === 0)).toBe(true);
  });

  it("keeps hand indices [84:162] all zero when right hand is missing", () => {
    const result = extractKeypoints(pose33, hand21, null)!;
    const rightHandSection = Array.from(result.slice(84, 162));
    expect(rightHandSection.every((v) => v === 0)).toBe(true);
  });

  it("produces no NaN or Infinity when both hands are present", () => {
    const result = extractKeypoints(pose33, hand21, hand21)!;
    for (let i = 0; i < result.length; i++) {
      expect(isFinite(result[i])).toBe(true);
    }
  });

  it("handles coincident wrist and middleMCP (zero scale) without NaN", () => {
    // All hand landmarks at the same position → hand_scale collapses to 0
    const samePoint = makeLandmarks(21, 0);
    const result = extractKeypoints(pose33, samePoint, null)!;
    for (let i = 0; i < result.length; i++) {
      expect(isFinite(result[i])).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Fixture parity test — skipped until the user supplies the fixture file.
  //
  // To generate it, run the Python helper:
  //   python artifacts/dump_fixture.py
  // which saves one frame of MediaPipe output + the 162-dim Python feature
  // vector to: frontend/src/lib/sign-detection/__fixtures__/sample_landmarks.json
  // -------------------------------------------------------------------------
  it.skip("matches Python extract_keypoints output within 0.01 tolerance", async () => {
    const fixture = await import("./__fixtures__/sample_landmarks.json");
    const { pose_landmarks, left_hand_landmarks, right_hand_landmarks, expected_features_0_to_162 } = fixture;

    const result = extractKeypoints(
      pose_landmarks as LandmarkPoint[],
      left_hand_landmarks as LandmarkPoint[] | null,
      right_hand_landmarks as LandmarkPoint[] | null
    )!;

    expect(result).not.toBeNull();
    for (let i = 0; i < 162; i++) {
      expect(Math.abs(result[i] - expected_features_0_to_162[i])).toBeLessThan(0.01);
    }
  });
});

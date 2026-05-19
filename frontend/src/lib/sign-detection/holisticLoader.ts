import { Holistic, Results } from "@mediapipe/holistic";

export function createHolistic(onResults: (results: Results) => void): Holistic {
  const holistic = new Holistic({
    locateFile: (file) => `/mediapipe/holistic/${file}`,
  });

  holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    refineFaceLandmarks: false,
    enableSegmentation: false,
    minDetectionConfidence: 0.8,
    minTrackingConfidence: 0.8,
  });

  holistic.onResults(onResults);
  return holistic;
}

import { useEffect, useRef, useState, useCallback } from "react";
import type { Results } from "@mediapipe/holistic";
import { createHolistic } from "@/lib/sign-detection/holisticLoader";
import { loadModel, scoreSequenceForTarget, LoadedModel } from "@/lib/sign-detection/signModel";
import { extractKeypoints } from "@/lib/sign-detection/extractKeypoints";
import {
  SEQUENCE_LENGTH,
  MISSING_FRAMES_TOLERANCE,
  MODEL_PATH,
  CONFIG_PATH,
  FEATURE_SIZE,
} from "@/lib/sign-detection/constants";
import type {
  SignDetectorState,
  SignDetectorResult,
  UseSignDetectorOptions,
  UseSignDetectorReturn,
} from "@/lib/sign-detection/types";

// Recording capture rate — matches the ~30fps used during Python training data collection.
// Total recording duration: 40 frames / 30fps ≈ 1.33s.
const RECORDING_FPS = 30;
const RECORDING_INTERVAL_MS = 1000 / RECORDING_FPS;

export function useSignDetector({
  targetSign,
  onResult,
}: UseSignDetectorOptions): UseSignDetectorReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [state, setState] = useState<SignDetectorState>("INITIALIZING");
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [countdownValue, setCountdownValue] = useState(0);
  const [framesRecorded, setFramesRecorded] = useState(0);
  const [trackingLost, setTrackingLost] = useState(false);
  const [lastResult, setLastResult] = useState<SignDetectorResult | null>(null);

  const loadedModelRef     = useRef<LoadedModel | null>(null);
  const stateRef           = useRef<SignDetectorState>("INITIALIZING");
  const sequenceRef        = useRef<Float32Array[]>([]);
  const missingFramesRef   = useRef(0);
  const animFrameRef       = useRef<number>(0);
  const streamRef          = useRef<MediaStream | null>(null);
  const holisticRef        = useRef<ReturnType<typeof createHolistic> | null>(null);
  const targetSignRef      = useRef(targetSign);
  const onResultRef        = useRef(onResult);
  const latestResultsRef   = useRef<Results | null>(null);
  const recordingTimerRef  = useRef<number | null>(null);

  useEffect(() => { targetSignRef.current = targetSign; }, [targetSign]);
  useEffect(() => { onResultRef.current   = onResult;   }, [onResult]);

  const setStateSync = useCallback((s: SignDetectorState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // MediaPipe results callback: ONLY caches the latest result.
  // Frame collection happens on a separate fixed-rate timer (see captureLoop).
  // ─────────────────────────────────────────────────────────────────────────
  const handleResults = useCallback((results: Results) => {
    latestResultsRef.current = results;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fixed-rate frame capture (30 fps).
  //
  // Reads latestResultsRef on a schedule of t = startTime + N * 33.33ms,
  // independent of how fast/slow MediaPipe is processing. This guarantees
  // the 0→40 progress always advances at a constant tempo and the total
  // recording duration is always ~1.33s (matching training).
  // ─────────────────────────────────────────────────────────────────────────
  const startRecordingCapture = useCallback(() => {
    // Anchor the schedule one interval ahead so the first frame is captured
    // at t = INTERVAL (not t = 0). This lets React render "0/40" before
    // the first setFramesRecorded(1) call lands.
    const startTime = performance.now() + RECORDING_INTERVAL_MS;
    let frameCount = 0;
    sequenceRef.current = [];
    missingFramesRef.current = 0;
    setFramesRecorded(0);

    const captureTick = () => {
      if (stateRef.current !== "RECORDING") return; // aborted externally

      const results = latestResultsRef.current;
      const frame = results
        ? extractKeypoints(
            results.poseLandmarks as any,
            results.leftHandLandmarks as any,
            results.rightHandLandmarks as any
          )
        : null;

      if (frame === null) {
        missingFramesRef.current += 1;
        if (missingFramesRef.current > MISSING_FRAMES_TOLERANCE) {
          setStateSync("IDLE");
          setTrackingLost(true);
          sequenceRef.current = [];
          missingFramesRef.current = 0;
          setFramesRecorded(0);
          return;
        }
        // Carry the previous frame forward (or zeros if we haven't captured one yet)
        const prev =
          sequenceRef.current.length > 0
            ? sequenceRef.current[sequenceRef.current.length - 1]
            : new Float32Array(FEATURE_SIZE);
        sequenceRef.current.push(new Float32Array(prev));
      } else {
        missingFramesRef.current = 0;
        sequenceRef.current.push(frame);
      }

      frameCount += 1;
      setFramesRecorded(frameCount);

      if (frameCount >= SEQUENCE_LENGTH) {
        const seq = sequenceRef.current.slice(0, SEQUENCE_LENGTH);
        sequenceRef.current = [];
        missingFramesRef.current = 0;

        setStateSync("SCORING");

        // Defer inference so SCORING state can paint
        setTimeout(() => {
          if (!loadedModelRef.current) {
            setStateSync("IDLE");
            return;
          }
          const result = scoreSequenceForTarget(
            loadedModelRef.current,
            seq,
            targetSignRef.current
          );
          setLastResult(result);
          onResultRef.current?.(result);
          setFramesRecorded(0);
          setStateSync("IDLE");
        }, 0);
        return;
      }

      // Drift-free scheduling: each tick is anchored to startTime + N * interval,
      // not to the previous tick's end. setTimeout drift never accumulates.
      const nextTime = startTime + frameCount * RECORDING_INTERVAL_MS;
      const wait = Math.max(0, nextTime - performance.now());
      recordingTimerRef.current = window.setTimeout(captureTick, wait);
    };

    // Schedule the first tick one interval out so "0/40" paints before "1/40".
    recordingTimerRef.current = window.setTimeout(captureTick, RECORDING_INTERVAL_MS);
  }, [setStateSync]);

  // ─────────────────────────────────────────────────────────────────────────
  // Bootstrap: wait for <video> → camera → model → holistic → frame loop
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function waitForVideoEl(timeoutMs = 15000): Promise<HTMLVideoElement> {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (cancelled) throw new Error("cancelled");
        if (videoRef.current) return videoRef.current;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error("Video element did not mount within " + timeoutMs + "ms");
    }

    async function frameLoop() {
      // Sends video frames to MediaPipe continuously. Awaits each send so frames
      // don't pile up faster than MediaPipe can process them.
      if (cancelled) return;
      const video = videoRef.current;
      const holistic = holisticRef.current;

      if (video && holistic && video.readyState >= 2 && !video.paused) {
        try {
          await holistic.send({ image: video });
        } catch {
          // per-frame errors are non-fatal
        }
      }

      if (!cancelled) {
        animFrameRef.current = requestAnimationFrame(() => { void frameLoop(); });
      }
    }

    async function init() {
      try {
        const video = await waitForVideoEl();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        video.srcObject = stream;
        try {
          await video.play();
        } catch (e) {
          console.warn("[useSignDetector] video.play() rejected:", e);
        }

        const loaded = await loadModel(MODEL_PATH, CONFIG_PATH);
        if (cancelled) return;
        loadedModelRef.current = loaded;

        const holistic = createHolistic(handleResults);
        holisticRef.current = holistic;

        setIsLoading(false);
        setIsReady(true);
        setStateSync("IDLE");
        void frameLoop();
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        console.error("[useSignDetector] init failed:", e);
        setLoadError(e);
        setIsLoading(false);
        setStateSync("ERROR");
      }
    }

    void init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      if (recordingTimerRef.current !== null) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      try { holisticRef.current?.close(); } catch { /* ignore */ }
      holisticRef.current = null;
      loadedModelRef.current?.weights.forEach((t) => t.dispose());
      loadedModelRef.current = null;
      stateRef.current = "INITIALIZING";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAttempt = useCallback(() => {
    if (stateRef.current !== "IDLE") return;

    setTrackingLost(false);
    setLastResult(null);
    sequenceRef.current = [];
    missingFramesRef.current = 0;
    setFramesRecorded(0);

    setStateSync("COUNTDOWN");
    setCountdownValue(3);

    let count = 3;
    const countdownTimer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownTimer);
        setCountdownValue(0);
        setStateSync("RECORDING");
        startRecordingCapture();
      } else {
        setCountdownValue(count);
      }
    }, 1000);
  }, [setStateSync, startRecordingCapture]);

  const resetResult = useCallback(() => {
    setLastResult(null);
    setTrackingLost(false);
  }, []);

  return {
    isReady,
    isLoading,
    loadError,
    state,
    countdownValue,
    framesRecorded,
    trackingLost,
    lastResult,
    videoRef,
    canvasRef,
    startAttempt,
    resetResult,
  };
}

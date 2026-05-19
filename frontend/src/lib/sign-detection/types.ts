export type Feedback = "good" | "almost" | "wrong_sign" | "not_prepared";

export type SignDetectorState =
  | "INITIALIZING"
  | "IDLE"
  | "COUNTDOWN"
  | "RECORDING"
  | "SCORING"
  | "ERROR";

export interface SignDetectorResult {
  passed: boolean;
  score: number;
  feedback: Feedback;
  predictedLabel: string;
}

export interface UseSignDetectorOptions {
  targetSign: string;
  onResult?: (result: SignDetectorResult) => void;
}

export interface UseSignDetectorReturn {
  isReady: boolean;
  isLoading: boolean;
  loadError: Error | null;

  state: SignDetectorState;
  countdownValue: number;
  framesRecorded: number;
  trackingLost: boolean;

  lastResult: SignDetectorResult | null;

  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;

  startAttempt: () => void;
  resetResult: () => void;
}

export interface InferenceConfig {
  label_map: Record<string, number>;
  idle_class_index: number;
  temperature: number;
  production_threshold: number;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

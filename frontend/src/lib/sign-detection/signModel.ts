import * as tf from "@tensorflow/tfjs";
import type { InferenceConfig, SignDetectorResult } from "./types";
import { SEQUENCE_LENGTH, FEATURE_SIZE } from "./constants";

export interface LoadedModel {
  weights: Map<string, tf.Tensor>;
  config: InferenceConfig;
  idxToLabel: Record<number, string>;
}

// ---------------------------------------------------------------------------
// Weight loading
// ---------------------------------------------------------------------------

interface WeightSpec {
  name: string;
  shape: number[];
  dtype: string;
}

async function loadWeights(
  weightsManifest: Array<{ paths: string[]; weights: WeightSpec[] }>,
  modelDir: string
): Promise<Map<string, tf.Tensor>> {
  const weightSpecs = weightsManifest.flatMap((e) => e.weights);
  const weightPaths = weightsManifest.flatMap((e) => e.paths);

  const buffers = await Promise.all(
    weightPaths.map((p) => fetch(modelDir + p).then((r) => r.arrayBuffer()))
  );

  const totalBytes = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalBytes);
  let byteOff = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), byteOff);
    byteOff += buf.byteLength;
  }

  const f32 = new Float32Array(combined.buffer);
  const tensorMap = new Map<string, tf.Tensor>();
  let elemOff = 0;

  for (const spec of weightSpecs) {
    const n = spec.shape.reduce((a, b) => a * b, 1);
    tensorMap.set(
      spec.name,
      tf.tensor(Array.from(f32.subarray(elemOff, elemOff + n)), spec.shape, "float32")
    );
    elemOff += n;
  }

  return tensorMap;
}

// ---------------------------------------------------------------------------
// GRU with reset_after=True (Keras 3 / CuDNN variant)
//
// Equations (matching Python keras/src/layers/rnn/gru.py, reset_after=True):
//   matrix_x = x @ kernel + bias[0]          shape (batch, 3*units)
//   matrix_h = h @ recKernel + bias[1]        shape (batch, 3*units)
//   z = sigmoid(matrix_x[z] + matrix_h[z])
//   r = sigmoid(matrix_x[r] + matrix_h[r])
//   hh = tanh(matrix_x[hh] + r * matrix_h[hh])   <-- reset AFTER recurrent bias
//   h_new = (1 - z) * hh + z * h_prev
//
// bias shape: (2, 3*units) — bias[0] = input bias, bias[1] = recurrent bias
// ---------------------------------------------------------------------------

function gruCellStep(
  x: tf.Tensor2D,
  hPrev: tf.Tensor2D,
  kernel: tf.Tensor2D,
  recKernel: tf.Tensor2D,
  bias: tf.Tensor2D,
  units: number
): tf.Tensor2D {
  const bIn  = bias.slice([0, 0], [1, 3 * units]).reshape([3 * units]) as tf.Tensor1D;
  const bRec = bias.slice([1, 0], [1, 3 * units]).reshape([3 * units]) as tf.Tensor1D;

  const matX = tf.add(tf.matMul(x, kernel), bIn)  as tf.Tensor2D;
  const matH = tf.add(tf.matMul(hPrev, recKernel), bRec) as tf.Tensor2D;

  const [zX, rX, hhX] = tf.split(matX, 3, 1) as tf.Tensor2D[];
  const [zH, rH, hhH] = tf.split(matH, 3, 1) as tf.Tensor2D[];

  const z  = tf.sigmoid(tf.add(zX, zH)) as tf.Tensor2D;
  const r  = tf.sigmoid(tf.add(rX, rH)) as tf.Tensor2D;
  const hh = tf.tanh(tf.add(hhX, tf.mul(r, hhH))) as tf.Tensor2D;

  return tf.add(
    tf.mul(tf.sub(tf.onesLike(z), z), hh),
    tf.mul(z, hPrev)
  ) as tf.Tensor2D;
}

function gruLayer(
  input: tf.Tensor3D,
  kernel: tf.Tensor2D,
  recKernel: tf.Tensor2D,
  bias: tf.Tensor2D,
  units: number,
  returnSequences: boolean
): tf.Tensor2D | tf.Tensor3D {
  const batch   = input.shape[0];
  const seqLen  = input.shape[1];
  const inDim   = input.shape[2];

  let h = tf.zeros([batch, units]) as tf.Tensor2D;
  const allH: tf.Tensor2D[] = [];

  for (let t = 0; t < seqLen; t++) {
    const xt = input.slice([0, t, 0], [batch, 1, inDim]).reshape([batch, inDim]) as tf.Tensor2D;
    h = gruCellStep(xt, h, kernel, recKernel, bias, units);
    if (returnSequences) allH.push(h);
  }

  return returnSequences
    ? (tf.stack(allH, 1) as tf.Tensor3D)
    : h;
}

// ---------------------------------------------------------------------------
// Full model forward pass (Dropout layers are no-ops at inference time)
// ---------------------------------------------------------------------------

function runInference(loaded: LoadedModel, flat: Float32Array): number[] {
  const w = loaded.weights;

  const probTensor = tf.tidy(() => {
    const input = tf.tensor3d(Array.from(flat), [1, SEQUENCE_LENGTH, FEATURE_SIZE]);

    const gru1Out = gruLayer(
      input,
      w.get("sequential/gru/gru_cell/kernel")!      as tf.Tensor2D,
      w.get("sequential/gru/gru_cell/recurrent_kernel")! as tf.Tensor2D,
      w.get("sequential/gru/gru_cell/bias")!         as tf.Tensor2D,
      64,
      true
    ) as tf.Tensor3D;

    const gru2Out = gruLayer(
      gru1Out,
      w.get("sequential/gru_1/gru_cell/kernel")!      as tf.Tensor2D,
      w.get("sequential/gru_1/gru_cell/recurrent_kernel")! as tf.Tensor2D,
      w.get("sequential/gru_1/gru_cell/bias")!         as tf.Tensor2D,
      32,
      false
    ) as tf.Tensor2D;

    const d1 = tf.relu(
      tf.add(
        tf.matMul(gru2Out, w.get("sequential/dense/kernel")! as tf.Tensor2D),
        w.get("sequential/dense/bias")! as tf.Tensor1D
      )
    ) as tf.Tensor2D;

    const logits = tf.add(
      tf.matMul(d1, w.get("sequential/dense_1/kernel")! as tf.Tensor2D),
      w.get("sequential/dense_1/bias")! as tf.Tensor1D
    ) as tf.Tensor2D;

    return tf.softmax(logits);
  });

  const probs = Array.from(probTensor.dataSync());
  probTensor.dispose();
  return probs;
}

// ---------------------------------------------------------------------------
// Softmax helper for temperature calibration
// ---------------------------------------------------------------------------

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadModel(modelPath: string, configPath: string): Promise<LoadedModel> {
  const modelDir = modelPath.substring(0, modelPath.lastIndexOf("/") + 1);

  const [modelJson, configRes] = await Promise.all([
    fetch(modelPath).then((r) => r.json()),
    fetch(configPath),
  ]);

  const config: InferenceConfig = await configRes.json();
  const weights = await loadWeights(modelJson.weightsManifest, modelDir);

  const idxToLabel: Record<number, string> = {};
  for (const [label, idx] of Object.entries(config.label_map)) {
    idxToLabel[idx as number] = label;
  }

  const loaded: LoadedModel = { weights, config, idxToLabel };

  // Warm-up: triggers TF.js JIT so first real inference is fast
  const dummyFlat = new Float32Array(SEQUENCE_LENGTH * FEATURE_SIZE);
  runInference(loaded, dummyFlat);

  return loaded;
}

export function scoreSequenceForTarget(
  loaded: LoadedModel,
  sequence: Float32Array[],
  targetSign: string
): SignDetectorResult {
  const { config, idxToLabel } = loaded;

  // Build flat buffer with wrist velocities filled in
  const flat = new Float32Array(SEQUENCE_LENGTH * FEATURE_SIZE);
  for (let t = 0; t < SEQUENCE_LENGTH; t++) {
    flat.set(sequence[t], t * FEATURE_SIZE);
  }
  for (let t = 1; t < SEQUENCE_LENGTH; t++) {
    for (let k = 0; k < 6; k++) {
      flat[t * FEATURE_SIZE + 162 + k] =
        flat[t * FEATURE_SIZE + k] - flat[(t - 1) * FEATURE_SIZE + k];
    }
  }

  const probsArray = runInference(loaded, flat);

  // Temperature calibration
  const logits    = probsArray.map((p) => Math.log(Math.max(p, 1e-12)));
  const calibrated = softmax(logits.map((l) => l / config.temperature));

  const predictedIdx = calibrated.indexOf(Math.max(...calibrated));

  if (predictedIdx === config.idle_class_index) {
    return { passed: false, score: 0, feedback: "not_prepared", predictedLabel: "idle" };
  }

  const predictedLabel = idxToLabel[predictedIdx] ?? "unknown";
  const targetIdx      = config.label_map[targetSign];

  if (targetIdx === undefined || predictedIdx !== targetIdx) {
    const targetScore = targetIdx !== undefined
      ? Math.round(calibrated[targetIdx] * 100)
      : 0;
    return { passed: false, score: targetScore, feedback: "wrong_sign", predictedLabel };
  }

  const score  = Math.round(calibrated[targetIdx] * 100);
  const passed = calibrated[targetIdx] >= config.production_threshold;

  return {
    passed,
    score,
    feedback: passed ? "good" : "almost",
    predictedLabel: targetSign,
  };
}

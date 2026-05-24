// Copies MediaPipe Holistic binary assets from node_modules to public/
// so the browser can load them locally without hitting a CDN.
// Run automatically via the postinstall npm script.
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src  = path.join(__dirname, "..", "node_modules", "@mediapipe", "holistic");
const dest = path.join(__dirname, "..", "public", "mediapipe", "holistic");

fs.mkdirSync(dest, { recursive: true });

const EXTS = [".js", ".wasm", ".binarypb", ".data", ".tflite"];
let copied = 0;
for (const file of fs.readdirSync(src)) {
  if (EXTS.some((e) => file.endsWith(e))) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
    copied++;
  }
}
console.log(`[copy-mediapipe] ${copied} files → public/mediapipe/holistic/`);

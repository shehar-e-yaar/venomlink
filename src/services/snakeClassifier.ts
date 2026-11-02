import type { InferenceSession } from "onnxruntime-web";
export type SpeciesMatch = { name: string; score: number };
let session: Promise<InferenceSession> | null = null;
let labels: Promise<string[]> | null = null;
export async function classifySnake(
  imageUrl: string,
  onStatus: (message: string) => void,
): Promise<SpeciesMatch[]> {
  onStatus("Loading your species model (63 MB on first use)...");
  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = `${location.origin}${import.meta.env.BASE_URL}models/runtime/`;
  labels ||= fetch(`${import.meta.env.BASE_URL}models/snake-teller.json`).then(
    async (r) => {
      if (!r.ok) throw new Error("Species labels unavailable.");
      return (await r.json()).labels;
    },
  );
  session ||= ort.InferenceSession.create(
    `${import.meta.env.BASE_URL}models/snake-teller.onnx`,
    { executionProviders: ["wasm"], graphOptimizationLevel: "all" },
  ).catch((error) => {
    session = null;
    throw error;
  });
  const [model, names] = await Promise.all([session, labels]);
  const image = new Image();
  image.src = imageUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 224;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image processing unavailable.");
  const scale = 224 / Math.min(image.naturalWidth, image.naturalHeight);
  const width = Math.floor(image.naturalWidth * scale),
    height = Math.floor(image.naturalHeight * scale);
  // Same aspect-preserving shortest-side resize and center crop as the supplied classifier.
  const resized = document.createElement("canvas");
  resized.width = width;
  resized.height = height;
  const rc = resized.getContext("2d");
  if (!rc) throw new Error("Image processing unavailable.");
  rc.drawImage(image, 0, 0, width, height);
  context.drawImage(
    resized,
    Math.round((width - 224) / 2),
    Math.round((height - 224) / 2),
    224,
    224,
    0,
    0,
    224,
    224,
  );
  const pixels = context.getImageData(0, 0, 224, 224).data,
    data = new Float32Array(3 * 224 * 224);
  for (let i = 0; i < 224 * 224; i++) {
    data[i] = pixels[i * 4] / 255;
    data[i + 224 * 224] = pixels[i * 4 + 1] / 255;
    data[i + 2 * 224 * 224] = pixels[i * 4 + 2] / 255;
  }
  onStatus("Comparing 498 species on your device...");
  const outputs = await model.run({
    [model.inputNames[0]]: new ort.Tensor("float32", data, [1, 3, 224, 224]),
  });
  const scores = Array.from(outputs[model.outputNames[0]].data as Float32Array);
  if (scores.length !== names.length || scores.some((n) => !Number.isFinite(n)))
    throw new Error("Invalid classifier output.");
  return scores
    .map((score, index) => ({ name: names[index].replaceAll("_", " "), score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

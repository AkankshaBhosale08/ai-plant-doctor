/* Model inference layer. No DOM/UI code here except an off-screen canvas for pixel access.
   Runs a real pretrained image classifier (ONNX) in the browser with onnxruntime-web.
   Nothing is simulated: if the model files cannot be loaded, load() rejects and the UI
   shows "detection unavailable". */
(function (root) {
  "use strict";

  const ORT_VERSION = "1.17.1";
  const ORT_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ORT_VERSION + "/dist/";
  const FILES = {
    model: "model/plant_disease.onnx",   // created by tools/convert_model.py
    labels: "model/labels.json",         // class names, in the model's output order
    preprocess: "model/preprocess.json"  // resize/crop/mean/std copied from the model's own config
  };

  let session = null, labels = null, pre = null, loading = null;

  function fail(code, detail) { const e = new Error(code + (detail ? ": " + detail : "")); e.code = code; return e; }

  /** Load the onnxruntime-web library from CDN (only once). */
  function loadOrt() {
    if (root.ort) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = ORT_BASE + "ort.min.js";
      s.onload = () => (root.ort ? resolve() : reject(fail("ORT_LOAD")));
      s.onerror = () => reject(fail("ORT_LOAD"));
      document.head.appendChild(s);
    });
  }

  async function fetchOk(url, kind) {
    let res;
    try { res = await fetch(url, { cache: "no-cache" }); } catch (e) { throw fail("MODEL_FETCH", url); }
    if (!res.ok) throw fail("MODEL_FETCH", url + " (HTTP " + res.status + ")");
    return kind === "json" ? res.json() : res.arrayBuffer();
  }

  /** Load library, config files and the model. Safe to call repeatedly. */
  function load() {
    if (session) return Promise.resolve(getInfo());
    if (loading) return loading;
    loading = (async () => {
      await loadOrt();
      root.ort.env.wasm.wasmPaths = ORT_BASE;
      root.ort.env.wasm.numThreads = 1;   // avoids needing special cross-origin headers on static hosts
      const [l, p, buf] = await Promise.all([
        fetchOk(FILES.labels, "json"), fetchOk(FILES.preprocess, "json"), fetchOk(FILES.model, "buffer")
      ]);
      if (!Array.isArray(l) || l.length < 2) throw fail("BAD_LABELS");
      if (!p || !p.crop_size || !p.mean || !p.std) throw fail("BAD_PREPROCESS");
      if (buf.byteLength < 100000) throw fail("BAD_MODEL", "file is too small");
      try {
        session = await root.ort.InferenceSession.create(new Uint8Array(buf), { executionProviders: ["wasm"] });
      } catch (e) { throw fail("MODEL_PARSE", e && e.message); }
      labels = l; pre = p;
      return getInfo();
    })().catch((e) => { loading = null; session = null; throw e; });
    return loading;
  }

  function getInfo() { return { ready: !!session, numClasses: labels ? labels.length : 0, labels: labels ? labels.slice() : [] }; }

  /** Image element -> Float32 NCHW tensor data, using the model's own preprocessing settings. */
  function toTensorData(img) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) throw fail("BAD_IMAGE");
    const crop = pre.crop_size;
    const shortest = Math.max(pre.resize_shortest_edge || crop, crop);
    const scale = shortest / Math.min(w, h);
    const rw = Math.max(crop, Math.round(w * scale)), rh = Math.max(crop, Math.round(h * scale));
    const c = document.createElement("canvas");
    c.width = rw; c.height = rh;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, rw, rh);          // transparent PNG -> white
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, rw, rh);
    const x0 = Math.floor((rw - crop) / 2), y0 = Math.floor((rh - crop) / 2);
    const px = ctx.getImageData(x0, y0, crop, crop).data;
    const plane = crop * crop, out = new Float32Array(3 * plane);
    const rescale = pre.rescale == null ? 1 / 255 : pre.rescale;
    for (let i = 0; i < plane; i++) {
      for (let ch = 0; ch < 3; ch++) {
        out[ch * plane + i] = (px[i * 4 + ch] * rescale - pre.mean[ch]) / pre.std[ch];
      }
    }
    return out;
  }

  /** Numerically stable softmax. */
  function softmax(logits) {
    let max = -Infinity;
    for (const v of logits) if (v > max) max = v;
    const ex = Array.from(logits, (v) => Math.exp(v - max));
    const sum = ex.reduce((a, b) => a + b, 0);
    return ex.map((v) => v / sum);
  }

  /** Run the model on an <img>. If selectedCrop is provided, rank only that crop's classes.
      Probabilities are normalized within the selected crop and must not be read as proof
      that the photo really belongs to that crop. */
  async function classify(img, topK, selectedCrop) {
    if (!session) throw fail("NOT_LOADED");
    const data = toTensorData(img);
    const cropSize = pre.crop_size;
    const input = new root.ort.Tensor("float32", data, [1, 3, cropSize, cropSize]);
    const outputs = await session.run({ [session.inputNames[0]]: input });
    const logits = outputs[session.outputNames[0]].data;
    if (logits.length !== labels.length) throw fail("LABEL_MISMATCH", logits.length + " vs " + labels.length);

    let indices = labels.map((_, i) => i);
    if (selectedCrop) {
      indices = indices.filter((i) => labels[i].startsWith(selectedCrop + "___"));
      if (!indices.length) throw fail("CROP_NOT_SUPPORTED", selectedCrop);
    }
    const selectedLogits = indices.map((i) => logits[i]);
    const probs = softmax(selectedLogits);
    const ranked = indices.map((labelIndex, j) => ({
      index: labelIndex,
      label: labels[labelIndex],
      probability: probs[j]
    })).sort((a, b) => b.probability - a.probability).slice(0, topK || 3);
    return { top: ranked, selectedCrop: selectedCrop || null, cropFiltered: !!selectedCrop };
  }

  const api = { load, classify, getInfo, softmax, FILES };
  root.PlantModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

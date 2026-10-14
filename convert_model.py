#!/usr/bin/env python3
"""
One-time converter: downloads the pretrained model from Hugging Face and writes the three
files the website needs into ../model/ :

    plant_disease.onnx   (the network, ONNX format, ~9 MB)
    labels.json          (class names in output order)
    preprocess.json      (resize / crop / mean / std taken from the model's own config)

Model:   neghani/plantvillage-mobilenetv2   (Apache-2.0)
Needs:   Python 3.9+ and internet access. Free to run locally or in Google Colab.
Install: pip install torch transformers onnx onnxruntime numpy safetensors pillow
Run:     python tools/convert_model.py

The script compares PyTorch and ONNX outputs and stops with an error if they differ.
"""
import argparse, json, pathlib, sys

import numpy as np
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification

REPO = "neghani/plantvillage-mobilenetv2"


class LogitsOnly(torch.nn.Module):
    """Wrap the model so ONNX export gets a plain tensor output."""
    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, pixel_values):
        return self.m(pixel_values=pixel_values).logits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=REPO)
    ap.add_argument("--revision", default="v1.0",
                    help="Hugging Face tag/commit to pin (the model card documents tag v1.0).")
    ap.add_argument("--out", default=str(pathlib.Path(__file__).resolve().parent.parent / "model"))
    args = ap.parse_args()
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    print(f"Downloading {args.repo} @ {args.revision} ...")
    model = AutoModelForImageClassification.from_pretrained(args.repo, revision=args.revision).eval()
    proc = AutoImageProcessor.from_pretrained(args.repo, revision=args.revision)

    # --- preprocessing settings, copied from the model's own preprocessor config ---
    size = getattr(proc, "size", {}) or {}
    crop = getattr(proc, "crop_size", None)
    if crop and getattr(proc, "do_center_crop", True):
        crop_px = int(crop.get("height") or crop.get("shortest_edge"))
    else:
        crop_px = int(size.get("height") or size.get("shortest_edge") or 224)
    resize = int(size.get("shortest_edge") or size.get("height") or crop_px)
    pre = {
        "resize_shortest_edge": max(resize, crop_px),
        "crop_size": crop_px,
        "mean": [float(x) for x in proc.image_mean],
        "std": [float(x) for x in proc.image_std],
        "rescale": float(getattr(proc, "rescale_factor", 1 / 255)),
        "source": f"{args.repo}@{args.revision}",
    }

    # --- labels in output order ---
    id2label = model.config.id2label
    labels = [id2label[i] for i in range(len(id2label))]

    # --- export ---
    wrapped = LogitsOnly(model).eval()
    dummy = torch.randn(1, 3, crop_px, crop_px)
    onnx_path = out / "plant_disease.onnx"
    kwargs = dict(input_names=["pixel_values"], output_names=["logits"],
                  dynamic_axes={"pixel_values": {0: "batch"}, "logits": {0: "batch"}},
                  opset_version=13, do_constant_folding=True)
    try:
        torch.onnx.export(wrapped, (dummy,), str(onnx_path), dynamo=False, **kwargs)  # newer torch
    except TypeError:
        torch.onnx.export(wrapped, (dummy,), str(onnx_path), **kwargs)                # older torch

    # --- verify ONNX == PyTorch ---
    import onnxruntime as ort
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    x = torch.randn(2, 3, crop_px, crop_px)
    with torch.no_grad():
        ref = wrapped(x).numpy()
    got = sess.run(None, {"pixel_values": x.numpy()})[0]
    diff = float(np.abs(ref - got).max())
    print(f"Max difference PyTorch vs ONNX: {diff:.2e}")
    if diff > 1e-3 or got.shape[1] != len(labels):
        sys.exit("ERROR: ONNX output does not match the PyTorch model. Do not use these files.")

    (out / "labels.json").write_text(json.dumps(labels, indent=1), encoding="utf-8")
    (out / "preprocess.json").write_text(json.dumps(pre, indent=1), encoding="utf-8")
    print(f"Done. {len(labels)} classes. Files written to {out}")


if __name__ == "__main__":
    main()

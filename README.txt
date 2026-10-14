This folder must contain three files before the website can analyze leaves:

  plant_disease.onnx
  labels.json
  preprocess.json

Create them once by running:   python tools/convert_model.py
(see the main README.md, step 1). Until they exist, the website shows
"Disease detection is temporarily unavailable" and never shows a result.

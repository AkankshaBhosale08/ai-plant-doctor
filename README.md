# AI Plant Doctor
**AI-Based Plant Disease Detection and Multilingual Farmer Assistance System**
(Marathi / English / Hindi. Static website: HTML + CSS + vanilla JavaScript. No backend, database, API key or paid service.)

## Read this first: one-time model step
The pretrained model is published on Hugging Face in PyTorch/safetensors format, which browsers cannot run.
`tools/convert_model.py` downloads it once and converts it to ONNX (about 9 MB) so it can run in the browser.
**The ONNX files are not included in this ZIP.** The author of this project could not download or convert
the model in the build environment (no internet), so the conversion has not been run by the author.
Until you run it, the website honestly shows "Disease detection is temporarily unavailable" and never fakes a result.

### 1. Create the model files (free, about 2 minutes)
```bash
pip install torch transformers onnx onnxruntime numpy safetensors pillow
python tools/convert_model.py
```
This writes `model/plant_disease.onnx`, `model/labels.json`, `model/preprocess.json`.
The script compares PyTorch and ONNX outputs and stops with an error if they differ.
No local Python? Run the same two commands in a free Google Colab notebook (prefix with `!`), then download the three files into `model/`.

### 2. Run locally
Browsers block model loading from `file://`, so use a tiny local server:
```bash
python -m http.server 8000
```
Open http://localhost:8000. The first load needs internet (onnxruntime-web is fetched from the jsDelivr CDN).

### 3. Deploy free
- **Netlify:** drag the whole project folder (with `model/` filled in) onto https://app.netlify.com/drop.
- **GitHub Pages:** push the folder to a GitHub repository, then Settings > Pages > Deploy from branch > `main` / root. Open the URL shown.

No build step, no special headers. The ONNX runtime is configured for single-thread WebAssembly, which works on any static host.

## Model, source and licence
| Item | Detail |
|---|---|
| Model | `neghani/plantvillage-mobilenetv2` (MobileNetV2 fine-tuned on PlantVillage), tag `v1.0` |
| Source | https://huggingface.co/neghani/plantvillage-mobilenetv2 |
| Model licence | Apache-2.0 (as stated on the model page) |
| Base model | `google/mobilenet_v2_1.0_224` |
| Training data | PlantVillage colour images (see model page for the dataset link and terms) |
| Runtime | onnxruntime-web 1.17.1 (MIT licence) loaded from jsDelivr |
| Output | 38 classes, softmax probability per class |

Check the model page yourself before commercial use; licences and files can change.

### Supported crops (14)
Apple, Blueberry, Cherry, Corn (maize), Grape, Orange, Peach, Bell pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato.

### Supported classes (38)
Apple: Apple scab, Black rot, Cedar apple rust, healthy. Blueberry: healthy. Cherry: Powdery mildew, healthy.
Corn: Cercospora leaf spot / Gray leaf spot, Common rust, Northern Leaf Blight, healthy.
Grape: Black rot, Esca (Black Measles), Leaf blight (Isariopsis Leaf Spot), healthy.
Orange: Haunglongbing (Citrus greening). Peach: Bacterial spot, healthy. Bell pepper: Bacterial spot, healthy.
Potato: Early blight, Late blight, healthy. Raspberry: healthy. Soybean: healthy. Squash: Powdery mildew.
Strawberry: Leaf scorch, healthy.
Tomato: Bacterial spot, Early blight, Late blight, Leaf Mold, Septoria leaf spot, Spider mites (Two-spotted spider mite), Target Spot, Yellow Leaf Curl Virus, Mosaic virus, healthy.

## Important limitations (be honest with users)
- The model card reports ~99% accuracy on a held-out PlantVillage split, but those are clean, lab-style photos, and the card itself calls that an upper bound.
- On a small real-world test (25 PlantDoc web/field photos) the card reports only **16% end-to-end pass rate**. Phone photos from a field may often be wrong or "not sure".
- It cannot recognise other crops, other diseases, pests (except the tomato mite class) or nutrient problems, and it will push unrelated images into the nearest known class. The app treats a top probability below 0.5 as "not sure" (the model card's recommended threshold) and shows no disease in that case.
- The app never gives pesticide names or doses. Guidance is general and non-chemical, and always sends users to a local expert (KVK / agriculture department).
- Preprocessing in the browser uses canvas resizing, which can differ very slightly from the Python preprocessing used in training.

## How languages work
`js/i18n.js` holds all interface text for Marathi, English and Hindi. `js/knowledge.js` holds crop-name translations and general guidance per problem type. **Disease names are not translated**; they appear exactly as the model returns them. Changing the language re-renders the same stored prediction, it never re-runs the model. The Marathi and Hindi text was written for simplicity but has not been reviewed by a native-speaking agricultural expert: please have it reviewed before public use.

## Project layout
```
index.html        page structure
style.css         styling (white + green, responsive, print styles)
js/model.js       model loading + inference (no UI code)
js/app.js         upload, validation, language, report rendering, printing
js/i18n.js        Marathi / English / Hindi interface text
js/knowledge.js   class -> crop/problem type map and general guidance
tools/convert_model.py   one-time model conversion
model/            put the 3 generated model files here
tests/check.js    offline checks (translations, class table, softmax)
assets/leaf.svg   logo
```

## Test procedure
1. `node tests/check.js` should print "All offline checks passed."
2. Start the server, open the site. The status bar should change from "Loading the AI model" to "AI model is ready." If it says unavailable, check the browser console and that the three files are in `model/`.
3. Validation: try a `.gif` or `.pdf` (expect the file-type error) and an image over 8 MB (expect the size error). Try JPG, PNG and WEBP (expect a preview). Use Change photo and Remove photo.
4. Inference: download sample leaf images (for example from the PlantVillage dataset or the PlantDoc dataset). Try a clear tomato leaf with visible spots, a healthy leaf, and a non-leaf photo (for example a shoe). Expected: a leaf from a supported crop gives a crop, a class and a confidence; a non-leaf or blurry photo should usually give "The model is not sure" (it is not guaranteed).
5. Language: after a result appears, switch between मराठी / English / हिंदी. The crop, class name and confidence must stay identical; headings and guidance change.
6. Click Print report: only the report should appear in the print preview. Click Analyze another leaf to reset.
7. Offline error path: block the network (browser dev tools) or rename `model/plant_disease.onnx` and reload. Expect the "temporarily unavailable" message and a disabled Analyze button.

## Verified vs not verified
**Verified by the author (automated, in Node):** translation key parity for all 3 languages; all 38 classes map to a crop and a problem type with guidance in all 3 languages; every element ID used by `app.js` exists in `index.html`; every `data-i18n` key exists; softmax is numerically stable; JavaScript syntax.
**Not verified (could not be tested in the build environment):** downloading and converting the model; ONNX loading and real inference in a browser; photo upload and preview in a real browser; rendering, responsive layout and print output; Marathi/Hindi display in real browsers; accuracy on your photos. Please run steps 1 to 7 above before relying on the site.

## Credits
Model by neghani (Apache-2.0), MobileNetV2 by Google, PlantVillage dataset (Hughes and Salathe; Mohanty et al. 2016), onnxruntime-web by Microsoft (MIT).

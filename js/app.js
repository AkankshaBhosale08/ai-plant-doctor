/* User interface logic. Uses PlantModel (model.js) for inference and
   Knowledge/TRANSLATIONS for text. No predictions are generated here. */
(function () {
  "use strict";

  // The model card recommends treating a top probability below 0.5 as "not sure".
  const CONF_UNCERTAIN = 0.5;
  // Between 0.5 and 0.85 we show an extra caution (the card used 0.85 for real-world photos).
  const CONF_HIGH = 0.85;
  const MAX_BYTES = 8 * 1024 * 1024;
  const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const OK_EXT = /\.(jpe?g|png|webp)$/i;
  const LOCALES = { en: "en-IN", mr: "mr-IN", hi: "hi-IN" };

  const $ = (id) => document.getElementById(id);
  const state = { lang: "en", file: null, url: null, result: null, model: "loading", busy: false, msg: null };

  const t = (k) => (TRANSLATIONS[state.lang] && TRANSLATIONS[state.lang][k]) ?? TRANSLATIONS.en[k] ?? k;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function list(items) { const ul = el("ul"); items.forEach((i) => ul.appendChild(el("li", null, i))); return ul; }

  /* ---------- Language ---------- */
  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
    document.title = t("appTitle") + " - " + t("subtitle");
    const tips = $("tipsList"); tips.replaceChildren(); t("tips").forEach((x) => tips.appendChild(el("li", null, x)));
    const about = $("aboutList"); about.replaceChildren(); t("aboutItems").forEach((x) => about.appendChild(el("li", null, x)));
    const crops = $("cropList"); crops.replaceChildren();
    Object.values(Knowledge.CROPS).forEach((c) => crops.appendChild(el("li", null, c[state.lang] || c.en)));
    renderModelStatus(); renderMessage(); updateButtons();
    if (state.result) renderReport();   // same prediction, new language
  }
  function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) lang = "en";
    state.lang = lang; $("langSelect").value = lang;
    try { localStorage.setItem("apd-lang", lang); } catch (e) { /* storage may be blocked */ }
    applyLanguage();
  }

  /* ---------- Model status ---------- */
  function renderModelStatus() {
    const box = $("modelStatus"), txt = $("modelStatusText"), retry = $("retryModelBtn");
    box.className = "status status-" + state.model;
    retry.hidden = state.model !== "unavailable";
    if (state.model === "loading") txt.textContent = t("modelLoading");
    else if (state.model === "ready") txt.textContent = t("modelReady");
    else txt.textContent = t("modelUnavailableTitle") + " " + t("modelUnavailableText");
  }
  async function loadModel() {
    state.model = "loading"; renderModelStatus(); updateButtons();
    try { await PlantModel.load(); state.model = "ready"; }
    catch (e) { console.error("Model load failed:", e); state.model = "unavailable"; }
    renderModelStatus(); updateButtons(); renderClassList();
  }
  function renderClassList() {
    const ul = $("classList"); ul.replaceChildren();
    // Show the model's real classes if loaded, otherwise the documented list.
    const labels = state.model === "ready" ? PlantModel.getInfo().labels : Knowledge.ENTRIES.map((e) => e[0]);
    labels.forEach((l) => ul.appendChild(el("li", null, l.replace(/___/g, " - ").replace(/_/g, " "))));
  }

  /* ---------- Messages ---------- */
  function setMessage(key, type) { state.msg = key ? { key, type } : null; renderMessage(); }
  function renderMessage() {
    const m = $("message");
    if (!state.msg) { m.hidden = true; return; }
    m.hidden = false; m.className = "message " + state.msg.type; m.textContent = t(state.msg.key);
  }

  /* ---------- Image selection ---------- */
  function validate(file) {
    const okType = OK_TYPES.includes(file.type) || (!file.type && OK_EXT.test(file.name));
    if (!okType) return "errType";
    if (file.size > MAX_BYTES) return "errSize";
    return null;
  }
  function selectFile(file) {
    if (!file) return;
    const err = validate(file);
    if (err) { setMessage(err, "error"); return; }
    clearImage(true);
    state.file = file; state.url = URL.createObjectURL(file);
    const img = $("previewImg");
    img.onerror = () => { clearImage(); setMessage("errRead", "error"); };
    img.onload = () => { setMessage(null); };
    img.src = state.url; img.hidden = false; img.alt = file.name;
    $("dropPrompt").hidden = true; $("changeBtn").hidden = false; $("removeBtn").hidden = false;
    updateButtons();
  }
  function clearImage(keepMessage) {
    if (state.url) URL.revokeObjectURL(state.url);
    state.file = null; state.url = null;
    const img = $("previewImg"); img.hidden = true; img.removeAttribute("src");
    $("dropPrompt").hidden = false; $("changeBtn").hidden = true; $("removeBtn").hidden = true;
    $("fileInput").value = "";
    if (!keepMessage) setMessage(null);
    updateButtons();
  }
  function updateButtons() {
    $("analyzeBtn").disabled = !state.file || state.model !== "ready" || state.busy;
    $("analyzeBtn").textContent = state.busy ? t("analyzing") : t("analyzeBtn");
    $("spinner").hidden = !state.busy;
  }

  /* ---------- Analysis ---------- */
  async function analyze() {
    if (!state.file) { setMessage("errNoImage", "error"); return; }
    if (state.model !== "ready") { renderModelStatus(); return; }
    state.busy = true; setMessage(null); updateButtons();
    try {
      const img = $("previewImg");
      if (!img.complete || !img.naturalWidth) await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      
      const selectedCrop = $("cropSelect").value;

      if (!selectedCrop) {
        setMessage("errNoImage", "error");
        return;
      }

      // Rank disease classes only within the crop selected by the user.
      // This helps keep the result crop-related, but does not verify the crop in the photo.
      const out = await PlantModel.classify(img, 3, selectedCrop);
      state.result = {
        top: out.top,
        imageUrl: state.url,
        date: new Date(),
        selectedCrop,
        cropFiltered: true
      };
      $("uploadPanel").hidden = true;
      $("report").hidden = false;
      renderReport();
      $("report").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      console.error("Inference failed:", e);
      setMessage("errInference", "error");
    } finally { state.busy = false; updateButtons(); }
  }

  /* ---------- Report ---------- */
  function pct(p) { return (p * 100).toFixed(1) + "%"; }
  function section(titleKey, items) {
    const d = el("section", "guide"); d.appendChild(el("h3", null, t(titleKey))); d.appendChild(list(items)); return d;
  }
  function renderReport() {
    const r = state.result, body = $("reportBody"); body.replaceChildren();
    $("reportDate").textContent = t("reportDate") + ": " + r.date.toLocaleDateString(LOCALES[state.lang] || "en-IN", { year: "numeric", month: "long", day: "numeric" });
    const best = r.top[0], info = Knowledge.lookup(best.label);
    const uncertain = best.probability < CONF_UNCERTAIN || !info.known;

    const grid = el("div", "report-grid");
    const img = el("img", "report-img"); img.src = r.imageUrl; img.alt = t("uploadedLeaf");
    grid.appendChild(img);
    const side = el("div");

    if (uncertain) {
      // Unsupported / unclear image: do not claim any disease.
      const b = el("div", "banner warn"); b.appendChild(el("strong", null, t("uncertainTitle")));
      b.appendChild(el("p", null, t("uncertainText"))); side.appendChild(b);
      side.appendChild(el("h3", null, t("closestMatches")));
      const ul = el("ul");
      r.top.forEach((p) => ul.appendChild(el("li", null, p.label.replace(/___/g, " - ").replace(/_/g, " ") + " (" + pct(p.probability) + ")")));
      side.appendChild(ul);
    } else {
      const crop = Knowledge.CROPS[info.crop];
      const dl = el("dl", "kv");
      dl.appendChild(el("dt", null, t("cropLabel"))); dl.appendChild(el("dd", null, crop[state.lang] || crop.en));
      dl.appendChild(el("dt", null, t("resultLabel")));
      dl.appendChild(el("dd", "result-name", info.isHealthy ? t("healthyWord") : info.diseaseName));
      dl.appendChild(el("dt", null, t("confidenceLabel")));
      const cd = el("dd", null, pct(best.probability));
      const bar = el("div", "bar"); const fill = el("span"); fill.style.width = (best.probability * 100).toFixed(1) + "%";
      bar.appendChild(fill); cd.appendChild(bar); dl.appendChild(cd);
      dl.appendChild(el("dt", null, t("categoryLabel"))); dl.appendChild(el("dd", null, t("cat_" + info.cat)));
      side.appendChild(dl);
      side.appendChild(el("p", "small muted", t("confidenceNote")));
      if (r.cropFiltered) {
        side.appendChild(el("p", "small muted", state.lang === "mr"
          ? "टीप: निकाल तुम्ही निवडलेल्या पिकाच्या रोगांमधून निवडला आहे. फोटोतील पीक खरोखर हेच आहे याची AI खात्री देत नाही; अचूकतेसाठी प्रत्यक्ष तपासणी करा."
          : "Note: This result is selected from diseases of the crop you chose. The AI has not verified that the photo really shows this crop; confirm with a local agriculture expert."));
      }
      side.appendChild(el("p", "mono", t("modelClass") + ": " + best.label));
      if (best.probability < CONF_HIGH) side.appendChild(el("div", "banner warn", t("medConfWarn")));
    }
    grid.appendChild(side); body.appendChild(grid);

    if (!uncertain) {
      const g = Knowledge.GUIDE[info.cat][state.lang] || Knowledge.GUIDE[info.cat].en;
      body.appendChild(section("symptomsH", g.symptoms));
      body.appendChild(section("causesH", g.causes));
      body.appendChild(section("stepsH", g.steps));
      body.appendChild(section("preventH", g.prevention));
      const others = r.top.slice(1);
      if (others.length) {
        const o = el("section", "guide"); o.appendChild(el("h3", null, t("otherMatchesH")));
        const ul = el("ul");
        others.forEach((p) => ul.appendChild(el("li", null, p.label.replace(/___/g, " - ").replace(/_/g, " ") + " (" + pct(p.probability) + ")")));
        o.appendChild(ul); body.appendChild(o);
      }
    }
    const ex = section("expertH", t("expertItems")); ex.appendChild(el("p", null, t("expertWhere"))); body.appendChild(ex);
    const dis = el("div", "disclaimer"); dis.appendChild(el("strong", null, t("disclaimerTitle") + ": "));
    dis.appendChild(document.createTextNode(t("disclaimerText"))); body.appendChild(dis);
    body.appendChild(el("p", "small muted", t("modelUsed")));
  }

  function analyzeAnother() {
    state.result = null; $("report").hidden = true; $("uploadPanel").hidden = false;
    clearImage(); $("analyze").scrollIntoView({ behavior: "smooth" });
  }

  /* ---------- Events ---------- */
  function init() {
    let saved = "en";
    try { saved = localStorage.getItem("apd-lang") || "en"; } catch (e) { /* ignore */ }
    const dz = $("dropzone"), fi = $("fileInput");
    $("langSelect").addEventListener("change", (e) => setLanguage(e.target.value));
    dz.addEventListener("click", () => { if (!state.file) fi.click(); });
    dz.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && !state.file) { e.preventDefault(); fi.click(); } });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", (e) => selectFile(e.dataTransfer.files[0]));
    fi.addEventListener("change", () => selectFile(fi.files[0]));
    $("changeBtn").addEventListener("click", () => fi.click());
    $("removeBtn").addEventListener("click", () => clearImage());
    $("analyzeBtn").addEventListener("click", analyze);
    $("retryModelBtn").addEventListener("click", loadModel);
    $("anotherBtn").addEventListener("click", analyzeAnother);
    $("printBtn").addEventListener("click", () => window.print());
    setLanguage(saved);
    renderClassList();
    loadModel();
  }
  document.addEventListener("DOMContentLoaded", init);
})();

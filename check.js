/* Offline checks that need no browser and no model:
   node tests/check.js */
const assert = require("assert");
const T = require("../js/i18n.js");
const K = require("../js/knowledge.js");
const M = require("../js/model.js");

// 1. Same keys and same list lengths in all three languages
const langs = ["en", "mr", "hi"];
const keys = Object.keys(T.en);
for (const l of langs) {
  assert.deepStrictEqual(Object.keys(T[l]).sort(), keys.slice().sort(), `key mismatch in ${l}`);
  for (const k of keys) {
    const v = T[l][k];
    assert(v && (typeof v === "string" ? v.trim() : v.length), `empty ${l}.${k}`);
    if (Array.isArray(T.en[k])) assert.strictEqual(v.length, T.en[k].length, `list length ${l}.${k}`);
  }
}
// 2. Guidance exists in every language for every category, with same shape
for (const cat of ["fungal", "bacterial", "viral", "mite", "citrus", "healthy"]) {
  for (const l of langs) {
    for (const f of ["symptoms", "causes", "steps", "prevention"]) {
      const a = K.GUIDE[cat][l][f], b = K.GUIDE[cat].en[f];
      assert(a && a.length === b.length, `guide ${cat}.${l}.${f}`);
    }
  }
  const cats = "cat_" + cat; assert(T.en[cats], "missing " + cats);
}
// 3. 38 classes, every crop has translations, lookup works for odd labels
assert.strictEqual(K.ENTRIES.length, 38);
for (const [raw, crop] of K.ENTRIES) {
  assert(K.CROPS[crop] && K.CROPS[crop].mr && K.CROPS[crop].hi, "crop " + crop);
  assert(K.lookup(raw).known, "lookup " + raw);
}
assert.strictEqual(K.lookup("Tomato___Early_blight").diseaseName, "Early blight");
assert.strictEqual(K.lookup("tomato___early_blight").known, true);
assert.strictEqual(K.lookup("Mango___Anthracnose").known, false);   // never invents a crop
// 4. Softmax sanity
const p = M.softmax([1, 2, 3]);
assert(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-9 && p[2] > p[1] && p[1] > p[0]);
assert(Math.abs(M.softmax([1000, 1000])[0] - 0.5) < 1e-9);          // no overflow
// 5. No pesticide/dose wording in guidance
const all = JSON.stringify(K.GUIDE).toLowerCase();
for (const w of ["mg/", " ml", "fungicide", "pesticide name", "copper", "neem", "mancozeb"]) assert(!all.includes(w), "found: " + w);
console.log("All offline checks passed.");

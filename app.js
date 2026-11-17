const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ==pure-start
const words = t => t.toLowerCase().match(/[\p{L}\p{N}\p{M}]+/gu) || [];
const matches = (p, terms) => terms.every(t => words(p.text).includes(t));
const hitsOf = (p, terms) => words(p.text).filter(w => terms.includes(w)).length;
const isSpam = (p, terms) => hitsOf(p, terms) >= 8 && hitsOf(p, terms) / words(p.text).length > 0.5;
const inbound = (web, id) => web.pages.filter(p => p.links.includes(id)).length;
const BASE = { pages: PAGES, pr: pageRank(PAGES), base: true };

// ---- fake web generator: same query always gives the same fake web ----
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const TEMPLATES = [
  [s => `${s}-guide.com`, P => `A friendly guide to ${P} for beginners - what is ${P} and why it matters`],
  [s => `best-${s}-india.com`, P => `Honest reviews of the best ${P} in India, updated every week`],
  [s => `${s}-lovers-blog.com`, P => `My ${P} diary: weekend notes, photos and tips about ${P}`],
  [s => `learn-${s}-fast.com`, P => `Learn ${P} step by step - ${P} basics, ${P} practice and ${P} quiz`],
  [s => `cheap-${s}-deals.com`, P => `Cheap ${P} deals and discounts, compare prices today`],
  [s => `${s}-news-today.com`, P => `Latest ${P} news and updates from around the country`],
  [s => `${s}-forum.org`, P => `Ask questions about ${P} and get answers from the community`],
  [s => `the-${s}-wiki.org`, P => `${P} explained: history, facts and common questions`]
];
function genWeb(terms) {
  const P = terms.join(" "), s = terms.join("-");
  const rnd = mulberry32(hash(P)), pick = n => Math.floor(rnd() * n);
  const N = 6 + pick(2), pool = [...TEMPLATES];
  for (let i = pool.length - 1; i > 0; i--) { const j = pick(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const pages = pool.slice(0, N - 1).map((t, i) => ({ id: i + 1, url: t[0](s), text: t[1](P), links: [] }));
  const spam = { id: N, url: `${s}-${s}-${s}.com`, text: Array(10).fill(P).join(" "), links: [] };
  pages.push(spam);
  const good = pages.slice(0, N - 1), auth = good[pick(good.length)];
  const add = (a, b) => { if (a !== b && !a.links.includes(b.id)) a.links.push(b.id); };
  let k = 0;
  good.forEach(p => { if (p !== auth && (k < 3 || rnd() < 0.8)) { add(p, auth); k++; } });
  const m = 1 + pick(2);
  while (auth.links.length < m) add(auth, good[pick(good.length)]);
  good.forEach(p => { if (rnd() < 0.35) add(p, good[pick(good.length)]); });
  good.forEach(p => { while (!p.links.length) add(p, good[pick(good.length)]); });
  add(spam, good[pick(good.length)]);
  return { pages, pr: pageRank(pages), base: false };
}
// ==pure-end

function highlight(text, terms) {
  const s = esc(text);
  return terms.length ? s.replace(new RegExp("(?<![\\p{L}\\p{N}\\p{M}])(" + terms.join("|") + ")(?![\\p{L}\\p{N}\\p{M}])", "giu"), "<b>$1</b>") : s;
}

function card(web, p, pos, mode, terms, max, oldPos) {
  const spam = isSpam(p, terms);
  let tag = "", meta, score;
  if (mode === "old") {
    score = hitsOf(p, terms);
    meta = `Keyword hits: <b>${score}</b>`;
    if (spam) tag = `<span class="tag bad">keyword stuffing</span>`;
  } else {
    score = web.pr[p.id];
    meta = `PageRank: <b>${score.toFixed(3)}</b> &middot; ${inbound(web, p.id)} page(s) link here`;
    const d = oldPos[p.id] - pos;
    if (d > 0) tag = `<span class="tag up">&#9650; up ${d}</span>`;
    else if (d < 0) tag = `<span class="tag dn">&#9660; down ${-d}</span>`;
  }
  return `<div class="r${spam ? " spam" : ""}">
    <span class="n">${pos + 1}</span>
    <div class="t"><a href="#" onclick="return false">${esc(p.url)}</a>${tag}</div>
    <div class="s">${highlight(p.text, terms)}</div>
    <div class="u">http://${esc(p.url)}/ - 2k - <i>Cached - Similar pages</i></div>
    <div class="meta">${meta}</div>
    <div class="bar"><i style="width:${Math.max(4, score / max * 100)}%"></i></div>
  </div>`;
}

function showNone(q) {
  $("#count").textContent = "No results";
  $("#oldList").innerHTML = $("#prList").innerHTML =
    `<p class="none">Your search - <b>${esc(q)}</b> - did not match any documents.<br>Suggestions: type a word using letters or numbers.</p>`;
  $("#verdict").innerHTML = "";
}

function search(q) {
  const t0 = performance.now();
  const terms = [...new Set(words(q))].slice(0, 4);
  document.body.className = "searched";
  $("#q").value = q;
  if (!terms.length) { showNone(q); return; }

  const web = PAGES.filter(p => matches(p, terms)).length >= 3 ? BASE : genWeb(terms);
  const m = web.pages.filter(p => matches(p, terms));
  const old = [...m].sort((a, b) => hitsOf(b, terms) - hitsOf(a, terms) || a.id - b.id);
  const pr = [...m].sort((a, b) => web.pr[b.id] - web.pr[a.id]);
  const oldPos = {};
  old.forEach((p, i) => oldPos[p.id] = i);

  const secs = ((performance.now() - t0) / 1000 + 0.01).toFixed(2);
  $("#barL").textContent = web.base ? "Searching the demo web of 6 pages"
    : `Searching a fake web of ${web.pages.length} pages made up for "${terms.join(" ")}"`;
  $("#count").textContent = `Results 1 - ${m.length} of about ${m.length} for ${terms.join(" ")}. (${secs} seconds)`;

  const maxH = Math.max(...old.map(p => hitsOf(p, terms)));
  const maxP = Math.max(...pr.map(p => web.pr[p.id]));
  $("#oldList").innerHTML = old.map((p, i) => card(web, p, i, "old", terms, maxH, oldPos)).join("");
  $("#prList").innerHTML = pr.map((p, i) => card(web, p, i, "pr", terms, maxP, oldPos)).join("");

  const spam = m.find(p => isSpam(p, terms));
  let v = `For <b>${esc(terms.join(" "))}</b>: the old method puts <span class="bad">${esc(old[0].url)}</span> first. PageRank puts <span class="good">${esc(pr[0].url)}</span> first.`;
  if (spam) v += ` The spam page <b>${esc(spam.url)}</b> goes from #${oldPos[spam.id] + 1} to #${pr.indexOf(spam) + 1} once links decide, because no other page links to it.`;
  $("#verdict").innerHTML = v;
  showGraph(web, web.base ? "The tiny web behind the search" : `The fake web made up for "${terms.join(" ")}"`);
  window.scrollTo(0, 0);
}

function showGraph(web, title) {
  $("#learnTitle").textContent = title;
  const pos = web.base
    ? { 6: [60, 45], 1: [270, 45], 2: [270, 150], 5: [60, 150], 4: [60, 255], 3: [270, 255] }
    : Object.fromEntries(web.pages.map((p, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / web.pages.length; return [p.id, [170 + 105 * Math.cos(a), 150 + 105 * Math.sin(a)]]; }));
  const r = id => 13 + web.pr[id] * 55;
  let svg = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#3366cc"/></marker></defs>`;
  web.pages.forEach(a => a.links.forEach(bid => {
    const b = web.pages.find(p => p.id === bid), [x1, y1] = pos[a.id], [x2, y2] = pos[bid];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const off = b.links.includes(a.id) ? 6 : 0, px = -uy * off, py = ux * off;
    svg += `<line x1="${x1 + ux * r(a.id) + px}" y1="${y1 + uy * r(a.id) + py}" x2="${x2 - ux * (r(bid) + 3) + px}" y2="${y2 - uy * (r(bid) + 3) + py}" stroke="#3366cc" stroke-width="1.6" marker-end="url(#ah)"/>`;
  }));
  web.pages.forEach(p => {
    const [x, y] = pos[p.id], none = inbound(web, p.id) === 0;
    svg += `<circle cx="${x}" cy="${y}" r="${r(p.id)}" fill="${none ? "#fdeaea" : "#d6e4ff"}" stroke="${none ? "#dc3912" : "#3366cc"}" stroke-width="2"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="bold" font-family="Arial">${p.id}</text>
      <text x="${x}" y="${y + r(p.id) + 13}" text-anchor="middle" font-size="11" font-family="Arial" fill="#444">${web.pr[p.id].toFixed(3)}</text>`;
  });
  $("#graph").innerHTML = svg;
  const rows = [...web.pages].sort((a, b) => web.pr[b.id] - web.pr[a.id]);
  $("#tbl").innerHTML = `<tr><th>#</th><th>Page</th><th>Links in</th><th>PageRank</th></tr>` +
    rows.map(p => `<tr${inbound(web, p.id) === 0 ? ' class="spam"' : ""}><td>${p.id}</td><td>${esc(p.url)}</td><td>${inbound(web, p.id)}</td><td>${web.pr[p.id].toFixed(3)}</td></tr>`).join("");
}

function goHome() {
  document.body.className = "home";
  $("#q").value = "";
  $("#q").focus();
  showGraph(BASE, "The tiny web behind the search");
  window.scrollTo(0, 0);
}

$("#f").addEventListener("submit", e => { e.preventDefault(); if ($("#q").value.trim()) search($("#q").value.trim()); });
document.querySelectorAll("[data-q]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); search(a.dataset.q); }));
$("#how").addEventListener("click", () => $("#learn").scrollIntoView({ behavior: "smooth" }));
$("#home-link").addEventListener("click", e => { e.preventDefault(); goHome(); });

// ---- landing page: greeting, visitor counter, typing placeholder ----
const hr = new Date().getHours();
$("#hello").textContent = (hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening") + ", and welcome.";
let visits = 1;
try { visits = (+localStorage.getItem("mg_visits") || 0) + 1; localStorage.setItem("mg_visits", visits); } catch (e) {}
$("#visits").textContent = String(visits).padStart(6, "0");

(function typer() {
  const q = $("#q");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { q.placeholder = "Search any word"; return; }
  const w = ["pizza", "cricket", "laptop", "chai tapri"];
  let i = 0, j = 0, del = false;
  (function tick() {
    if (q.value || document.body.className !== "home") { q.placeholder = ""; return; }
    const word = w[i];
    j += del ? -1 : 1;
    q.placeholder = word.slice(0, j) || " ";
    if (!del && j === word.length) { del = true; setTimeout(tick, 1400); }
    else if (del && j === 0) { del = false; i = (i + 1) % w.length; setTimeout(tick, 350); }
    else setTimeout(tick, del ? 40 : 90);
  })();
})();

showGraph(BASE, "The tiny web behind the search");

/* ====================================================================
   Man-Beating Separation - logique du mini-site
   ==================================================================== */

const COLORS = {
  target: "#4ade80", defender: "#ef4444",
  offense: "#60a5fa", defense: "#94a3b8", ball: "#8b4513",
};

let DATA = null, filtered = [], current = null;
let frameIdx = 0, playing = false, timer = null;

const canvas = document.getElementById("field");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const FIELD_LONG = 120, FIELD_WIDE = 53.3;
const MX = W / FIELD_LONG, MY = H / FIELD_WIDE;

/* -------- Onglets -------- */
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(b => { b.classList.remove("tab-active"); b.classList.add("text-slate-300"); });
    btn.classList.add("tab-active"); btn.classList.remove("text-slate-300");
    document.querySelectorAll(".tabpanel").forEach(p => p.classList.add("hidden"));
    const panel = document.getElementById(btn.dataset.tab);
    panel.classList.remove("hidden"); panel.classList.add("fade-in");
  };
});
function goTab(name) { document.querySelector(`.tab[data-tab="${name}"]`).click(); }

/* -------- Terrain -------- */
function drawField() {
  for (let yd = 0; yd < 120; yd += 10) {
    ctx.fillStyle = (yd / 10) % 2 === 0 ? "#167a3c" : "#13703a";
    ctx.fillRect(yd * MX, 0, 10 * MX, H);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
  for (let yd = 10; yd <= 110; yd += 5) { ctx.beginPath(); ctx.moveTo(yd * MX, 0); ctx.lineTo(yd * MX, H); ctx.stroke(); }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, 10 * MX, H); ctx.fillRect(110 * MX, 0, 10 * MX, H);
  ctx.fillStyle = "rgba(255,255,255,0.33)"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
  [10,20,30,40,50,40,30,20,10].forEach((n, k) => { const yd = 20 + k * 10; ctx.fillText(n, yd * MX, H - 10); ctx.fillText(n, yd * MX, 18); });
}

function drawFrame(i) {
  if (!current) return;
  const players = current.frames[i];
  if (!players) return;
  drawField();

  const target = players.find(p => p.kind === "target");
  const defender = players.find(p => p.kind === "defender");
  // lien cible <-> defenseur direct + mesure de separation
  if (target && defender) {
    ctx.strokeStyle = "rgba(74,222,128,0.8)"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(target.x * MX, target.y * MY); ctx.lineTo(defender.x * MX, defender.y * MY); ctx.stroke(); ctx.setLineDash([]);
    const midx = (target.x + defender.x) / 2 * MX, midy = (target.y + defender.y) / 2 * MY;
    const sepNow = Math.hypot(target.x - defender.x, target.y - defender.y).toFixed(1);
    ctx.fillStyle = "#e6edf3"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(sepNow + " yd", midx, midy - 6);
    ctx.beginPath(); ctx.arc(target.x * MX, target.y * MY, 22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(74,222,128,0.14)"; ctx.fill();
  }

  players.forEach(p => {
    if (p.kind === "ball") {
      ctx.beginPath(); ctx.ellipse(p.x * MX, p.y * MY, 6, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8b4513"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke(); return;
    }
    const big = (p.kind === "target" || p.kind === "defender");
    ctx.beginPath(); ctx.arc(p.x * MX, p.y * MY, big ? 12 : 9, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[p.kind] || "#94a3b8"; ctx.fill();
    if (big) { ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = "#0a0e1a"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(p.j || "", p.x * MX, p.y * MY);
  });

  const m = current;
  let txt = "";
  if (i < m.snapFrame) txt = "Mise en place avant l'engagement.";
  else if (i < m.passFrame) txt = "Le receveur court sa route, colle par son defenseur.";
  else if (i < m.obsFrame) txt = "La passe part — le receveur cherche a se liberer !";
  else txt = `Instant cle : le receveur a cree ${m.separation} yd de separation en 1-contre-1.`;
  document.getElementById("phase").textContent = txt;
  document.getElementById("scrub").value = i;
}

/* -------- Lecture -------- */
function play() {
  if (playing || !current) return;
  playing = true; document.getElementById("playBtn").textContent = "⏸ Pause";
  const delay = +document.getElementById("speed").value;
  timer = setInterval(() => {
    frameIdx++;
    if (frameIdx >= current.frames.length) { frameIdx = current.frames.length - 1; pause(); return; }
    drawFrame(frameIdx);
  }, delay);
}
function pause() { playing = false; clearInterval(timer); document.getElementById("playBtn").textContent = "▶ Lancer"; }
function resetPlay() { pause(); frameIdx = 0; drawFrame(0); }
document.getElementById("playBtn").onclick = () => playing ? pause() : play();
document.getElementById("resetBtn").onclick = resetPlay;
document.getElementById("scrub").oninput = e => { pause(); frameIdx = +e.target.value; drawFrame(frameIdx); };
document.getElementById("speed").onchange = () => { if (playing) { pause(); play(); } };

/* -------- Selection action -------- */
function resultLabel(r) {
  return ({C:"Passe reussie", I:"Passe incomplete", S:"Sack", R:"Scramble", IN:"Interception"})[r] || r || "—";
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function selectPlay(p) {
  current = p; pause(); frameIdx = 0;
  document.getElementById("scrub").max = p.frames.length - 1;
  const res = p.touchdown ? '<span class="text-yellow-300 font-bold">TOUCHDOWN</span>' : escapeHtml(resultLabel(p.passResult));
  document.getElementById("playInfo").innerHTML =
    `<div class="flex items-start justify-between gap-3 flex-wrap">
       <div>
         <p class="text-base"><span class="text-green-400 font-bold">${escapeHtml(p.receiver)}</span>
           <span class="text-slate-400">(${p.receiverPos})</span> se libere de
           <span class="text-red-400 font-semibold">${escapeHtml(p.defender)}</span> en
           <span class="text-yellow-300 font-bold">marquage individuel</span> :
           <span class="text-yellow-300 font-bold">${p.separation} yd</span> de separation.</p>
         <p class="text-slate-400 text-sm mt-1">${escapeHtml(p.desc)}</p>
       </div>
       <span class="shrink-0 text-sm px-3 py-1 rounded-full bg-slate-800">${res}</span>
     </div>`;
  drawFrame(0);
}

/* -------- Liste + filtres -------- */
function applyFilters() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const pos = document.getElementById("posFilter").value;
  const minSep = +document.getElementById("sepFilter").value;
  const tdOnly = document.getElementById("tdFilter").checked;
  filtered = DATA.plays.filter(p =>
    (!q || p.receiver.toLowerCase().includes(q)) &&
    (!pos || p.receiverPos === pos) &&
    (p.separation >= (minSep || 2)) &&
    (!tdOnly || p.touchdown));
  renderList();
}
function renderList() {
  const list = document.getElementById("playList");
  document.getElementById("listCount").textContent = `${filtered.length} duel(s)`;
  list.innerHTML = filtered.map((p, idx) => `
    <button data-idx="${idx}" class="playItem w-full text-left bg-slate-800/70 hover:bg-slate-700 rounded-lg p-3 border border-transparent">
      <div class="flex items-center justify-between gap-2">
        <span class="font-semibold text-sm">${escapeHtml(p.receiver)} <span class="text-slate-400 font-normal">(${p.receiverPos})</span></span>
        <span class="text-xs px-2 py-0.5 rounded-full ${p.touchdown ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}">${p.separation} yd${p.touchdown ? ' · TD' : ''}</span>
      </div>
      <p class="text-xs text-slate-400 mt-1 line-clamp-2">vs ${escapeHtml(p.defender)} · ${escapeHtml(p.desc).slice(0, 64)}…</p>
    </button>`).join("");
  list.querySelectorAll(".playItem").forEach(btn => {
    btn.onclick = () => {
      list.querySelectorAll(".playItem").forEach(b => b.classList.remove("border-blue-500"));
      btn.classList.add("border-blue-500");
      selectPlay(filtered[+btn.dataset.idx]);
    };
  });
  if (filtered.length) selectPlay(filtered[0]);
}
["searchInput","posFilter","sepFilter","tdFilter"].forEach(id =>
  document.getElementById(id).addEventListener("input", applyFilters));

/* -------- Classement -------- */
function renderRanking() {
  const pos = document.getElementById("rankPosFilter").value;
  const rows = DATA.ranking.filter(r => !pos || r.pos === pos);
  const maxMan = Math.max(...DATA.ranking.map(r => r.manSep), 0.001);
  document.getElementById("rankBody").innerHTML = rows.map((r, i) => `
    <tr class="border-b border-slate-800/60 hover:bg-slate-800/40 clickable" data-name="${escapeHtml(r.name)}">
      <td class="py-2 pr-2 text-slate-500">${i + 1}</td>
      <td class="pr-2 font-semibold text-blue-300">${escapeHtml(r.name)}</td>
      <td class="pr-2 text-slate-400">${r.pos}</td>
      <td class="pr-2 text-right text-slate-400">${r.manPlays}</td>
      <td class="pr-2">
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div class="bar bg-gradient-to-r from-yellow-400 to-amber-500 h-full" style="width:${(r.manSep / maxMan * 100).toFixed(0)}%"></div>
          </div>
          <span class="text-xs w-10 text-right">${r.manSep.toFixed(2)}</span>
        </div>
      </td>
      <td class="pr-2 text-right text-slate-400">${r.zoneSep.toFixed(2)}</td>
      <td class="pr-2 text-right text-slate-400">${r.manComp.toFixed(0)}%</td>
    </tr>`).join("");
  document.querySelectorAll("#rankBody tr").forEach(tr =>
    tr.onclick = () => showPlayer(tr.dataset.name));
}
document.getElementById("rankPosFilter").onchange = renderRanking;

/* -------- Fiche joueur -------- */
function showPlayer(name) {
  const r = DATA.ranking.find(x => x.name === name);
  if (!r) return;
  goTab("player");
  document.getElementById("playerEmpty").classList.add("hidden");
  const card = document.getElementById("playerCard");
  card.classList.remove("hidden");

  const tagColor = { elite:"text-yellow-300 bg-yellow-500/15", good:"text-green-300 bg-green-500/15",
                     avg:"text-slate-300 bg-slate-700/40", low:"text-orange-300 bg-orange-500/15" }[r.tag] || "";
  const idxs = DATA.playsByPlayer[name] || [];
  const playsHtml = idxs.length
    ? idxs.map(i => {
        const p = DATA.plays[i];
        return `<button data-idx="${i}" class="pfPlay text-left bg-slate-800/70 hover:bg-slate-700 rounded-lg p-3 border border-transparent">
          <div class="flex justify-between"><span class="text-sm font-semibold">${p.separation} yd vs ${escapeHtml(p.defender)}</span>
          <span class="text-xs ${p.touchdown ? 'text-yellow-300' : 'text-slate-400'}">${p.touchdown ? 'TD' : resultLabel(p.passResult)}</span></div>
          <p class="text-xs text-slate-400 mt-1 line-clamp-1">${escapeHtml(p.desc).slice(0,70)}…</p></button>`;
      }).join("")
    : '<p class="text-slate-500 text-sm">Pas de duel man-to-man marquant dans le catalogue pour ce joueur.</p>';

  const resil = r.resilience != null
    ? `Il conserve <b>${Math.round(r.resilience * 100)}%</b> de sa separation de zone quand il passe en individuel.`
    : "";

  card.innerHTML = `
    <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-black">${escapeHtml(r.name)} <span class="text-slate-400 text-lg font-normal">· ${r.pos}</span></h2>
          <p class="text-slate-400 text-sm">${r.manPlays} duels en man-to-man · ${r.zonePlays} actions en zone</p>
        </div>
        <span class="px-3 py-1.5 rounded-lg text-sm font-semibold ${tagColor}">Top ${r.manPct}% a son poste</span>
      </div>
      <div class="grid grid-cols-3 gap-3 mt-4">
        <div class="bg-slate-800/50 rounded-lg p-3"><p class="text-xs text-slate-400">Sep. en MAN</p><p class="text-2xl font-black text-yellow-300">${r.manSep.toFixed(2)}<span class="text-sm">yd</span></p></div>
        <div class="bg-slate-800/50 rounded-lg p-3"><p class="text-xs text-slate-400">Sep. en ZONE</p><p class="text-2xl font-black text-slate-200">${r.zoneSep.toFixed(2)}<span class="text-sm">yd</span></p></div>
        <div class="bg-slate-800/50 rounded-lg p-3"><p class="text-xs text-slate-400">Reussite en man</p><p class="text-2xl font-black text-green-300">${r.manComp.toFixed(0)}<span class="text-sm">%</span></p></div>
      </div>
      <div class="mt-4 bg-slate-800/40 border-l-4 border-yellow-500 rounded p-3">
        <p class="text-sm"><b class="text-yellow-300">Verdict scout :</b> ${escapeHtml(r.verdict)} ${resil}</p>
      </div>
    </div>
    <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <h3 class="font-bold mb-3">Ses duels gagnes en 1-contre-1 ${idxs.length ? `(${idxs.length})` : ''}</h3>
      <div class="grid sm:grid-cols-2 gap-2">${playsHtml}</div>
    </div>`;

  card.querySelectorAll(".pfPlay").forEach(b =>
    b.onclick = () => { goTab("replay"); selectPlay(DATA.plays[+b.dataset.idx]); });
}

/* -------- Preuve & Analyse -------- */
function renderAnalysis() {
  // impact separation -> succes
  const maxC = Math.max(...DATA.impact.map(r => r.compRate), 1);
  document.getElementById("impactChart").innerHTML = DATA.impact.map(r => `
    <div>
      <div class="flex justify-between text-sm mb-1"><span>${r.sep} yd de separation <span class="text-slate-500">(${r.plays} actions)</span></span>
        <span class="text-slate-300 font-semibold">${r.compRate}% reussite · ${r.avgYards} yd</span></div>
      <div class="bg-slate-800 rounded-full h-3 overflow-hidden"><div class="bar h-full bg-gradient-to-r from-sky-500 to-green-500" style="width:${(r.compRate/maxC*100).toFixed(0)}%"></div></div>
    </div>`).join("");

  // couverture
  const maxSep = Math.max(...DATA.coverage.map(c => c.avgSep), 1);
  document.getElementById("covChart").innerHTML = DATA.coverage.map(c => `
    <div>
      <div class="flex justify-between text-sm mb-1"><span class="font-semibold">${c.coverage} <span class="text-slate-500 font-normal">(${c.plays} actions)</span></span>
        <span class="text-slate-300">${c.avgSep} yd · ${c.compRate}% reussite</span></div>
      <div class="bg-slate-800 rounded-full h-3 overflow-hidden"><div class="bar h-full" style="width:${(c.avgSep/maxSep*100).toFixed(0)}%;background:${c.coverage==='Man'?'#ef4444':c.coverage==='Zone'?'#3b82f6':'#94a3b8'}"></div></div>
    </div>`).join("");

  // par poste
  const bp = DATA.byPosition;
  const maxP = Math.max(...bp.flatMap(p => [p.manSep, p.zoneSep]), 1);
  document.getElementById("posChart").innerHTML = bp.map(p => `
    <div>
      <div class="flex justify-between text-sm mb-1"><span class="font-semibold">${p.pos} <span class="text-slate-500 font-normal">(${p.players})</span></span>
        <span class="text-slate-400">man ${p.manSep} / zone ${p.zoneSep} yd</span></div>
      <div class="flex gap-1">
        <div class="bg-slate-800 rounded-full h-3 overflow-hidden flex-1"><div class="bar h-full bg-amber-500" style="width:${(p.manSep/maxP*100).toFixed(0)}%"></div></div>
        <div class="bg-slate-800 rounded-full h-3 overflow-hidden flex-1"><div class="bar h-full bg-blue-500" style="width:${(p.zoneSep/maxP*100).toFixed(0)}%"></div></div>
      </div>
    </div>`).join("");

  const man = DATA.coverage.find(c => c.coverage === "Man");
  const zone = DATA.coverage.find(c => c.coverage === "Zone");
  document.getElementById("analysisText").innerHTML =
    `Les donnees le confirment : la separation <b>predit la reussite</b> (de ~39% a 0 yd jusqu'a ~70% a 5+ yd). ` +
    (man && zone ? `Or se liberer est bien plus dur en individuel : en moyenne <b>${man.avgSep} yd</b> de separation en man ` +
    `contre <b>${zone.avgSep} yd</b> en zone, et la reussite tombe de ${zone.compRate}% a ${man.compRate}%. ` : "") +
    `C'est pourquoi un receveur capable de creer de la separation <b>contre le marquage individuel</b> a une valeur ` +
    `rare : il reste une option fiable meme quand la defense lui met un homme dessus. Pour un recruteur, le classement ` +
    `"man-to-man" isole exactement ce talent, la ou les stats de reception brutes melangent tout.`;
}

/* -------- Boot -------- */
fetch("data.json").then(r => r.json()).then(j => {
  DATA = j;
  applyFilters(); renderRanking(); renderAnalysis();
}).catch(err => {
  document.getElementById("playInfo").innerHTML =
    '<p class="text-red-400">Impossible de charger data.json. Lance le site via un serveur local (voir README).</p>';
  console.error(err);
});

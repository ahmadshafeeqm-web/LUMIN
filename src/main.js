import { currentUser, cloudStore, signOut, uploadImage } from "./session.js";



const $ = (id) => document.getElementById(id);
const NS = "";
const KEY = "lumin.v4";
const ls = cloudStore;
const defaults = {
  avatar: "", name: currentUser?.name || "Your profile", tagline: "Add a short line about yourself.",
  fields: [["Full name",currentUser?.name || ""],["Admission no",""],["Date of birth",""],["Phone",""],["Email",currentUser?.email || ""],["City",""],["Occupation",""],["Languages",""],["Blood group",""]],
  about: "Add a few lines about who you are, what you do and what you care about.",
  events: [], memories: [], gallery: []
};
let S = structuredClone(defaults);
try {
  const saved = JSON.parse(ls.get(KEY));
  if(saved) S = saved;
} catch { /* Server-validated data; use empty defaults if unavailable. */ }
let toastT;
function toast(m){ const t = $("toast"); if(!t) return; t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove("on"), 1600); }
function save(){ const ok = ls.set(KEY, JSON.stringify(S)); toast(ok ? "Saving changes…" : "Sign in to save your changes."); return ok; }

/* ---------- Sign in ---------- */
const welcome = $("welcome"), login = $("login"), app = $("app");
function greetWord(){ const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>';
const MOON = '<path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z"/>';
function setGreets(){
  const g = greetWord(), icon = new Date().getHours() < 17 ? SUN : MOON;
  ["l","w"].forEach(k => { $(k+"Hi").textContent = g; $(k+"Icon").innerHTML = icon; });
  $("wName").textContent = S.name;
}
function screen(n){
  if(n !== "login" && !currentUser) n = "login";
  welcome.hidden = n !== "welcome"; login.hidden = n !== "login"; app.hidden = n !== "app";
  window.scrollTo(0,0);
  if(n !== "app") setGreets();
  if(n === "app"){ render(); showView("profile"); }
}
function show(on){ screen(on ? "app" : "login"); }
$("wGo").addEventListener("click", () => screen("app"));
document.querySelectorAll(".wc").forEach(b => b.addEventListener("click", () => { screen("app"); showView(b.dataset.go); }));
$("wOut").addEventListener("click", signOut);
function applyLogo(){
  const url = ls.get("lumin.logo");
  document.querySelectorAll(".mark i, .lgi").forEach(n => { n.style.backgroundImage = url ? `url(${url})` : ""; n.classList.toggle("has-logo", !!url); });
  document.querySelectorAll(".logo-slot").forEach(n => n.classList.toggle("has", !!url));
}
$("logoFile").addEventListener("change", (e) => {
  const f = e.target.files[0]; if(!f) return;
  resize(f, 256, (url) => { ls.set("lumin.logo", url); applyLogo(); }, "png"); e.target.value = "";
});
$("eye").addEventListener("click", () => {
  const p = $("pass"), t = p.type === "password";
  p.type = t ? "text" : "password";
  $("eye").setAttribute("aria-label", t ? "Hide password" : "Show password");
});
$("logout").addEventListener("click", signOut);

/* ---------- Helpers ---------- */
function el(tag, cls, text){ const n = document.createElement(tag); if(cls) n.className = cls; if(text != null) n.textContent = text; return n; }
function initials(n){ return n.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("") || "L"; }
function fmtDate(s, o){ const d = new Date(s + "T00:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-IN", o); }
function todayStr(){ const n = new Date(); return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0"); }
async function resize(file, max, cb, type){
  try { const url = await uploadImage(file, max, type); if(cb) cb(url); return url; }
  catch { toast("Image could not be uploaded. Please select it again to retry."); return null; }
}
const grads = ["linear-gradient(145deg,#2d58ff,#6f98ff)","linear-gradient(145deg,#1d3fd8,#071040)","linear-gradient(145deg,#6f98ff,#3b7bff)","linear-gradient(145deg,#3b7bff,#12236b)"];
const ICONS = {
  id:'<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M14 10h4M14 14h4M6 16c.6-1.6 1.6-2 3-2s2.4.4 3 2"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  pin:'<path d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  job:'<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/>'
};
function chip(icon, label, value){
  const c = el("div","chip"), ic = el("span","ic");
  ic.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ICONS[icon]+'</svg>';
  const t = el("div"); t.append(el("small",null,label), el("b",null,value));
  c.append(ic,t); return c;
}

/* ---------- Render ---------- */
let editing = false;
function render(){
  const av = $("avatar");
  av.style.backgroundImage = S.avatar ? `url(${S.avatar})` : "none";
  av.textContent = S.avatar ? "" : initials(S.name);
  $("hName").textContent = S.name; $("hTag").textContent = S.tagline;
  const sa = $("sbAvatar"); sa.style.backgroundImage = S.avatar ? `url(${S.avatar})` : ""; sa.textContent = S.avatar ? "" : initials(S.name);
  $("sbName").textContent = S.name;
  const hr = new Date().getHours();
  { const g = $("gHi"); g.textContent = ""; g.append(el("span","gw",greetWord()+","), document.createTextNode(" "), el("b",null,S.name)); }
  $("gDate").textContent = new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});

  const next = S.events.filter(e => e.date >= todayStr()).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const get = (k) => (S.fields.find(f=>f[0]===k)||[])[1];
  const L = $("chipsL"), R = $("chipsR"); L.textContent = ""; R.textContent = "";
  if(get("Admission no")) L.append(chip("id","Admission no",get("Admission no")));
  if(get("City")) L.append(chip("pin","Lives in",get("City")));
  if(get("Phone")) R.append(chip("phone","Phone",get("Phone")));
  if(get("Occupation")) R.append(chip("job","Works as",get("Occupation")));
  const upAll = S.events.filter(e => e.date >= todayStr());
  $("stUp").textContent = upAll.length; $("stUpSub").textContent = upAll.length ? "on the calendar" : "nothing planned";
  $("stMem").textContent = S.memories.length; $("stMemSub").textContent = S.memories.length ? "saved so far" : "add the first one";
  if(next){
    const days = Math.round((new Date(next.date+"T00:00:00") - new Date(todayStr()+"T00:00:00"))/864e5);
    $("stNext").textContent = days === 0 ? "Today" : days === 1 ? "Tomorrow" : days + " days";
    $("stNextSub").textContent = next.title;
  } else { $("stNext").textContent = "None"; $("stNextSub").textContent = "add an event"; }

  const sp = $("spot"); sp.textContent = "";
  if(next){
    const days = Math.round((new Date(next.date+"T00:00:00") - new Date(todayStr()+"T00:00:00"))/864e5);
    const sd = el("div","sd"); sd.append(el("b",null,fmtDate(next.date,{day:"numeric"})), el("span",null,fmtDate(next.date,{month:"short"})));
    const m = el("div"); m.append(el("small",null,"Next event"), el("h3",null,next.title), el("p",null,next.place || "No place added"));
    sp.style.gridTemplateColumns = ""; sp.append(sd, m, el("span","in", days === 0 ? "Today" : days === 1 ? "Tomorrow" : "In "+days+" days"));
  } else {
    const m = el("div"); m.append(el("small",null,"Next event"), el("h3",null,"Nothing planned yet"), el("p",null,"Add an event from the Events page."));
    sp.style.gridTemplateColumns = "1fr"; sp.append(m);
  }

  const d = $("details"); d.textContent = "";
  S.fields.forEach((f,i) => {
    const t = el("div","tile"+(i===0 ? " blue" : "")); t.append(el("small",null,f[0]));
    if(editing){ const inp = el("input"); inp.maxLength = 300; inp.value = f[1]; inp.id = "f"+i; inp.setAttribute("aria-label",f[0]); t.append(inp); }
    else t.append(el("b", f[1] ? null : "nv", f[1] || "Not added"));
    d.append(t);
  });
  const ab = el("div","tile about"); ab.append(el("small",null,"About"));
  if(editing){
    const ta = el("textarea"); ta.maxLength = 20000; ta.id = "aboutEdit"; ta.value = S.about; ta.setAttribute("aria-label","About");
    const tg = el("input"); tg.maxLength = 300; tg.id = "tagEdit"; tg.value = S.tagline; tg.setAttribute("aria-label","Tagline"); tg.style.marginTop = "10px";
    ab.append(ta, tg);
  } else ab.append(el("p",null,S.about));
  d.append(ab);
  $("editBtn").hidden = editing; $("saveBtn").hidden = !editing;
  renderEvents(); renderMemories(); renderGallery();
}
function evCard(ev, t, canDel){
  const isUp = ev.date >= t, c = el("div","ev"+(isUp?" up":" past"));
  const w = el("div","when"); w.append(el("b",null,fmtDate(ev.date,{day:"numeric"})), el("span",null,fmtDate(ev.date,{month:"short",year:"numeric"})));
  const m = el("div"); m.append(el("h4",null,ev.title), el("p",null,ev.place || "No place added"));
  c.append(el("span","st", isUp ? "Upcoming" : "Past"));
  if(canDel){
    c.querySelector(".st").style.right = "52px";
    const x = el("button","x","\u00d7"); x.type = "button"; x.setAttribute("aria-label","Remove "+ev.title);
    x.addEventListener("click",()=>{ S.events = S.events.filter(k=>k.id!==ev.id); save(); render(); });
    c.append(x);
  } else c.querySelector(".st").style.right = "18px";
  c.append(w, m); return c;
}
function renderEvents(){
  const box = $("evList"), pv = $("evPreview"); box.textContent = ""; pv.textContent = "";
  const t = todayStr();
  const up = S.events.filter(e=>e.date>=t).sort((a,b)=>a.date.localeCompare(b.date));
  const past = S.events.filter(e=>e.date<t).sort((a,b)=>b.date.localeCompare(a.date));
  if(!S.events.length) box.append(el("div","empty","No events yet. Add the first one below."));
  [...up, ...past].forEach(ev => box.append(evCard(ev, t, true)));
  if(up.length) up.slice(0,3).forEach(ev => pv.append(evCard(ev, t, false)));
  else pv.append(el("div","empty","No upcoming events. Add one from the Events page."));
}
function renderMemories(){
  const box = $("memList"); box.textContent = "";
  if(!S.memories.length){ box.append(el("div","empty","No memories yet. Add a photo and a few words below.")); return; }
  [...S.memories].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).forEach((m,i) => {
    const c = el("article","mem");
    if(m.img){ const im = new Image(); im.src = m.img; im.alt = m.title; c.append(im); }
    else { const ph = el("div","ph",initials(m.title)); ph.style.background = grads[i % grads.length]; c.append(ph); }
    const tx = el("div","tx");
    if(m.date) tx.append(el("small",null,fmtDate(m.date,{day:"numeric",month:"long",year:"numeric"})));
    tx.append(el("h4",null,m.title)); if(m.text) tx.append(el("p",null,m.text));
    const x = el("button","x","×"); x.type = "button"; x.setAttribute("aria-label","Remove "+m.title);
    x.addEventListener("click",()=>{ S.memories = S.memories.filter(k=>k.id!==m.id); save(); render(); });
    c.append(tx,x); box.append(c);
  });
}

/* ---------- Actions ---------- */
$("editBtn").addEventListener("click",()=>{ editing = true; render(); });
$("saveBtn").addEventListener("click",()=>{
  const vals = S.fields.map((f,i) => [f[0], $("f"+i)?.value.trim() || ""]);
  const email = vals.find(f => f[0] === "Email")?.[1];
  const phone = vals.find(f => f[0] === "Phone")?.[1];
  if(vals.some(f => f[1].length > 300) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || (phone && !/^\+?[\d ()-]{7,25}$/.test(phone))){ toast("Check your email and phone number; details must be under 300 characters."); return; }
  S.fields = vals;
  S.about = $("aboutEdit").value.trim() || S.about;
  S.tagline = $("tagEdit").value.trim() || S.tagline;
  const nm = S.fields.find(f=>f[0]==="Full name"); if(nm && nm[1]) S.name = nm[1];
  editing = false; save(); render();
});
$("avatarFile").addEventListener("change",(e)=>{
  const f = e.target.files[0]; if(!f) return;
  resize(f, 560, (url)=>{ S.avatar = url; save(); render(); }); e.target.value = "";
});
$("evForm").addEventListener("submit",(e)=>{
  e.preventDefault();
  const t = $("evTitle").value.trim(), d = $("evDate").value; if(!t || !d) return;
  S.events.push({id:Date.now(),title:t,date:d,place:$("evPlace").value.trim()});
  e.target.reset(); save(); render();
});
$("memForm").addEventListener("submit",(e)=>{
  e.preventDefault();
  const t = $("memTitle").value.trim(); if(!t) return;
  const m = {id:Date.now(),title:t,date:$("memDate").value,text:$("memText").value.trim(),img:""};
  const f = $("memFile").files[0];
  const done = ()=>{ S.memories.push(m); $("memForm").reset(); save(); render(); };
  if(f) resize(f, 900, (url)=>{ m.img = url; done(); }); else done();
});
function showView(v){
  document.querySelectorAll("[data-view]").forEach(n => {
    n.hidden = n.dataset.view !== v;
    if(!n.hidden){ n.classList.remove("enter"); void n.offsetWidth; n.classList.add("enter"); }
  });
  document.querySelectorAll(".menu button[data-v]").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  window.scrollTo(0,0);
}
$("gBtn").addEventListener("click", () => showView("events"));
document.querySelectorAll(".qa").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));
$("allEv").addEventListener("click", () => showView("events"));
document.querySelectorAll(".menu button[data-v]").forEach(b => b.addEventListener("click", () => showView(b.dataset.v)));

/* ================= Quiz engine ================= */
const QBANK = [
  {q:"Which planet is known as the Red Planet?", o:["Mars","Venus","Jupiter","Mercury"], a:0},
  {q:"What is the capital of India?", o:["Mumbai","New Delhi","Kolkata","Chennai"], a:1},
  {q:"How many continents are there?", o:["5","6","7","8"], a:2},
  {q:"Which gas do plants absorb from the air?", o:["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"], a:2},
  {q:"Who wrote the Indian national anthem?", o:["Bankim Chandra Chatterjee","Rabindranath Tagore","Sarojini Naidu","Mahatma Gandhi"], a:1},
  {q:"Which is the largest ocean on Earth?", o:["Atlantic","Indian","Arctic","Pacific"], a:3},
  {q:"How many sides does a hexagon have?", o:["5","6","7","8"], a:1},
  {q:"Which language is used to style web pages?", o:["CSS","SQL","Python","Java"], a:0},
  {q:"What is the smallest prime number?", o:["0","1","2","3"], a:2},
  {q:"Which organ pumps blood around the body?", o:["Liver","Lungs","Kidney","Heart"], a:3},
  {q:"What is the national animal of India?", o:["Lion","Tiger","Elephant","Leopard"], a:1},
  {q:"What is 12 x 12?", o:["124","132","144","148"], a:2},
  {q:"Which planet is famous for its rings?", o:["Saturn","Mars","Earth","Neptune"], a:0},
  {q:"Who developed the theory of relativity?", o:["Isaac Newton","Albert Einstein","Nikola Tesla","Galileo Galilei"], a:1},
  {q:"What does HTML stand for?", o:["HyperText Markup Language","High Tech Modern Language","Home Tool Markup Language","Hyperlink and Text Management Language"], a:0},
  {q:"Which is the highest mountain above sea level?", o:["K2","Kangchenjunga","Mount Everest","Makalu"], a:2},
  {q:"How many days are in a leap year?", o:["365","366","364","367"], a:1},
  {q:"Which metal is liquid at room temperature?", o:["Iron","Copper","Mercury","Zinc"], a:2},
  {q:"What is the square root of 81?", o:["7","8","9","11"], a:2},
  {q:"Which country is called the Land of the Rising Sun?", o:["China","Japan","Thailand","South Korea"], a:1}
];
function shuffleArr(a){ for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
function mountQuiz(root, count, onDone){
  let list, i, score, t0, locked;
  function start(){
    list = shuffleArr(QBANK.slice()).slice(0,count).map(b => ({q:b.q, o:shuffleArr(b.o.map((t,k) => ({t, ok:k === b.a})))}));
    i = 0; score = 0; t0 = Date.now(); locked = false; draw();
  }
  function draw(){
    root.textContent = "";
    const box = el("div","qz");
    if(i >= list.length){
      const secs = Math.round((Date.now() - t0)/1000), r = score/list.length;
      box.className = "qz qz-res";
      box.append(el("b",null,score+"/"+list.length),
        el("p",null, r === 1 ? "Perfect score. Well done!" : r >= .6 ? "Nice work. You know your stuff." : "Good try. Play again to beat it."),
        el("p",null,"Time: "+Math.floor(secs/60)+":"+String(secs%60).padStart(2,"0")));
      const again = el("button","btn solid sm","Play again"); again.type = "button"; again.addEventListener("click", start); box.append(again);
      root.append(box);
      if(onDone) onDone(score, list.length, secs);
      return;
    }
    const cur = list[i];
    const top = el("div","qz-top"); top.append(el("span",null,"Question "+(i+1)+" of "+list.length), el("span",null,"Score "+score));
    const bar = el("div","qz-bar"), fill = el("i"); fill.style.width = (i/list.length*100)+"%"; bar.append(fill);
    const opts = el("div","qz-opts"), fb = el("div","qz-fb"), next = el("button","btn solid sm", i === list.length-1 ? "See results" : "Next question");
    next.type = "button"; next.hidden = true; locked = false;
    cur.o.forEach((opt,k) => {
      const b = el("button","qz-o"); b.type = "button";
      b.append(el("b",null,"ABCD"[k]), document.createTextNode(opt.t));
      b.addEventListener("click", () => {
        if(locked) return; locked = true;
        opts.querySelectorAll(".qz-o").forEach((x,n) => { x.disabled = true; if(cur.o[n].ok) x.classList.add("right"); });
        if(opt.ok){ score++; fb.textContent = "Correct!"; } else { b.classList.add("wrong"); fb.textContent = "Not quite. The answer is "+cur.o.find(x => x.ok).t+"."; }
        next.hidden = false; next.focus();
      });
      opts.append(b);
    });
    next.addEventListener("click", () => { i++; draw(); });
    box.append(top, bar, el("h4","qz-q",cur.q), opts, fb, next);
    root.append(box);
  }
  start();
}

/* ================= Quiz Arena ================= */
(function(){
  const q = (id) => document.getElementById(id);
  let activeGame = "xox";
  function seg(id, attr, cb){
    const box = q(id);
    box.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      box.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      cb(b.dataset[attr]);
    }));
  }

  /* ---- Private account scores ---- */
  const LBK = "lumin.lb.v1"; let LB;
  try { LB = JSON.parse(ls.get(LBK)); } catch(e){ LB = null; }
  if(!LB || typeof LB !== "object") LB = {};
  LB.xox = LB.xox || {}; LB.puz = LB.puz || []; LB.sud = LB.sud || []; LB.quiz = LB.quiz || [];
  const lbSave = () => ls.set(LBK, JSON.stringify(LB));
  const pname = q("playerName"); pname.value = ls.get("lumin.player") || S.name;
  pname.addEventListener("input", () => ls.set("lumin.player", pname.value));
  const who = () => pname.value.trim() || S.name;
  function lbXox(w){
    if(xMode !== "cpu") return;
    const pts = w === "X" ? (xLevel === "hard" ? 3 : 1) : (w === "D" && xLevel === "hard" ? 1 : 0);
    if(pts){ const n = who(); LB.xox[n] = (LB.xox[n] || 0) + pts; lbSave(); }
  }
  function lbCard(title, note, rows){
    const c = el("div","lbc"); c.append(el("h4",null,title), el("div","nt",note));
    if(!rows.length){ c.append(el("p","none","No scores yet. Play a round to get on the board.")); return c; }
    const ol = el("ol");
    rows.slice(0,5).forEach((r,i) => {
      const li = el("li"), nm = el("div","nm",r.nm);
      if(r.sub) nm.append(el("small",null,r.sub));
      li.append(el("span","rk",String(i+1)), nm, el("span","sc2",r.sc)); ol.append(li);
    });
    c.append(ol); return c;
  }
  function lbRender(){
    const g = q("lbGrid"); g.textContent = "";
    g.append(lbCard("Tic-Tac-Toe","Win on Hard 3 pts, on Easy 1 pt, Hard draw 1 pt",
      Object.entries(LB.xox).sort((a,b) => b[1]-a[1]).map(([n,v]) => ({nm:n, sc:v+" pts"}))));
    [3,4].forEach(z => g.append(lbCard("Puzzle "+z+" x "+z,"Fewest moves, then fastest",
      LB.puz.filter(e => e.size === z).sort((a,b) => a.moves-b.moves || a.secs-b.secs).map(e => ({nm:e.n, sub:fmt(e.secs), sc:e.moves+" moves"})))));
    const wt = {easy:1,medium:2,hard:3};
    g.append(lbCard("Sudoku","Hardest level first, then fastest. No hints.",
      LB.sud.slice().sort((a,b) => wt[b.level]-wt[a.level] || a.secs-b.secs).map(e => ({nm:e.n, sub:e.level, sc:fmt(e.secs)}))));
    g.append(lbCard("Quiz","Most correct answers, then fastest",
      LB.quiz.slice().sort((a,b) => b.score-a.score || a.secs-b.secs).map(e => ({nm:e.n, sub:fmt(e.secs), sc:e.score+"/"+e.total}))));
  }
  let lbConfirm;
  q("lbClear").addEventListener("click", (e) => {
    if(!lbConfirm){ lbConfirm = setTimeout(() => { lbConfirm = null; e.target.textContent = "Clear leaderboard"; }, 3000); e.target.textContent = "Click again to confirm"; return; }
    clearTimeout(lbConfirm); lbConfirm = null; e.target.textContent = "Clear leaderboard";
    LB = {xox:{}, puz:[], sud:[], quiz:[]}; lbSave(); lbRender();
  });

  mountQuiz(q("quizBox"), 5, (score, total, secs) => {
    LB.quiz.push({n:who(), score, total, secs}); LB.quiz.sort((x,y) => y.score-x.score || x.secs-y.secs); LB.quiz = LB.quiz.slice(0,60); lbSave();
  });
  seg("gameTabs","g", g => { activeGame = g; document.querySelectorAll(".game").forEach(x => { x.hidden = x.id !== "g-"+g; }); if(g === "lb") lbRender(); });

  /* ---- Tic-Tac-Toe ---- */
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let xb, xTurn, xOver, xWin, xStarted = false, xMode = "cpu", xLevel = "hard", sc = {X:0,O:0,D:0}, xTimer;
  function result(b){
    for(const [a,c,d] of LINES) if(b[a] && b[a] === b[c] && b[a] === b[d]) return {w:b[a], line:[a,c,d]};
    return b.every(Boolean) ? {w:"D", line:[]} : null;
  }
  function minimax(b, p, depth){
    const r = result(b);
    if(r) return r.w === "O" ? 10 - depth : r.w === "X" ? depth - 10 : 0;
    let best = p === "O" ? -Infinity : Infinity;
    for(let i=0;i<9;i++) if(!b[i]){
      b[i] = p; const v = minimax(b, p === "O" ? "X" : "O", depth+1); b[i] = "";
      best = p === "O" ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  }
  function cpuMove(){
    if(xOver) return;
    const empty = []; xb.forEach((v,i) => { if(!v) empty.push(i); });
    let pick;
    if(xLevel === "easy") pick = empty[Math.floor(Math.random()*empty.length)];
    else {
      let best = -Infinity, pool = [];
      empty.forEach(i => { xb[i] = "O"; const v = minimax(xb,"X",1); xb[i] = ""; if(v > best){ best = v; pool = [i]; } else if(v === best) pool.push(i); });
      pick = pool[Math.floor(Math.random()*pool.length)];
    }
    xPlay(pick, true);
  }
  function xPlay(i, fromCpu){
    if(xOver || xb[i]) return;
    if(xMode === "cpu" && xTurn === "O" && !fromCpu) return;
    xb[i] = xTurn;
    const r = result(xb);
    if(r){ xOver = true; xWin = r.line; sc[r.w]++; lbXox(r.w); }
    else xTurn = xTurn === "X" ? "O" : "X";
    xRender();
    if(!xOver && xMode === "cpu" && xTurn === "O"){ clearTimeout(xTimer); xTimer = setTimeout(cpuMove, 380); }
  }
  function xRender(){
    const box = q("xoxBoard"); box.textContent = "";
    xb.forEach((v,i) => {
      const c = el("button","cell3"+(v==="O"?" o":"")+(xWin.includes(i)?" win":""), v);
      c.type = "button"; c.disabled = !!v || xOver || !xStarted || (xMode === "cpu" && xTurn === "O");
      c.setAttribute("aria-label","Cell "+(i+1)+(v ? ", "+v : ", empty"));
      c.addEventListener("click", () => xPlay(i)); box.append(c);
    });
    const cpu = xMode === "cpu";
    q("scXl").textContent = cpu ? "You (X)" : "Player X"; q("scOl").textContent = cpu ? "Computer (O)" : "Player O";
    q("scX").textContent = sc.X; q("scO").textContent = sc.O; q("scD").textContent = sc.D;
    q("xoxLevel").hidden = !cpu;
    let t;
    if(!xStarted) t = "Press Start to begin.";
    else if(xOver){ const r = result(xb); t = r.w === "D" ? "It is a draw." : cpu ? (r.w === "X" ? "You win!" : "Computer wins.") : "Player "+r.w+" wins!"; }
    else t = cpu ? (xTurn === "X" ? "Your turn (X)" : "Computer is thinking...") : "Player "+xTurn+"'s turn";
    q("xoxStatus").textContent = t;
    q("xoxNew").textContent = !xStarted ? "Start game" : xOver ? "Play again" : "Restart";
  }
  function xNew(go){ xStarted = !!go; clearTimeout(xTimer); xb = Array(9).fill(""); xTurn = "X"; xOver = false; xWin = []; xRender(); }
  seg("xoxMode","m", m => { xMode = m; sc = {X:0,O:0,D:0}; xNew(); });
  seg("xoxLevel","l", l => { xLevel = l; xNew(); });
  q("xoxNew").addEventListener("click", () => xNew(true));
  xNew();

  /* ---- Sliding puzzle ---- */
  let pn = 3, tiles = [], moves = 0, secs = 0, ptimer = null, pstarted = false, pdone = false;
  const fmt = (s) => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
  const nbrs = (i) => { const r = Math.floor(i/pn), c = i%pn, o = []; if(r>0)o.push(i-pn); if(r<pn-1)o.push(i+pn); if(c>0)o.push(i-1); if(c<pn-1)o.push(i+1); return o; };
  const psolved = () => tiles.every((v,i) => i === tiles.length-1 ? v === 0 : v === i+1);
  const bestKey = () => "lumin.puzbest" + pn;
  function pBest(){ const b = ls.get(bestKey()); q("puBest").textContent = b || "-"; }
  function pRender(){
    const box = q("puzBoard"); box.textContent = ""; box.style.gridTemplateColumns = "repeat("+pn+",1fr)"; box.style.gridTemplateRows = "repeat("+pn+",1fr)";
    tiles.forEach((v,i) => {
      const b = el("button","tp"+(v?"":" blank"), v ? String(v) : ""); b.type = "button";
      if(v){ b.setAttribute("aria-label","Tile "+v); b.addEventListener("click", () => pMove(i)); } else b.tabIndex = -1;
      box.append(b);
    });
    q("puMoves").textContent = moves; q("puTime").textContent = fmt(secs);
    q("puStatus").textContent = pdone ? "Solved in "+moves+" moves, "+fmt(secs)+"." : "Put the tiles in order.";
  }
  function pMove(i){
    if(pdone) return;
    const bl = tiles.indexOf(0); if(!nbrs(bl).includes(i)) return;
    [tiles[bl], tiles[i]] = [tiles[i], tiles[bl]]; moves++;
    if(!pstarted){ pstarted = true; ptimer = setInterval(() => { secs++; q("puTime").textContent = fmt(secs); }, 1000); }
    if(psolved()){
      pdone = true; clearInterval(ptimer);
      const b = parseInt(ls.get(bestKey()) || "0", 10); if(!b || moves < b){ ls.set(bestKey(), String(moves)); }
      LB.puz.push({n:who(), size:pn, moves, secs}); LB.puz.sort((x,y) => x.moves-y.moves || x.secs-y.secs); LB.puz = LB.puz.slice(0,60); lbSave();
      pBest();
    }
    pRender();
  }
  function pShuffle(){
    clearInterval(ptimer); moves = 0; secs = 0; pstarted = false; pdone = false;
    tiles = []; for(let i=1;i<pn*pn;i++) tiles.push(i); tiles.push(0);
    let bl = tiles.length-1, prev = -1;
    for(let s=0; s<pn*pn*30; s++){
      const opts = nbrs(bl).filter(x => x !== prev), pick = opts[Math.floor(Math.random()*opts.length)];
      [tiles[bl], tiles[pick]] = [tiles[pick], tiles[bl]]; prev = bl; bl = pick;
    }
    if(psolved()) return pShuffle();
    pBest(); pRender();
  }
  seg("puSize","n", n => { pn = parseInt(n,10); pShuffle(); });
  q("puShuffle").addEventListener("click", pShuffle);
  pShuffle();

  /* ---- Sudoku ---- */
  const PEERS = [];
  for(let i=0;i<81;i++){
    const r = Math.floor(i/9), c = i%9, set = new Set();
    for(let k=0;k<9;k++){ set.add(r*9+k); set.add(k*9+c); }
    const br = r - r%3, bc = c - c%3;
    for(let a=0;a<3;a++) for(let b=0;b<3;b++) set.add((br+a)*9+bc+b);
    set.delete(i); PEERS.push([...set]);
  }
  const shuffle = (a) => { for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
  function genSolved(){
    const g = Array(81).fill(0);
    (function fill(pos){
      if(pos === 81) return true;
      for(const n of shuffle([1,2,3,4,5,6,7,8,9])){
        if(PEERS[pos].every(p => g[p] !== n)){ g[pos] = n; if(fill(pos+1)) return true; g[pos] = 0; }
      }
      return false;
    })(0);
    return g;
  }
  let sGrid = [], sGiven = [], sSol = [], sSel = -1, sDone = false, sLevel = "medium", sT0 = Date.now(), sHints = 0;
  const conflict = (i) => sGrid[i] !== 0 && PEERS[i].some(p => sGrid[p] === sGrid[i]);
  function sNew(){
    sSol = genSolved(); sGrid = sSol.slice();
    const remove = {easy:36, medium:46, hard:53}[sLevel];
    shuffle([...Array(81).keys()]).slice(0, remove).forEach(i => { sGrid[i] = 0; });
    sGiven = sGrid.map(v => v !== 0); sSel = -1; sDone = false; sT0 = Date.now(); sHints = 0;
    sRender("Pick a cell, then a number.");
  }
  function sRender(msg){
    const box = q("sudBoard"); box.textContent = "";
    const selV = sSel >= 0 ? sGrid[sSel] : 0;
    for(let i=0;i<81;i++){
      const r = Math.floor(i/9), c = i%9;
      let cls = "sc" + (sGiven[i] ? " g" : "") + (c%3===2 && c!==8 ? " bx" : "") + (r%3===2 && r!==8 ? " by" : "");
      if(sSel >= 0){ if(i === sSel) cls += " sl"; else if(PEERS[sSel].includes(i)) cls += " pe"; if(i !== sSel && selV && sGrid[i] === selV) cls += " sm"; }
      if(conflict(i)) cls += " cf";
      const b = el("button", cls, sGrid[i] ? String(sGrid[i]) : ""); b.type = "button";
      b.setAttribute("aria-label","Row "+(r+1)+", column "+(c+1)+(sGrid[i] ? ", "+sGrid[i] : ", empty"));
      b.addEventListener("click", () => { sSel = i; sRender(); }); box.append(b);
    }
    if(msg) q("sudStatus").textContent = msg;
  }
  function sWin(){
    sDone = true; const secs = Math.round((Date.now() - sT0)/1000);
    if(!sHints){ LB.sud.push({n:who(), level:sLevel, secs}); LB.sud.sort((x,y) => x.secs-y.secs); LB.sud = LB.sud.slice(0,60); lbSave(); }
    sRender("Solved in "+fmt(secs)+(sHints ? " (hints used, not ranked)." : "."));
  }
  function sSet(v){
    if(sSel < 0 || sGiven[sSel] || sDone) return;
    sGrid[sSel] = v;
    const full = sGrid.every(x => x), bad = sGrid.some((x,i) => conflict(i));
    if(full && !bad) sWin(); else sRender(bad ? "Some numbers clash. Check the red cells." : "");
  }
  const pad = q("sudPad");
  for(let n=1;n<=9;n++){ const b = el("button",null,String(n)); b.type = "button"; b.addEventListener("click", () => sSet(n)); pad.append(b); }
  const er = el("button","er","Erase"); er.type = "button"; er.addEventListener("click", () => sSet(0)); pad.append(er);
  q("sudNew").addEventListener("click", sNew);
  seg("sudLevel","d", d => { sLevel = d; sNew(); });
  q("sudCheck").addEventListener("click", () => {
    const bad = sGrid.filter((x,i) => conflict(i)).length, left = sGrid.filter(x => !x).length;
    sRender(bad ? bad+" cells clash with another number." : left ? "No clashes so far. "+left+" cells left." : "Solved. Nicely done.");
  });
  q("sudHint").addEventListener("click", () => {
    if(sDone) return;
    let i = sSel;
    if(i < 0 || sGiven[i] || sGrid[i] === sSol[i]){
      const open = []; sGrid.forEach((v,k) => { if(!sGiven[k] && v !== sSol[k]) open.push(k); });
      if(!open.length) return; i = open[Math.floor(Math.random()*open.length)];
    }
    sSel = i; sGrid[i] = sSol[i]; sHints++;
    const full = sGrid.every(x => x), bad = sGrid.some((x,k) => conflict(k));
    if(full && !bad) sWin(); else sRender("Hint added.");
  });
  document.addEventListener("keydown", (e) => {
    if(activeGame !== "sud" || q("arena").hidden || /INPUT|TEXTAREA/.test((e.target.tagName||""))) return;
    if(e.key >= "1" && e.key <= "9"){ sSet(parseInt(e.key,10)); e.preventDefault(); }
    else if(e.key === "Backspace" || e.key === "Delete" || e.key === "0"){ sSet(0); e.preventDefault(); }
    else if(e.key.startsWith("Arrow")){
      if(sSel < 0) sSel = 0;
      else { const r = Math.floor(sSel/9), c = sSel%9;
        if(e.key === "ArrowUp" && r>0) sSel -= 9; if(e.key === "ArrowDown" && r<8) sSel += 9;
        if(e.key === "ArrowLeft" && c>0) sSel -= 1; if(e.key === "ArrowRight" && c<8) sSel += 1; }
      sRender(); e.preventDefault();
    }
  });
  sNew();
})();


/* ================= Gallery ================= */
function scene(kind){
  const W = 800, H = 600; let g = "";
  const stars = (n, maxY) => { let o = ""; for(let i=0;i<n;i++){ o += `<circle cx='${(i*137)%W}' cy='${(i*71)%maxY}' r='${(i%3)*.5+.6}' fill='#fff' opacity='${.4+(i%4)*.15}'/>`; } return o; };
  const S = {
    golden:`<defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3b2a6b'/><stop offset='.55' stop-color='#e8734a'/><stop offset='1' stop-color='#ffc46b'/></linearGradient></defs><rect width='${W}' height='${H}' fill='url(#a)'/><circle cx='520' cy='360' r='72' fill='#fff3c4'/><path d='M0 430Q150 360 300 420T600 410T800 400V600H0Z' fill='#5a2a4a'/><path d='M0 505Q200 440 400 492T800 480V600H0Z' fill='#2a1230'/>`,
    night:`<defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#020617'/><stop offset='.7' stop-color='#0a3a6e'/><stop offset='1' stop-color='#0c4a7a'/></linearGradient><radialGradient id='b' cx='.5' cy='.9' r='.6'><stop offset='0' stop-color='#22d3ee' stop-opacity='.55'/><stop offset='1' stop-color='#22d3ee' stop-opacity='0'/></radialGradient></defs><rect width='${W}' height='${H}' fill='url(#a)'/>${stars(70,330)}<rect width='${W}' height='${H}' fill='url(#b)'/><circle cx='560' cy='170' r='34' fill='#e8f1ff'/><circle cx='574' cy='162' r='32' fill='#0a2a52'/><path d='M0 430L120 340L210 390L330 300L450 380L560 320L690 400L800 350V600H0Z' fill='#06182e'/><path d='M0 520Q200 470 400 510T800 495V600H0Z' fill='#030b17'/>`,
    canyon:`<defs><linearGradient id='a' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2a0f3a'/><stop offset='.6' stop-color='#c4432f'/><stop offset='1' stop-color='#f08a4b'/></linearGradient></defs><rect width='${W}' height='${H}' fill='url(#a)'/><path d='M0 120Q200 40 380 140T800 90V0H0Z' fill='#4a1450'/><ellipse cx='420' cy='300' rx='120' ry='46' fill='#fff1d6'/><path d='M0 260Q220 180 400 300T800 250V600H0Z' fill='#d9552f' opacity='.85'/><path d='M0 360Q240 280 420 380T800 340V600H0Z' fill='#8a2a5a' opacity='.9'/><path d='M0 470Q260 400 440 480T800 450V600H0Z' fill='#3b1245'/>`,
    city:`<defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1b2a5c'/><stop offset='.6' stop-color='#b4607a'/><stop offset='1' stop-color='#f6a65c'/></linearGradient><linearGradient id='w' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f6a65c' stop-opacity='.6'/><stop offset='1' stop-color='#0a0f24'/></linearGradient></defs><rect width='${W}' height='${H}' fill='url(#a)'/><g fill='#0b0f26'><rect x='30' y='300' width='70' height='160'/><rect x='110' y='250' width='60' height='210'/><rect x='180' y='330' width='80' height='130'/><rect x='270' y='220' width='56' height='240'/><rect x='336' y='290' width='90' height='170'/><rect x='440' y='260' width='64' height='200'/><rect x='514' y='340' width='84' height='120'/><rect x='610' y='230' width='60' height='230'/><rect x='680' y='310' width='90' height='150'/></g><g fill='#ffd27a'>${Array.from({length:46},(_,i)=>`<rect x='${40+(i*53)%720}' y='${270+(i*37)%170}' width='5' height='7'/>`).join("")}</g><rect y='460' width='${W}' height='140' fill='url(#w)'/><g stroke='#ffd27a' stroke-opacity='.45' stroke-width='3'>${Array.from({length:14},(_,i)=>`<path d='M${60+i*52} 470V${540+(i%3)*20}'/>`).join("")}</g>`,
    aurora:`<defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#02060f'/><stop offset='1' stop-color='#06222e'/></linearGradient><linearGradient id='b' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#34f5a4' stop-opacity='0'/><stop offset='.5' stop-color='#34f5a4' stop-opacity='.65'/><stop offset='1' stop-color='#22b8f0' stop-opacity='0'/></linearGradient></defs><rect width='${W}' height='${H}' fill='url(#a)'/>${stars(50,260)}<path d='M0 260Q150 80 320 220T640 150T800 230V380Q640 300 480 360T200 330T0 370Z' fill='url(#b)'/><path d='M0 470L150 380L260 430L400 340L540 440L680 370L800 430V600H0Z' fill='#04141c'/><rect y='520' width='${W}' height='80' fill='#020a10'/>`,
    field:`<defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f08a2a'/><stop offset='.7' stop-color='#ffb347'/><stop offset='1' stop-color='#b4501a'/></linearGradient></defs><rect width='${W}' height='${H}' fill='url(#a)'/><circle cx='400' cy='380' r='64' fill='#fff1c9'/><rect y='400' width='${W}' height='200' fill='#7a3510'/><g stroke='#3b1a08' stroke-width='3' opacity='.7'>${Array.from({length:60},(_,i)=>`<path d='M${(i*13)%W} 600L${(i*13)%W+((i%5)-2)*5} ${480+(i%7)*10}'/>`).join("")}</g><path d='M380 400V330M370 330Q380 300 392 330' stroke='#1c0c04' stroke-width='6' fill='none'/>`
  };
  g = S[kind] || S.golden;
  return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid slice'>${g}</svg>`);
}
let glbI = -1;
const gSrc = (it) => it.img || scene(it.kind);
function renderGallery(){
  $("gName").textContent = S.name;
  $("gCount").textContent = S.gallery.length + (S.gallery.length === 1 ? " photo" : " photos");
  const box = $("mosaic"); box.textContent = "";
  if(!S.gallery.length){ box.style.display = "block"; box.append(el("div","empty","No photos yet. Tap the + button to add your first photo.")); return; }
  box.style.display = "";
  S.gallery.forEach((it,i) => {
    const t = el("div","gt"); t.style.backgroundImage = `url("${gSrc(it)}")`;
    const open = el("button","gopen"); open.type = "button"; open.setAttribute("aria-label","Open "+it.title); open.addEventListener("click", () => openLB(i));
    const x = el("button","gx","×"); x.type = "button"; x.setAttribute("aria-label","Remove "+it.title);
    x.addEventListener("click", () => { S.gallery = S.gallery.filter(k => k.id !== it.id); save(); renderGallery(); });
    t.append(open, el("div","gcap",it.title), x); box.append(t);
  });
}
function openLB(i){
  if(!S.gallery.length) return;
  glbI = (i + S.gallery.length) % S.gallery.length;
  const it = S.gallery[glbI];
  $("glbImg").style.backgroundImage = `url("${gSrc(it)}")`; $("glbImg").setAttribute("aria-label", it.title);
  $("glbCap").value = it.title; $("glb").hidden = false; $("glbX").focus();
}
function closeLB(){ $("glb").hidden = true; glbI = -1; renderGallery(); }
$("glbX").addEventListener("click", closeLB);
$("glbP").addEventListener("click", () => openLB(glbI-1));
$("glbN").addEventListener("click", () => openLB(glbI+1));
$("glb").addEventListener("click", (e) => { if(e.target === $("glb") || e.target.classList.contains("glb-f")) closeLB(); });
$("glbCap").addEventListener("change", () => { const it = S.gallery[glbI]; if(it){ it.title = $("glbCap").value.trim() || it.title; save(); } });
document.addEventListener("keydown", (e) => {
  if($("glb").hidden || e.target === $("glbCap")) return;
  if(e.key === "Escape") closeLB(); else if(e.key === "ArrowLeft") openLB(glbI-1); else if(e.key === "ArrowRight") openLB(glbI+1);
});
$("gFile").addEventListener("change", async (e) => {
  const files = [...e.target.files]; e.target.value = "";
  const added = [];
  for(const f of files){
    const url = await resize(f, 1400);
    if(!url) continue;
    const it = {id:"p"+Date.now()+Math.random().toString(36).slice(2,6), title:(f.name || "Photo").replace(/\.[^.]+$/,"").slice(0,60), img:url};
    S.gallery.push(it); added.push(it);
  }
  if(added.length && !save()){ S.gallery = S.gallery.filter(k => !added.includes(k)); }
  renderGallery();
});

/* ================= Challenge, Creativity, Football ================= */
(function(){
const store = {
  get(k, d){ try { const v = JSON.parse(ls.get(k)); return v == null ? d : v; } catch(e){ return d; } },
  set(k, v){ return ls.set(k, JSON.stringify(v)); }
};
const pad = (n) => String(n).padStart(2,"0");
const dkey = (d) => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
const dayIdx = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
const wordCount = (s) => (s.trim().match(/[\p{L}\p{N}']+/gu) || []).length;
const shuf = (a) => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
const clear = (n) => { while(n.firstChild) n.removeChild(n.firstChild); };

/* ---------- Challenge ---------- */
const WORDS = [
  ["Serendipity","a happy accident or lucky discovery"],["Ephemeral","lasting for a very short time"],["Resilient","able to recover quickly from difficulty"],
  ["Meticulous","very careful about every detail"],["Eloquent","fluent and persuasive in speaking or writing"],["Benevolent","kind and well meaning"],
  ["Ubiquitous","found everywhere at once"],["Pragmatic","dealing with things in a practical way"],["Candid","honest and straightforward"],
  ["Tenacious","holding firmly and not giving up"],["Lucid","clearly expressed and easy to understand"],["Ambiguous","open to more than one meaning"],
  ["Diligent","showing steady, careful effort"],["Verbose","using more words than needed"],["Altruistic","caring about the welfare of others"],
  ["Nostalgia","a wistful longing for the past"],["Inevitable","certain to happen"],["Frugal","careful about spending money"],
  ["Gregarious","fond of company and social"],["Quaint","charmingly old fashioned"],["Zenith","the highest point"],
  ["Mundane","ordinary and dull"],["Vivid","producing strong, clear images"],["Humble","not proud or arrogant"],
  ["Innovate","to introduce new ideas or methods"],["Perplexed","completely puzzled"],["Radiant","sending out light, glowing brightly"],
  ["Subtle","delicate and not obvious"],["Vigilant","keeping careful watch"],["Whimsical","playfully unusual or fanciful"]
];
const RIDDLES = [
  ["I have keys but open no locks, and space but no room. What am I?",["keyboard","a keyboard"]],
  ["What has hands but cannot clap?",["clock","a clock","watch"]],
  ["The more you take, the more you leave behind. What am I?",["footsteps","steps","footstep"]],
  ["What gets wetter the more it dries?",["towel","a towel"]],
  ["I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",["echo","an echo"]],
  ["What has to be broken before you can use it?",["egg","an egg"]],
  ["What can travel around the world while staying in one corner?",["stamp","a stamp","postage stamp"]],
  ["Forward I am heavy, backward I am not. What am I?",["ton","a ton"]],
  ["What comes once in a minute, twice in a moment, but never in a thousand years?",["m","the letter m","letter m"]],
  ["What has a head and a tail but no body?",["coin","a coin"]],
  ["What can you catch but not throw?",["cold","a cold"]],
  ["I am tall when I am young and short when I am old. What am I?",["candle","a candle"]]
];
const TOPICS = [
  "How does the internet send a message from one device to another?","Why is the sky blue?","How do vaccines protect the body?","What causes the seasons?",
  "How do plants make food from sunlight?","What is inflation and why does it matter?","How does a rainbow form?","Why do we need sleep?",
  "How does a computer store a photo?","What is gravity?","How do airplanes stay in the air?","What is a habit and how can we build a good one?"
];
const TASKS = [
  "Invent a new festival and describe how people celebrate it.","Write a short thank-you note to something that is not a person.","Describe your perfect day in exactly five sentences.",
  "Write a tiny story that begins with: The door was never meant to open.","Design a logo idea in words for a school club, and explain the meaning.","Write a short poem about a rainy evening.",
  "Create a new superhero and describe their one weakness.","Imagine your city in the year 2100 and describe one street.","Write a conversation between the sun and the moon.",
  "Invent a snack and write its advertisement.","Describe a colour to someone who has never seen it.","Write a letter to your future self ten years from now."
];
const TYPES = [
  {k:"words", name:"Learn five words", icon:"📚", pts:20},
  {k:"puzzle", name:"Solve a puzzle", icon:"🧩", pts:15},
  {k:"explain", name:"Explain a topic", icon:"🗣️", pts:20},
  {k:"creative", name:"Creative task", icon:"🎨", pts:25}
];
const BADGES = [
  {id:"first", icon:"🌱", n:"First step", d:"Finish 1 challenge", t:(s) => total(s) >= 1},
  {id:"s3", icon:"🔥", n:"On fire", d:"3 day streak", t:(s) => s.best >= 3},
  {id:"s7", icon:"⚡", n:"Unstoppable", d:"7 day streak", t:(s) => s.best >= 7},
  {id:"w", icon:"📚", n:"Word wizard", d:"3 word sets", t:(s) => s.c.words >= 3},
  {id:"p", icon:"🧩", n:"Riddle master", d:"3 puzzles", t:(s) => s.c.puzzle >= 3},
  {id:"e", icon:"🗣️", n:"Explainer", d:"3 explanations", t:(s) => s.c.explain >= 3},
  {id:"c", icon:"🎨", n:"Creator", d:"3 creative tasks", t:(s) => s.c.creative >= 3},
  {id:"h", icon:"👑", n:"Centurion", d:"100 points", t:(s) => s.pts >= 100}
];
const total = (s) => s.c.words + s.c.puzzle + s.c.explain + s.c.creative;
let CS = store.get("lumin.chal" + NS, null) || {pts:0, streak:0, best:0, last:"", done:{}, c:{words:0,puzzle:0,explain:0,creative:0}, badges:[]};
CS.c = Object.assign({words:0,puzzle:0,explain:0,creative:0}, CS.c || {});
let wordQuiz = null;

function today(){ const d = new Date(); const i = dayIdx(d); return {d, key:dkey(d), type:TYPES[i % 4], n:Math.floor(i / 4)}; }
function award(type, pts){
  const t = today();
  const yest = new Date(t.d); yest.setDate(yest.getDate()-1);
  CS.streak = CS.last === dkey(yest) ? CS.streak + 1 : 1;
  CS.best = Math.max(CS.best || 0, CS.streak);
  CS.last = t.key; CS.pts += pts; CS.c[type]++; CS.done[t.key] = {type, pts};
  const fresh = BADGES.filter(b => !CS.badges.includes(b.id) && b.t(CS));
  fresh.forEach(b => CS.badges.push(b.id));
  store.set("lumin.chal" + NS, CS);
  toast("+" + pts + " points" + (fresh.length ? ". New badge: " + fresh[0].n : ""));
  renderChal();
}
function doneBox(t, d){
  const b = el("div","done");
  b.textContent = "Done for today! You earned " + d.pts + " points. Your streak is " + CS.streak + " day" + (CS.streak === 1 ? "" : "s") + ". Come back tomorrow for a new challenge.";
  return b;
}
function renderChal(){
  const t = today(), box = $("chBox"); clear(box);
  const lvl = Math.floor(CS.pts / 50) + 1;
  $("kPts").textContent = CS.pts; $("kStreak").textContent = CS.streak; $("kBadge").textContent = CS.badges.length; $("kLvl").textContent = lvl;
  const tag = el("span","tagp", "Today · " + t.type.icon + " " + t.type.name); box.append(tag);
  const doneToday = CS.done[t.key];
  if(t.type.k === "words"){
    const start = (t.n * 5) % WORDS.length, set = [0,1,2,3,4].map(i => WORDS[(start + i) % WORDS.length]);
    box.append(el("h4",null,"Learn these five words"), el("p","desc","Read them, then take the quick check. Get 4 out of 5 to complete the challenge."));
    const wl = el("div","wordlist"); set.forEach(w => { const r = el("div","wd"); r.append(el("b",null,w[0]), el("span",null,w[1])); wl.append(r); }); box.append(wl);
    if(doneToday){ box.append(doneBox(t, doneToday)); }
    else {
      if(!wordQuiz || wordQuiz.key !== t.key){ wordQuiz = {key:t.key, pick:[], qs:set.map(w => ({w, opts:shuf([w, ...shuf(WORDS.filter(x => x !== w)).slice(0,3)])}))}; }
      const q = el("div","mcq");
      wordQuiz.qs.forEach((it, qi) => {
        const wrap = el("div"); wrap.append(el("h5",null,(qi+1) + ". Which word means: " + it.w[1] + "?"));
        const os = el("div","opts"); os.style.marginTop = "8px";
        it.opts.forEach(o => { const b = el("button","opt",o[0]); b.type = "button"; if(wordQuiz.pick[qi] === o) b.classList.add("sel"); b.addEventListener("click", () => { wordQuiz.pick[qi] = o; renderChal(); }); os.append(b); });
        wrap.append(os); q.append(wrap);
      });
      box.append(q);
      const row = el("div","row"); const go = el("button","btn solid sm","Check answers"); go.type = "button"; go.style.height = "44px";
      const msg = el("p","msg");
      go.addEventListener("click", () => {
        if(wordQuiz.pick.filter(Boolean).length < 5){ msg.className = "msg bad"; msg.textContent = "Answer all five questions first."; return; }
        const score = wordQuiz.qs.filter((it, i) => wordQuiz.pick[i] === it.w).length;
        if(score >= 4){ wordQuiz = null; award("words", 20); }
        else { msg.className = "msg bad"; msg.textContent = "You got " + score + " out of 5. Read the words again and try once more."; wordQuiz.pick = []; setTimeout(renderChal, 1400); }
      });
      row.append(go); box.append(row, msg);
    }
  } else if(t.type.k === "puzzle"){
    const r = RIDDLES[t.n % RIDDLES.length];
    box.append(el("h4",null,"Today's riddle"), el("p","desc",r[0]));
    if(doneToday){ box.append(doneBox(t, doneToday)); }
    else {
      const row = el("div","row"); const inp = el("input","inp"); inp.placeholder = "Your answer"; inp.setAttribute("aria-label","Your answer"); inp.style.flex = "1 1 200px"; inp.style.width = "auto"; inp.style.maxWidth = "250px";
      const go = el("button","btn solid sm","Submit"); go.type = "button"; go.style.height = "44px";
      const hint = el("button","btn ghost sm","Show hint"); hint.type = "button"; hint.style.position = "static"; hint.style.translate = "none";
      const msg = el("p","msg");
      const submit = () => {
        const a = norm(inp.value); if(!a) return;
        if(r[1].some(x => norm(x) === a)) award("puzzle", 15);
        else { msg.className = "msg bad"; msg.textContent = "Not quite. Think again."; }
      };
      go.addEventListener("click", submit); inp.addEventListener("keydown", e => { if(e.key === "Enter") submit(); });
      hint.addEventListener("click", () => { msg.className = "msg"; msg.textContent = "Hint: the answer starts with \"" + r[1][0][0].toUpperCase() + "\" and has " + r[1][0].length + " letters."; });
      row.append(inp, go, hint); box.append(row, msg);
    }
  } else {
    const isE = t.type.k === "explain", min = isE ? 25 : 15, list = isE ? TOPICS : TASKS;
    const prompt = list[t.n % list.length], pts = isE ? 20 : 25;
    box.append(el("h4",null, isE ? "Explain this in your own words" : "Today's creative task"), el("p","desc",prompt));
    if(doneToday){ box.append(doneBox(t, doneToday)); }
    else {
      const ta = el("textarea","txa"); ta.placeholder = "Write at least " + min + " words..."; ta.setAttribute("aria-label","Your answer");
      const cnt = el("span","hintp", "0 / " + min + " words");
      const go = el("button","btn solid sm","Complete challenge"); go.type = "button"; go.style.height = "44px";
      const msg = el("p","msg");
      ta.addEventListener("input", () => { cnt.textContent = wordCount(ta.value) + " / " + min + " words"; });
      go.addEventListener("click", () => {
        if(wordCount(ta.value) < min){ msg.className = "msg bad"; msg.textContent = "Please write at least " + min + " words."; return; }
        award(t.type.k, pts);
      });
      const row = el("div","row"); row.append(go, cnt); box.append(ta, row, msg);
    }
  }
  // week strip
  const wk = $("chWeek"); clear(wk);
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i); const c = el("div","wk", d.toLocaleDateString([], {weekday:"narrow"}));
    c.title = d.toDateString(); if(CS.done[dkey(d)]) c.classList.add("on"); if(i === 0) c.classList.add("today"); wk.append(c);
  }
  $("chNote").textContent = CS.streak ? "Keep your " + CS.streak + " day streak alive by finishing today's challenge." : "Finish today's challenge to start a streak.";
  const bg = $("chBadges"); clear(bg);
  BADGES.forEach(b => { const x = el("div","bdg"); if(CS.badges.includes(b.id)) x.classList.add("on"); x.append(el("i",null,b.icon), el("b",null,b.n), el("span",null,b.d)); bg.append(x); });
}

/* ---------- Creativity ---------- */
const NOUNS = ["lantern","ocean","robot","castle","umbrella","forest","clock","rocket","mirror","bridge","dragon","garden","violin","volcano","compass","pencil","island","thunder","library","bicycle","moonlight","treasure","teacup","mountain","puzzle","shadow","comet","window","river","painter","kite","desert","magnet","feather","candle","train","orchard","whistle","galaxy","backpack","cactus","festival","lighthouse","blanket","sparrow","tunnel","marble","notebook","snowflake","harvest","carpet","engine","pearl","jungle","balloon","tractor","firefly","stadium","ladder","monsoon"];
let words = [], ctype = "Story", creations = store.get("lumin.create" + NS, []);
function newWords(){ words = shuf(NOUNS).slice(0,3); drawWords(); liveScore(); }
function drawWords(){ const w = $("cWords"); clear(w); words.forEach(x => w.append(el("div","w3", x))); }
function usesWord(text, w){ return new RegExp("\\b" + w + "(s|es)?\\b","i").test(text); }
function calc(text){
  const wc = wordCount(text), used = words.filter(w => usesWord(text, w)).length;
  const toks = (text.toLowerCase().match(/[\p{L}']+/gu) || []), uniq = new Set(toks).size;
  const sents = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const target = ctype === "Slogan" ? 8 : 45;
  const pw = used * 15, pl = Math.min(wc / target, 1) * 30, pv = wc >= 3 ? (uniq / toks.length) * 15 : 0;
  const ps = ctype === "Slogan" ? (wc >= 3 && wc <= 14 ? 10 : 0) : Math.min(sents, 3) / 3 * 10;
  return {wc, used, total:Math.round(pw + pl + pv + ps), parts:[["Words used", used + " of 3"],["Length", wc + " words"],["Variety", wc >= 3 ? Math.round(uniq / toks.length * 100) + "% unique" : "-"],["Structure", ctype === "Slogan" ? (wc <= 14 && wc >= 3 ? "short and punchy" : "keep it 3 to 14 words") : sents + " sentence" + (sents === 1 ? "" : "s")]]};
}
function liveScore(){
  const t = $("cText").value, r = calc(t);
  $("cRing").style.setProperty("--p", r.total); $("cLive").textContent = r.total;
  document.querySelectorAll("#cWords .w3").forEach((n, i) => n.classList.toggle("used", usesWord(t, words[i])));
  const ul = $("cWhy"); clear(ul); r.parts.forEach(p => ul.append(el("li",null, p[0] + ": " + p[1])));
  $("cCnt").textContent = r.wc + " words";
}
function renderCreations(){
  const g = $("cGal"); clear(g);
  const tot = creations.reduce((a, c) => a + c.score, 0), best = creations.reduce((a, c) => Math.max(a, c.score), 0);
  $("cCount").textContent = creations.length; $("cBest").textContent = best; $("cTot").textContent = tot; $("cAvg").textContent = creations.length ? Math.round(tot / creations.length) : 0;
  if(!creations.length){ g.append(el("div","empty","Nothing saved yet. Write your first creation above.")); g.style.display = "block"; return; }
  g.style.display = "";
  creations.slice().reverse().forEach(c => {
    const card = el("article","cr"), top = el("div","top"), ws = el("div","ws");
    top.append(el("span","tagp",c.type), el("span","sc", c.score + " pts"));
    c.words.forEach(w => ws.append(el("span",null,w)));
    const del = el("button","del","Delete"); del.type = "button"; del.addEventListener("click", () => { creations = creations.filter(x => x.id !== c.id); store.set("lumin.create" + NS, creations); renderCreations(); });
    card.append(top, ws, el("p",null,c.text), el("small",null,new Date(c.id).toLocaleDateString([], {day:"numeric",month:"short",year:"numeric"})), del);
    g.append(card);
  });
}
$("cShuf").addEventListener("click", newWords);
$("cText").addEventListener("input", liveScore);
$("cType").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-t]"); if(!b) return; ctype = b.dataset.t;
  document.querySelectorAll("#cType button").forEach(x => x.classList.toggle("on", x === b));
  const ph = {Story:"Write a short story that uses all three words...", Invention:"Describe your invention, what it does and who it helps...", Slogan:"Write one catchy line using all three words...", "Business idea":"Describe your business idea, its customers and why it works..."};
  $("cText").placeholder = ph[ctype]; liveScore();
});
$("cSave").addEventListener("click", () => {
  const t = $("cText").value.trim(), r = calc(t), m = $("cMsg"), min = ctype === "Slogan" ? 3 : 12;
  if(r.used < 3){ m.className = "msg bad"; m.textContent = "Use all three words to save. Missing: " + words.filter(w => !usesWord(t, w)).join(", "); return; }
  if(r.wc < min){ m.className = "msg bad"; m.textContent = "Write at least " + min + " words."; return; }
  creations.push({id:Date.now(), type:ctype, words:words.slice(), text:t, score:r.total});
  if(!store.set("lumin.create" + NS, creations)){ creations.pop(); m.className = "msg bad"; m.textContent = "Please sign in to save."; return; }
  m.className = "msg ok"; m.textContent = "Saving creation. Creativity score: " + r.total + "/100."; $("cText").value = ""; newWords(); renderCreations();
});
$("cText").placeholder = "Write a short story that uses all three words...";

/* ---------- Football (snapshot data, 22 Oct 2026) ---------- */
const LEAGUES = {
  epl:{name:"Premier League", table:[
    ["MCI","Manchester City",7,0,0,21],["ARS","Arsenal",6,0,1,18],["BRI","Brighton & Hove Albion",5,1,1,16],["CFC","Chelsea",4,1,2,13],["LFC","Liverpool",3,3,1,12],
    ["BRE","Brentford",2,4,1,10],["LEE","Leeds United",2,4,1,10],["EVE","Everton",2,4,1,10],["HUL","Hull City",2,3,2,9],["IPS","Ipswich Town",3,0,4,9],
    ["NEW","Newcastle United",2,2,3,8],["AVL","Aston Villa",2,2,3,8],["MUN","Manchester United",1,4,2,7],["CRY","Crystal Palace",2,1,4,7],["BOU","AFC Bournemouth",1,3,3,6],
    ["TOT","Tottenham Hotspur",1,3,3,6],["COV","Coventry City",2,0,5,6],["FUL","Fulham",1,2,4,5],["NFO","Nottingham Forest",1,2,4,5],["SUN","Sunderland",1,1,5,4]],
    res:[["EVE","CFC",0,2,"2026-10-17T11:30Z"],["BRE","LFC",1,2,"2026-10-17T14:00Z"],["FUL","HUL",1,0,"2026-10-17T14:00Z"],["MCI","IPS",3,2,"2026-10-17T14:00Z"],["NEW","AVL",0,1,"2026-10-17T16:30Z"],["BOU","SUN",2,0,"2026-10-18T13:00Z"],["BRI","CRY",5,0,"2026-10-18T13:00Z"],["LEE","MUN",1,1,"2026-10-18T13:00Z"],["NFO","ARS",0,1,"2026-10-18T15:30Z"],["TOT","COV",3,1,"2026-10-19T19:00Z"]],
    fix:[["IPS","NFO","2026-10-23T19:00Z",30.6,27.1,42.3],["AVL","MCI","2026-10-24T11:30Z",20.1,22.3,57.6],["ARS","EVE","2026-10-24T14:00Z",67.2,19.9,12.9],["COV","FUL","2026-10-24T14:00Z",31.3,27.2,41.5],["CFC","TOT","2026-10-24T16:30Z",56.9,22.3,20.8],["CRY","NEW","2026-10-25T14:00Z",33.5,25.7,40.8],["HUL","BRE","2026-10-25T14:00Z",19.5,23.1,57.4],["LFC","BRI","2026-10-25T14:00Z",44.5,25.3,30.2],["MUN","BOU","2026-10-25T14:00Z",47.6,25.2,27.2],["SUN","LEE","2026-10-25T16:30Z",30.6,29.2,40.2]],
    goals:[["Erling Haaland","Manchester City",8],["João Pedro","Chelsea",5],["Alexander Isak","Liverpool",5],["Marcus Tavernier","Bournemouth",4],["Morgan Rogers","Chelsea",4],["Rayan Cherki","Manchester City",4],["Bryan Mbeumo","Manchester United",4],["Bukayo Saka","Arsenal",3]],
    assists:[["Pascal Groß","Brighton",4],["Evanilson","Bournemouth",4],["João Pedro","Chelsea",3],["Cole Palmer","Chelsea",3],["Antoine Semenyo","Manchester City",3],["Joško Gvardiol","Manchester City",3],["Cody Gakpo","Liverpool",3],["Rayan Cherki","Manchester City",2]]},
  liga:{name:"LaLiga", table:[
    ["BAR","FC Barcelona",9,0,0,27],["ATM","Atletico Madrid",7,1,1,22],["RMA","Real Madrid",7,0,2,21],["RBB","Real Betis",6,1,2,19],["RSO","Real Sociedad",5,1,3,16],
    ["SEV","Sevilla",4,2,3,14],["ALA","Deportivo Alaves",3,2,4,11],["RCC","Celta de Vigo",2,5,2,11],["DEP","Deportivo La Coruna",2,5,2,11],["OSA","Osasuna",3,2,4,11],
    ["LEV","Levante",2,4,3,10],["VIL","Villarreal",2,3,4,9],["ATH","Athletic Bilbao",2,3,3,9],["RVC","Rayo Vallecano",2,3,3,9],["GET","Getafe",2,3,4,9],
    ["ESP","Espanyol",2,2,5,8],["RAC","Racing Santander",2,2,5,8],["ELC","Elche",1,4,4,7],["VCF","Valencia",1,3,5,6],["MCF","Malaga",0,4,5,4]],
    res:[["ESP","ATM",0,1,"2026-10-17T12:00Z"],["VIL","ELC",0,0,"2026-10-17T14:15Z"],["RBB","BAR",2,5,"2026-10-17T16:30Z"],["VCF","ATH",0,0,"2026-10-17T19:00Z"],["OSA","RAC",2,0,"2026-10-18T12:00Z"],["RCC","ALA",2,1,"2026-10-18T14:15Z"],["MCF","RSO",2,5,"2026-10-18T16:30Z"],["RMA","SEV",4,1,"2026-10-18T19:00Z"],["GET","RVC",1,1,"2026-10-19T19:00Z"],["LEV","ATH",3,1,"2026-10-21T18:00Z"]],
    fix:[["ALA","MCF","2026-10-23T19:00Z",56.3,25.6,18.1],["RVC","ELC","2026-10-24T12:00Z",53.8,25.1,21.1],["RAC","ESP","2026-10-24T14:15Z",39.7,26.1,34.2],["VCF","VIL","2026-10-24T16:30Z",29.9,26.5,43.6],["ATM","DEP","2026-10-24T19:00Z",76.5,14.8,8.7],["ATH","GET","2026-10-25T13:00Z",59.3,24.7,16],["RCC","RBB","2026-10-25T15:15Z",32.5,27.7,39.8],["RSO","LEV","2026-10-25T17:30Z",57.2,22.8,20],["BAR","RMA","2026-10-25T20:00Z",59.8,17.5,22.7],["SEV","OSA","2026-10-26T20:00Z",49.4,27.8,22.8]],
    goals:[["Raphinha","Barcelona",12],["Kylian Mbappé","Real Madrid",9],["Lamine Yamal","Barcelona",8],["Sergio Camello","Rayo Vallecano",7],["Yassir Zabiri","Racing Santander",7],["Ante Budimir","Osasuna",7],["Roberto Fernández","Espanyol",6],["P-E Aubameyang","Deportivo La Coruna",5]],
    assists:[["Lamine Yamal","Barcelona",6],["Javier Hernández","Espanyol",5],["M. Díaz","Alaves",4],["A. Gordon","Barcelona",4],["Raphinha","Barcelona",3],["Fermín López","Barcelona",3],["Jude Bellingham","Real Madrid",3],["Alberto Moleiro","Villarreal",3]]}
};
let lg = "epl", tab = "table";
const colorOf = (s) => { let h = 0; for(const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return "hsl(" + h + " 55% 38%)"; };
const CL = {MCI:["#6CABDD","#fff"],ARS:["#EF0107","#fff"],BRI:["#0057B8","#fff"],CFC:["#034694","#fff"],LFC:["#C8102E","#F6EB61"],BRE:["#E30613","#fff"],LEE:["#FFCD00","#1D428A"],EVE:["#003399","#fff"],HUL:["#F5A12D","#111"],IPS:["#0044AA","#fff"],NEW:["#241F20","#fff"],AVL:["#670E36","#95BFE5"],MUN:["#DA291C","#FBE122"],CRY:["#1B458F","#C4122E"],BOU:["#DA291C","#111"],TOT:["#132257","#fff"],COV:["#5CB8E5","#fff"],FUL:["#fff","#111"],NFO:["#DD0000","#fff"],SUN:["#EB172B","#fff"],BAR:["#A50044","#004D98"],ATM:["#CB3524","#fff"],RMA:["#fff","#FEBE10"],RBB:["#0BB363","#fff"],RSO:["#0067B1","#fff"],SEV:["#fff","#D4021D"],ALA:["#0761AF","#fff"],RCC:["#8AC3EE","#fff"],DEP:["#0E4DA4","#fff"],OSA:["#D91A21","#0A346F"],LEV:["#0F4C9C","#C8102E"],VIL:["#FBE122","#005187"],ATH:["#EE2523","#fff"],RVC:["#fff","#E30613"],GET:["#005999","#fff"],ESP:["#007FC8","#fff"],RAC:["#1D9A5A","#fff"],ELC:["#fff","#0A7A3B"],VCF:["#fff","#F18E00"],MCF:["#6EC1E4","#fff"]};
let cid = 0;
const lum = (h) => { const n = parseInt(h.slice(1).length === 3 ? h.slice(1).replace(/./g, "$&$&") : h.slice(1), 16); return (0.299*(n>>16) + 0.587*((n>>8)&255) + 0.114*(n&255)) / 255; };
const badge = (a) => {
  const c = CL[a] || [colorOf(a), "#fff"], id = "cr" + (++cid), NS = "http://www.w3.org/2000/svg";
  const sh = "M16 1 L30 5 V18 C30 27 23 33 16 35 C9 33 2 27 2 18 V5 Z";
  const tx = lum(c[0]) > .62 ? "#111" : "#fff";
  const w = el("span","ab"); w.title = "Click to use your own logo for " + a; w.tabIndex = 0; w.setAttribute("role","button"); w.dataset.t = a;
  const own = store.get("lumin.crests", {})[a];
  if(own){ const im = new Image(); im.alt = a; im.src = own; im.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 3px 4px rgba(0,0,0,.5))"; w.append(im); return w; }
  w.innerHTML = '<svg xmlns="' + NS + '" viewBox="0 0 32 36" aria-hidden="true"><defs><clipPath id="' + id + '"><path d="' + sh + '"/></clipPath><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs><g clip-path="url(#' + id + ')"><rect width="32" height="36" fill="' + c[0] + '"/><rect y="0" width="32" height="12" fill="' + c[1] + '"/><rect x="14" y="12" width="4" height="24" fill="' + c[1] + '" opacity=".35"/><rect width="32" height="36" fill="url(#' + id + 'g)"/></g><path d="' + sh + '" fill="none" stroke="' + c[1] + '" stroke-width="1.6"/><path d="' + sh + '" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".6"/><text x="16" y="25.5" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-weight="800" font-size="9" fill="' + tx + '">' + a + '</text></svg>';
  return w;
};
const when = (iso) => new Date(iso).toLocaleString([], {weekday:"short", day:"numeric", month:"short", hour:"numeric", minute:"2-digit"});
function renderSports(){
  const L = LEAGUES[lg], box = $("spBody"), name = {}; clear(box);
  L.table.forEach(r => name[r[0]] = r[1]);
  if(tab === "table"){
    const t = el("table","tbl"), head = el("tr");
    ["","P","W","D","L","Pts"].forEach((h) => head.append(el("th",null,h)));
    const thead = el("thead"); thead.append(head); t.append(thead);
    const tb = el("tbody");
    L.table.forEach((r, i) => {
      const tr = el("tr");
      const club = el("td"), tm = el("div","tm"); tm.append(badge(r[0]), el("span","tn",r[1])); club.append(tm);
      tr.append(club, el("td",null,r[2]+r[3]+r[4]));
      [r[2],r[3],r[4]].forEach(v => tr.append(el("td",null,v)));
      tr.append(el("td",null,r[5])); tb.append(tr);
    });
    t.append(tb); box.append(t);
      } else if(tab === "md"){
    const md = el("div","md");
    const sec = (title) => md.append(el("div","mh",title));
    sec("Next matchday");
    L.fix.forEach(f => {
      const row = el("div","fx"), a = el("div","t"), b = el("div","t r");
      a.append(badge(f[0]), el("span",null,name[f[0]])); b.append(badge(f[1]), el("span",null,name[f[1]]));
      const sc = el("div","sc","vs"); sc.append(el("small",null,when(f[2])));
      const win = el("div","win"); [[f[3],"#4a78ff"],[f[4],"#5b6070"],[f[5],"#ff9f43"]].forEach(p => { const i = el("i"); i.style.width = p[0] + "%"; i.style.background = p[1]; win.append(i); });
      const wl = el("div","wl"); wl.append(el("span",null,Math.round(f[3]) + "% win"), el("span",null,Math.round(f[4]) + "% draw"), el("span",null,Math.round(f[5]) + "% win"));
      row.append(a, sc, b, win, wl); md.append(row);
    });
    sec("Latest results");
    L.res.forEach(f => {
      const row = el("div","fx"), a = el("div","t"), b = el("div","t r");
      a.append(badge(f[0]), el("span",null,name[f[0]])); b.append(badge(f[1]), el("span",null,name[f[1]]));
      const sc = el("div","sc", f[2] + " - " + f[3]); sc.append(el("small",null,"Full time · " + when(f[4])));
      row.append(a, sc, b); md.append(row);
    });
    box.append(md);
    box.append(el("p","snap","Win chances are pre-match estimates."));
  } else {
    const wrap = el("div","lead2");
    [["Top scorers","goals","Goals"],["Top assists","assists","Assists"]].forEach(c => {
      const col = el("div"); col.append(el("h4",null,c[0]));
      const ul = el("ul","ld"), data = L[c[1]], max = data[0][2];
      data.forEach((p, i) => {
        const li = el("li"), pn = el("div","pl"), bar = el("div","bar"), fill = el("i");
        fill.style.width = (p[2] / max * 100) + "%"; bar.append(fill);
        const nm = el("b",null,p[0]); pn.append(nm, el("small",null,p[1]));
        li.append(el("span","n",i+1), pn, bar, el("span","v",p[2])); ul.append(li);
      });
      col.append(ul); wrap.append(col);
    });
    box.append(wrap);
  }
  document.querySelectorAll("#spLeague button").forEach(b => b.classList.toggle("on", b.dataset.l === lg));
  document.querySelectorAll("#spTab button").forEach(b => b.classList.toggle("on", b.dataset.t === tab));
}
$("spLeague").addEventListener("click", (e) => { const b = e.target.closest("button[data-l]"); if(b){ lg = b.dataset.l; renderSports(); } });
$("spTab").addEventListener("click", (e) => { const b = e.target.closest("button[data-t]"); if(b){ tab = b.dataset.t; renderSports(); } });


/* ---------- Chat ---------- */
let sampleFn = async (messages, options) => {
  const res = await fetch("/api/chat", {method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json"}, body:JSON.stringify({messages:messages.slice(-12)}), signal:options.signal});
  const data = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error(data.error || "The assistant is unavailable. Please retry.");
  return data;
}, turns = store.get("lumin.chat" + NS, []), chatCtl = null, busy = false;
const chMsgs = $("chMsgs");
function ctxText(){
  const out = ["FOOTBALL SNAPSHOT (22 Oct 2026, for football questions only):"];
  Object.values(LEAGUES).forEach(L => {
    out.push(L.name + " table (club W-D-L Pts): " + L.table.map(r => r[1] + " " + r[2] + "-" + r[3] + "-" + r[4] + " " + r[5]).join("; "));
    out.push(L.name + " latest results: " + L.res.map(f => f[0] + " " + f[2] + "-" + f[3] + " " + f[1]).join("; "));
    out.push(L.name + " next fixtures: " + L.fix.map(f => f[0] + " v " + f[1] + " " + f[2].slice(0,10)).join("; "));
    out.push(L.name + " top scorers: " + L.goals.map(p => p[0] + " (" + p[1] + ") " + p[2]).join("; ") + ". Top assists: " + L.assists.map(p => p[0] + " (" + p[1] + ") " + p[2]).join("; "));
  });
  return out.join("\n");
}
const RULES = "You are the Lumin assistant inside a personal website. Answer the user's question correctly, clearly and directly. Be concise: a short answer first, then brief detail only if it helps. Do your reasoning carefully before answering, especially for maths, facts and logic. If you are not sure, or the answer may have changed recently (news, prices, current office holders), say so plainly instead of guessing. You cannot browse the web. Reply in the language the user writes in. Use plain text without markdown symbols.\n\n" + ctxText();
function bubble(role, text, err){ const b = el("div","bub " + role + (err ? " err" : ""), text); chMsgs.append(b); chMsgs.scrollTop = chMsgs.scrollHeight; return b; }
function drawChat(){
  clear(chMsgs);
  if(!turns.length) bubble("ai","Hi! Ask me anything: homework, general knowledge, maths, writing help, or football. I will answer as accurately as I can and tell you when I am unsure.");
  turns.forEach(t => bubble(t.role === "user" ? "me" : "ai", t.content));
  const sg = $("chSugg"); clear(sg);
  if(!turns.length) ["Explain photosynthesis simply","What is 15% of 840?","Who is top of LaLiga right now?","Give me 3 study tips"].forEach(q => { const b = el("button",null,q); b.type = "button"; b.addEventListener("click", () => { $("chIn").value = q; ask(); }); sg.append(b); });
}
async function ask(){
  const inp = $("chIn"), q = inp.value.trim(); if(!q || busy) return;
  
  busy = true; inp.value = ""; $("chSend").disabled = true; $("chStop").hidden = false;
  turns.push({role:"user", content:q}); if(turns.length === 1 || !chMsgs.querySelector(".bub.me")) drawChat(); else bubble("me", q);
  $("chSugg").textContent = "";
  const ai = el("div","bub ai"); const dots = el("span","dots"); dots.append(el("i"),el("i"),el("i")); ai.append(dots); chMsgs.append(ai); chMsgs.scrollTop = chMsgs.scrollHeight;
  chatCtl = new AbortController();
  const hist = turns.slice(-12); while(hist.length && hist[0].role !== "user") hist.shift();
  try {
    const res = await sampleFn([{role:"user", content:RULES}, ...hist], {cache:false, signal:chatCtl.signal, onText:({text}) => { ai.textContent = text; chMsgs.scrollTop = chMsgs.scrollHeight; }});
    ai.textContent = res.text + (res.truncated ? "\n\n(The answer was cut short. Ask me to continue.)" : "");
    turns.push({role:"assistant", content:res.text}); store.set("lumin.chat" + NS, turns.slice(-30));
  } catch(e){
    turns.pop();
    if(!inp.value) inp.value = q;
    if(e && (e.code === "cancelled" || e.name === "AbortError")){ ai.textContent = (e.text || "") + (e.text ? "\n\n(Stopped)" : "Stopped."); }
    else { ai.textContent = (e && e.text ? e.text + "\n\n" : "") + (e.message || "Something went wrong. Please try again."); ai.classList.add("err"); }
  } finally { busy = false; chatCtl = null; $("chSend").disabled = false; $("chStop").hidden = true; inp.focus(); }
}
$("chForm").addEventListener("submit", (e) => { e.preventDefault(); ask(); });
$("chIn").addEventListener("keydown", (e) => { if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); ask(); } });
$("chIn").addEventListener("input", (e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; });
$("chStop").addEventListener("click", () => { if(chatCtl) chatCtl.abort(); });
$("chClear").addEventListener("click", () => { if(busy && chatCtl) chatCtl.abort(); turns = []; store.set("lumin.chat" + NS, []); drawChat(); });
drawChat();
const logoIn = document.createElement("input"); logoIn.type = "file"; logoIn.accept = "image/*"; logoIn.multiple = true; logoIn.hidden = true; document.body.append(logoIn);
$("spLogos").addEventListener("click", () => logoIn.click());
$("spLogosReset").addEventListener("click", () => { store.set("lumin.crests", {}); renderSports(); toast("Logos reset"); });
logoIn.addEventListener("change", () => {
  const files = [...logoIn.files]; logoIn.value = ""; if(!files.length) return;
  const nz = (x) => x.toLowerCase().replace(/\.[a-z0-9]+$/,"").replace(/[^a-z0-9]/g,"");
  const clubs = []; Object.values(LEAGUES).forEach(L => L.table.forEach(r => clubs.push([r[0], nz(r[1])])));
  let done = 0, hit = 0; const all = store.get("lumin.crests", {});
  files.forEach(f => {
    const n = nz(f.name); let m = clubs.find(c => c[0].toLowerCase() === n) || clubs.find(c => n.length > 3 && (c[1].includes(n) || n.includes(c[1])));
    if(!m){ tick(); return; }
    resize(f, 96, (url) => { all[m[0]] = url; hit++; tick(); }, "png").then(url => { if(!url) tick(); });
  });
  function tick(){ if(++done === files.length){ store.set("lumin.crests", all); renderSports(); toast(hit ? hit + " logo" + (hit === 1 ? "" : "s") + " added" : "No file name matched a club. Try names like real-madrid.png"); } }
});
const crestIn = document.createElement("input"); crestIn.type = "file"; crestIn.accept = "image/*"; crestIn.hidden = true; document.body.append(crestIn);
let crestFor = null;
const pickCrest = (e) => { const b = e.target.closest(".ab"); if(!b) return; if(e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return; e.preventDefault(); crestFor = b.dataset.t; crestIn.click(); };
$("spBody").addEventListener("click", pickCrest); $("spBody").addEventListener("keydown", pickCrest);
crestIn.addEventListener("change", () => {
  const f = crestIn.files[0]; crestIn.value = ""; if(!f || !crestFor) return; const t = crestFor;
  resize(f, 96, (url) => { const all = store.get("lumin.crests", {}); all[t] = url; if(store.set("lumin.crests", all)){ toast("Saving logo for " + t); renderSports(); } else toast("Could not save this logo"); }, "png");
});
newWords(); renderChal(); renderCreations(); renderSports();
})();

(function(){
  const c = $("lcard"); if(!c || matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(pointer: coarse)").matches) return;
  c.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.setProperty("--ry", (x * 10).toFixed(2) + "deg"); c.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg"); c.style.setProperty("--gx", (x*100+50) + "%"); c.style.setProperty("--gy", (y*100+50) + "%"); });
  c.addEventListener("pointerleave", () => { c.style.setProperty("--rx","0deg"); c.style.setProperty("--ry","0deg"); });
})();

(function(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: none)").matches) return;
  const root = document.documentElement;
  const scr = (id) => $(id);
  ["welcome","login"].forEach(id => { const n = scr(id); if(!n) return;
    n.addEventListener("pointermove", (e) => { const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; n.style.setProperty("--ty", (x * 14).toFixed(2) + "deg"); n.style.setProperty("--tx", (-y * 10).toFixed(2) + "deg"); });
    n.addEventListener("pointerleave", () => { n.style.setProperty("--tx","0deg"); n.style.setProperty("--ty","0deg"); }); });
  document.querySelectorAll(".bento2 .wc").forEach(c => {
    c.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.setProperty("--cy", (x * 14).toFixed(2) + "deg"); c.style.setProperty("--cx", (-y * 12).toFixed(2) + "deg"); c.style.setProperty("--gx", (x*100+50) + "%"); c.style.setProperty("--gy", (y*100+50) + "%"); });
    c.addEventListener("pointerleave", () => { c.style.setProperty("--cx","0deg"); c.style.setProperty("--cy","0deg"); });
  });
})();



applyLogo(); setGreets();
if(currentUser) screen("welcome");

// 她想说的话 · 游戏逻辑与像素画面
// ---------- state ----------
let S = {screen:'title', sid:null, round:0, open:20, hearts:3, log:[], clues:0, done:{}, step:'ask', last:null, end:null};
let emote = null, emoteT = 0;
const $ = id => document.getElementById(id);
const box = $('box');
const story = () => STORIES.find(s => s.id === S.sid);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- typewriter ----------
let typing = null;
function type(el, text, done){
  if (typing) clearInterval(typing.iv);
  if (reduce){ el.textContent = text; done && done(); return; }
  let i = 0; el.textContent = '';
  const cur = document.createElement('span'); cur.className = 'cursor';
  typing = {finish(){ clearInterval(this.iv); el.textContent = text; typing = null; done && done(); }};
  typing.iv = setInterval(() => {
    i++; el.textContent = text.slice(0, i); el.appendChild(cur);
    if (i >= text.length) typing.finish();
  }, 38);
}

function shuffle(a){ a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function esc(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// ---------- HUD ----------
function hud(){
  $('menuBtn').hidden = S.screen === 'title';
  const on = S.screen === 'play';
  $('hud').hidden = !on; $('clues').hidden = !on;
  if (!on) return;
  const n = Math.round(S.open / 10);
  $('bar').innerHTML = Array.from({length:10}, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  $('hearts').innerHTML = [0,1,2].map(i => `<span class="${i < S.hearts ? '' : 'off'}">♥</span>`).join('');
  const st = story();
  $('rnd').textContent = S.round < st.rounds.length ? `${S.round+1}/${st.rounds.length}` : 'FINAL';
  $('clues').innerHTML = st.clues.map((c, i) => `<div class="clue ${i < S.clues ? 'on' : ''}" id="clue${i}"><small>#${i+1}</small><span>${i < S.clues ? esc(c) : '心门 ' + CLUE_AT[i] + ' 解锁'}</span></div>`).join('');
}

// ---------- screens ----------
function title(){
  S.screen = 'title'; hud();
  box.innerHTML = `
    <div class="intro">
      <p>今晚，她提出了分手。她没有说为什么。</p>
      <p><strong>你有四次开口的机会。</strong>问对了，她的心门会一点点打开，说出真正的原因；问错了，她的耐心会减少，三次就会离开。</p>
      <p>这里没有标准答案，但有更好的问法：倾听、好奇、承认，而不是辩解、猜疑、急着解决。</p>
    </div>
    <div class="label">选择一个夜晚</div>
    <div class="chapters">${STORIES.map((s, i) => `
      <button class="chap" data-s="${s.id}">
        <small>NIGHT 0${i+1}</small>
        <strong>${esc(s.name)}</strong>
        <span>${esc(s.blurb)}</span>
        ${S.done[s.id] ? `<span class="done">CLEARED · ${esc(ENDINGS[S.done[s.id]].title)}</span>` : ''}
      </button>`).join('')}
    </div>`;
  box.querySelectorAll('.chap').forEach(b => b.onclick = () => start(b.dataset.s));
}

function start(id){
  Object.assign(S, {screen:'play', sid:id, round:0, open:20, hearts:3, log:[], clues:0, step:'ask', last:null, end:null});
  hud(); ask();
}

function speaker(who, sub){
  return `<div class="speaker ${who === '你' ? 'me' : ''}">${who}${sub ? `<em>${sub}</em>` : ''}</div>`;
}

function ask(){
  S.step = 'ask'; hud();
  const st = story(), r = st.rounds[S.round];
  const line = S.round === 0 ? st.intro : r.her;
  box.innerHTML = speaker('她') + `<div class="line" id="line"></div><div class="opts" id="opts" hidden></div>`;
  const opts = shuffle(r.opts);
  $('opts').innerHTML = opts.map((o, i) => `<button class="opt" data-i="${r.opts.indexOf(o)}"><kbd>${i+1}</kbd><span>${esc(o.t)}</span></button>`).join('');
  $('opts').querySelectorAll('.opt').forEach(b => b.onclick = () => pick(+b.dataset.i));
  type($('line'), line, () => { $('opts').hidden = false; });
}

function pick(i){
  const st = story(), o = st.rounds[S.round].opts[i];
  S.open = Math.max(0, Math.min(100, S.open + o.d));
  S.hearts = Math.max(0, S.hearts + o.h);
  S.log.push({t:o.t, k:o.k, tag:o.tag});
  S.last = o;
  emote = o.k === 'g' ? 'heart' : o.k === 'm' ? 'dots' : 'cloud'; emoteT = 0;
  const before = S.clues;
  while (S.clues < 3 && S.open >= CLUE_AT[S.clues]) S.clues++;
  S.step = 'reply'; hud();
  for (let c = before; c < S.clues; c++) $('clue'+c)?.classList.add('flash');
  showReply(o);
}

function showReply(o){
  const sign = o.d > 0 ? '+' + o.d : o.d;
  const cls = o.k === 'g' ? '' : o.k === 'm' ? 'mid' : 'bad';
  box.innerHTML = speaker('你') + `<div class="line" style="color:var(--dim);min-height:0;font-size:15px">${esc(o.t)}</div>`
    + speaker('她') + `<div class="line" id="line"></div>
    <div id="after" hidden>
      <div class="note ${cls}">
        <div class="tag">${o.k === 'g' ? 'GOOD' : o.k === 'm' ? 'OK' : 'OUCH'} · <b>${esc(o.tag)}</b> · 心门 ${sign}${o.h ? ' · 耐心 ' + o.h : ''}</div>
        <p>${esc(o.n)}</p>
      </div>
      <div class="row" style="margin-top:12px"><button class="go" id="next">继续 ▶</button></div>
    </div>`;
  type($('line'), o.r, () => { $('after').hidden = false; $('next').focus({preventScroll:true}); $('next').onclick = next; });
}

function next(){
  const st = story();
  if (S.hearts <= 0) return ending('leave', '……我先走了。');
  S.round++;
  if (S.round < st.rounds.length) return ask();
  hud();
  if (S.open >= REVEAL_AT) return reveal();
  if (S.open >= PARTIAL_AT) return ending('partial', st.partial);
  ending('closed', st.closed);
}

function reveal(){
  S.step = 'reveal';
  const st = story();
  emote = 'heart'; emoteT = 0;
  box.innerHTML = speaker('她', 'THE REASON') + `<div class="line" id="line"></div>
    <div id="after" hidden><div class="label" style="margin-bottom:8px">她终于说出来了。你怎么回应？</div><div class="opts" id="opts"></div></div>`;
  const opts = shuffle(st.finals);
  $('opts').innerHTML = opts.map((o, i) => `<button class="opt" data-i="${st.finals.indexOf(o)}"><kbd>${i+1}</kbd><span>${esc(o.t)}</span></button>`).join('');
  $('opts').querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const f = st.finals[+b.dataset.i];
    S.log.push({t:f.t, k:f.k, tag:'最后的回应'});
    ending(f.end, f.r);
  });
  type($('line'), st.reveal, () => { $('after').hidden = false; });
}

function ending(kind, line){
  const st = story(), e = ENDINGS[kind];
  S.screen = 'end'; S.end = kind; S.step = 'end';
  if (!S.done[st.id] || kind === 'good') S.done[st.id] = kind;
  emote = kind === 'good' ? 'heart' : kind === 'mid' ? 'dots' : 'cloud'; emoteT = 0;
  hud();
  const good = S.log.filter(l => l.k === 'g').length;
  box.innerHTML = `<div class="end" style="display:flex;flex-direction:column;gap:14px">
    <div><div class="label">ENDING · ${esc(st.name)}</div><h2>${esc(e.title)}</h2><div style="color:var(--dim);font-size:14px">${esc(e.sub)}</div></div>
    <p class="quote">她：${esc(line)}</p>
    ${S.clues ? `<div><div class="label" style="margin-bottom:6px">你拼出的原因 ${S.clues}/3</div><div style="font-size:14px">${st.clues.slice(0, S.clues).map(esc).join(' → ')}</div></div>` : ''}
    <div><div class="label" style="margin-bottom:8px">复盘 · 好的提问 ${good}/${S.log.length}</div>
      <ul class="recap">${S.log.map(l => `<li><i class="${l.k === 'g' ? 'g' : l.k === 'm' ? 'm' : 'b'}">${esc(l.tag)}</i><span>${esc(l.t)}</span></li>`).join('')}</ul></div>
    <div class="tip"><small>带回现实的一句话</small><p>${esc(st.tip)}</p></div>
    <div class="row"><button class="go ghost" id="home">换一个夜晚</button><button class="go" id="again">重来这一晚</button></div>
  </div>`;
  $('home').onclick = title;
  $('again').onclick = () => start(st.id);
}

// ---------- keyboard ----------
addEventListener('keydown', e => {
  if (typing && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); typing.finish(); return; }
  if (/^[1-4]$/.test(e.key)) { const b = box.querySelectorAll('.opt')[+e.key - 1]; if (b && !b.closest('[hidden]')) b.click(); }
});
box.addEventListener('click', e => { if (typing && e.target.closest('.line')) typing.finish(); });

// ---------- pixel scene ----------
const cv = $('cv'), g = cv.getContext('2d');
const W = 192, H = 108;
const HER = [
  '...hhhhhh...','..hhhhhhhh..','.hhhhhhhhhh.','.hhsssssshh.','hhsesssseshh','hhspssssps hh'.replace(' ',''),
  'hhsssmmssshh','hh.ssssss.hh','hh...ss...hh','h..dddddd..h','..dddddddd..','.dddddddddd.',
  '.sddddddddds'.slice(0,12),'.sdddddddds.','..dddddddd..','..dddddddd..','.dddddddddd.','.dddddddddd.',
  '...ss..ss...','...ss..ss...','...bb..bb...'
];
HER[12] = '.sdddddddds.';
const HER_BACK = HER.map((row, y) => y >= 3 && y <= 8 ? row.replace(/[sepm]/g, (c, x) => (x > 2 && x < 9 && y === 8) ? 's' : 'h') : row);
const HIM = [
  '............','...HHHHHH...','..HHHHHHHH..','..HssssssH..','..sesssses..','..ssssssss..',
  '..sssmmsss..','...ssssss...','.....ss.....','..cccccccc..','.cccccccccc.','.cccccccccc.',
  '.sccccccccs.','.sccccccccs.','..cccccccc..','..pppppppp..','..ppp..ppp..','..ppp..ppp..',
  '..pp....pp..','..pp....pp..','..bb....bb..'
];
const PAL = {h:'#3b2230',s:'#f2c9a5',e:'#2a1b2a',m:'#c4606e',p:'#f0a0a0',d:'#d9667f',b:'#2a1b2a',
             H:'#2b2433',c:'#5a7bb8',P:'#33405e'};
PAL.p = '#f0a0a0';
function sprite(rows, x, y, pal, flip){
  rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    const col = ch === 'p' && pal === 'him' ? PAL.P : PAL[ch];
    if (!col) return;
    g.fillStyle = col;
    const px = flip ? x + (row.length - 1 - rx) * 2 : x + rx * 2;
    g.fillRect(px, y + ry * 2, 2, 2);
  }));
}
const drops = Array.from({length:26}, () => ({x:Math.random()*48, y:Math.random()*34, v:.8+Math.random()*.8}));
const HEART = ['.##.##.','#######','#######','.#####.','..###..','...#...'];
const CLOUD = ['..###..','.#####.','#######','.......','.#.#.#.','#.#.#..'];
const DOTS  = ['.......','.......','#.#.#..','.......','.......','.......'];
function icon(map, x, y, col){ g.fillStyle = col; map.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') g.fillRect(x+i, y+j, 1, 1); })); }
function mix(a, b, t){ const p = s => [1,3,5].map(i => parseInt(s.substr(i,2),16)); const A=p(a),B=p(b); return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`; }

let t0 = 0, warmth = .2;
function frame(ts){
  const dt = Math.min(50, ts - t0); t0 = ts;
  const target = S.screen === 'title' ? .35 : S.open / 100;
  warmth += (target - warmth) * .03;
  // wall & floor
  g.fillStyle = mix('#1a1830', '#3a2a3a', warmth); g.fillRect(0, 0, W, H);
  g.fillStyle = mix('#221f3a', '#46323f', warmth); for (let x = 0; x < W; x += 12) g.fillRect(x, 0, 1, 78);
  g.fillStyle = mix('#14121f', '#2a1d22', warmth); g.fillRect(0, 78, W, 30);
  g.fillStyle = mix('#1c1a2c', '#3a2a2c', warmth); for (let x = 0; x < W; x += 16) g.fillRect(x, 78, 1, 30);
  g.fillStyle = '#0b0910'; g.fillRect(0, 77, W, 2);
  // window
  g.fillStyle = '#0b0910'; g.fillRect(70, 12, 52, 40);
  g.fillStyle = '#18233f'; g.fillRect(72, 14, 48, 36);
  g.fillStyle = '#e8e2c8'; g.fillRect(108, 18, 6, 6); g.fillStyle = '#18233f'; g.fillRect(110, 17, 5, 5);
  g.fillStyle = '#26324f'; for (let i = 0; i < 6; i++) g.fillRect(74 + i*8, 40 - (i%3)*4, 6, 10 + (i%3)*4);
  g.fillStyle = '#ffd98a'; [[76,44],[84,38],[92,46],[100,42],[116,40]].forEach(([x,y]) => g.fillRect(x, y, 1, 1));
  g.fillStyle = '#9fb4e0';
  drops.forEach(d => { d.y += d.v * dt / 16; if (d.y > 34) { d.y = 0; d.x = Math.random()*48; } g.fillRect(72 + d.x, 14 + d.y, 1, 2); });
  g.fillStyle = '#0b0910'; g.fillRect(95, 14, 2, 36); g.fillRect(72, 31, 48, 2);
  g.fillStyle = '#4a3f5e'; g.fillRect(68, 52, 56, 3);
  // lamp + glow
  const glow = .08 + warmth * .22 + Math.sin(ts/600) * .01;
  g.fillStyle = `rgba(255,201,107,${glow})`; g.beginPath(); g.arc(164, 40, 30 + warmth*14, 0, Math.PI*2); g.fill();
  g.fillStyle = '#0b0910'; g.fillRect(163, 34, 2, 44); g.fillRect(158, 76, 12, 2);
  g.fillStyle = mix('#8a6a3a', '#ffc96b', warmth); g.fillRect(156, 24, 16, 10);
  g.fillStyle = '#0b0910'; g.fillRect(156, 24, 16, 1);
  // small table with two cups
  g.fillStyle = '#0b0910'; g.fillRect(80, 74, 32, 3); g.fillRect(82, 77, 2, 12); g.fillRect(108, 77, 2, 12);
  g.fillStyle = '#e8e2c8'; g.fillRect(86, 70, 4, 4); g.fillRect(102, 70, 4, 4);
  // characters
  const herX = 132 - Math.round(warmth * 18), baseY = 90 - 42;
  const bob = Math.round(Math.sin(ts/700)) ;
  sprite(HIM, 40, baseY + bob * 0, 'him');
  const facing = S.screen === 'title' ? false : S.open >= 40 || S.end === 'good';
  sprite(facing ? HER : HER_BACK, herX, baseY + (bob > 0 ? 1 : 0), 'her');
  // shadows
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(42, 90, 20, 2); g.fillRect(herX + 2, 90, 20, 2);
  // emote above her
  if (emote){
    emoteT += dt;
    const y = baseY - 12 - Math.min(4, emoteT / 120);
    const show = emoteT < 2600 || S.screen === 'end';
    if (show){
      g.fillStyle = '#f3e9dc'; g.fillRect(herX + 7, y - 1, 11, 9); g.fillRect(herX + 10, y + 8, 2, 2);
      g.fillStyle = '#0b0910'; g.fillRect(herX + 7, y - 2, 11, 1); g.fillRect(herX + 7, y + 8, 11, 1); g.fillRect(herX + 6, y - 1, 1, 9); g.fillRect(herX + 18, y - 1, 1, 9);
      if (emote === 'heart') icon(HEART, herX + 9, y + 1, '#ff7a93');
      if (emote === 'cloud') icon(CLOUD, herX + 9, y + 1, '#5b6d94');
      if (emote === 'dots') icon(DOTS, herX + 9, y + 1, '#2a1b2a');
    }
  }
  // title vignette text
  if (S.screen === 'title'){
    g.fillStyle = 'rgba(11,9,16,.55)'; g.fillRect(0, 94, W, 14);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- boot (keeps progress across live updates) ----------
window.claude?.hot?.snapshot?.(() => ({done: S.done}));
function boot(data){
  if (data && data.done) S.done = data.done;
  title();
}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
$('menuBtn').onclick = () => { if (typing) { clearInterval(typing.iv); typing = null; } title(); };

// 쓰담돌 — 2D Canvas 워리스톤 (위에서 내려다보는 시점)

const canvas = document.getElementById("stoneCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const guide = document.getElementById("guide")!;
const warmthBar = document.getElementById("warmthBar") as HTMLElement;
const comfortToast = document.getElementById("comfortToast")!;
const comfortText = document.getElementById("comfortText")!;
const btnPrivacy = document.getElementById("btnPrivacy")!;
const privacyOverlay = document.getElementById("privacyOverlay") as HTMLElement;
const btnPrivacyClose = document.getElementById("btnPrivacyClose")!;

// ---------- 사이즈 ----------
let W = window.innerWidth;
let H = window.innerHeight;
const dpr = Math.min(window.devicePixelRatio, 2);

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener("resize", resize);

// ---------- 돌 파라미터 ----------
const stoneW = Math.min(W * 0.65, 280);
const stoneH = stoneW * 0.72;
const cx = W / 2;
const cy = H / 2;
const indentRx = stoneW * 0.28;
const indentRy = stoneH * 0.32;

// ---------- 상태 ----------
let warmth = 0;
let isRubbing = false;
let lastX = 0;
let lastY = 0;
let guideFaded = false;
let shownMsgs = new Set<number>();
let lastComfortTime = 0;
let glowPulse = 0;

// ---------- 위로 메시지 ----------
const WARMTH_MSGS = [
  { at: 20, msg: "조금씩 따뜻해지고 있어요" },
  { at: 50, msg: "마음도 함께 녹고 있어요" },
  { at: 85, msg: "충분히 쉬었어요, 괜찮아요" },
];
const COMFORTS = [
  "괜찮아요, 지금 이 순간에 집중해요",
  "천천히, 서두르지 않아도 돼요",
  "깊게 숨 쉬어봐요",
  "잠깐 멈춰도 괜찮아요",
  "당신은 충분히 잘하고 있어요",
  "오늘 하루도 수고했어요",
];

function showComfort(msg: string) {
  comfortText.textContent = msg;
  comfortToast.setAttribute("data-show", "true");
  setTimeout(() => comfortToast.setAttribute("data-show", "false"), 3500);
}

// ---------- 오디오 ----------
let audioCtx: AudioContext | null = null;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
}

function playRubTone() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = 180 + Math.random() * 60 + warmth * 0.5;
  gain.gain.value = 0.02;
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.25);
}

function vibrate() {
  if (navigator.vibrate) navigator.vibrate(10);
}

// ---------- 별 배경 ----------
const stars: { x: number; y: number; r: number; speed: number; opacity: number }[] = [];
for (let i = 0; i < 40; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 0.5 + Math.random() * 1.2,
    speed: 0.1 + Math.random() * 0.3,
    opacity: 0.1 + Math.random() * 0.3,
  });
}

// ---------- 터치 ----------
function isInIndent(px: number, py: number): boolean {
  const dx = (px - cx) / indentRx;
  const dy = (py - cy) / indentRy;
  return dx * dx + dy * dy <= 1;
}

canvas.addEventListener("pointerdown", (e) => {
  ensureAudio();
  isRubbing = true;
  lastX = e.clientX;
  lastY = e.clientY;
  if (!guideFaded) {
    guide.classList.add("is-faded");
    guideFaded = true;
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!isRubbing) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 2) {
    const onIndent = isInIndent(e.clientX, e.clientY);
    const boost = onIndent ? 1.5 : 0.5;
    warmth = Math.min(100, warmth + dist * 0.03 * boost);
    vibrate();
    if (Math.random() < 0.2) playRubTone();
    lastX = e.clientX;
    lastY = e.clientY;
  }
});

canvas.addEventListener("pointerup", () => { isRubbing = false; });
canvas.addEventListener("pointerleave", () => { isRubbing = false; });

// ---------- 개인정보 ----------
btnPrivacy.addEventListener("click", (e) => {
  e.preventDefault();
  privacyOverlay.removeAttribute("hidden");
  requestAnimationFrame(() => privacyOverlay.setAttribute("data-show", "true"));
});
btnPrivacyClose.addEventListener("click", () => {
  privacyOverlay.setAttribute("data-show", "false");
  setTimeout(() => privacyOverlay.setAttribute("hidden", ""), 300);
});

// ---------- 그리기 ----------
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 0xff) * (1 - t) + ((pb >> 16) & 0xff) * t);
  const g = Math.round(((pa >> 8) & 0xff) * (1 - t) + ((pb >> 8) & 0xff) * t);
  const bl = Math.round((pa & 0xff) * (1 - t) + (pb & 0xff) * t);
  return `rgb(${r},${g},${bl})`;
}

function drawStone() {
  const t = warmth / 100;

  // 돌 본체 색
  const stoneColor = lerpColor("#8888A0", "#C8B090", t);
  const indentColor = lerpColor("#606078", "#B89868", t);
  const glowColor = `rgba(255,214,165,${t * 0.4 + glowPulse * 0.1})`;

  // 돌 그림자
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + stoneH * 0.48, stoneW * 0.48, stoneH * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fill();
  ctx.restore();

  // 돌 본체 (타원)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, stoneW * 0.5, stoneH * 0.5, 0, 0, Math.PI * 2);
  const stoneGrad = ctx.createRadialGradient(cx - stoneW * 0.15, cy - stoneH * 0.15, 0, cx, cy, stoneW * 0.5);
  stoneGrad.addColorStop(0, lerpColor("#A0A0B8", "#E0D0B8", t));
  stoneGrad.addColorStop(0.6, stoneColor);
  stoneGrad.addColorStop(1, lerpColor("#606878", "#907858", t));
  ctx.fillStyle = stoneGrad;
  ctx.fill();
  ctx.restore();

  // 움푹 패인 홈 (indent)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, indentRx, indentRy, 0, 0, Math.PI * 2);
  const indentGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, indentRx);
  indentGrad.addColorStop(0, lerpColor("#505068", "#A08050", t));
  indentGrad.addColorStop(0.7, indentColor);
  indentGrad.addColorStop(1, stoneColor);
  ctx.fillStyle = indentGrad;
  ctx.fill();
  ctx.restore();

  // 온기 글로우 (홈 안쪽)
  if (t > 0.05) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, indentRx * 0.8, indentRy * 0.8, 0, 0, Math.PI * 2);
    const warmGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, indentRx * 0.8);
    warmGrad.addColorStop(0, glowColor);
    warmGrad.addColorStop(1, "rgba(255,214,165,0)");
    ctx.fillStyle = warmGrad;
    ctx.fill();
    ctx.restore();
  }

  // 상단 하이라이트 (광택)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx - stoneW * 0.12, cy - stoneH * 0.2, stoneW * 0.18, stoneH * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.15 - t * 0.05})`;
  ctx.fill();
  ctx.restore();

  // 작은 하이라이트
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx - stoneW * 0.08, cy - stoneH * 0.14, stoneW * 0.06, stoneH * 0.03, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.25 - t * 0.08})`;
  ctx.fill();
  ctx.restore();

  // 홈 테두리 미세 그림자
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, indentRx, indentRy, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0,0,0,${0.08 - t * 0.03})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawStars(time: number) {
  for (const s of stars) {
    const flicker = 0.5 + Math.sin(time * s.speed + s.x) * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201,184,255,${s.opacity * flicker})`;
    ctx.fill();
    ctx.restore();
  }
}

// ---------- 메인 루프 ----------
let lastTime = performance.now();

function loop(now: number) {
  requestAnimationFrame(loop);
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // 온기 감소
  if (!isRubbing) {
    warmth = Math.max(0, warmth - dt * 2);
  }
  warmthBar.style.width = warmth + "%";

  // 글로우 펄스
  glowPulse = Math.sin(now * 0.003) * 0.5 + 0.5;

  // 위로 메시지 체크
  for (const wm of WARMTH_MSGS) {
    if (warmth >= wm.at && !shownMsgs.has(wm.at)) {
      shownMsgs.add(wm.at);
      showComfort(wm.msg);
    }
  }

  // 랜덤 위로 (25초마다, 문지르는 중일 때)
  if (isRubbing && warmth > 30 && now - lastComfortTime > 25000) {
    lastComfortTime = now;
    showComfort(COMFORTS[Math.floor(Math.random() * COMFORTS.length)]);
  }

  // 그리기
  ctx.clearRect(0, 0, W, H);

  // 배경
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
  bgGrad.addColorStop(0, `rgba(45,43,61,${0.3 + warmth / 100 * 0.2})`);
  bgGrad.addColorStop(1, "#1A1828");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  drawStars(now);
  drawStone();
}

requestAnimationFrame(loop);

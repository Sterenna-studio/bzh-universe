
const $ = (s) => document.querySelector(s);
const state = {
  image: new Image(),
  imageName: "walk_leme_2.png",
  playing: true,
  frame: 0,
  frameB: 0,
  acc: 0,
  accB: 0,
  lastTime: performance.now(),
  pingDir: 1,
  pingDirB: 1,
};

const els = {
  cols: $("#cols"), rows: $("#rows"), start: $("#startFrame"), end: $("#endFrame"),
  fps: $("#fps"), fpsNumber: $("#fpsNumber"), fpsValue: $("#fpsValue"), fpsB: $("#fpsB"),
  speed: $("#speed"), loopMode: $("#loopMode"), direction: $("#direction"),
  scale: $("#scale"), background: $("#background"),
  canvas: $("#previewCanvas"), canvasA: $("#canvasA"), canvasB: $("#canvasB"),
  stage: $("#stage"), stageA: $("#stageA"), stageB: $("#stageB"),
  scrubber: $("#scrubber"), play: $("#playBtn"), status: $("#statusText"),
  cycle: $("#cycleDuration"), frameDuration: $("#frameDuration"),
  imageSize: $("#imageSize"), frameSize: $("#frameSize"), playedFrames: $("#playedFrames"),
  diagnostic: $("#diagnostic"), config: $("#configPreview"),
  labelA: $("#labelA"), labelB: $("#labelB")
};

function cfg() {
  const cols = Math.max(1, +els.cols.value || 1);
  const rows = Math.max(1, +els.rows.value || 1);
  const total = cols * rows;
  const start = Math.min(total, Math.max(1, +els.start.value || 1));
  const end = Math.min(total, Math.max(start, +els.end.value || total));
  const fps = Math.max(.25, +els.fpsNumber.value || 8);
  return {
    image: state.imageName, columns: cols, rows, startFrame: start, endFrame: end,
    frameCount: end - start + 1, fps, speed: +els.speed.value,
    effectiveFps: fps * +els.speed.value, loopMode: els.loopMode.value,
    direction: els.direction.value, scale: +els.scale.value, background: els.background.value
  };
}

function syncFPS(source) {
  if (source === "range") els.fpsNumber.value = els.fps.value;
  else els.fps.value = Math.min(30, Math.max(1, +els.fpsNumber.value || 8));
  els.fpsValue.textContent = (+els.fpsNumber.value).toLocaleString("fr-FR");
  updateUI();
}

function frameRect(index) {
  const c = cfg();
  const fw = state.image.naturalWidth / c.columns;
  const fh = state.image.naturalHeight / c.rows;
  const absolute = c.startFrame - 1 + index;
  const col = absolute % c.columns;
  const row = Math.floor(absolute / c.columns);
  return { sx: col * fw, sy: row * fh, sw: fw, sh: fh };
}

function draw(canvas, index, scaleMultiplier = 1) {
  if (!state.image.complete || !state.image.naturalWidth) return;
  const r = frameRect(index);
  const scale = cfg().scale * scaleMultiplier;
  canvas.width = Math.round(r.sw * scale);
  canvas.height = Math.round(r.sh * scale);
  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(state.image, r.sx,r.sy,r.sw,r.sh, 0,0,canvas.width,canvas.height);
}

function sequenceNext(current, pingDir, mode, reverse, count) {
  let dir = reverse ? -1 : 1;
  if (mode === "pingpong") {
    let next = current + pingDir * dir;
    if (next >= count) { next = Math.max(0,count-2); pingDir *= -1; }
    if (next < 0) { next = Math.min(count-1,1); pingDir *= -1; }
    return [next, pingDir];
  }
  let next = current + dir;
  if (mode === "once") return [Math.max(0,Math.min(count-1,next)), pingDir];
  next = (next + count) % count;
  return [next, pingDir];
}

function updateUI() {
  const c = cfg();
  state.frame = Math.min(state.frame, c.frameCount-1);
  state.frameB = Math.min(state.frameB, c.frameCount-1);
  els.end.max = c.columns*c.rows;
  els.start.max = c.columns*c.rows;
  els.scrubber.max = c.frameCount;
  els.scrubber.value = state.frame + 1;
  els.status.textContent = `Frame ${state.frame + 1} / ${c.frameCount}`;
  els.cycle.textContent = (c.frameCount / c.effectiveFps).toLocaleString("fr-FR",{maximumFractionDigits:2}) + " s";
  els.frameDuration.textContent = Math.round(1000 / c.effectiveFps) + " ms";
  els.playedFrames.textContent = c.frameCount;
  els.labelA.textContent = `${c.effectiveFps.toLocaleString("fr-FR")} FPS`;
  els.labelB.textContent = `${(+els.fpsB.value).toLocaleString("fr-FR")} FPS`;
  if (state.image.naturalWidth) {
    const fw = state.image.naturalWidth/c.columns, fh=state.image.naturalHeight/c.rows;
    els.imageSize.textContent = `${state.image.naturalWidth} × ${state.image.naturalHeight}`;
    els.frameSize.textContent = `${fw} × ${fh}`;
  }
  [els.stage,els.stageA,els.stageB].forEach(stage => {
    stage.className = stage.className.replace(/\b(checker|dark|light|red|green)\b/g,"").trim()+" "+c.background;
  });
  draw(els.canvas,state.frame,1);
  draw(els.canvasA,state.frame,0.55);
  draw(els.canvasB,state.frameB,0.55);
  diagnose(c);
  els.config.textContent = JSON.stringify(c,null,2);
}

function diagnose(c) {
  const lines=[];
  const duration=c.frameCount/c.effectiveFps;
  if (c.frameCount === 8 && c.effectiveFps >= 7 && c.effectiveFps <= 10)
    lines.push(["ok","Très bon point de départ pour une marche mécanique en 8 images."]);
  else if (c.frameCount < 4)
    lines.push(["bad","Trop peu d’images : la marche risque de devenir difficile à lire."]);
  else lines.push(["warn","Réglage exploitable, mais compare-le visuellement à 8 FPS."]);

  if (duration < .55) lines.push(["warn","Cycle très rapide : risque de course ou de pieds qui glissent."]);
  else if (duration > 1.45) lines.push(["warn","Cycle lent : peut paraître lourd ou hésitant."]);
  else lines.push(["ok",`Cycle de ${duration.toFixed(2)} s : zone confortable pour une marche.`]);

  if (c.effectiveFps < 6) lines.push(["warn","Cadence très hachée. Intéressante seulement pour un style volontairement mécanique."]);
  if (c.effectiveFps > 14) lines.push(["warn","Cadence élevée : les différences entre poses risquent de devenir peu visibles."]);

  const fw=state.image.naturalWidth/c.columns;
  if (state.image.naturalWidth && !Number.isInteger(fw)) lines.push(["bad","La largeur de l’image n’est pas divisible proprement par le nombre de colonnes."]);
  else if (state.image.naturalWidth) lines.push(["ok","Découpage horizontal propre."]);

  els.diagnostic.innerHTML = lines.map(([type,text]) => `<div class="diag ${type==='ok'?'':type}">${text}</div>`).join("");
}

function tick(now) {
  const dt = now - state.lastTime;
  state.lastTime = now;
  const c = cfg();
  if (state.playing && c.frameCount > 1) {
    state.acc += dt;
    state.accB += dt;
    const intervalA=1000/c.effectiveFps;
    const intervalB=1000/Math.max(.25,+els.fpsB.value);
    while(state.acc>=intervalA){
      state.acc-=intervalA;
      [state.frame,state.pingDir]=sequenceNext(state.frame,state.pingDir,c.loopMode,c.direction==="reverse",c.frameCount);
    }
    while(state.accB>=intervalB){
      state.accB-=intervalB;
      [state.frameB,state.pingDirB]=sequenceNext(state.frameB,state.pingDirB,c.loopMode,c.direction==="reverse",c.frameCount);
    }
    updateUI();
  }
  requestAnimationFrame(tick);
}

function setPlaying(v){
  state.playing=v;
  els.play.textContent=v?"Pause":"Lecture";
}

$("#playBtn").onclick=()=>setPlaying(!state.playing);
$("#prevBtn").onclick=()=>{setPlaying(false);state.frame=(state.frame-1+cfg().frameCount)%cfg().frameCount;updateUI()};
$("#nextBtn").onclick=()=>{setPlaying(false);state.frame=(state.frame+1)%cfg().frameCount;updateUI()};
$("#resetBtn").onclick=()=>{state.frame=state.frameB=0;state.acc=state.accB=0;updateUI()};
els.scrubber.oninput=()=>{setPlaying(false);state.frame=+els.scrubber.value-1;updateUI()};
els.fps.oninput=()=>syncFPS("range");
els.fpsNumber.oninput=()=>syncFPS("number");
els.fpsB.oninput=updateUI;

["cols","rows","start","end","speed","loopMode","direction","scale","background"].forEach(k=>{
  els[k].addEventListener("input",()=>{state.frame=0;state.frameB=0;updateUI()});
});

document.querySelectorAll("[data-fps]").forEach(btn=>btn.onclick=()=>{
  els.fpsNumber.value=btn.dataset.fps;syncFPS("number");
});

$("#fileInput").onchange=e=>{
  const file=e.target.files[0]; if(!file)return;
  state.imageName=file.name;
  state.image.src=URL.createObjectURL(file);
};

$("#saveBtn").onclick=()=>{
  localStorage.setItem("lemegeton-animation-tuner",JSON.stringify(cfg()));
  const old=$("#saveBtn").textContent; $("#saveBtn").textContent="Sauvegardé ✓";
  setTimeout(()=>$("#saveBtn").textContent=old,1200);
};

$("#exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(cfg(),null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="lemegeton-animation-config.json";a.click();URL.revokeObjectURL(a.href);
};

window.addEventListener("keydown",e=>{
  if(["INPUT","SELECT"].includes(document.activeElement.tagName)) return;
  if(e.code==="Space"){e.preventDefault();setPlaying(!state.playing)}
  if(e.key==="ArrowLeft")$("#prevBtn").click();
  if(e.key==="ArrowRight")$("#nextBtn").click();
  if(e.key.toLowerCase()==="r")$("#resetBtn").click();
  if(e.key==="+"){els.fpsNumber.value=+els.fpsNumber.value+.25;syncFPS("number")}
  if(e.key==="-"){els.fpsNumber.value=Math.max(.25,+els.fpsNumber.value-.25);syncFPS("number")}
});

state.image.onload=()=>{
  els.end.value=Math.min(+els.cols.value*+els.rows.value,8);
  updateUI();
};
state.image.src="assets/walk_leme_2.png";

const saved=localStorage.getItem("lemegeton-animation-tuner");
if(saved){
  try{
    const s=JSON.parse(saved);
    for(const [key,val] of Object.entries({cols:s.columns,rows:s.rows,start:s.startFrame,end:s.endFrame,fpsNumber:s.fps,speed:s.speed,loopMode:s.loopMode,direction:s.direction,scale:s.scale,background:s.background})){
      if(els[key] && val!==undefined) els[key].value=val;
    }
    els.fps.value=s.fps||8;
  }catch{}
}
requestAnimationFrame(tick);

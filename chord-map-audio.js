// chord-map-audio.js
// Web Audio API 音声合成エンジン
// 依存: NOTES, ni, nn, CT, TIMBRE (chord-map.html グローバル)
// グローバル: audioCtx, reverbNode, masterGain, getCtx, getOut, pluck, playChord, playVoicing
// playPhraseNote, playMelodyPhrase, playAdlibPhrase, triggerPhrase
// ─────────────────────────────────────────────────────────────

// ═══════════════════════
// AUDIO
// ═══════════════════════
// AUDIO ENGINE — Multi-timbre
// ═══════════════════════
let audioCtx=null;
let reverbNode=null;
let masterGain=null;
let TIMBRE='synth'; // current timbre

const STR_HZ=[82.41,110.00,146.83,196.00,246.94,329.63];
const OPEN_S=[4,9,14,19,23,28];
const ntAt=(s,f)=>(OPEN_S[s]+f)%12;

function getCtx(){
  if(!audioCtx){
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    // Master gain
    masterGain=audioCtx.createGain();
    masterGain.gain.value=0.85;
    masterGain.connect(audioCtx.destination);
    // Convolution reverb (impulse synthesis)
    reverbNode=audioCtx.createConvolver();
    const len=audioCtx.sampleRate*2.5;
    const buf=audioCtx.createBuffer(2,len,audioCtx.sampleRate);
    for(let ch=0;ch<2;ch++){
      const d=buf.getChannelData(ch);
      for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.2);
    }
    reverbNode.buffer=buf;
    const rvGain=audioCtx.createGain();rvGain.gain.value=0.28;
    reverbNode.connect(rvGain);rvGain.connect(masterGain);
  }
  // iOS Safari: suspended 状態を自動解除（ユーザー操作文脈外でも対応）
  if(audioCtx.state==='suspended'){
    audioCtx.resume().catch(()=>{});
  }
  return audioCtx;
}

function getOut(ctx,wet=0.3){
  // dry → master, wet → reverb
  const dry=ctx.createGain();dry.gain.value=1-wet;dry.connect(masterGain);
  const wetG=ctx.createGain();wetG.gain.value=wet;wetG.connect(reverbNode);
  // merge node
  const merge=ctx.createGain();merge.gain.value=1;
  merge.connect(dry);merge.connect(wetG);
  return merge;
}

// ── SYNTH (original) ──
function playSynth(ctx,hz,t0,vol){
  const o1=ctx.createOscillator(),o2=ctx.createOscillator();
  const g=ctx.createGain(),lp=ctx.createBiquadFilter();
  o1.type='sawtooth';o1.frequency.value=hz;
  o2.type='sawtooth';o2.frequency.value=hz*2;
  lp.type='lowpass';lp.frequency.value=hz*5;lp.Q.value=0.4;
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+2.0);
  o1.connect(lp);o2.connect(lp);lp.connect(g);g.connect(getOut(ctx,0.2));
  o1.start(t0);o1.stop(t0+2.0);o2.start(t0);o2.stop(t0+2.0);
}

// ── AMBIENT PAD ──
function playAmbient(ctx,hz,t0,vol){
  const osc=ctx.createOscillator();
  const osc2=ctx.createOscillator();
  const osc3=ctx.createOscillator();
  const g=ctx.createGain();
  const lp=ctx.createBiquadFilter();
  const chorus=ctx.createDelay();
  chorus.delayTime.value=0.022;
  osc.type='sine';osc.frequency.value=hz;
  osc2.type='sine';osc2.frequency.value=hz*2.001; // slight detune
  osc3.type='triangle';osc3.frequency.value=hz*0.999;
  lp.type='lowpass';lp.frequency.value=hz*3;lp.Q.value=0.8;
  // Slow attack, long sustain
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol*0.7,t0+0.6);
  g.gain.setValueAtTime(vol*0.7,t0+2.5);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+4.5);
  osc.connect(lp);osc2.connect(chorus);chorus.connect(lp);osc3.connect(lp);
  lp.connect(g);g.connect(getOut(ctx,0.55));
  osc.start(t0);osc.stop(t0+4.5);
  osc2.start(t0);osc2.stop(t0+4.5);
  osc3.start(t0);osc3.stop(t0+4.5);
}

// ── PIANO ──
function playPiano(ctx,hz,t0,vol){
  const o1=ctx.createOscillator(),o2=ctx.createOscillator(),o3=ctx.createOscillator();
  const g=ctx.createGain(),lp=ctx.createBiquadFilter();
  o1.type='triangle';o1.frequency.value=hz;
  o2.type='sine';o2.frequency.value=hz*2;
  o3.type='sine';o3.frequency.value=hz*3;
  const g2=ctx.createGain();g2.gain.value=0.35;
  const g3=ctx.createGain();g3.gain.value=0.15;
  lp.type='lowpass';lp.frequency.value=hz*8;
  g.gain.setValueAtTime(vol,t0);
  g.gain.exponentialRampToValueAtTime(vol*0.3,t0+0.15);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+2.2);
  o1.connect(lp);o2.connect(g2);g2.connect(lp);o3.connect(g3);g3.connect(lp);
  lp.connect(g);g.connect(getOut(ctx,0.18));
  o1.start(t0);o1.stop(t0+2.5);
  o2.start(t0);o2.stop(t0+2.5);
  o3.start(t0);o3.stop(t0+2.5);
}

// ── BELL ──
function playBell(ctx,hz,t0,vol){
  const carriers=[1,2.756,5.404];
  carriers.forEach((ratio,i)=>{
    const mod=ctx.createOscillator(),modG=ctx.createGain();
    const car=ctx.createOscillator(),g=ctx.createGain();
    mod.frequency.value=hz*ratio*3.5;modG.gain.value=hz*ratio*2;
    mod.connect(modG);modG.connect(car.frequency);
    car.type='sine';car.frequency.value=hz*ratio;
    g.gain.setValueAtTime(vol/(i+1),t0);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+3.5-i*0.5);
    car.connect(g);g.connect(getOut(ctx,0.35));
    mod.start(t0);mod.stop(t0+3.5);
    car.start(t0);car.stop(t0+3.5);
  });
}

// ── GUITAR (Karplus-Strong風) ──
function playGuitar(ctx,hz,t0,vol){
  const bufSize=Math.round(ctx.sampleRate/hz);
  const buf=ctx.createBuffer(1,bufSize,ctx.sampleRate);
  const data=buf.getChannelData(0);
  for(let i=0;i<bufSize;i++)data[i]=Math.random()*2-1;
  const src=ctx.createBufferSource();
  src.buffer=buf;src.loop=true;
  const lp=ctx.createBiquadFilter();
  lp.type='lowpass';lp.frequency.value=hz*4;
  const g=ctx.createGain();
  g.gain.setValueAtTime(vol*0.8,t0);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+1.8);
  src.connect(lp);lp.connect(g);g.connect(getOut(ctx,0.15));
  src.start(t0);src.stop(t0+1.8);
}

// ── MARIMBA ──
function playMarimba(ctx,hz,t0,vol){
  [1,4,10].forEach((ratio,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=hz*ratio;
    g.gain.setValueAtTime(vol/(i*2+1),t0);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.8/(i+1));
    o.connect(g);g.connect(getOut(ctx,0.12));
    o.start(t0);o.stop(t0+0.9);
  });
}

// ── DRONE ──
function playDrone(ctx,hz,t0,vol){
  [1,2,3,4].forEach((h,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(),lfo=ctx.createOscillator(),lfoG=ctx.createGain();
    o.type=i<2?'sine':'triangle';
    o.frequency.value=hz*h*(1+i*0.0008);
    lfo.type='sine';lfo.frequency.value=0.2+i*0.07;
    lfoG.gain.value=hz*0.003;
    lfo.connect(lfoG);lfoG.connect(o.frequency);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.5/(i+1),t0+1.2);
    g.gain.setValueAtTime(vol*0.5/(i+1),t0+3.5);
    g.gain.linearRampToValueAtTime(0.0001,t0+5.0);
    o.connect(g);g.connect(getOut(ctx,0.5));
    o.start(t0);o.stop(t0+5.0);
    lfo.start(t0);lfo.stop(t0+5.0);
  });
}

// ── DISPATCH ──
// Timbre properties table: {strum, vol, dur}
const TIMBRE_PROPS={
  synth:      {strum:0.025,vol:0.14,dur:2.0},
  ambient:    {strum:0.12, vol:0.10,dur:4.5},
  piano:      {strum:0.03, vol:0.13,dur:2.2},
  bell:       {strum:0.06, vol:0.10,dur:3.5},
  guitar:     {strum:0.04, vol:0.12,dur:1.8},
  marimba:    {strum:0.04, vol:0.12,dur:0.9},
  drone:      {strum:0,    vol:0.08,dur:5.0},
  pad:        {strum:0.15, vol:0.09,dur:5.5},
  crystal:    {strum:0.07, vol:0.10,dur:4.0},
  organ:      {strum:0.01, vol:0.11,dur:2.5},
  strings:    {strum:0.08, vol:0.09,dur:4.0},
  celeste:    {strum:0.05, vol:0.11,dur:2.8},
  waterphone: {strum:0.1,  vol:0.07,dur:6.0},
  braindance: {strum:0.02, vol:0.12,dur:2.0},
  tibetan:    {strum:0.18, vol:0.08,dur:7.0},
  throat:     {strum:0.0,  vol:0.07,dur:6.0},
  rainforest: {strum:0.22, vol:0.07,dur:5.0},
  cosmos:     {strum:0.0,  vol:0.06,dur:8.0},
  koto:       {strum:0.05, vol:0.12,dur:2.0},
  oud:        {strum:0.03, vol:0.12,dur:2.2},
  // ── Electronic/Dance ──
  acid:       {strum:0.01, vol:0.13,dur:0.8},
  reese:      {strum:0.0,  vol:0.11,dur:3.0},
  technopad:  {strum:0.05, vol:0.10,dur:3.5},
  housechord: {strum:0.02, vol:0.13,dur:1.2},
  supersaw:   {strum:0.03, vol:0.10,dur:2.5},
  plucksynth: {strum:0.03, vol:0.13,dur:0.7},
  bass808:    {strum:0.0,  vol:0.12,dur:2.0},
  ravestab:   {strum:0.01, vol:0.13,dur:0.5},
  detroit:    {strum:0.04, vol:0.11,dur:2.0},
  junglestab: {strum:0.01, vol:0.13,dur:0.4},
  trancelead: {strum:0.03, vol:0.11,dur:2.0},
  deephouse:  {strum:0.06, vol:0.10,dur:3.0},
  // ── Vintage ──
  rhodes:     {strum:0.02, vol:0.13,dur:2.4},
  moog:       {strum:0.01, vol:0.12,dur:1.8},
  wurlitzer:  {strum:0.02, vol:0.12,dur:2.0},
  clavinet:   {strum:0.01, vol:0.13,dur:0.9},
  // ── Strings ──
  violin:     {strum:0.04, vol:0.10,dur:3.0},
  cello:      {strum:0.05, vol:0.10,dur:3.5},
  ensemble:   {strum:0.09, vol:0.09,dur:4.5},
  // ── Electronic Lead ──
  sawlead:    {strum:0.01, vol:0.11,dur:1.6},
  pulsebass:  {strum:0.01, vol:0.12,dur:1.4},
  glidelead:  {strum:0.02, vol:0.11,dur:2.0},
};

function pluck(ctx,hz,t0,vol){
  switch(TIMBRE){
    case'ambient':    playAmbient(ctx,hz,t0,vol);break;
    case'piano':      playPiano(ctx,hz,t0,vol);break;
    case'bell':       playBell(ctx,hz,t0,vol);break;
    case'guitar':     playGuitar(ctx,hz,t0,vol);break;
    case'marimba':    playMarimba(ctx,hz,t0,vol);break;
    case'drone':      playDrone(ctx,hz,t0,vol);break;
    case'pad':        playPad(ctx,hz,t0,vol);break;
    case'crystal':    playCrystal(ctx,hz,t0,vol);break;
    case'organ':      playOrgan(ctx,hz,t0,vol);break;
    case'strings':    playStrings(ctx,hz,t0,vol);break;
    case'celeste':    playCeleste(ctx,hz,t0,vol);break;
    case'waterphone': playWaterphone(ctx,hz,t0,vol);break;
    case'braindance': playBraindance(ctx,hz,t0,vol);break;
    case'tibetan':    playTibetan(ctx,hz,t0,vol);break;
    case'throat':     playThroat(ctx,hz,t0,vol);break;
    case'rainforest': playRainforest(ctx,hz,t0,vol);break;
    case'cosmos':     playCosmos(ctx,hz,t0,vol);break;
    case'koto':       playKoto(ctx,hz,t0,vol);break;
    case'oud':        playOud(ctx,hz,t0,vol);break;
    case'acid':       playAcid(ctx,hz,t0,vol);break;
    case'reese':      playReese(ctx,hz,t0,vol);break;
    case'technopad':  playTechnoPad(ctx,hz,t0,vol);break;
    case'housechord': playHouseChord(ctx,hz,t0,vol);break;
    case'supersaw':   playSupersaw(ctx,hz,t0,vol);break;
    case'plucksynth': playPluckSynth(ctx,hz,t0,vol);break;
    case'bass808':    playBass808(ctx,hz,t0,vol);break;
    case'ravestab':   playRaveStab(ctx,hz,t0,vol);break;
    case'detroit':    playDetroit(ctx,hz,t0,vol);break;
    case'junglestab': playJungleStab(ctx,hz,t0,vol);break;
    case'trancelead': playTrancelead(ctx,hz,t0,vol);break;
    case'deephouse':  playDeephouse(ctx,hz,t0,vol);break;
    // ── Vintage ──
    case'rhodes':     playRhodes(ctx,hz,t0,vol);break;
    case'moog':       playMoog(ctx,hz,t0,vol);break;
    case'wurlitzer':  playWurlitzer(ctx,hz,t0,vol);break;
    case'clavinet':   playClavinet(ctx,hz,t0,vol);break;
    // ── Strings ──
    case'violin':     playViolin(ctx,hz,t0,vol);break;
    case'cello':      playCello(ctx,hz,t0,vol);break;
    case'ensemble':   playEnsemble(ctx,hz,t0,vol);break;
    // ── Electronic Lead ──
    case'sawlead':    playSawlead(ctx,hz,t0,vol);break;
    case'pulsebass':  playPulsebass(ctx,hz,t0,vol);break;
    case'glidelead':  playGlidelead(ctx,hz,t0,vol);break;
    default:          playSynth(ctx,hz,t0,vol);
  }
}

// ── PAD (warm detuned supersaw) ──
function playPad(ctx,hz,t0,vol){
  const voices=4;const out=getOut(ctx,0.6);
  for(let v=0;v<voices;v++){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sawtooth';o.frequency.value=hz*(1+(v-1.5)*0.004);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.28,t0+0.8);
    g.gain.setValueAtTime(vol*0.28,t0+4.0);
    g.gain.linearRampToValueAtTime(0.0001,t0+5.5);
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=hz*2.5;lp.Q.value=1.2;
    o.connect(lp);lp.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+5.5);
  }
}

// ── CRYSTAL (high glassy sine harmonics) ──
function playCrystal(ctx,hz,t0,vol){
  const out=getOut(ctx,0.45);
  [1,2,3,5,8].forEach((h,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=hz*h;
    const decay=4.0/Math.sqrt(h);
    g.gain.setValueAtTime(vol/(i+1)*0.6,t0);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+decay);
    o.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+decay+0.1);
  });
}

// ── ORGAN (Hammond-ish drawbar) ──
function playOrgan(ctx,hz,t0,vol){
  const out=getOut(ctx,0.18);
  const drawbars=[1,2,3,4,5,6,8];
  const levels=[0.8,0.7,0.5,0.3,0.2,0.15,0.1];
  drawbars.forEach((h,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=hz*h;
    g.gain.setValueAtTime(vol*levels[i],t0+0.005);
    g.gain.setValueAtTime(vol*levels[i],t0+2.3);
    g.gain.linearRampToValueAtTime(0.0001,t0+2.5);
    o.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+2.5);
  });
}

// ── STRINGS (bowed, slow attack) ──
function playStrings(ctx,hz,t0,vol){
  const out=getOut(ctx,0.5);
  [1,2,3].forEach((h,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    const vib=ctx.createOscillator(),vibG=ctx.createGain();
    o.type=i===0?'sawtooth':'triangle';o.frequency.value=hz*h*(1+i*0.001);
    vib.type='sine';vib.frequency.value=5.5;vibG.gain.value=hz*0.006;
    vib.connect(vibG);vibG.connect(o.frequency);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.4/(i+1),t0+0.35);
    g.gain.setValueAtTime(vol*0.4/(i+1),t0+3.2);
    g.gain.linearRampToValueAtTime(0.0001,t0+4.0);
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=hz*4;
    o.connect(lp);lp.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+4.0);
    vib.start(t0);vib.stop(t0+4.0);
  });
}

// ── CELESTE (bright bell-piano) ──
function playCeleste(ctx,hz,t0,vol){
  const out=getOut(ctx,0.28);
  [[1,0.8],[2.8,0.4],[5.2,0.15],[8.1,0.05]].forEach(([h,amp])=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=hz*h;
    g.gain.setValueAtTime(vol*amp,t0);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+2.8/Math.sqrt(h));
    o.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+3.0);
  });
}

// ── WATERPHONE (eerie sustained metal) ──
function playWaterphone(ctx,hz,t0,vol){
  const out=getOut(ctx,0.75);
  const inharmonic=[1,1.41,1.73,2.24,2.83];
  inharmonic.forEach((h,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    const lfo=ctx.createOscillator(),lfoG=ctx.createGain();
    o.type='sine';o.frequency.value=hz*h*(0.98+Math.random()*0.04);
    lfo.type='sine';lfo.frequency.value=0.3+Math.random()*0.4;
    lfoG.gain.value=hz*0.015;
    lfo.connect(lfoG);lfoG.connect(o.frequency);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.3/(i+1),t0+0.5);
    g.gain.setValueAtTime(vol*0.3/(i+1),t0+4.5);
    g.gain.linearRampToValueAtTime(0.0001,t0+6.0);
    o.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+6.0);
    lfo.start(t0);lfo.stop(t0+6.0);
  });
}

// ── BRAINDANCE (glitchy detuned square) ──
function playBraindance(ctx,hz,t0,vol){
  const out=getOut(ctx,0.3);
  const o=ctx.createOscillator(),o2=ctx.createOscillator();
  const g=ctx.createGain(),lp=ctx.createBiquadFilter();
  o.type='square';o.frequency.value=hz;
  o2.type='square';o2.frequency.value=hz*1.007;
  lp.type='bandpass';lp.frequency.value=hz*3;lp.Q.value=4;
  g.gain.setValueAtTime(vol*0.4,t0);
  g.gain.exponentialRampToValueAtTime(vol*0.1,t0+0.08);
  g.gain.setValueAtTime(vol*0.3,t0+0.1);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+2.0);
  o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(out);
  o.start(t0);o.stop(t0+2.0);
  o2.start(t0);o2.stop(t0+2.0);
}

// ── TIBETAN BOWL (long resonant ring) ──
function playTibetan(ctx,hz,t0,vol){
  const out=getOut(ctx,0.7);
  // Low fundamental + high partials + long ring
  [[1,6.5],[2.73,4.0],[5.0,2.5],[7.8,1.5]].forEach(([h,dur])=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=hz*h;
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.4/h,t0+0.08);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+dur+0.1);
  });
}

// ── THROAT SINGING (overtone vocal formants) ──
function playThroat(ctx,hz,t0,vol){
  const out=getOut(ctx,0.65);
  const formants=[1,2,3,4,5,8,13];
  formants.forEach((h,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(),bp=ctx.createBiquadFilter();
    o.type='sawtooth';o.frequency.value=hz;
    bp.type='bandpass';bp.frequency.value=hz*h;bp.Q.value=12;
    const lfo=ctx.createOscillator(),lfoG=ctx.createGain();
    lfo.type='sine';lfo.frequency.value=4.5+i*0.3;lfoG.gain.value=hz*0.004;
    lfo.connect(lfoG);lfoG.connect(o.frequency);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.35/(i+1),t0+0.4);
    g.gain.setValueAtTime(vol*0.35/(i+1),t0+4.5);
    g.gain.linearRampToValueAtTime(0.0001,t0+6.0);
    o.connect(bp);bp.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+6.0);
    lfo.start(t0);lfo.stop(t0+6.0);
  });
}

// ── RAINFOREST (filtered noise + harmonics) ──
function playRainforest(ctx,hz,t0,vol){
  const out=getOut(ctx,0.8);
  // Pitched tone
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';o.frequency.value=hz;
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol*0.5,t0+0.9);
  g.gain.setValueAtTime(vol*0.5,t0+3.5);
  g.gain.linearRampToValueAtTime(0.0001,t0+5.0);
  o.connect(g);g.connect(out);o.start(t0);o.stop(t0+5.0);
  // Noise shimmer
  const bufLen=ctx.sampleRate*0.5;
  const nBuf=ctx.createBuffer(1,bufLen,ctx.sampleRate);
  const nd=nBuf.getChannelData(0);
  for(let i=0;i<bufLen;i++)nd[i]=(Math.random()*2-1)*0.3;
  const ns=ctx.createBufferSource();ns.buffer=nBuf;ns.loop=true;
  const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=hz*4;bp.Q.value=8;
  const ng=ctx.createGain();
  ng.gain.setValueAtTime(0,t0);
  ng.gain.linearRampToValueAtTime(vol*0.08,t0+1.2);
  ng.gain.exponentialRampToValueAtTime(0.0001,t0+5.0);
  ns.connect(bp);bp.connect(ng);ng.connect(out);
  ns.start(t0);ns.stop(t0+5.0);
}

// ── COSMOS (ultra-long morphing space pad) ──
function playCosmos(ctx,hz,t0,vol){
  const out=getOut(ctx,0.9);
  const layers=[0.5,1,2,3];
  layers.forEach((h,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    const lfo1=ctx.createOscillator(),lfo2=ctx.createOscillator();
    const lG1=ctx.createGain(),lG2=ctx.createGain();
    o.type='sine';o.frequency.value=hz*h;
    lfo1.type='sine';lfo1.frequency.value=0.07+i*0.03;lG1.gain.value=hz*h*0.008;
    lfo2.type='sine';lfo2.frequency.value=0.13+i*0.05;lG2.gain.value=hz*h*0.004;
    lfo1.connect(lG1);lG1.connect(o.frequency);
    lfo2.connect(lG2);lG2.connect(o.frequency);
    const attack=1.5+i*0.5;
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.25/(i+1),t0+attack);
    g.gain.setValueAtTime(vol*0.25/(i+1),t0+6.0);
    g.gain.linearRampToValueAtTime(0.0001,t0+8.0);
    o.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+8.0);
    lfo1.start(t0);lfo1.stop(t0+8.0);
    lfo2.start(t0);lfo2.stop(t0+8.0);
  });
}

// ── KOTO (Japanese plucked string) ──
function playKoto(ctx,hz,t0,vol){
  const out=getOut(ctx,0.22);
  [[1,1.0],[2,0.6],[3,0.3],[4,0.15],[6,0.08]].forEach(([h,amp],i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=i===0?'triangle':'sine';o.frequency.value=hz*h;
    g.gain.setValueAtTime(vol*amp,t0);
    g.gain.exponentialRampToValueAtTime(vol*amp*0.3,t0+0.05);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+2.0/Math.sqrt(h));
    o.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+2.2);
  });
  // Attack noise
  const nb=ctx.createBuffer(1,Math.round(ctx.sampleRate*0.02),ctx.sampleRate);
  const nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  const ns=ctx.createBufferSource();ns.buffer=nb;
  const ng=ctx.createGain();ng.gain.value=vol*0.15;
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=hz*3;
  ns.connect(hp);hp.connect(ng);ng.connect(out);
  ns.start(t0);
}

// ── OUD (Middle Eastern lute) ──
function playOud(ctx,hz,t0,vol){
  const out=getOut(ctx,0.2);
  [[1,1.0],[2,0.7],[3,0.45],[4,0.25],[5,0.12]].forEach(([h,amp])=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='triangle';o.frequency.value=hz*h*(1+Math.random()*0.002);
    g.gain.setValueAtTime(vol*amp,t0);
    g.gain.exponentialRampToValueAtTime(vol*amp*0.5,t0+0.04);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+2.2/h);
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=hz*6;
    o.connect(lp);lp.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+2.5);
  });
}

// ── ACID (TB-303 style filter sweep) ──
function playAcid(ctx,hz,t0,vol){
  const out=getOut(ctx,0.22);
  const o=ctx.createOscillator(),g=ctx.createGain();
  const lp=ctx.createBiquadFilter();
  o.type='sawtooth';o.frequency.value=hz;
  lp.type='lowpass';lp.Q.value=18;
  // Filter envelope: sweep from low to bright
  lp.frequency.setValueAtTime(hz*1.2,t0);
  lp.frequency.exponentialRampToValueAtTime(hz*12,t0+0.06);
  lp.frequency.exponentialRampToValueAtTime(hz*1.5,t0+0.8);
  g.gain.setValueAtTime(vol,t0);
  g.gain.exponentialRampToValueAtTime(vol*0.6,t0+0.05);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+0.8);
  o.connect(lp);lp.connect(g);g.connect(out);
  o.start(t0);o.stop(t0+0.85);
}

// ── REESE BASS (detuned saws, heavy low end) ──
function playReese(ctx,hz,t0,vol){
  const out=getOut(ctx,0.15);
  // Use lower octave for bass feel
  const baseHz=hz*0.5;
  const detunes=[0,+7,-7,+13];
  detunes.forEach(cents=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    const lp=ctx.createBiquadFilter();
    o.type='sawtooth';
    o.frequency.value=baseHz*Math.pow(2,cents/1200);
    lp.type='lowpass';lp.frequency.value=baseHz*4;lp.Q.value=0.6;
    g.gain.setValueAtTime(vol*0.28,t0);
    g.gain.setValueAtTime(vol*0.28,t0+2.5);
    g.gain.linearRampToValueAtTime(0.0001,t0+3.0);
    o.connect(lp);lp.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+3.0);
  });
}

// ── TECHNO PAD (metallic Berlin-style) ──
function playTechnoPad(ctx,hz,t0,vol){
  const out=getOut(ctx,0.45);
  // FM with inharmonic ratio
  const mod=ctx.createOscillator(),modG=ctx.createGain();
  const car=ctx.createOscillator(),g=ctx.createGain();
  const lp=ctx.createBiquadFilter();
  mod.type='sine';mod.frequency.value=hz*2.17;
  modG.gain.value=hz*2.8;
  mod.connect(modG);modG.connect(car.frequency);
  car.type='sawtooth';car.frequency.value=hz;
  lp.type='lowpass';lp.frequency.value=hz*5;lp.Q.value=2;
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol*0.8,t0+0.04);
  g.gain.setValueAtTime(vol*0.6,t0+2.8);
  g.gain.linearRampToValueAtTime(0.0001,t0+3.5);
  car.connect(lp);lp.connect(g);g.connect(out);
  mod.start(t0);mod.stop(t0+3.5);
  car.start(t0);car.stop(t0+3.5);
}

// ── HOUSE CHORD (Rhodes-ish stab) ──
function playHouseChord(ctx,hz,t0,vol){
  const out=getOut(ctx,0.3);
  [[1,1],[2,0.5],[3,0.25],[4,0.12]].forEach(([h,amp])=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=h===1?'triangle':'sine';o.frequency.value=hz*h;
    g.gain.setValueAtTime(vol*amp,t0);
    g.gain.exponentialRampToValueAtTime(vol*amp*0.4,t0+0.08);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+1.2);
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=hz*7;
    o.connect(lp);lp.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+1.3);
  });
}

// ── SUPERSAW (trance/EDM lead — 7 detuned saws) ──
function playSupersaw(ctx,hz,t0,vol){
  const out=getOut(ctx,0.35);
  const cents=[-30,-20,-10,0,10,20,30];
  cents.forEach(c=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    const lp=ctx.createBiquadFilter();
    o.type='sawtooth';o.frequency.value=hz*Math.pow(2,c/1200);
    lp.type='lowpass';lp.frequency.value=hz*6;lp.Q.value=0.4;
    g.gain.setValueAtTime(vol*0.15,t0+0.005);
    g.gain.setValueAtTime(vol*0.15,t0+2.2);
    g.gain.linearRampToValueAtTime(0.0001,t0+2.5);
    o.connect(lp);lp.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+2.5);
  });
}

// ── PLUCK SYNTH (techno pluck / Moog-ish) ──
function playPluckSynth(ctx,hz,t0,vol){
  const out=getOut(ctx,0.18);
  const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain();
  const lp=ctx.createBiquadFilter();
  o.type='square';o.frequency.value=hz;
  o2.type='square';o2.frequency.value=hz*1.003;
  lp.type='lowpass';lp.Q.value=6;
  lp.frequency.setValueAtTime(hz*8,t0);
  lp.frequency.exponentialRampToValueAtTime(hz*1.2,t0+0.3);
  g.gain.setValueAtTime(vol,t0);
  g.gain.exponentialRampToValueAtTime(vol*0.1,t0+0.04);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+0.7);
  o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(out);
  o.start(t0);o.stop(t0+0.75);
  o2.start(t0);o2.stop(t0+0.75);
}

// ── 808 BASS (sine with pitch drop) ──
function playBass808(ctx,hz,t0,vol){
  const out=getOut(ctx,0.12);
  // Use sub-bass octave
  const baseHz=hz*0.5;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(baseHz*2,t0);
  o.frequency.exponentialRampToValueAtTime(baseHz,t0+0.05);
  g.gain.setValueAtTime(vol*1.2,t0);
  g.gain.exponentialRampToValueAtTime(vol*0.8,t0+0.05);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+2.0);
  o.connect(g);g.connect(out);
  o.start(t0);o.stop(t0+2.1);
}

// ── RAVE STAB (90s hardcore brass stab) ──
function playRaveStab(ctx,hz,t0,vol){
  const out=getOut(ctx,0.2);
  const osc=[0,7,12].map(st=>{
    const o=ctx.createOscillator();
    o.type='sawtooth';
    o.frequency.value=hz*Math.pow(2,st/12);
    return o;
  });
  const g=ctx.createGain(),lp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter();
  lp.type='lowpass';lp.frequency.value=hz*6;lp.Q.value=3;
  hp.type='highpass';hp.frequency.value=hz*0.8;
  g.gain.setValueAtTime(vol*0.9,t0);
  g.gain.exponentialRampToValueAtTime(vol*0.3,t0+0.03);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+0.5);
  osc.forEach(o=>{o.connect(hp);});
  hp.connect(lp);lp.connect(g);g.connect(out);
  osc.forEach(o=>{o.start(t0);o.stop(t0+0.55);});
}

// ── DETROIT TECHNO (FM, Arp 2500 inspired) ──
function playDetroit(ctx,hz,t0,vol){
  const out=getOut(ctx,0.3);
  // Two-op FM, slightly inharmonic
  const mod=ctx.createOscillator(),modG=ctx.createGain();
  const car=ctx.createOscillator(),g=ctx.createGain();
  mod.type='sine';mod.frequency.value=hz*1.41;
  modG.gain.setValueAtTime(hz*4,t0);
  modG.gain.exponentialRampToValueAtTime(hz*0.5,t0+1.5);
  mod.connect(modG);modG.connect(car.frequency);
  car.type='sine';car.frequency.value=hz;
  g.gain.setValueAtTime(vol,t0);
  g.gain.exponentialRampToValueAtTime(vol*0.5,t0+0.1);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+2.0);
  car.connect(g);g.connect(out);
  mod.start(t0);mod.stop(t0+2.1);
  car.start(t0);car.stop(t0+2.1);
}

// ── JUNGLE STAB (DnB choppy stab) ──
function playJungleStab(ctx,hz,t0,vol){
  const out=getOut(ctx,0.22);
  const o=ctx.createOscillator(),g=ctx.createGain();
  const lp=ctx.createBiquadFilter(),hp=ctx.createBiquadFilter();
  o.type='sawtooth';o.frequency.value=hz;
  lp.type='lowpass';lp.frequency.value=hz*5;lp.Q.value=5;
  hp.type='highpass';hp.frequency.value=hz*0.5;
  g.gain.setValueAtTime(vol,t0);
  g.gain.exponentialRampToValueAtTime(vol*0.02,t0+0.04);
  g.gain.setValueAtTime(vol*0.4,t0+0.05);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+0.4);
  o.connect(hp);hp.connect(lp);lp.connect(g);g.connect(out);
  o.start(t0);o.stop(t0+0.45);
}

// ── TRANCE LEAD (gated supersaw with portamento feel) ──
function playTrancelead(ctx,hz,t0,vol){
  const out=getOut(ctx,0.28);
  [-15,-5,0,5,15].forEach((c,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();
    o.type='sawtooth';o.frequency.value=hz*Math.pow(2,c/1200);
    lp.type='lowpass';lp.frequency.value=hz*8;lp.Q.value=1;
    // Gate envelope
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.22,t0+0.008);
    g.gain.setValueAtTime(vol*0.22,t0+1.6);
    g.gain.linearRampToValueAtTime(0.0001,t0+2.0);
    o.connect(lp);lp.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+2.1);
  });
}

// ── DEEP HOUSE (mellow Juno-style chord) ──
function playDeephouse(ctx,hz,t0,vol){
  const out=getOut(ctx,0.42);
  const voices=[{d:0,t:'triangle'},{d:7,t:'sawtooth'},{d:-5,t:'triangle'}];
  voices.forEach(({d,t})=>{
    const o=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();
    const ch=ctx.createDelay();ch.delayTime.value=0.018+d*0.0005;
    o.type=t;o.frequency.value=hz*Math.pow(2,d/1200);
    lp.type='lowpass';lp.frequency.value=hz*3;lp.Q.value=0.7;
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.35,t0+0.05);
    g.gain.setValueAtTime(vol*0.35,t0+2.5);
    g.gain.linearRampToValueAtTime(0.0001,t0+3.0);
    o.connect(lp);lp.connect(ch);ch.connect(g);g.connect(out);
    o.start(t0);o.stop(t0+3.1);
  });
}

// ── RHODES (Fender Rhodes風 — FM系倍音+振幅変調) ──
function playRhodes(ctx,hz,t0,vol){
  const out=getOut(ctx,0.5);
  const car=ctx.createOscillator(), mod=ctx.createOscillator();
  const modGain=ctx.createGain(), g=ctx.createGain();
  mod.frequency.value=hz*2.0;
  modGain.gain.setValueAtTime(hz*1.8,t0);
  modGain.gain.exponentialRampToValueAtTime(hz*0.3,t0+0.8);
  car.type='sine'; car.frequency.value=hz;
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol*0.9,t0+0.008);
  g.gain.exponentialRampToValueAtTime(vol*0.4,t0+0.3);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+2.4);
  // トレモロ
  const trem=ctx.createOscillator(), tremGain=ctx.createGain();
  trem.frequency.value=4.8; tremGain.gain.value=0.05;
  trem.connect(tremGain); tremGain.connect(g.gain);
  mod.connect(modGain); modGain.connect(car.frequency);
  car.connect(g); g.connect(out);
  mod.start(t0); car.start(t0); trem.start(t0);
  mod.stop(t0+2.5); car.stop(t0+2.5); trem.stop(t0+2.5);
}

// ── MOOG (Moog風 — sawtooth + resonant LP ladder filter) ──
function playMoog(ctx,hz,t0,vol){
  const out=getOut(ctx,0.48);
  const o=ctx.createOscillator(), g=ctx.createGain();
  const lp=ctx.createBiquadFilter(), lp2=ctx.createBiquadFilter();
  o.type='sawtooth'; o.frequency.value=hz;
  // ピッチスライド（ポルタメント感）
  o.frequency.setValueAtTime(hz*1.04,t0);
  o.frequency.exponentialRampToValueAtTime(hz,t0+0.06);
  lp.type='lowpass'; lp.frequency.setValueAtTime(hz*12,t0);
  lp.frequency.exponentialRampToValueAtTime(hz*1.8,t0+0.15); lp.Q.value=8;
  lp2.type='lowpass'; lp2.frequency.value=hz*4; lp2.Q.value=2;
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol*0.85,t0+0.012);
  g.gain.setValueAtTime(vol*0.85,t0+0.3);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+1.8);
  o.connect(lp); lp.connect(lp2); lp2.connect(g); g.connect(out);
  o.start(t0); o.stop(t0+1.9);
}

// ── WURLITZER (Wurlitzer風 — 矩形波+倍音) ──
function playWurlitzer(ctx,hz,t0,vol){
  const out=getOut(ctx,0.45);
  [[1,0.6,'square'],[2,0.2,'sine'],[3,0.08,'sine']].forEach(([r,w,type])=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type; o.frequency.value=hz*r;
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*w,t0+0.01);
    g.gain.exponentialRampToValueAtTime(vol*w*0.5,t0+0.2);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+2.0);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0+2.1);
  });
}

// ── CLAVINET (クラビネット風 — sharp attack) ──
function playClavinet(ctx,hz,t0,vol){
  const out=getOut(ctx,0.45);
  const o=ctx.createOscillator(), g=ctx.createGain();
  const hp=ctx.createBiquadFilter(), lp=ctx.createBiquadFilter();
  o.type='sawtooth'; o.frequency.value=hz;
  hp.type='highpass'; hp.frequency.value=hz*1.5; hp.Q.value=1;
  lp.type='lowpass';  lp.frequency.value=hz*8;   lp.Q.value=2;
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol,t0+0.004);
  g.gain.exponentialRampToValueAtTime(vol*0.1,t0+0.12);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+0.9);
  o.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
  o.start(t0); o.stop(t0+1.0);
}

// ── VIOLIN (バイオリン風 — bowed string) ──
function playViolin(ctx,hz,t0,vol){
  const out=getOut(ctx,0.5);
  const dur=3.0;
  [[1,0.5],[2,0.25],[3,0.12],[4,0.06],[5,0.04]].forEach(([r,w])=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sawtooth'; o.frequency.value=hz*r;
    // ビブラート
    const vib=ctx.createOscillator(), vibG=ctx.createGain();
    vib.frequency.value=5.8; vibG.gain.value=hz*r*0.006;
    vib.connect(vibG); vibG.connect(o.frequency);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*w,t0+0.18); // ボウイング開始
    g.gain.setValueAtTime(vol*w,t0+dur-0.15);
    g.gain.linearRampToValueAtTime(0.0001,t0+dur);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=hz*r*3;
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t0); vib.start(t0); o.stop(t0+dur+0.1); vib.stop(t0+dur+0.1);
  });
}

// ── CELLO (チェロ風 — deeper bowed string) ──
function playCello(ctx,hz,t0,vol){
  const out=getOut(ctx,0.5);
  const dur=3.5;
  [[1,0.55],[2,0.22],[3,0.10],[4,0.05]].forEach(([r,w])=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sawtooth'; o.frequency.value=hz*r;
    const vib=ctx.createOscillator(), vibG=ctx.createGain();
    vib.frequency.value=4.5; vibG.gain.value=hz*r*0.005;
    vib.connect(vibG); vibG.connect(o.frequency);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*w,t0+0.22);
    g.gain.setValueAtTime(vol*w,t0+dur-0.2);
    g.gain.linearRampToValueAtTime(0.0001,t0+dur);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=hz*r*2.5;
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t0); vib.start(t0); o.stop(t0+dur+0.1); vib.stop(t0+dur+0.1);
  });
}

// ── ENSEMBLE (ストリングスアンサンブル — detuned layered strings) ──
function playEnsemble(ctx,hz,t0,vol){
  const out=getOut(ctx,0.55);
  const detunes=[0,3,-3,5,-5];
  detunes.forEach(d=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sawtooth'; o.frequency.value=hz*Math.pow(2,d/1200);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol*0.16,t0+0.3);
    g.gain.setValueAtTime(vol*0.16,t0+4.0);
    g.gain.linearRampToValueAtTime(0.0001,t0+4.5);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=hz*4; lp.Q.value=0.5;
    o.connect(lp); lp.connect(g); g.connect(out);
    o.start(t0); o.stop(t0+4.6);
  });
}

// ── SAWLEAD (Electronc Saw Lead) ──
function playSawlead(ctx,hz,t0,vol){
  const out=getOut(ctx,0.48);
  const o1=ctx.createOscillator(), o2=ctx.createOscillator();
  const g=ctx.createGain(), lp=ctx.createBiquadFilter();
  o1.type='sawtooth'; o1.frequency.value=hz;
  o2.type='sawtooth'; o2.frequency.value=hz*1.005;
  lp.type='lowpass'; lp.frequency.setValueAtTime(hz*8,t0);
  lp.frequency.exponentialRampToValueAtTime(hz*2,t0+0.1); lp.Q.value=3;
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol*0.5,t0+0.015);
  g.gain.setValueAtTime(vol*0.5,t0+1.4);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+1.6);
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out);
  o1.start(t0); o2.start(t0); o1.stop(t0+1.7); o2.stop(t0+1.7);
}

// ── PULSEBASS (Pulse Wave Bass) ──
function playPulsebass(ctx,hz,t0,vol){
  const out=getOut(ctx,0.45);
  const o=ctx.createOscillator(), g=ctx.createGain(), lp=ctx.createBiquadFilter();
  o.type='square'; o.frequency.value=hz;
  lp.type='lowpass'; lp.frequency.setValueAtTime(hz*6,t0);
  lp.frequency.exponentialRampToValueAtTime(hz*1.5,t0+0.08); lp.Q.value=5;
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol*0.8,t0+0.01);
  g.gain.exponentialRampToValueAtTime(vol*0.3,t0+0.2);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+1.4);
  o.connect(lp); lp.connect(g); g.connect(out);
  o.start(t0); o.stop(t0+1.5);
}

// ── GLIDELEAD (Glide/Portamento Lead) ──
function playGlidelead(ctx,hz,t0,vol){
  const out=getOut(ctx,0.48);
  const o=ctx.createOscillator(), g=ctx.createGain(), lp=ctx.createBiquadFilter();
  o.type='sawtooth';
  // ポルタメント: 半音上からスライドイン
  o.frequency.setValueAtTime(hz*1.06,t0);
  o.frequency.exponentialRampToValueAtTime(hz,t0+0.08);
  lp.type='lowpass'; lp.frequency.value=hz*5; lp.Q.value=4;
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol*0.75,t0+0.02);
  g.gain.setValueAtTime(vol*0.75,t0+1.6);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+2.0);
  o.connect(lp); lp.connect(g); g.connect(out);
  o.start(t0); o.stop(t0+2.1);
}

function playChord(root,type){
  try{const ctx=getCtx();
    const p=TIMBRE_PROPS[TIMBRE]||TIMBRE_PROPS.synth;
    const play=()=>{
      const t0=ctx.currentTime+0.05;
      // Use selected voicing if it matches current chord, else fall back to IV-based
      if(S.voicing&&S.root===root&&S.type===type){
        let cnt=0;
        S.voicing.forEach((f,si)=>{
          if(f<0)return;
          pluck(ctx,STR_HZ[si]*Math.pow(2,f/12),t0+cnt*p.strum,p.vol);
          cnt++;
        });
      } else {
        const ri=ni(root);const ivs=CT[type]?.iv??[0,4,7];
        const base=55*Math.pow(2,ri/12);
        ivs.forEach((iv,i)=>{
          const oct=i>=3?2:i>=2?1:0;
          pluck(ctx,base*Math.pow(2,(iv+oct*12)/12),t0+i*p.strum,p.vol);
        });
      }
    };
    if(ctx.state==='suspended')ctx.resume().then(play);else play();
  }catch(e){}
}
function playVoicing(frets){
  try{const ctx=getCtx();
    const p=TIMBRE_PROPS[TIMBRE]||TIMBRE_PROPS.synth;
    const play=()=>{const t0=ctx.currentTime+0.04;let cnt=0;
      frets.forEach((f,si)=>{
        if(f<0)return;
        if(!stringActive[si])return; // ストリングレンジOFF弦はスキップ
        pluck(ctx,STR_HZ[si]*Math.pow(2,f/12),t0+cnt*p.strum,p.vol*0.9);cnt++;
      });};
    if(ctx.state==='suspended')ctx.resume().then(play);else play();
  }catch(e){}
}

// ═══════════════════════
// VOTES (localStorage)
// ═══════════════════════

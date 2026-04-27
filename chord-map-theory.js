// chord-map-theory.js
// 音楽理論定数: NOTES, CT, GROUPS
// 依存: なし（完全独立）
// グローバル: NOTES, ni, nn, CT, GROUPS
// ─────────────────────────────────────────────────────────────

// ═══════════════════════
// MUSIC THEORY
// ═══════════════════════
const NOTES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ni=n=>NOTES.indexOf(n);
const nn=n=>NOTES[((n%12)+12)%12];
const CT={
  major:{sym:'',iv:[0,4,7]},minor:{sym:'m',iv:[0,3,7]},
  dom7:{sym:'7',iv:[0,4,7,10]},m7:{sym:'m7',iv:[0,3,7,10]},
  maj7:{sym:'M7',iv:[0,4,7,11]},m9:{sym:'m9',iv:[0,3,7,10,2]},
  '9':{sym:'9',iv:[0,4,7,10,2]},maj9:{sym:'M9',iv:[0,4,7,11,2]},
  dim:{sym:'dim',iv:[0,3,6]},dim7:{sym:'°7',iv:[0,3,6,9]},
  aug:{sym:'+',iv:[0,4,8]},sus4:{sym:'sus4',iv:[0,5,7]},
  sus2:{sym:'sus2',iv:[0,2,7]},m7b5:{sym:'ø',iv:[0,3,6,10]},
  add9:{sym:'add9',iv:[0,4,7,2]},'6':{sym:'6',iv:[0,4,7,9]},
  mmaj7:{sym:'mM7',iv:[0,3,7,11]},m6:{sym:'m6',iv:[0,3,7,9]},
  '7b9':{sym:'7♭9',iv:[0,4,7,10,1]},'7s9':{sym:'7♯9',iv:[0,4,7,10,3]},
  '11':{sym:'11',iv:[0,4,7,10,2,5]},'13':{sym:'13',iv:[0,4,7,10,2,9]},
  // ── Ethnic / World ──
  // 1. Spanish/Flamenco — Phrygian Dominant (1,♭2,3,4,5,♭6,♭7)
  phrydom:{sym:'Phry',iv:[0,1,4,7,10]},        // E7♭9 type, Hijaz feel
  // 2. Arabic/Egyptian — Hijaz tetrachord (1,♭2,3) stack
  hijaz:{sym:'Hij',iv:[0,1,4,5,7]},             // 増2度の特徴
  // 3. Japanese — 都節 In scale chord (1,♭2,4,5,♭6)
  japanese:{sym:'都節',iv:[0,1,5,7,8]},
  // 4. Blues extended — blue note triad (1,♭3,♭5,5)
  bluestri:{sym:'Bl',iv:[0,3,6,7]},             // blue note cluster
  // 5. African — stacked minor thirds pentatonic
  afripen:{sym:'Afr',iv:[0,3,5,7,10]},          // minor pentatonic+
  // 6. Indian/Raga — Bhairav raga (1,♭2,3,4,5,♭6,7)
  bhairav:{sym:'Bhrv',iv:[0,1,4,5,7,8,11]},
  // 7. Hungarian minor (1,2,♭3,♯4,5,♭6,7)
  hungarian:{sym:'Hun',iv:[0,2,3,6,7,8,11]},
  // 8. Byzantine — double harmonic (1,♭2,3,4,5,♭6,7)
  byzantine:{sym:'Byz',iv:[0,1,4,5,7,8,11]},   // same as Bhairav — context differs
  // 9. Jewish/Klezmer — Freygish/Ahava Raba (1,2,♭3,♯4,5,♭6,♭7)
  freygish:{sym:'Klez',iv:[0,2,3,6,7,8,10]},
  // 10. Balinese — Pelog scale chord (1,♭2,♭3,5,♭6)
  pelog:{sym:'Pelg',iv:[0,1,3,7,8]},
  // 11. Celtic — Mixolydian sus (1,2,4,5,♭7)
  celtic:{sym:'Celt',iv:[0,2,5,7,10]},
  // 12. Persian — Shur scale (1,2,♭3,4,5,♭6,♭7)
  persian:{sym:'Pers',iv:[0,2,3,5,7,8,10]},
  // 13. Brazilian — dominant with added 6 and 9 (bossa voicing)
  bossa:{sym:'Bssa',iv:[0,4,7,9,10,2]},
};
const GROUPS={
  Triad:['major','minor','dim','aug'],Sus:['sus2','sus4'],
  '7th':['dom7','m7','maj7','mmaj7','dim7','m7b5'],
  Add:['add9','6','m6'],'9th':['m9','9','maj9','11','13'],Alt:['7b9','7s9'],
  World:['phrydom','hijaz','japanese','bluestri','afripen'],
  World2:['bhairav','hungarian','byzantine','freygish','pelog','celtic','persian','bossa'],
};

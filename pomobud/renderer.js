// renderer.js — PomoBuddy v2
// No ES module imports needed; runs as a plain script in Electron

// =========================================================
// STORAGE KEYS
// =========================================================
const TRACKER_KEY  = 'pomobuddy_tracker';
const SUBJECTS_KEY = 'pomobuddy_subjects';

// =========================================================
// SUBJECTS — shared between main dropdown + tracker filter
// =========================================================
function getSubjects() {
  try { return JSON.parse(localStorage.getItem(SUBJECTS_KEY)) || ['General']; }
  catch { return ['General']; }
}
function saveSubjects(arr) {
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(arr));
}

/** Repopulate both the main subject select and the tracker filter select */
function populateSubjectDropdowns() {
  const subjects = getSubjects();

  // --- Main (left-side) dropdown ---
  const mainSel = document.getElementById('mainSubjectSelect');
  if (mainSel) {
    const prev = mainSel.value;
    mainSel.innerHTML = '';
    subjects.forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      mainSel.appendChild(o);
    });
    mainSel.value = subjects.includes(prev) ? prev : subjects[0];
  }

  // --- Tracker filter dropdown ---
  const trackerSel = document.getElementById('subjectSelect');
  if (trackerSel) {
    const prev = trackerSel.value;
    trackerSel.innerHTML = '<option value="_all">All Subjects</option>';
    subjects.forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      trackerSel.appendChild(o);
    });
    trackerSel.value = subjects.includes(prev) ? prev : '_all';
  }
}

function getMainSubject() {
  const sel = document.getElementById('mainSubjectSelect');
  return (sel && sel.value) ? sel.value : 'General';
}


// =========================================================
// TIMER — Focus / Break with auto-switch
// =========================================================
let isRunning       = false;
let isBreak         = false;
let focusDuration   = 30 * 60;   // seconds
let breakDuration   = 5  * 60;
let timeLeft        = focusDuration;
let timerInterval   = null;
let sessionStart    = null;       // Date.now() when current focus session started

const display        = document.getElementById('timer-display');
const status         = document.getElementById('status');
const modeBadge      = document.getElementById('modeBadge');
const leftSide       = document.getElementById('leftSide');
const startBtn       = document.getElementById('startBtn');
const recordingRow   = document.getElementById('recordingRow');
const recordingLabel = document.getElementById('recordingLabel');

// Lottie cat animation
const catAnim = lottie.loadAnimation({
  container : document.getElementById('animation-container'),
  renderer  : 'svg',
  loop      : true,
  autoplay  : false,
  path      : 'animations/cat.json'
});

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Switch UI to focus or break mode without starting the timer */
function applyMode(breakMode) {
  isBreak  = breakMode;
  timeLeft = breakMode ? breakDuration : focusDuration;
  display.textContent = formatTime(timeLeft);

  if (breakMode) {
    modeBadge.textContent  = 'BREAK';
    modeBadge.className    = 'mode-badge break';
    leftSide.classList.add('break-mode');
    status.textContent     = 'Take a break — you earned it';
    startBtn.textContent   = 'Start Break';
  } else {
    modeBadge.textContent  = 'FOCUS';
    modeBadge.className    = 'mode-badge focus';
    leftSide.classList.remove('break-mode');
    status.textContent     = 'Select a subject, then start.';
    startBtn.textContent   = 'Start';
  }
}

/** Log elapsed focus seconds to localStorage under current subject */
function logStudyTime(seconds) {
  if (seconds < 5) return;
  const data    = getTrackerData();
  const key     = todayKey();
  const subject = getMainSubject();
  if (!data[key]) data[key] = {};
  if (!data[key][subject]) data[key][subject] = 0;
  data[key][subject] += seconds;
  saveTrackerData(data);
  refreshTrackerUI();
}

function showRecording(subject) {
  recordingLabel.textContent = `Recording — ${subject}`;
  recordingRow.style.display = 'flex';
}
function hideRecording() {
  recordingRow.style.display = 'none';
}

// Called when timer reaches zero — auto-switch and auto-start next phase
function onTimerComplete() {
  clearInterval(timerInterval);
  isRunning = false;
  catAnim.pause();

  if (!isBreak && sessionStart) {
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    logStudyTime(elapsed);
    sessionStart = null;
  }
  hideRecording();

  // Switch mode and auto-start the next phase
  applyMode(!isBreak);
  // Small delay so user sees the mode change before the timer starts
  setTimeout(() => startPhase(), 400);
}

function startPhase() {
  isRunning = true;
  catAnim.play();

  if (!isBreak) {
    sessionStart = Date.now();
    showRecording(getMainSubject());
    startBtn.textContent = 'Pause';
    status.textContent   = 'Studying — stay focused';
  } else {
    startBtn.textContent = 'Skip Break';
    status.textContent   = 'Break time — step away for a bit';
  }

  timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      onTimerComplete();
    } else {
      timeLeft--;
      display.textContent = formatTime(timeLeft);
    }
  }, 1000);
}

function toggleTimer() {
  if (isRunning) {
    // --- PAUSE ---
    clearInterval(timerInterval);
    isRunning = false;
    catAnim.pause();
    hideRecording();

    if (!isBreak && sessionStart) {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      logStudyTime(elapsed);
      sessionStart = null;
    }

    startBtn.textContent = isBreak ? 'Resume Break' : 'Resume';
    status.textContent   = isBreak ? 'Break paused'  : 'Paused — resume when ready';
  } else {
    // --- START / RESUME ---
    startPhase();
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  catAnim.pause();
  hideRecording();

  if (!isBreak && sessionStart) {
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    logStudyTime(elapsed);
    sessionStart = null;
  }

  applyMode(false);   // back to focus, resets timeLeft
}

// Expose for inline onclick handlers
window.toggleTimer = toggleTimer;
window.resetTimer  = resetTimer;

// Initialise display
display.textContent = formatTime(timeLeft);


// =========================================================
// TRACKER DATA
// =========================================================
function getTrackerData() {
  try { return JSON.parse(localStorage.getItem(TRACKER_KEY)) || {}; }
  catch { return {}; }
}
function saveTrackerData(data) {
  localStorage.setItem(TRACKER_KEY, JSON.stringify(data));
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDayHours(dateKey, subject) {
  const data = getTrackerData();
  if (!data[dateKey]) return 0;
  if (subject === '_all') return Object.values(data[dateKey]).reduce((s, v) => s + v, 0) / 3600;
  return (data[dateKey][subject] || 0) / 3600;
}

function formatHours(h) {
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  if (hrs === 0 && min === 0) return '0m';
  if (hrs === 0) return `${min}m`;
  if (min === 0) return `${hrs}h`;
  return `${hrs}h ${min}m`;
}

// Heat colour 0h → 8h+
function getHeatColor(hours) {
  const stops = [
    [0, '#e8e0f0'], [1, '#c8d8f5'], [2, '#a0c4f0'], [3, '#78ade8'],
    [4, '#5090d8'], [5, '#3070c0'], [6, '#1a50a0'], [7, '#0e3578'], [8, '#081e50'],
  ];
  const clamped = Math.min(hours, 8);
  const lo = Math.floor(clamped), hi = Math.min(lo + 1, 8), t = clamped - lo;
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  const c1 = hexRgb(stops[lo][1]), c2 = hexRgb(stops[hi][1]);
  return `rgb(${lerp(c1.r,c2.r)},${lerp(c1.g,c2.g)},${lerp(c1.b,c2.b)})`;
}
function hexRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r:parseInt(r[1],16), g:parseInt(r[2],16), b:parseInt(r[3],16) } : {r:0,g:0,b:0};
}
function textOnHeat(hours) { return hours >= 3 ? '#fff' : '#4a3f5c'; }


// =========================================================
// TRACKER UI
// =========================================================
function refreshTrackerUI() {
  const subject = (document.getElementById('subjectSelect') || {}).value || '_all';
  const today   = new Date();
  const tk      = todayKey();

  // Today total
  const todayH = getDayHours(tk, subject);
  const todayEl = document.getElementById('todayTime');
  if (todayEl) {
    todayEl.textContent = formatHours(todayH);
    todayEl.style.color = getHeatColor(Math.max(todayH, 0.5));
  }

  // --- Week grid ---
  const weekGrid  = document.getElementById('weekGrid');
  if (weekGrid) {
    weekGrid.innerHTML = '';
    const dayNames  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const currentDI = (today.getDay() + 6) % 7;

    for (let i = 0; i < 7; i++) {
      const d   = new Date(today);
      d.setDate(d.getDate() - currentDI + i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const hrs = getDayHours(key, subject);
      const col = getHeatColor(hrs);
      const txt = textOnHeat(hrs);

      const cell = document.createElement('div');
      cell.className = 'week-cell' + (i === currentDI ? ' today' : '');
      cell.style.background = col;
      cell.title = `${dayNames[i]}: ${formatHours(hrs)}`;
      cell.innerHTML = `<span class="week-day" style="color:${txt}">${dayNames[i]}</span>
                        <span class="week-hours" style="color:${txt}">${formatHours(hrs)}</span>`;
      weekGrid.appendChild(cell);
    }
  }

  // --- Month grid ---
  const monthGrid = document.getElementById('monthGrid');
  if (monthGrid) {
    monthGrid.innerHTML = '';
    const y = today.getFullYear(), m = today.getMonth();
    const first   = new Date(y, m, 1);
    const last    = new Date(y, m + 1, 0);
    const offset  = (first.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) {
      const e = document.createElement('div'); e.className = 'month-cell empty'; monthGrid.appendChild(e);
    }
    for (let day = 1; day <= last.getDate(); day++) {
      const key  = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const hrs  = getDayHours(key, subject);
      const col  = getHeatColor(hrs);
      const txt  = textOnHeat(hrs);
      const cell = document.createElement('div');
      cell.className = 'month-cell' + (day === today.getDate() ? ' today-cell' : '');
      cell.style.background = col; cell.style.color = txt;
      cell.title = `${day}: ${formatHours(hrs)}`;
      cell.textContent = day;
      monthGrid.appendChild(cell);
    }
  }

  // --- Subject bars ---
  const barsEl = document.getElementById('subjectBars');
  if (barsEl) {
    barsEl.innerHTML = '';
    const subjects = getSubjects();
    const data     = getTrackerData();
    const colors   = ['#78ade8','#e8a0bf','#a8d8c8','#f5c5a3','#c4b1e0','#e8a0a0','#a8c8e8','#ffe066'];

    const totals = {};
    let max = 0;
    subjects.forEach(s => {
      let tot = 0;
      Object.values(data).forEach(dd => { tot += (dd[s] || 0) / 3600; });
      totals[s] = tot;
      if (tot > max) max = tot;
    });

    subjects.forEach((s, i) => {
      const h   = totals[s];
      const pct = max > 0 ? (h / max) * 100 : 0;
      const row = document.createElement('div');
      row.className = 'subject-bar-row';
      row.innerHTML = `
        <span class="subject-bar-name">${s}</span>
        <div class="subject-bar-track">
          <div class="subject-bar-fill" style="width:${pct}%;background:${colors[i % colors.length]}"></div>
        </div>
        <span class="subject-bar-time">${formatHours(h)}</span>`;
      barsEl.appendChild(row);
    });
  }
}


// =========================================================
// TRACKER PANEL INIT
// =========================================================
function initTracker() {
  const overlay    = document.getElementById('trackerOverlay');
  const closeBtn   = document.getElementById('trackerClose');
  const addBtn     = document.getElementById('addSubjectBtn');
  const addForm    = document.getElementById('addSubjectForm');
  const confirmBtn = document.getElementById('confirmAddSubject');
  const trackerSel = document.getElementById('subjectSelect');

  document.getElementById('tracker-button').addEventListener('click', () => {
    overlay.classList.add('open');
    refreshTrackerUI();
  });
  closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });

  trackerSel.addEventListener('change', refreshTrackerUI);

  addBtn.addEventListener('click', () => {
    addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
    if (addForm.style.display === 'flex') document.getElementById('newSubjectInput').focus();
  });

  confirmBtn.addEventListener('click', () => {
    const input = document.getElementById('newSubjectInput');
    const name  = input.value.trim();
    if (name) {
      const subjects = getSubjects();
      if (!subjects.includes(name)) { subjects.push(name); saveSubjects(subjects); }
      populateSubjectDropdowns();
      // Select the new subject in both dropdowns
      const mainSel = document.getElementById('mainSubjectSelect');
      if (mainSel) mainSel.value = name;
      trackerSel.value = name;
      refreshTrackerUI();
      input.value = '';
      addForm.style.display = 'none';
    }
  });

  document.getElementById('newSubjectInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmBtn.click();
  });
}


// =========================================================
// AMBIENT SOUND MIXER
// =========================================================
let audioCtx = null;
const activeSounds = {};
let activeSoundCount = 0;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function createNoiseBuffer(type) {
  const ctx  = getAudioCtx();
  const size = ctx.sampleRate * 4;
  const buf  = ctx.createBuffer(2, size, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    switch (type) {
      case 'rain': {
        let b = 0;
        for (let i = 0; i < size; i++) {
          const w = Math.random() * 2 - 1; b = 0.97 * b + w * 0.06; d[i] = b;
          if (Math.random() < 0.0008) {
            const len = Math.floor(50 + Math.random() * 150);
            for (let j = 0; j < len && i+j < size; j++)
              d[i+j] += (Math.random()*2-1) * (1 - j/len) * 0.12;
          }
        }
        break;
      }
      case 'fire': {
        let f0 = 0, f1 = 0;
        for (let i = 0; i < size; i++) {
          const w = Math.random()*2-1; f0 = 0.993*f0+w*0.04; f1 = 0.85*f1+w*0.02;
          d[i] = (f0+f1)*1.8;
          if (Math.random() < 0.0003) d[i] += (Math.random()-0.5)*0.6;
        }
        break;
      }
      case 'cafe': {
        let c = 0;
        for (let i = 0; i < size; i++) {
          c = 0.96*c + (Math.random()*2-1)*0.05; d[i] = c;
          if (Math.random() < 0.001) {
            const len = Math.floor(200 + Math.random()*600), freq = 800 + Math.random()*1500;
            for (let j = 0; j < len && i+j < size; j++)
              d[i+j] += Math.sin(j/ctx.sampleRate*freq*Math.PI*2)*(1-j/len)*0.03;
          }
        }
        break;
      }
      case 'wind': {
        let ph = Math.random()*100;
        for (let i = 0; i < size; i++) {
          ph += 0.000015;
          const sw = Math.sin(ph*Math.PI*2)*0.5+0.5, sw2 = Math.sin(ph*0.37*Math.PI*2)*0.3+0.5;
          d[i] = (Math.random()*2-1)*0.1*(0.2+sw*sw2*0.8);
        }
        break;
      }
      case 'waves': {
        for (let i = 0; i < size; i++) {
          const t = i/ctx.sampleRate;
          d[i] = (Math.random()*2-1)*0.15*((Math.sin(t*0.12*Math.PI*2)*0.5+0.5)*0.6+(Math.sin(t*0.07*Math.PI*2)*0.3+0.5)*0.4);
        }
        break;
      }
      case 'birds': {
        for (let i = 0; i < size; i++) {
          d[i] = 0;
          if (Math.random() < 0.00025) {
            const len = Math.floor(300+Math.random()*1000), base = 1800+Math.random()*3500, wob = 200+Math.random()*800;
            for (let j = 0; j < len && i+j < size; j++) {
              const env = 1-j/len, freq = base+Math.sin(j/ctx.sampleRate*wob*Math.PI*2)*300;
              d[i+j] = Math.sin(j/ctx.sampleRate*freq*Math.PI*2)*env*0.08;
            }
          }
        }
        break;
      }
    }
  }
  return buf;
}

function toggleSound(type) {
  const ctx = getAudioCtx(); ctx.resume();
  if (activeSounds[type]) {
    const { source, gain } = activeSounds[type];
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    setTimeout(() => { try { source.stop(); } catch(e) {} delete activeSounds[type]; }, 600);
    activeSoundCount--;
  } else {
    const buf = createNoiseBuffer(type), source = ctx.createBufferSource();
    source.buffer = buf; source.loop = true;
    const gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = type === 'birds' ? 8000 : 1400;
    gain.gain.value = 0;
    source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    source.start(); gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.6);
    activeSounds[type] = { source, gain, filter }; activeSoundCount++;
  }
  updateSoundBadge();
}

function setSoundVolume(type, val) {
  if (activeSounds[type]) {
    const ctx = getAudioCtx();
    activeSounds[type].gain.gain.linearRampToValueAtTime(val/100, ctx.currentTime + 0.1);
  }
}

function updateSoundBadge() {
  const badge = document.getElementById('soundBadge');
  const btn   = document.getElementById('soundToggleBtn');
  badge.textContent = activeSoundCount;
  badge.classList.toggle('show', activeSoundCount > 0);
  btn.classList.toggle('active', activeSoundCount > 0);
}

function initSoundMixer() {
  const btn   = document.getElementById('soundToggleBtn');
  const panel = document.getElementById('soundPanel');
  btn.addEventListener('click', () => panel.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && !btn.contains(e.target)) panel.classList.remove('open');
  });
  document.querySelectorAll('.sound-item').forEach(item => {
    const type   = item.dataset.sound;
    const slider = item.querySelector('.sound-slider');
    item.addEventListener('click', e => {
      if (e.target === slider) return;
      toggleSound(type); item.classList.toggle('active');
    });
    slider.addEventListener('input',  e => { e.stopPropagation(); setSoundVolume(type, e.target.value); });
    slider.addEventListener('click',  e => e.stopPropagation());
  });
}


// =========================================================
// CUSTOM TIME MODAL
// =========================================================
function initCustomTime() {
  const btn    = document.getElementById('Custom');
  const modal  = document.getElementById('custom-time-modal');
  const save   = document.getElementById('save-time');
  const cancel = document.getElementById('cancel-time');

  btn.addEventListener('click', () => {
    document.getElementById('custom-time-input').value  = Math.floor(focusDuration / 60);
    document.getElementById('custom-break-input').value = Math.floor(breakDuration / 60);
    modal.style.display = 'block';
  });
  save.addEventListener('click', () => {
    const fm = parseInt(document.getElementById('custom-time-input').value);
    const bm = parseInt(document.getElementById('custom-break-input').value);
    if (!isNaN(fm) && fm > 0) focusDuration = fm * 60;
    if (!isNaN(bm) && bm > 0) breakDuration = bm * 60;
    if (!isRunning) applyMode(isBreak);  // reset display with new duration
    modal.style.display = 'none';
  });
  cancel.addEventListener('click', () => { modal.style.display = 'none'; });
}


// =========================================================
// PLANNER LINK
// =========================================================
document.getElementById('todo-button').addEventListener('click', () => {
  window.open('todo.html', '_blank');
});


// =========================================================
// BOOT
// =========================================================
window.addEventListener('DOMContentLoaded', () => {
  populateSubjectDropdowns();
  initTracker();
  initSoundMixer();
  initCustomTime();
  applyMode(false);  // start in focus mode
});
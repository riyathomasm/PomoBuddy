const path = require('path');
const { ipcRenderer } = require('electron');

import { renderHeader } from './components/header.js';

// ===== DOM READY =====
window.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  initSoundMixer();
  initTracker();
  
  const customButton = document.getElementById('Custom');
  if (customButton) {
    customButton.addEventListener('click', () => {
      const modal = document.getElementById('custom-time-modal');
      if (modal) {
        document.getElementById('custom-time-input').value = Math.floor(timeLeft / 60);
        modal.style.display = 'block';
      }
    });
  }
  
  const saveTimeBtn = document.getElementById('save-time');
  if (saveTimeBtn) {
    saveTimeBtn.addEventListener('click', () => {
      const minutes = parseInt(document.getElementById('custom-time-input').value);
      if (!isNaN(minutes) && minutes > 0) {
        timeLeft = minutes * 60;
        display.textContent = formatTime(timeLeft);
      }
      document.getElementById('custom-time-modal').style.display = 'none';
    });
  }
  
  const cancelTimeBtn = document.getElementById('cancel-time');
  if (cancelTimeBtn) {
    cancelTimeBtn.addEventListener('click', () => {
      document.getElementById('custom-time-modal').style.display = 'none';
    });
  }
});


// ========================================
// TIMER
// ========================================
let isRunning = false;
let isBreak = false;
let timeLeft = 30 * 60;
let timer;
let sessionStartTime = null; // Track when current session started

const display = document.getElementById('timer-display');
const status = document.getElementById('status');

const animationPath = 'animations/cat.json';
const animation = lottie.loadAnimation({
  container: document.getElementById('animation-container'),
  renderer: 'svg',
  loop: true,
  autoplay: false,
  path: animationPath
});

function startAnimation() { animation.play(); }
function stopAnimation() { animation.pause(); }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function toggleTimer() {
  if (isRunning) {
    clearInterval(timer);
    isRunning = false;
    stopAnimation();
    // Log the time studied so far
    if (sessionStartTime) {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      logStudyTime(elapsed);
      sessionStartTime = null;
    }
  } else {
    isRunning = true;
    startAnimation();
    sessionStartTime = Date.now();
    timer = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timer);
        isRunning = false;
        // Log final chunk
        if (sessionStartTime) {
          const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
          logStudyTime(elapsed);
          sessionStartTime = null;
        }
        isBreak = !isBreak;
        timeLeft = isBreak ? 5 * 60 : 30 * 60;
        status.textContent = isBreak ? 'Time to relax! 🧘‍♂️' : 'Stay focused! 💪';
        toggleTimer();
      } else {
        timeLeft--;
        display.textContent = formatTime(timeLeft);
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  stopAnimation();
  // Log any time from current session
  if (sessionStartTime) {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    logStudyTime(elapsed);
    sessionStartTime = null;
  }
  timeLeft = isBreak ? 5 * 60 : 30 * 60;
  display.textContent = formatTime(timeLeft);
}

window.toggleTimer = toggleTimer;
window.resetTimer = resetTimer;
display.textContent = formatTime(timeLeft);

const todoButton = document.querySelector('#todo-button');
todoButton.addEventListener('click', () => {
  window.open('todo.html', '_blank');
});


// ========================================
// STUDY TRACKER (Yeolpumta-style)
// ========================================
const TRACKER_KEY = 'pomobuddy_tracker';
const SUBJECTS_KEY = 'pomobuddy_subjects';

function getTrackerData() {
  try {
    return JSON.parse(localStorage.getItem(TRACKER_KEY)) || {};
  } catch { return {}; }
}

function saveTrackerData(data) {
  localStorage.setItem(TRACKER_KEY, JSON.stringify(data));
}

function getSubjects() {
  try {
    return JSON.parse(localStorage.getItem(SUBJECTS_KEY)) || ['General'];
  } catch { return ['General']; }
}

function saveSubjects(subjects) {
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
}

function getActiveSubject() {
  const sel = document.getElementById('subjectSelect');
  return sel ? sel.value : '_all';
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function logStudyTime(seconds) {
  if (seconds < 5) return; // Ignore tiny blips
  const data = getTrackerData();
  const key = todayKey();
  const subject = getActiveSubject() === '_all' ? 'General' : getActiveSubject();
  
  if (!data[key]) data[key] = {};
  if (!data[key][subject]) data[key][subject] = 0;
  data[key][subject] += seconds;
  
  saveTrackerData(data);
  refreshTrackerUI();
}

// Heat color based on hours (0-8+)
function getHeatColor(hours) {
  const stops = [
    [0, '#e8e0f0'],
    [1, '#c8d8f5'],
    [2, '#a0c4f0'],
    [3, '#78ade8'],
    [4, '#5090d8'],
    [5, '#3070c0'],
    [6, '#1a50a0'],
    [7, '#0e3578'],
    [8, '#081e50'],
  ];
  
  const clamped = Math.min(hours, 8);
  const lower = Math.floor(clamped);
  const upper = Math.min(lower + 1, 8);
  const t = clamped - lower;
  
  const c1 = hexToRgb(stops[lower][1]);
  const c2 = hexToRgb(stops[upper][1]);
  
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  
  return `rgb(${r},${g},${b})`;
}

function getTextColor(hours) {
  return hours >= 3 ? '#fff' : '#4a3f5c';
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function getDayHours(dateKey, subject) {
  const data = getTrackerData();
  if (!data[dateKey]) return 0;
  
  if (subject === '_all') {
    return Object.values(data[dateKey]).reduce((sum, s) => sum + s, 0) / 3600;
  }
  return (data[dateKey][subject] || 0) / 3600;
}

function formatHours(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function refreshTrackerUI() {
  const subject = getActiveSubject();
  const today = new Date();
  const tk = todayKey();
  
  // Today's total
  const todayHours = getDayHours(tk, subject);
  document.getElementById('todayTime').textContent = formatHours(todayHours);
  document.getElementById('todayTime').style.color = getHeatColor(Math.max(todayHours, 1));
  
  // Week grid
  const weekGrid = document.getElementById('weekGrid');
  weekGrid.innerHTML = '';
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentDay = (today.getDay() + 6) % 7; // Monday=0
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - currentDay + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const hours = getDayHours(key, subject);
    const color = getHeatColor(hours);
    const textCol = getTextColor(hours);
    
    const cell = document.createElement('div');
    cell.className = 'week-cell' + (i === currentDay ? ' today' : '');
    cell.style.background = color;
    cell.title = `${dayNames[i]}: ${formatHours(hours)}`;
    cell.innerHTML = `
      <span class="week-day" style="color:${textCol}">${dayNames[i]}</span>
      <span class="week-hours" style="color:${textCol}">${formatHours(hours)}</span>
    `;
    weekGrid.appendChild(cell);
  }
  
  // Month grid
  const monthGrid = document.getElementById('monthGrid');
  monthGrid.innerHTML = '';
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
  
  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'month-cell empty';
    monthGrid.appendChild(empty);
  }
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const hours = getDayHours(key, subject);
    const color = getHeatColor(hours);
    const textCol = getTextColor(hours);
    const isToday = day === today.getDate();
    
    const cell = document.createElement('div');
    cell.className = 'month-cell' + (isToday ? ' today-cell' : '');
    cell.style.background = color;
    cell.style.color = textCol;
    cell.title = `${day}: ${formatHours(hours)}`;
    cell.textContent = day;
    monthGrid.appendChild(cell);
  }
  
  // Subject bars
  const barsEl = document.getElementById('subjectBars');
  barsEl.innerHTML = '';
  const subjects = getSubjects();
  const data = getTrackerData();
  
  // Calculate total hours per subject (all time)
  const subjectTotals = {};
  let maxHours = 0;
  
  subjects.forEach(s => {
    let total = 0;
    Object.values(data).forEach(dayData => {
      total += (dayData[s] || 0) / 3600;
    });
    subjectTotals[s] = total;
    if (total > maxHours) maxHours = total;
  });
  
  const barColors = ['#78ade8', '#e8a0bf', '#a8d8c8', '#f5c5a3', '#c4b1e0', '#e8a0a0', '#a8c8e8', '#ffe066'];
  
  subjects.forEach((s, i) => {
    const hours = subjectTotals[s];
    const pct = maxHours > 0 ? (hours / maxHours) * 100 : 0;
    
    const row = document.createElement('div');
    row.className = 'subject-bar-row';
    row.innerHTML = `
      <span class="subject-bar-name">${s}</span>
      <div class="subject-bar-track">
        <div class="subject-bar-fill" style="width:${pct}%; background:${barColors[i % barColors.length]}"></div>
      </div>
      <span class="subject-bar-time">${formatHours(hours)}</span>
    `;
    barsEl.appendChild(row);
  });
}

function initTracker() {
  const trackerBtn = document.getElementById('tracker-button');
  const overlay = document.getElementById('trackerOverlay');
  const closeBtn = document.getElementById('trackerClose');
  const addBtn = document.getElementById('addSubjectBtn');
  const addForm = document.getElementById('addSubjectForm');
  const confirmBtn = document.getElementById('confirmAddSubject');
  const subjectSelect = document.getElementById('subjectSelect');
  
  // Open/close
  trackerBtn.addEventListener('click', () => {
    overlay.classList.add('open');
    refreshTrackerUI();
  });
  
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
  });
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
  
  // Populate subjects dropdown
  function populateSubjects() {
    const subjects = getSubjects();
    const current = subjectSelect.value;
    subjectSelect.innerHTML = '<option value="_all">All Subjects</option>';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      subjectSelect.appendChild(opt);
    });
    subjectSelect.value = current || '_all';
  }
  
  populateSubjects();
  
  subjectSelect.addEventListener('change', () => {
    refreshTrackerUI();
  });
  
  // Add subject
  addBtn.addEventListener('click', () => {
    addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
    if (addForm.style.display === 'flex') {
      document.getElementById('newSubjectInput').focus();
    }
  });
  
  confirmBtn.addEventListener('click', () => {
    const input = document.getElementById('newSubjectInput');
    const name = input.value.trim();
    if (name) {
      const subjects = getSubjects();
      if (!subjects.includes(name)) {
        subjects.push(name);
        saveSubjects(subjects);
        populateSubjects();
        subjectSelect.value = name;
        refreshTrackerUI();
      }
      input.value = '';
      addForm.style.display = 'none';
    }
  });
  
  document.getElementById('newSubjectInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
  });
}


// ========================================
// AMBIENT SOUND MIXER
// ========================================
let audioCtx = null;
const activeSounds = {};
let activeSoundCount = 0;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function createNoiseBuffer(type) {
  const ctx = getAudioContext();
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);

    switch (type) {
      case 'rain': {
        let b0 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.97 * b0 + white * 0.06;
          data[i] = b0;
          if (Math.random() < 0.0008) {
            const dropLen = Math.floor(50 + Math.random() * 150);
            for (let j = 0; j < dropLen && i + j < bufferSize; j++) {
              data[i + j] += (Math.random() * 2 - 1) * (1 - j / dropLen) * 0.12;
            }
          }
        }
        break;
      }
      case 'fire': {
        let f0 = 0, f1 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          f0 = 0.993 * f0 + white * 0.04;
          f1 = 0.85 * f1 + white * 0.02;
          data[i] = (f0 + f1) * 1.8;
          if (Math.random() < 0.0003) data[i] += (Math.random() - 0.5) * 0.6;
        }
        break;
      }
      case 'cafe': {
        let c0 = 0;
        for (let i = 0; i < bufferSize; i++) {
          c0 = 0.96 * c0 + (Math.random() * 2 - 1) * 0.05;
          data[i] = c0;
          if (Math.random() < 0.001) {
            const burstLen = Math.floor(200 + Math.random() * 600);
            const freq = 800 + Math.random() * 1500;
            for (let j = 0; j < burstLen && i + j < bufferSize; j++) {
              data[i + j] += Math.sin(j / ctx.sampleRate * freq * Math.PI * 2) * (1 - j / burstLen) * 0.03;
            }
          }
        }
        break;
      }
      case 'wind': {
        let phase = Math.random() * 100;
        for (let i = 0; i < bufferSize; i++) {
          phase += 0.000015;
          const swell = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
          const swell2 = Math.sin(phase * 0.37 * Math.PI * 2) * 0.3 + 0.5;
          data[i] = (Math.random() * 2 - 1) * 0.1 * (0.2 + swell * swell2 * 0.8);
        }
        break;
      }
      case 'waves': {
        for (let i = 0; i < bufferSize; i++) {
          const t = i / ctx.sampleRate;
          const wave1 = Math.sin(t * 0.12 * Math.PI * 2) * 0.5 + 0.5;
          const wave2 = Math.sin(t * 0.07 * Math.PI * 2) * 0.3 + 0.5;
          data[i] = (Math.random() * 2 - 1) * 0.15 * (wave1 * 0.6 + wave2 * 0.4);
        }
        break;
      }
      case 'birds': {
        for (let i = 0; i < bufferSize; i++) {
          data[i] = 0;
          if (Math.random() < 0.00025) {
            const chirpLen = Math.floor(300 + Math.random() * 1000);
            const baseFreq = 1800 + Math.random() * 3500;
            const wobble = 200 + Math.random() * 800;
            for (let j = 0; j < chirpLen && i + j < bufferSize; j++) {
              const env = (1 - j / chirpLen);
              const freq = baseFreq + Math.sin(j / ctx.sampleRate * wobble * Math.PI * 2) * 300;
              data[i + j] = Math.sin(j / ctx.sampleRate * freq * Math.PI * 2) * env * 0.08;
            }
          }
        }
        break;
      }
    }
  }
  return buffer;
}

function toggleSound(soundType) {
  const ctx = getAudioContext();
  ctx.resume();

  if (activeSounds[soundType]) {
    const { source, gain } = activeSounds[soundType];
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    setTimeout(() => {
      try { source.stop(); } catch(e) {}
      delete activeSounds[soundType];
    }, 600);
    activeSoundCount--;
  } else {
    const buffer = createNoiseBuffer(soundType);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = soundType === 'birds' ? 8000 : 1400;

    gainNode.gain.value = 0;
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.6);

    activeSounds[soundType] = { source, gain: gainNode, filter };
    activeSoundCount++;
  }
  updateBadge();
}

function setSoundVolume(soundType, value) {
  if (activeSounds[soundType]) {
    const ctx = getAudioContext();
    activeSounds[soundType].gain.gain.linearRampToValueAtTime(value / 100, ctx.currentTime + 0.1);
  }
}

function updateBadge() {
  const badge = document.getElementById('soundBadge');
  const btn = document.getElementById('soundToggleBtn');
  badge.textContent = activeSoundCount;
  if (activeSoundCount > 0) {
    badge.classList.add('show');
    btn.classList.add('active');
  } else {
    badge.classList.remove('show');
    btn.classList.remove('active');
  }
}

function initSoundMixer() {
  const toggleBtn = document.getElementById('soundToggleBtn');
  const panel = document.getElementById('soundPanel');

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  const soundItems = document.querySelectorAll('.sound-item');
  soundItems.forEach(item => {
    const soundType = item.dataset.sound;
    const slider = item.querySelector('.sound-slider');

    item.addEventListener('click', (e) => {
      if (e.target === slider) return;
      toggleSound(soundType);
      item.classList.toggle('active');
    });

    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      setSoundVolume(soundType, e.target.value);
    });

    slider.addEventListener('click', (e) => { e.stopPropagation(); });
  });
}
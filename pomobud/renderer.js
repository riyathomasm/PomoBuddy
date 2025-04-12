const path = require('path');

import { renderHeader } from './components/header.js';

window.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  
});

let isRunning = false;
let isBreak = false;
let timeLeft = 30 * 60;
let timer;

const display = document.getElementById('timer-display');
const status = document.getElementById('status');


const animationPath = 'animations/cat.json';

console.log('Loading animation from:', animationPath);



const animation = lottie.loadAnimation({
  container: document.getElementById('animation-container'),
  renderer: 'svg',
  loop: true,
  autoplay: false,
  path: animationPath
});

function startAnimation() {
  animation.play();
}

function stopAnimation() {
  animation.pause();
}

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
  } else {
    isRunning = true;
    startAnimation();
    timer = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timer);
        isRunning = false;
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
  timeLeft = isBreak ? 5 * 60 : 30 * 60;
  display.textContent = formatTime(timeLeft);
}

window.toggleTimer = toggleTimer;
window.resetTimer = resetTimer;
display.textContent = formatTime(timeLeft);


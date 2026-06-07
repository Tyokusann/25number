const board = document.querySelector("#board");
const timerDisplay = document.querySelector("#timer");
const nextNumberDisplay = document.querySelector("#nextNumber");
const bestTimeDisplay = document.querySelector("#bestTime");
const startOverlay = document.querySelector("#startOverlay");
const resultOverlay = document.querySelector("#resultOverlay");
const countdown = document.querySelector("#countdown");
const startButton = document.querySelector("#startButton");
const retryButton = document.querySelector("#retryButton");
const soundButton = document.querySelector("#soundButton");
const resetBestButton = document.querySelector("#resetBestButton");
const resultTime = document.querySelector("#resultTime");
const resultBest = document.querySelector("#resultBest");
const resultMessage = document.querySelector("#resultMessage");

const BEST_TIME_KEY = "number25-best-time";
let expectedNumber = 1;
let startedAt = 0;
let animationFrame = 0;
let isRunning = false;
let soundEnabled = true;
let audioContext;

function shuffledNumbers() {
  const numbers = Array.from({ length: 25 }, (_, index) => index + 1);

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [numbers[index], numbers[randomIndex]] = [numbers[randomIndex], numbers[index]];
  }

  return numbers;
}

function renderBoard() {
  board.replaceChildren();

  shuffledNumbers().forEach((number) => {
    const tile = document.createElement("button");
    tile.className = "number-tile";
    tile.type = "button";
    tile.textContent = number;
    tile.dataset.number = number;
    tile.setAttribute("aria-label", `${number}`);
    board.append(tile);
  });
}

function getBestTime() {
  try {
    return Number.parseFloat(localStorage.getItem(BEST_TIME_KEY)) || null;
  } catch {
    return null;
  }
}

function saveBestTime(time) {
  try {
    localStorage.setItem(BEST_TIME_KEY, time.toString());
  } catch {
    // Private browsing or storage restrictions should not stop the game.
  }
}

function updateBestDisplay() {
  const best = getBestTime();
  bestTimeDisplay.textContent = best ? best.toFixed(2) : "--.--";
}

function playTone(frequency, duration = 0.04, volume = 0.025) {
  if (!soundEnabled) return;

  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // Audio support varies by browser; gameplay remains unaffected.
  }
}

function formatElapsed(now = performance.now()) {
  return (now - startedAt) / 1000;
}

function updateTimer(now) {
  if (!isRunning) return;
  timerDisplay.textContent = formatElapsed(now).toFixed(2);
  animationFrame = requestAnimationFrame(updateTimer);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function runCountdown() {
  startOverlay.hidden = true;
  resultOverlay.hidden = true;
  board.classList.add("is-locked");
  renderBoard();
  expectedNumber = 1;
  nextNumberDisplay.textContent = "1";
  timerDisplay.textContent = "0.00";
  countdown.classList.add("is-visible");

  for (const value of ["3", "2", "1", "GO"]) {
    countdown.textContent = value;
    countdown.classList.remove("is-popping");
    void countdown.offsetWidth;
    countdown.classList.add("is-popping");
    playTone(value === "GO" ? 760 : 440, 0.08, 0.035);
    await wait(value === "GO" ? 520 : 620);
  }

  countdown.classList.remove("is-visible", "is-popping");
  board.classList.remove("is-locked");
  startedAt = performance.now();
  isRunning = true;
  animationFrame = requestAnimationFrame(updateTimer);
}

function finishGame() {
  isRunning = false;
  cancelAnimationFrame(animationFrame);
  const elapsed = formatElapsed();
  timerDisplay.textContent = elapsed.toFixed(2);
  nextNumberDisplay.textContent = "✓";
  board.classList.add("is-locked");

  const previousBest = getBestTime();
  const isNewBest = !previousBest || elapsed < previousBest;
  if (isNewBest) saveBestTime(elapsed);

  const best = getBestTime() || elapsed;
  updateBestDisplay();
  resultTime.innerHTML = `${elapsed.toFixed(2)}<span>秒</span>`;
  resultBest.textContent = `${best.toFixed(2)} 秒`;
  resultMessage.textContent = isNewBest ? "ベストタイム更新！" : "ナイスプレイ！";
  playTone(880, 0.12, 0.04);
  window.setTimeout(() => playTone(1175, 0.18, 0.035), 110);
  window.setTimeout(() => {
    resultOverlay.hidden = false;
  }, 350);
}

function handleTilePress(event) {
  const tile = event.target.closest(".number-tile");
  if (!tile || !isRunning) return;

  const number = Number(tile.dataset.number);
  if (number !== expectedNumber) {
    tile.classList.remove("is-wrong");
    void tile.offsetWidth;
    tile.classList.add("is-wrong");
    playTone(150, 0.08, 0.025);
    window.setTimeout(() => tile.classList.remove("is-wrong"), 240);
    return;
  }

  tile.classList.add("is-correct");
  playTone(480 + expectedNumber * 7);

  if (expectedNumber === 25) {
    finishGame();
    return;
  }

  expectedNumber += 1;
  nextNumberDisplay.textContent = expectedNumber;
}

function resetBestTime() {
  try {
    localStorage.removeItem(BEST_TIME_KEY);
  } catch {
    // Ignore unavailable storage.
  }
  updateBestDisplay();
}

board.addEventListener("click", handleTilePress);
startButton.addEventListener("click", runCountdown);
retryButton.addEventListener("click", runCountdown);
resetBestButton.addEventListener("click", resetBestTime);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.classList.toggle("is-muted", !soundEnabled);
  soundButton.setAttribute("aria-label", soundEnabled ? "効果音をオフにする" : "効果音をオンにする");
  if (soundEnabled) playTone(620, 0.06, 0.025);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && isRunning) {
    isRunning = false;
    cancelAnimationFrame(animationFrame);
    startOverlay.hidden = false;
    board.classList.add("is-locked");
  }
});

renderBoard();
updateBestDisplay();

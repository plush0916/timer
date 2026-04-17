const daysInput = document.querySelector("#days-input");
const hoursInput = document.querySelector("#hours-input");
const minutesInput = document.querySelector("#minutes-input");
const secondsInput = document.querySelector("#seconds-input");
const timeDisplay = document.querySelector("#time-display");
const statusLabel = document.querySelector("#status-label");
const startButton = document.querySelector("#start-btn");
const pauseButton = document.querySelector("#pause-btn");
const resetButton = document.querySelector("#reset-btn");
const soundTestButton = document.querySelector("#sound-test-btn");
const presetButtons = document.querySelectorAll(".preset-btn");
const ring = document.querySelector(".ring");

let timerId = null;
let totalSeconds = getInputSeconds();
let remainingSeconds = totalSeconds;
let audioContext = null;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

async function unlockAudio() {
  const context = getAudioContext();

  if (!context) {
    return null;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      console.error("Audio resume failed", error);
    }
  }

  return context;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatTime(value) {
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function getInputSeconds() {
  const days = Math.max(0, Number(daysInput?.value) || 0);
  const hours = Math.min(23, Math.max(0, Number(hoursInput?.value) || 0));
  const minutes = Math.min(59, Math.max(0, Number(minutesInput?.value) || 0));
  const seconds = Math.min(59, Math.max(0, Number(secondsInput?.value) || 0));
  return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
}

function syncInputs(total) {
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  daysInput.value = days;
  hoursInput.value = hours;
  minutesInput.value = minutes;
  secondsInput.value = seconds;
}

function updateUI() {
  timeDisplay.textContent = formatTime(remainingSeconds);
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  ring.style.setProperty("--progress", `${Math.max(0, progress)}`);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

async function playAlertSound() {
  const context = await unlockAudio();

  if (!context) {
    return;
  }

  const notes = [880, 988, 1318];
  const startAt = context.currentTime + 0.02;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + (index * 0.28);
    const noteEnd = noteStart + 0.22;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.24, noteStart + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);
  });
}

async function startTimer() {
  if (!remainingSeconds) {
    totalSeconds = getInputSeconds();
    remainingSeconds = totalSeconds;
  }

  if (!remainingSeconds) {
    statusLabel.textContent = "\u8acb\u5148\u8f38\u5165\u6642\u9593";
    return;
  }

  await unlockAudio();
  statusLabel.textContent = "\u5012\u6578\u4e2d";
  stopTimer();

  timerId = setInterval(() => {
    remainingSeconds -= 1;
    updateUI();

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateUI();
      stopTimer();
      statusLabel.textContent = "\u6642\u9593\u5230";
      playAlertSound();
    }
  }, 1000);
}

function pauseTimer() {
  if (timerId) {
    stopTimer();
    statusLabel.textContent = "\u5df2\u66ab\u505c";
  }
}

function resetTimer() {
  stopTimer();
  totalSeconds = getInputSeconds();
  remainingSeconds = totalSeconds;
  statusLabel.textContent = "\u6e96\u5099\u958b\u59cb";
  updateUI();
}

function applyPreset(button) {
  const days = Number(button.dataset.days || "0");
  const hours = Number(button.dataset.hours || "0");
  const minutes = Number(button.dataset.minutes || "0");
  const seconds = Number(button.dataset.seconds || "0");

  daysInput.value = days;
  hoursInput.value = hours;
  minutesInput.value = minutes;
  secondsInput.value = seconds;

  totalSeconds = getInputSeconds();
  remainingSeconds = totalSeconds;
  stopTimer();
  statusLabel.textContent = "\u5df2\u5957\u7528\u9810\u8a2d";
  updateUI();
}

startButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", pauseTimer);
resetButton.addEventListener("click", resetTimer);
soundTestButton.addEventListener("click", async () => {
  await playAlertSound();
  statusLabel.textContent = "\u5df2\u64ad\u653e\u6e2c\u8a66\u63d0\u793a\u97f3";
});

[daysInput, hoursInput, minutesInput, secondsInput].forEach((input) => {
  input.addEventListener("input", resetTimer);
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => applyPreset(button));
});

syncInputs(totalSeconds);
updateUI();

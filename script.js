const daysInput = document.querySelector("#days-input");
const hoursInput = document.querySelector("#hours-input");
const minutesInput = document.querySelector("#minutes-input");
const secondsInput = document.querySelector("#seconds-input");
const daysDisplay = document.querySelector("#days-display");
const hoursDisplay = document.querySelector("#hours-display");
const minutesDisplay = document.querySelector("#minutes-display");
const secondsDisplay = document.querySelector("#seconds-display");
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
let alertAudio = null;
let hasUnlockedAudio = false;

function createAlertToneUrl() {
  const sampleRate = 44100;
  const duration = 1.4;
  const frameCount = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + (frameCount * 2));
  const view = new DataView(buffer);
  const notes = [
    { start: 0.0, end: 0.24, frequency: 880 },
    { start: 0.34, end: 0.58, frequency: 988 },
    { start: 0.68, end: 1.08, frequency: 1318 }
  ];

  function writeString(offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + (frameCount * 2), true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, frameCount * 2, true);

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / sampleRate;
    let sample = 0;

    notes.forEach((note) => {
      if (time < note.start || time > note.end) {
        return;
      }

      const fadeIn = Math.min(1, (time - note.start) / 0.02);
      const fadeOut = Math.min(1, (note.end - time) / 0.04);
      const envelope = Math.min(fadeIn, fadeOut);
      sample += Math.sin(2 * Math.PI * note.frequency * time) * envelope * 0.32;
    });

    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + (index * 2), clamped * 32767, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function getAlertAudio() {
  if (!alertAudio) {
    alertAudio = new Audio(createAlertToneUrl());
    alertAudio.preload = "auto";
    alertAudio.playsInline = true;
    alertAudio.crossOrigin = "anonymous";
  }

  return alertAudio;
}

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
  const media = getAlertAudio();

  if (context && context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      console.error("Audio resume failed", error);
    }
  }

  if (!hasUnlockedAudio) {
    try {
      media.muted = true;
      media.currentTime = 0;
      await media.play();
      media.pause();
      media.currentTime = 0;
      media.muted = false;
      hasUnlockedAudio = true;
    } catch (error) {
      media.muted = false;
      console.error("Media element unlock failed", error);
    }
  }

  return context;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getTimeParts(value) {
  return {
    days: Math.floor(value / 86400),
    hours: Math.floor((value % 86400) / 3600),
    minutes: Math.floor((value % 3600) / 60),
    seconds: value % 60
  };
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
  const parts = getTimeParts(remainingSeconds);
  daysDisplay.textContent = pad(parts.days);
  hoursDisplay.textContent = pad(parts.hours);
  minutesDisplay.textContent = pad(parts.minutes);
  secondsDisplay.textContent = pad(parts.seconds);
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  ring.style.setProperty("--progress", `${Math.max(0, progress)}`);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

async function playAlertSound() {
  const context = await unlockAudio();
  const media = getAlertAudio();
  let played = false;

  try {
    media.pause();
    media.currentTime = 0;
    media.muted = false;
    await media.play();
    played = true;
  } catch (error) {
    console.error("Media element playback failed", error);
  }

  if (!played && context) {
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
    played = true;
  }

  if (navigator.vibrate) {
    navigator.vibrate([180, 120, 180]);
  }

  return played;
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
  const played = await playAlertSound();
  statusLabel.textContent = played
    ? "\u5df2\u64ad\u653e\u6e2c\u8a66\u63d0\u793a\u97f3"
    : "\u700f\u89bd\u5668\u5c01\u9396\u4e86\u8072\u97f3\u64ad\u653e";
});

[daysInput, hoursInput, minutesInput, secondsInput].forEach((input) => {
  input.addEventListener("input", resetTimer);
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => applyPreset(button));
});

syncInputs(totalSeconds);
updateUI();

const minutesInput = document.querySelector("#minutes-input");
const secondsInput = document.querySelector("#seconds-input");
const timeDisplay = document.querySelector("#time-display");
const statusLabel = document.querySelector("#status-label");
const startButton = document.querySelector("#start-btn");
const pauseButton = document.querySelector("#pause-btn");
const resetButton = document.querySelector("#reset-btn");
const presetButtons = document.querySelectorAll(".preset-btn");
const ring = document.querySelector(".ring");

let timerId = null;
let totalSeconds = 25 * 60;
let remainingSeconds = totalSeconds;
let isPaused = true;

function formatTime(value) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getInputSeconds() {
  const minutes = Math.max(0, Number(minutesInput.value) || 0);
  const seconds = Math.min(59, Math.max(0, Number(secondsInput.value) || 0));
  return minutes * 60 + seconds;
}

function syncInputs(seconds) {
  minutesInput.value = Math.floor(seconds / 60);
  secondsInput.value = seconds % 60;
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

function startTimer() {
  if (!remainingSeconds) {
    totalSeconds = getInputSeconds();
    remainingSeconds = totalSeconds;
  }

  if (!remainingSeconds) {
    statusLabel.textContent = "請先輸入時間";
    return;
  }

  isPaused = false;
  statusLabel.textContent = "倒數中";
  stopTimer();

  timerId = setInterval(() => {
    remainingSeconds -= 1;
    updateUI();

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateUI();
      stopTimer();
      isPaused = true;
      statusLabel.textContent = "時間到";
    }
  }, 1000);
}

function pauseTimer() {
  if (timerId) {
    stopTimer();
    isPaused = true;
    statusLabel.textContent = "已暫停";
  }
}

function resetTimer() {
  stopTimer();
  totalSeconds = getInputSeconds();
  remainingSeconds = totalSeconds;
  isPaused = true;
  statusLabel.textContent = "準備開始";
  updateUI();
}

startButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", pauseTimer);
resetButton.addEventListener("click", resetTimer);

minutesInput.addEventListener("input", resetTimer);
secondsInput.addEventListener("input", resetTimer);

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const presetMinutes = Number(button.dataset.minutes || "0");
    totalSeconds = presetMinutes * 60;
    remainingSeconds = totalSeconds;
    syncInputs(totalSeconds);
    stopTimer();
    isPaused = true;
    statusLabel.textContent = "已套用預設";
    updateUI();
  });
});

updateUI();

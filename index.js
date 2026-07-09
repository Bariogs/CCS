// index.js

import { db } from "./firebase.js";
import {
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const countdownPopup = document.getElementById("countdownPopup");
const countdownTimer = document.getElementById("countdownTimer");
const closedMessage = document.getElementById("closedMessage");
const loginBtn = document.getElementById("loginBtn");

let startDate = null;
let endDate = null;
let tickIntervalId = null;

const scheduleDocRef = doc(db, "settings", "attendanceWindow");

onSnapshot(scheduleDocRef, (snap) => {
  if (!snap.exists()) {
    startDate = null;
    endDate = null;
  } else {
    const data = snap.data();
    startDate = data.start?.toDate ? data.start.toDate() : null;
    endDate = data.end?.toDate ? data.end.toDate() : null;
  }

  // Restart the ticking loop whenever the schedule changes
  if (tickIntervalId) clearInterval(tickIntervalId);
  tick();
  tickIntervalId = setInterval(tick, 1000);
});

function tick() {
  if (!startDate || !endDate) {
    // No schedule set yet
    countdownPopup.style.display = "none";
    closedMessage.style.display = "none";
    loginBtn.style.display = "none";
    return;
  }

  const now = new Date();

  if (now < startDate) {
    // Before the window: show countdown, hide the button
    countdownPopup.style.display = "block";
    closedMessage.style.display = "none";
    loginBtn.style.display = "none";
    countdownTimer.textContent = formatCountdown(startDate - now);
  } else if (now >= startDate && now < endDate) {
    // Inside the window: show the button
    countdownPopup.style.display = "none";
    closedMessage.style.display = "none";
    loginBtn.style.display = "inline-block";
  } else {
    // After the window: hide the button
    countdownPopup.style.display = "none";
    closedMessage.style.display = "block";
    loginBtn.style.display = "none";
  }
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`, `${minutes}m`, `${seconds}s`);
  return parts.join(" ");
}
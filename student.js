// student.js

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// --- Guard: must have logged in as a student first ---
const role = sessionStorage.getItem("role");
const schoolId = sessionStorage.getItem("schoolId");
const name = sessionStorage.getItem("name");

if (role !== "student" || !schoolId || !name) {
  window.location.href = "login.html";
}

document.getElementById("welcomeText").textContent = `${name} (${schoolId})`;

// --- Elements ---
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const selfiePreview = document.getElementById("selfiePreview");
const captureBtn = document.getElementById("captureBtn");
const retakeBtn = document.getElementById("retakeBtn");

const locationBtn = document.getElementById("locationBtn");
const locationStatus = document.getElementById("locationStatus");

const submitBtn = document.getElementById("submitBtn");
const submitStatus = document.getElementById("submitStatus");

const qrSection = document.getElementById("qrSection");
const qrCanvas = document.getElementById("qrCanvas");

const cameraSection = document.getElementById("cameraSection");
const locationSection = document.getElementById("locationSection");
const submitSection = document.getElementById("submitSection");

const countdownPopup = document.getElementById("countdownPopup");
const countdownTimer = document.getElementById("countdownTimer");
const closedMessage = document.getElementById("closedMessage");

let selfieDataUrl = null;
let coords = null; // { latitude, longitude }
let address = null;

let cameraStarted = false;
let startDate = null;
let endDate = null;
let tickIntervalId = null;
let windowIsOpen = false;

// --- Schedule check (moved from index.js) ---
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

  if (tickIntervalId) clearInterval(tickIntervalId);
  tick();
  tickIntervalId = setInterval(tick, 1000);
});

function tick() {
  if (!startDate || !endDate) {
    // No schedule set yet — keep form hidden
    setFormVisible(false);
    countdownPopup.style.display = "none";
    closedMessage.style.display = "none";
    return;
  }

  const now = new Date();

  if (now < startDate) {
    // Before the window: show countdown, hide the form
    setFormVisible(false);
    countdownPopup.style.display = "block";
    closedMessage.style.display = "none";
    countdownTimer.textContent = formatCountdown(startDate - now);
  } else if (now >= startDate && now < endDate) {
    // Inside the window: show the form
    countdownPopup.style.display = "none";
    closedMessage.style.display = "none";
    setFormVisible(true);
  } else {
    // After the window: hide the form
    setFormVisible(false);
    countdownPopup.style.display = "none";
    closedMessage.style.display = "block";
  }
}

function setFormVisible(isOpen) {
  windowIsOpen = isOpen;
  cameraSection.style.display = isOpen ? "block" : "none";
  locationSection.style.display = isOpen ? "block" : "none";
  submitSection.style.display = isOpen ? "block" : "none";

  // Only request camera permission once the window actually opens
  if (isOpen && !cameraStarted) {
    cameraStarted = true;
    startCamera();
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

// --- Camera setup ---
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    submitStatus.textContent =
      "Could not access camera. Please allow camera permission and reload.";
  }
}

captureBtn.addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Compress to keep the Firestore document small (1MB doc limit)
  selfieDataUrl = canvas.toDataURL("image/jpeg", 0.6);

  selfiePreview.src = selfieDataUrl;
  selfiePreview.style.display = "block";
  video.style.display = "none";
  captureBtn.style.display = "none";
  retakeBtn.style.display = "inline-block";

  checkReadyToSubmit();
});

retakeBtn.addEventListener("click", () => {
  selfieDataUrl = null;
  selfiePreview.style.display = "none";
  video.style.display = "block";
  captureBtn.style.display = "inline-block";
  retakeBtn.style.display = "none";
  checkReadyToSubmit();
});

// --- Geolocation ---
locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = "Geolocation is not supported on this device.";
    return;
  }

  locationStatus.textContent = "Requesting location...";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      locationStatus.textContent = `Location captured (${coords.latitude.toFixed(
        5
      )}, ${coords.longitude.toFixed(5)}). Looking up address...`;

      address = await reverseGeocode(coords.latitude, coords.longitude);
      locationStatus.textContent = `Location captured: ${address}`;

      checkReadyToSubmit();
    },
    (err) => {
      locationStatus.textContent =
        "Location permission denied. Please enable location to submit attendance.";
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
});

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await res.json();
    return data.display_name || `Lat: ${lat.toFixed(5)}, Long: ${lon.toFixed(5)}`;
  } catch (err) {
    return `Lat: ${lat.toFixed(5)}, Long: ${lon.toFixed(5)}`;
  }
}

// --- Enable submit only once both selfie and location are ready ---
function checkReadyToSubmit() {
  submitBtn.disabled = !(selfieDataUrl && coords && address);
}

// --- Submit attendance ---
submitBtn.addEventListener("click", async () => {
  // Extra safety check in case the window closed while the form was open
  if (!windowIsOpen) {
    submitStatus.textContent = "Attendance window is closed.";
    return;
  }

  submitBtn.disabled = true;
  submitStatus.textContent = "Submitting...";

  try {
    await addDoc(collection(db, "attendance"), {
      schoolId,
      name,
      photo: selfieDataUrl,
      latitude: coords.latitude,
      longitude: coords.longitude,
      address,
      status: "pending", // pending -> shows under Admin's QR Code tab
      createdAt: serverTimestamp()
    });

    submitStatus.textContent = "Attendance submitted successfully!";
    await showQrCode();

    cameraSection.style.display = "none";
    locationSection.style.display = "none";
    submitSection.style.display = "none";
    qrSection.style.display = "block";
  } catch (err) {
    submitStatus.textContent = "Something went wrong. Please try again.";
    submitBtn.disabled = false;
  }
});

// QR code contains ONLY personal info + address, never the photo
async function showQrCode() {
  const qrPayload = JSON.stringify({
    schoolId,
    name,
    address
  });
  await QRCode.toCanvas(qrCanvas, qrPayload, { width: 240 });
}
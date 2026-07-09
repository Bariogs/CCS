// admin.js

import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { STUDENTS } from "./students-data.js";

// --- Guard: must have logged in as admin first ---
// NOTE: this is a client-side check only (sessionStorage), so it stops casual
// navigation but is not real access control. Firestore Security Rules should
// also be configured on the Firebase project so only trusted requests can
// read/write the "attendance" collection.
if (sessionStorage.getItem("role") !== "admin") {
  window.location.href = "login.html";
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "login.html";
});

// --- Registered Students (read-only, hardcoded in students-data.js) ---
const registeredList = document.getElementById("registeredList");
registeredList.innerHTML = "";
STUDENTS.forEach((s) => {
  const li = document.createElement("li");
  li.textContent = `${s.name} — ${s.email} — ${s.schoolId}`;
  registeredList.appendChild(li);
});

// --- Attendance schedule (controls the Log In button on index.html) ---
const scheduleStartInput = document.getElementById("scheduleStart");
const scheduleEndInput = document.getElementById("scheduleEnd");
const scheduleStatus = document.getElementById("scheduleStatus");
const scheduleDocRef = doc(db, "settings", "attendanceWindow");

// Show whatever schedule is already saved, if any
(async () => {
  const snap = await getDoc(scheduleDocRef);
  if (snap.exists()) {
    const data = snap.data();
    if (data.start && data.end) {
      scheduleStatus.textContent = `Current schedule: ${data.start
        .toDate()
        .toLocaleString()} until ${data.end.toDate().toLocaleString()}`;
    }
  }
})();

document.getElementById("saveScheduleBtn").addEventListener("click", async () => {
  const startVal = scheduleStartInput.value;
  const endVal = scheduleEndInput.value;

  if (!startVal || !endVal) {
    scheduleStatus.textContent = "Please set both a start and an end date/time.";
    return;
  }

  const start = new Date(startVal);
  const end = new Date(endVal);

  if (end <= start) {
    scheduleStatus.textContent = "End time must be after the start time.";
    return;
  }

  await setDoc(scheduleDocRef, {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end)
  });

  scheduleStatus.textContent = `Saved! Attendance is open from ${start.toLocaleString()} until ${end.toLocaleString()}.`;
});

// --- Tab switching ---
const qrTab = document.getElementById("qrTab");
const transferTab = document.getElementById("transferTab");
document.getElementById("qrTabBtn").addEventListener("click", () => {
  qrTab.style.display = "block";
  transferTab.style.display = "none";
});
document.getElementById("transferTabBtn").addEventListener("click", () => {
  qrTab.style.display = "none";
  transferTab.style.display = "block";
});

// --- Local cache of all attendance records, kept in sync via onSnapshot ---
let records = []; // [{ id, schoolId, name, address, latitude, longitude, status, createdAt }]

const liveFeedList = document.getElementById("liveFeedList");
const qrList = document.getElementById("qrList");
const transferTableBody = document.getElementById("transferTableBody");

const attendanceQuery = query(collection(db, "attendance"), orderBy("createdAt", "desc"));

onSnapshot(attendanceQuery, (snapshot) => {
  records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderLiveFeed();
  renderQrList();
  renderTransferTable();
});

// --- Live feed: every submission, as it happens ---
function renderLiveFeed() {
  liveFeedList.innerHTML = "";
  records.forEach((r) => {
    const li = document.createElement("li");
    const time = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : "";
    li.textContent = `${r.name} (${r.schoolId}) ${time}`;
    liveFeedList.appendChild(li);
  });
}

// --- QR Code tab: pending records only ---
async function renderQrList() {
  qrList.innerHTML = "";
  const pending = records.filter((r) => r.status === "pending");

  for (const r of pending) {
    const card = document.createElement("div");
    card.className = "qr-card";

    const canvas = document.createElement("canvas");
    // QR payload is personal info + address only, never the photo
    const qrPayload = JSON.stringify({
      schoolId: r.schoolId,
      name: r.name,
      address: r.address
    });
    await QRCode.toCanvas(canvas, qrPayload, { width: 160 });

    const details = document.createElement("div");
    details.style.display = "none";

    const detailsText = document.createElement("p");
    detailsText.textContent = `${r.name} (${r.schoolId}) — ${r.address}`;
    details.appendChild(detailsText);

    if (r.photo) {
      const photoImg = document.createElement("img");
      photoImg.src = r.photo;
      photoImg.alt = `Selfie of ${r.name}`;
      photoImg.width = 160;
      details.appendChild(photoImg);
    }

    canvas.addEventListener("click", () => {
      details.style.display = details.style.display === "none" ? "block" : "none";
    });

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.textContent = "Reject";
    rejectBtn.addEventListener("click", async () => {
      await deleteDoc(doc(db, "attendance", r.id));
    });

    card.appendChild(canvas);
    card.appendChild(details);
    card.appendChild(rejectBtn);
    qrList.appendChild(card);
  }
}

// "Accept All" moves every pending record over to the Transfer tab
document.getElementById("acceptAllBtn").addEventListener("click", async () => {
  const pending = records.filter((r) => r.status === "pending");
  await Promise.all(
    pending.map((r) => updateDoc(doc(db, "attendance", r.id), { status: "accepted" }))
  );
});

// --- Transfer tab: accepted records only ---
function renderTransferTable() {
  transferTableBody.innerHTML = "";
  const accepted = records.filter((r) => r.status === "accepted");

  accepted.forEach((r) => {
    const tr = document.createElement("tr");
    const time = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : "";
    tr.innerHTML = `
      <td>${r.schoolId}</td>
      <td>${r.name}</td>
      <td>${r.address}</td>
      <td>${time}</td>
    `;
    transferTableBody.appendChild(tr);
  });
}

// --- Download Excel ---
document.getElementById("downloadExcelBtn").addEventListener("click", () => {
  const accepted = records.filter((r) => r.status === "accepted");

  const rows = accepted.map((r) => ({
    "School ID": r.schoolId,
    Name: r.name,
    Address: r.address,
    "Date/Time": r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
  XLSX.writeFile(workbook, "ccs-attendance.xlsx");
});
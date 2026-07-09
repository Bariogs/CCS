// login.js
//
// IMPORTANT SECURITY NOTE:
// This is a frontend-only app with no backend/server to keep secrets on.
// Anything shipped in JavaScript that reaches the browser CAN be read by
// anyone who opens DevTools, no matter how it is hidden. What this file
// does instead is avoid storing the admin username/password as plain
// text: it only stores a SHA-256 hash of "username:password" (see
// ADMIN_HASH below) and compares hashes. That stops someone from simply
// reading the admin credentials off the page, but it is NOT real
// authentication/security. For real protection, move the admin check to
// Firebase Authentication + Firestore Security Rules instead of a
// client-side hash comparison.
//
// Student accounts (Email = username, School ID = password) are hardcoded
// directly in students-data.js — edit that file to add or remove students.
// Since it's a plain list of school IDs/emails (not a secret like the admin
// password), it doesn't need hashing, but anyone who opens the JS files can
// still read that list, same caveat as above.

import { STUDENTS } from "./students-data.js";

// SHA-256("ccsdepevosanser1willbedone meafteryou:ITmeperodlimetigayoogwashingmachinTVunsapadiha")
const ADMIN_HASH = "b133a29dec73db227d4f19405f5f92332418559dfdb8074ecde4aabafd3da78a";

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const form = document.getElementById("loginForm");
const errorEl = document.getElementById("loginError");
const submitBtn = form.querySelector("button[type='submit']");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  submitBtn.disabled = true;

  const email = document.getElementById("email").value.trim();
  const schoolId = document.getElementById("password").value.trim();

  try {
    const attemptHash = await sha256(`${email}:${schoolId}`);

    if (attemptHash === ADMIN_HASH) {
      sessionStorage.setItem("role", "admin");
      window.location.href = "admin.html";
      return;
    }

    const student = STUDENTS.find(
      (s) => s.email.toLowerCase() === email.toLowerCase() && s.schoolId === schoolId
    );

    if (student) {
      sessionStorage.setItem("role", "student");
      sessionStorage.setItem("schoolId", student.schoolId);
      sessionStorage.setItem("name", student.name);
      sessionStorage.setItem("email", student.email);
      window.location.href = "student.html";
      return;
    }

    errorEl.textContent = "Invalid Email or School ID. Please try again.";
  } catch (err) {
    errorEl.textContent = "Something went wrong. Please try again.";
  } finally {
    submitBtn.disabled = false;
  }
});
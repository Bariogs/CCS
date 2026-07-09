// index.js
// This page just shows the login options.
// The attendance-window/countdown check now lives in student.js,
// so both buttons are always visible here.

const loginBtn = document.getElementById("loginBtn");
const adminLoginBtn = document.getElementById("adminLoginBtn");

// Student login — goes to the normal login page
loginBtn.style.display = "inline-block";
loginBtn.addEventListener("click", () => {
  window.location.href = "login.html";
});

// Admin login — goes to the same login page,
// but tags the intent so login.html knows to show the admin form
// (adjust this if your login.html already handles role selection differently)
adminLoginBtn.style.display = "inline-block";
adminLoginBtn.addEventListener("click", () => {
  window.location.href = "login.html?role=admin";
});

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
}

const openDonate = document.getElementById("openDonate");
const closeDonate = document.getElementById("closeDonate");
const donationModal = document.getElementById("donationModal");

if (openDonate && donationModal) {
  openDonate.addEventListener("click", () => {
    donationModal.style.display = "flex";
  });
}

if (closeDonate && donationModal) {
  closeDonate.addEventListener("click", () => {
    donationModal.style.display = "none";
  });
}

if (donationModal) {
  window.addEventListener("click", (e) => {
    if (e.target === donationModal) {
      donationModal.style.display = "none";
    }
  });
}

const donationForm = document.getElementById("donationForm");

if (donationForm && donationModal) {
  donationForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Thank You For Your Donation ❤️");
    donationModal.style.display = "none";
    donationForm.reset();
  });
}

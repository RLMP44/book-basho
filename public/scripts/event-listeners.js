import { searchFunction, sendPostRequest } from './functions.js';

const usernameEditTrigger = document.querySelector(".username-edit-trigger");
const usernameEditField = document.querySelector(".username-edit-toggle");
const bioEditTrigger = document.querySelector(".bio-edit-trigger");
const bioEditField = document.querySelector(".bio-edit-toggle");
const nameEditForm = document.getElementById("name-edit-form");
const bioEditForm = document.getElementById("bio-edit-form");
const privateCheckboxes = document.querySelectorAll('input[name="private"]');
const searchButton = document.getElementById("search-button");

// ---------- Buttons ----------
searchButton.addEventListener('click', searchFunction);


// ---------- Triggers ----------
// display edit form and hide edit button
usernameEditTrigger.addEventListener("click", () => {
  usernameEditTrigger.classList.add("hidden");
  usernameEditField.classList.remove("hidden");
});

bioEditTrigger.addEventListener("click", () => {
  bioEditTrigger.classList.add("hidden");
  bioEditField.classList.remove("hidden");
});


// ---------- Forms ----------
// hide form and submit contents on enter, also update UI
nameEditForm.addEventListener('keydown', function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendPostRequest(this);
    usernameEditTrigger.classList.remove("hidden");
    usernameEditField.classList.add("hidden");
  }
});

bioEditForm.addEventListener('keydown', function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendPostRequest(this);
    bioEditTrigger.classList.remove("hidden");
    bioEditField.classList.add("hidden");
  }
});


// ---------- Checkboxes ----------
privateCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", function (event) {
    const editForm = this.parentNode.parentNode;
    sendPostRequest(editForm);
  })
});

import { formatNameForDisplay } from './client-helpers.js';

const usernameEditTrigger = document.querySelector(".username-edit-trigger");
const usernameEditField = document.querySelector(".username-edit-toggle");
const usernameText = document.getElementById("username-text");
const bioEditTrigger = document.querySelector(".bio-edit-trigger");
const bioEditField = document.querySelector(".bio-edit-toggle");
const bioText = document.getElementById("bio-text");
const nameEditForm = document.getElementById("name-edit-form");
const bioEditForm = document.getElementById("bio-edit-form");
const privateEditForms = document.querySelectorAll(".private-edit-form");

// display username edit form and hide edit button
usernameEditTrigger.addEventListener("click", () => {
  usernameEditTrigger.classList.add("hidden");
  usernameEditField.classList.remove("hidden");
});

// hide form and submit contents on enter, also update UI
nameEditForm.addEventListener('keydown', function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendPostRequest(this);
    usernameEditTrigger.classList.remove("hidden");
    usernameEditField.classList.add("hidden");
  }
});

// display bio edit form and hide edit button
bioEditTrigger.addEventListener("click", () => {
  bioEditTrigger.classList.add("hidden");
  bioEditField.classList.remove("hidden");
});

// hide form and submit contents on enter, also update UI
bioEditForm.addEventListener('keydown', function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendPostRequest(this);
    bioEditTrigger.classList.remove("hidden");
    bioEditField.classList.add("hidden");
  }
});

const privateCheckboxes = document.querySelectorAll('input[name="private"]');

privateCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", function (event) {
    const editForm = this.parentNode.parentNode;
    sendPostRequest(editForm);
  })
});

function sendPostRequest(form) {
  const endpoint = form.dataset.endpoint;
  const input = form.querySelector('[data-field]');
  const updatedField = input.name;
  let updatedValue = input.value;
  if (updatedField === 'private') {
    updatedValue = form.querySelector('[data-field]').checked;
  }

  fetch(endpoint, {
    method: form?._method?.value ? form._method.value : "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ fieldToUpdate: updatedField, value: updatedValue })
  })
  .then(res => { // converts POST request response to JSON, set in HTTP request setup
    return res.json();
  })
  .then(data => {
    if (data.field === 'username') {
      usernameText.innerHTML = `<strong>${data?.value ? formatNameForDisplay(data.value) : 'Add a username!'}</strong>`;
    } else if (data.field === 'bio') {
      bioText.innerHTML = `${data?.value ? data?.value : 'Add a bio!'}`;
    }
  })
  .catch(error => {
    console.error("Update failed: " + error);
  });
}

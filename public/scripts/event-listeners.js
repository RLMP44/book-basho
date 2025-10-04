import { searchFunction, sendPostRequest } from './functions.js';

const privateCheckboxes = document.querySelectorAll('input[name="private"]');
const searchButton = document.getElementById("search-button");
const triggers = document.querySelectorAll(".edit-trigger");
const forms = document.querySelectorAll(".edit-toggle");

// ---------- Buttons ----------
searchButton.addEventListener('click', searchFunction);


// ---------- Triggers ----------
// display edit form and hide edit button
triggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    trigger.classList.add("hidden");
    const form = event.currentTarget.parentNode.nextElementSibling
    form.classList.remove("hidden");
  });
})


// ---------- Forms ----------
// hide form and submit contents on enter, also update UI
forms.forEach((form) => {
  form.addEventListener('keydown', function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      const trigger = event.currentTarget.previousElementSibling.querySelector(".edit-trigger");
      sendPostRequest(this);
      trigger.classList.remove("hidden");
      form.classList.add("hidden");
    }
  });
})


// ---------- Checkboxes ----------
privateCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", function (event) {
    const editForm = this.parentNode.parentNode;
    sendPostRequest(editForm);
  })
});

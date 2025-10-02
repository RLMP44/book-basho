const usernameEditTrigger = document.querySelector(".username-edit-trigger");
const usernameEditField = document.querySelector(".username-edit-toggle");
const editForm = document.getElementById("toggleable-edit-form")

// display username edit form and hide edit button
usernameEditTrigger.addEventListener("click", () => {
  usernameEditTrigger.classList.add("hidden");
  usernameEditField.classList.remove("hidden");
});

// hide form and submit contents on enter, also update UI
editForm.addEventListener('keydown', function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendPostRequest(this);
    usernameEditTrigger.classList.remove("hidden");
    usernameEditField.classList.add("hidden");
  }
});

function sendPostRequest(form) {
  const usernameText = document.getElementById("username-text");
  const endpoint = form.dataset.endpoint;
  const input = form.querySelector('[data-field]');
  const updatedField = input.name;
  const updatedValue = input.value;

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ fieldToUpdate: updatedField, value: updatedValue })
  })
  .then(res => res.json()) // converts POST request response to JSON, set in HTTP request setup
  .then(data => {
    if (data.field === 'username') {
      usernameText.innerHTML = `<strong>${data?.value ? formatNameForDisplay(data.value) : 'Add a username!'}</strong>`;
    }
  })
  .catch(error => {
    console.error("Update failed: " + error);
  });
}

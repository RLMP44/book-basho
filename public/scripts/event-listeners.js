import { searchFunction, sendPostRequest } from './functions.js';

const $privateCheckboxes = $('input[name="private"]');
const $searchButton = $("#search-button");
const $triggers = $(".edit-trigger");
const $forms = $(".edit-toggle");

// ---------- Buttons ----------
$searchButton.on('click', searchFunction);


// ---------- Triggers ----------
// display edit form and hide edit button
$triggers.on("click", function() {
  const $trigger = $(this)
  $trigger.addClass("hidden");
  const $form = $trigger.parent().next(".edit-toggle");
  $form.removeClass("hidden");
});


// ---------- Forms ----------
// hide form and submit contents on enter, also update UI
$forms.on('keydown', function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const $form = $(this);
    const $trigger = $form.prev().find(".edit-trigger");
    // convert form back into a DOM element
    // allows manipulation and dataset access in function
    sendPostRequest($form[0]);
    $trigger.removeClass("hidden");
    $form.addClass("hidden");
  }
});


// ---------- Checkboxes ----------
$privateCheckboxes.on("change", function (event) {
  const $editForm = $(this).parent().parent();
  sendPostRequest($editForm[0]);
});

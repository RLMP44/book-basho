import { formatDatesForDisplay, formatNameForDisplay } from './client-helpers.js';

// ------- filtering -------
export function searchFunction(event) {
  const button = event.currentTarget;
  const data = JSON.parse(button.getAttribute('data-books'));
  var sortedData = data;
  const searchInput = document.getElementById("searchInput").value;
  const filterParams = document.getElementById("filterParams").value;

  if (searchInput) {
    sortedData = sortedData.filter(book =>
      book.book_title.toLowerCase().includes(searchInput.toLowerCase()) ||
      book.book_author.toLowerCase().includes(searchInput.toLowerCase())
    );
  }

  if (filterParams) {
    const userInputs = filterParams.split(' ');
    const filter = userInputs[0]; // rating or date_finished
    const order = userInputs[1]; // DESC or ASC
    if (filter === 'rating' && order === 'ASC') {
      sortedData = sortedData.sort((a, b) => a.rating - b.rating);
    } else if (filter === 'date_finished' && order === 'DESC') {
      sortedData = sortedData.sort((a, b) => new Date(b.date_finished) - new Date(a.date_finished));
    } else if (filter === 'date_finished' && order === 'ASC') {
      sortedData = sortedData.sort((a, b) => new Date(a.date_finished) - new Date(b.date_finished));
    } else {
      // default filter (filter === 'rating' && order === 'DESC')
      sortedData = sortedData.sort((a, b) => b.rating - a.rating);
    }
  }
  updateCards(sortedData);
}

function updateCards(books) {
  const container = document.querySelector(".outline");
  container.innerHTML = '';

  if (books.length > 0) {
    books.forEach((book) => {
      const card = createIndexCard(book);
      container.appendChild(card);
    });
  } else {
    const text = document.createElement('p');
    text.innerHTML = `<p>No titles available</p>`;
    container.appendChild(text);
  }
}

function createIndexCard(data) {
  const card = document.createElement('div');
  const formattedDates = formatDatesForDisplay(data.date_started, data.date_finished)
  card.className = "book-card";
  let buttonsHTML = "";

  if (currentUserID && data.user_id == currentUserID) {
    buttonsHTML =
      `<div class="card-buttons card-buttons-container">
        <form class="note-form" action="/notes/${data.id}/edit" method="get">
          <button class="button edit-button" type="submit">
            <img class="edit-icon" src="/images/edit-button.png" title="edit" alt="edit" />
          </button>
        </form>
        <form class="note-form" action="/notes/${data.id}/delete" method="post">
          <button class="button delete warp black" type="submit" title="delete" alt="delete"></button>
        </form>
      </div>`;
    };

  card.innerHTML = `
    <div class="card-body">
      <p class="text-grey card-rating minimize-txt" style="justify-self: flex-start"> Rating: ${data.rating}/10 given by
        <a href="/users/${data.user_id}" style="padding-left: 4px; color: var(--text-black)">
          ${data.user_name}
        </a>
      </p>
      <p class="text-grey card-read minimize-txt">Read: ${formattedDates}</p>
      ${buttonsHTML}
      <div class="card-title-author">
        <p class="text-black mb-0 minimize-txt"><strong>${data.book_title}</strong></p>
        <p class="text-black minimize-txt"><em>${data.book_author}</em></p>
      </div>
      <p class="text-black mb-0 card-note minimize-txt" style="white-space: pre-line;">
        <img class="card-cover" src="${data.book_cover}" alt="book cover">
        ${data.summary}
      </p>
      <p class="text-grey mb-0 card-year minimize-txt">Published: ${data.book_year}</p>
      <form class="note-form" action="/notes/${data.id}" method="get">
        <button class="main-button btn-lg card-button" type="submit" alt="View notes">Notes</button>
      </form>
    </div>
  `;

  return card;
}

// ------- in-place editing -------
export function sendPostRequest(form) {
  const endpoint = form.dataset.endpoint;
  const usernameText = document.getElementById("username-text");
  const bioText = document.getElementById("bio-text");
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

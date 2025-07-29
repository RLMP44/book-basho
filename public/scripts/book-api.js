const APIEndpoint = 'https://openlibrary.org/search.json';

async function fetchBooks(searchInput) {
  try {
    return await axios.get(APIEndpoint + "?q=" + searchInput + "&language=eng");
  } catch (error) {
    console.log(error);
  }
};

function createBookCard(book) {
  const booksContainer = document.getElementById("searchResultsContainer");
  const title = book.title || "No title available";
  const subtitle = book.subtitle || "";
  const author = book.author_name ? book.author_name.join(", ") : "Author unknown";
  const coverUrl = book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : "";
  const year = book.first_publish_year || "Not listed";
  const html = `
    <div class="search-book-card"
      data-title="${title}"
      data-subtitle="${subtitle}"
      data-author="${author}"
      data-year="${year}"
      data-cover="${coverUrl}""
      >
      ${coverUrl ? `<img src="${coverUrl}" alt="${title}" />` : ""}
      <div class="search-book-info">
        <p class="mb-0"><strong>${title}</strong></p>
        <p class="mb-0">${subtitle}</p>
        <p class="mb-0"><em>${author}</em></p>
        <p class="mb-0">Published: ${year}</p>
      </div>
    </div>
  `;

  booksContainer.insertAdjacentHTML("beforeend", html);
};

document.getElementById("book-select").addEventListener("click", async (event) => {
  const searchedBook = document.getElementById("bookSearchInput").value;
  const results = await fetchBooks(searchedBook);
  const books = results.data.docs;
  console.log(books);

  books.forEach((book) => {
    createBookCard(book);
  });

  document.querySelectorAll(".search-book-card").forEach((book) => {
    book.addEventListener("click", async (event) => {
      const card = event.currentTarget;

      const data = {
        cover: card.dataset.cover,
        title: card.dataset.title,
        subtitle: card.dataset.subtitle,
        author: card.dataset.author,
        year: card.dataset.year
      }

      await fetch("/addBook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      window.location.href = "/add";
    });
  });
});

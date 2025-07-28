const APIEndpoint = 'https://openlibrary.org/search.json';

async function fetchBooks(searchInput) {
  try {
    return await axios.get(APIEndpoint + "?q=" + searchInput);
  } catch (error) {
    console.log(error);
  }
};

document.getElementById("book-select").addEventListener("click", async (event) => {
  console.log('goddamn');
  const searchedBook = document.getElementById("bookSearchInput").value;
  const results = await fetchBooks(searchedBook);
  const books = results.data.docs;
  const booksContainer = document.getElementById("searchResultsContainer");
  books.forEach((book) => {
    const bookCard = document.createElement("div");
    bookCard.className = "search-book-card";

    const bookInfo = document.createElement("div");
    bookInfo.className = "search-book-info";

    const title = document.createElement("p");
    title.textContent = book.title || "No title available";

    const author = document.createElement("p");
    author.textContent = book.author_name ? book.author_name.join(", ") : "Author unknown";

    const cover = document.createElement("img");
    if (book.cover_i) {
      cover.src = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
      cover.alt = book.title;
    } else {
      cover.alt = "No cover image";
    }

    // Add everything to card
    bookInfo.appendChild(author);
    bookInfo.appendChild(title);
    bookCard.appendChild(cover);
    bookCard.appendChild(bookInfo);

    // Add card to container
    booksContainer.appendChild(bookCard);
    // book.author_name
    // book.title
    // book.subtitle
    // book.cover_i
    // book.cover_edition_key
  })
});

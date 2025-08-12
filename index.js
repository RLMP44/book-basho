import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from 'dotenv';
import axios from "axios";
import session from "express-session";
import flash from "connect-flash";
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const port = 3000;
const dbPass = process.env.PG_ADMIN_PASS;
const dbUser = process.env.PG_ADMIN_USER;
const dbName = process.env.PG_ADMIN_DB;

const db = new pg.Client({
  user: dbUser,
  host: "localhost",
  database: dbName,
  password: dbPass,
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

// flash middleware
app.use(cookieParser('keyboard cat'));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 }
}));
app.use(flash());

const currentUserId = 1;

// ----------------- functions -----------------
async function getUserBooks({ filterBy = 'rating', orderBy = 'DESC', search = false, searchInput = '' } = {}) {
  let queryBase = `
    SELECT
      n.id,
      n.rating,
      n.date_started,
      n.date_finished,
      n.note,
      n.summary,
      n.private,
      n.user_id,
      book.title AS book_title,
      book.cover AS book_cover,
      book.author AS book_author,
      book.subtitle AS book_subtitle,
      book.year AS book_year,
      users.name AS user_name
    FROM note n
    JOIN book ON n.book_id = book.id
    JOIN users ON n.user_id = users.id
    WHERE user_id = $1
  `;

  const params = [currentUserId];

  if (search) {
    queryBase += `
      AND (book.title ILIKE '%' || $2 || '%' OR book.author ILIKE '%' || $2 || '%')
    `;
    params.push(searchInput);
  };

  const query = queryBase + `ORDER BY n.${filterBy} ${orderBy};`;
  try {
    const results = await db.query(query, params);
    return results.rows;
  } catch (error) {
    console.log("Error retrieving user books: " + error);
  }
};

async function getNote(noteId) {
  const query = `
    SELECT
      n.id,
      n.rating,
      n.date_started,
      n.date_finished,
      n.note,
      n.summary,
      n.private,
      n.user_id,
      book.title AS book_title,
      book.cover AS book_cover,
      book.author AS book_author,
      book.subtitle AS book_subtitle,
      book.year AS book_year
    FROM note n
    JOIN book ON n.book_id = book.id
    WHERE n.id = $1;
  `;
  const results = await db.query(query, [noteId]);
  return results.rows[0]
};

async function fetchBookId(book) {
  try {
    const bookQuery = `
      SELECT * FROM book
      WHERE title = $1 AND cover = $2 AND author = $3 AND year = $4 AND subtitle = $5;
    `;
    const foundBook = await db.query(bookQuery, [
      book.title,
      book.cover,
      book.author,
      book.year,
      book.subtitle
    ]);
    if (foundBook.rows[0]) {return foundBook.rows[0].id};
  } catch (error) {
    console.error("Error fetching book from database: " + error);
  }
};

async function createAndFetchNewBook(book) {
  try {
    const newBookQuery = `
      INSERT INTO book (title, cover, author, year, subtitle)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const newBook = await db.query(newBookQuery, [
      book.title,
      book.cover,
      book.author,
      book.year,
      book.subtitle
    ]);
    return newBook.rows[0].id;
  } catch (error) {
    console.error("Error creating new book: " + error);
  }
};

function formatDate(date) {
  const month = date.getMonth() + 1;
  const paddedMonth = month < 10 ? '0' + `${month}` : `${month}`;
  const year = date.getFullYear();
  return `${year}-${paddedMonth}`;
};

// ----------------- HTTP requests -----------------
app.get("/", async (req, res) => {
  try {
    const data = await getUserBooks();
    res.render("index.ejs", { data: data });
  } catch (error) {
    console.log(error);
  }
});

app.get("/filter", async (req, res) => {
  try {
    const userInputs = req.query.filterParams.split(' ');
    const filter = userInputs[0];
    const order = userInputs[1];
    const data = await getUserBooks({ filterBy: filter, orderBy: order })
    res.render("index.ejs", { data: data });
  } catch (error) {
    console.log(error);
  }
});

app.get("/search", async (req, res) => {
  try {
    const userInput = req.query.searchInput;
    const data = await getUserBooks({ filter: false, search: true, searchInput: userInput })
    res.render("index.ejs", { data: data });
  } catch (error) {
    console.log(error);
  }
});

app.get("/notes/:id", async (req, res) => {
  const noteId = req.params.id;
  try {
    const results = await getNote(noteId);
    res.render("show.ejs", { data: results });
  } catch (error) {
    console.log(error);
  }
});

app.get("/notes/:id/edit", async (req, res) => {
  const idToEdit = req.params.id;
  const data = await getNote(idToEdit);
  const dates = {
    start: data.date_started ? formatDate(data.date_started) : '',
    finish: formatDate(data.date_finished),
  }
  res.render("edit.ejs", { data: data, dates: dates });
});

app.post("/notes/:id/edit", async (req, res) => {
  try {
    const idToEdit = req.params.id;
    var updates = [];
    const queryArray = [];

    // create transaction
    await db.query("BEGIN");


    if (req.body.updatedPrivacy) {
      updates.push(`private = $${queryArray.length + 1}`);
      queryArray.push(req.body.updatedPrivacy);
    }
    if (req.body.updatedRating) {
      updates.push(`rating = $${queryArray.length + 1}`);
      queryArray.push(req.body.updatedRating);
    }
    if (req.body.updatedStart) {
      const updatedStart = new Date(`${req.body.updatedStart}-15`);
      updates.push(`date_started = $${queryArray.length + 1}`);
      queryArray.push(updatedStart);
    }
    if (req.body.updatedFinish) {
      const updatedFinish = new Date(`${req.body.updatedFinish}-15`);
      updates.push(`date_finished = $${queryArray.length + 1}`);
      queryArray.push(updatedFinish);
    }
    if (req.body.updatedSummary) {
      updates.push(`summary = $${queryArray.length + 1}`);
      queryArray.push(req.body.updatedSummary);
    }
    if (req.body.updatedNote) {
      updates.push(`note = $${queryArray.length + 1}`);
      queryArray.push(req.body.updatedNote);
    }
    queryArray.push(idToEdit);

    const query = `UPDATE note SET ${updates.join(', ')} WHERE id = $${queryArray.length};`;
    await db.query(query, queryArray);
    await db.query("COMMIT");
    res.redirect("/");
  } catch (error) {
    await db.query("ROLLBACK");
    console.log(error);
    res.redirect("/notes/:id/edit");
  }
});

app.get("/add", async (req, res) => {
  res.render("add.ejs", {
    bookData: {},
    messages: { error: req.flash("error")}
  });
});

app.post("/add", async (req, res) => {
  const note = req.body;
  let book;

  // catch cases when user doesn't select a book
  try {
    book = JSON.parse(req.body.selectedBookFormData);
  } catch (error) {
    req.flash("error", "Please select a book");
    return res.render("add.ejs", {
      submittedData: req.body,
      messages: { error: req.flash("error") }
    });
  }

  // keep if block for edge cases
  if (!book || Object.keys(book).length === 0) {
    req.flash("error", "Please select a book");
    return res.render("add.ejs", {
      submittedData: req.body,
      messages: { error: req.flash("error")}
    });
  }

  try {
    // create transaction
    await db.query("BEGIN");
    // search for book in database and populate book id
    var bookId = await fetchBookId(book);
    // create book if not in database and get new id
    if (!bookId) { bookId = await createAndFetchNewBook(book); }

    // create note instance using id from new book instance and current user id
    // TODO: allow multiple users - get current user id
    const noteQuery = `
      INSERT INTO note (rating, date_started, date_finished, note, summary, private, user_id, book_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;
    await db.query(noteQuery, [
      note.rating,
      note.start ? new Date(`${note.start}-15`) : null,
      new Date(`${note.finish}-15`),
      note.note || null,
      note.summary || null,
      note.private || false,
      currentUserId,
      bookId
    ]);

    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    req.flash("error", "Failed to create your note!");
    console.error("error occurred: " + error);
    // return to prefilled form if creation failed
    return res.render("add.ejs", {
       submittedData: req.body,
       messages: { error: req.flash("error") }
     });
  }

  res.redirect("/");
});

app.post("/notes/:id/delete", async (req, res) => {
  try {
    const idToDelete = req.params.id;
    await db.query('DELETE FROM note WHERE id = $1', [idToDelete]);
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

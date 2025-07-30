import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from 'dotenv';
import axios from "axios";
import session from "express-session";

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
app.use(session({ secret: "keyboard cat", resave: false, saveUninitialized: true }));

const currentUserId = 1;

// ----------------- functions -----------------

async function getUserBooks({ filterBy = 'rating', orderBy = 'DESC', filter = true, search = false, searchInput = '' } = {}) {
  const queryBase = `
    SELECT
      n.id,
      n.rating,
      n.date_started,
      n.date_finished,
      n.note,
      n.summary,
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

  var queryParams = ``;
  var params = [currentUserId];

  if (filter) {
    queryParams = `ORDER BY n.${filterBy} ${orderBy};`
  } else if (search) {
    queryParams = `
    AND book.title ILIKE '%' || $2 || '%'
    OR book.author ILIKE '%' || $2 || '%';
    `;
    params.push(searchInput);
  };

  const query = queryBase + queryParams;
  const results = await db.query(query, params);
  return results.rows;
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
  res.render("edit.ejs", { data: await getNote(idToEdit) });
});

app.post("/notes/:id/edit", async (req, res) => {
  try {
    const idToEdit = req.params.id;
    const query = `
      UPDATE note
      SET rating = $1, date_started = $2, date_finished = $3,
      summary = $4, note = $5
      WHERE id = $6
    `;
    db.query(query, [req.body.updatedRating, req.body.updatedStart, req.body.updatedFinish, req.body.updatedSummary, req.body.updatedNote, idToEdit])
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});

app.get("/add", async (req, res) => {
  // use selected book data (stored in session) to populate form
  const bookData = req.session.bookData || {};
  res.render("add.ejs", { bookData: bookData });
});

app.post("/add", async (req, res) => {
  const note = req.body;
  const book = req.session.bookData;
  // create transaction
  try {
    // TODO: check for book in database before creating
    await db.query("BEGIN");
    // add selected book and get id upon successful creation
    const bookQuery = `
      INSERT INTO book (title, cover, author, year, subtitle)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const newBook = await db.query(bookQuery, [
      book.title,
      book.cover,
      book.author,
      book.year,
      book.subtitle
    ]);
    console.log("new book: " + newBook.rows[0])
    const bookId = newBook.rows[0].id;

    // create note instance using id from new book instance and current user id
    // TODO: allow multiple users - get current user id
    const noteQuery = `
      INSERT INTO note (rating, date_started, date_finished, note, summary, user_id, book_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;

    await db.query(noteQuery, [
      note.rating,
      note.start ? new Date(`${note.start}-15`) : null,
      new Date(`${note.finish}-15`),
      note.note || null,
      note.summary || null,
      currentUserId,
      bookId
    ]);

    await db.query("COMMIT");
    // clear book data from add form upon successful transaction
    req.session.bookData = {};
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("error occurred: " + error);
    // return to prefilled form if creation failed
    res.render("add.ejs", { bookData: req.session.bookData });
  }
  res.redirect("/");
});

app.post("/addBook", async (req, res) => {
  // catch book data from user selected book and store it in session for later
  req.session.bookData = req.body;
  res.status(200).end();
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

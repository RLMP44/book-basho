import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from 'dotenv';

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

const currentUserId = 1;

async function getUserBooks(filter = 'rating', order = 'DESC') {
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
      book.isbn AS book_isbn,
      users.name AS user_name
    FROM note n
    JOIN book ON n.book_id = book.id
    JOIN users ON n.user_id = users.id
    WHERE user_id = $1
    ORDER BY n.${filter} ${order};
  `;
  const results = await db.query(query, [currentUserId]);
  return results.rows;
}

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
      book.isbn AS book_isbn
    FROM note n
    JOIN book ON n.book_id = book.id
    WHERE n.id = $1;
  `;
  const results = await db.query(query, [noteId]);
  return results.rows[0]
}

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
    const data = await getUserBooks(filter, order)
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

app.post("/add", async (req, res) => {
  // TODO: add notes
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

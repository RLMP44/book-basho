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

async function getUserBooks() {
  const query = `
    SELECT
      n.id,
      n.rating,
      n.date_started,
      n.date_finished,
      n.note,
      n.summary,
      book.title AS book_title,
      book.cover AS book_cover,
      book.author AS book_author,
      book.isbn AS book_isbn,
      users.name AS user_name
    FROM note n
    JOIN book ON n.book_id = book.id
    JOIN users ON n.user_id = users.id
    WHERE user_id = $1
    ORDER BY n.rating DESC;
  `;
  const results = await db.query(query, [currentUserId]);
  return results.rows;
}

app.get("/", async (req, res) => {
  try {
    const data = await getUserBooks();
    res.render("index.ejs", { data: data });
  } catch (error) {
    console.log(error);
  }
});

app.get("/notes/:id", async (req, res) => {
  const noteId = req.params.id;
  try {
    const query = `
      SELECT
        n.id,
        n.rating,
        n.date_started,
        n.date_finished,
        n.note,
        n.summary,
        book.title AS book_title,
        book.cover AS book_cover,
        book.author AS book_author,
        book.isbn AS book_isbn
      FROM note n
      JOIN book ON n.book_id = book.id
      WHERE n.id = $1;
    `;
    const results = await db.query(query, [noteId]);
    res.render("show.ejs", { data: results.rows[0] });
  } catch (error) {
    console.log(error);
  }
});

app.post("/add", async (req, res) => {
  // TODO: add notes
});

app.post("/notes/:id/edit", async (req, res) => {
  // TODO: add notes edit page
});

app.post("/notes/:id/delete", (req, res) => {
  // TODO: delete capabilities
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

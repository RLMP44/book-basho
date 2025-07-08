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

async function getBooks() {
  const query = `
    SELECT
      rb.rating,
      rb.date_started,
      rb.date_finished,
      rb.note,
      rb.summary,
      book.title AS book_title,
      book.cover AS book_cover,
      book.author AS book_author,
      book.isbn AS book_isbn,
      users.name AS user_name
    FROM read_book rb
    JOIN book ON rb.book_id = book.id
    JOIN users ON rb.user_id = users.id
    WHERE user_id = $1;
  `
  const results = await db.query(query, [currentUserId]);
  return results.rows[0];
}

app.get("/", async (req, res) => {
  try {
    const data = await getBooks();
    res.render("index.ejs", { data: data });
  } catch (error) {
    console.log(error);
  }
});

// TODO: add notes/:id show page

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

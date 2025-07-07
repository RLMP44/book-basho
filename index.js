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

app.get("/", (req, res) => {
 res.render("index.ejs");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

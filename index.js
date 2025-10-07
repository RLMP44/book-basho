import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from 'dotenv';
import session from "express-session";
import flash from "connect-flash";
import cookieParser from 'cookie-parser';
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import * as helpers from "./utils/helpers.js";

dotenv.config();

const app = express();
const port = 3000;
const saltRounds = 10;

const bookBashoIntro = "Hello and welcome to Book Basho! This is a safe space where people can track and rate books they've read, or take notes as they go. Publish your notes and reviews for all to see, or keep them private for personal reference only. To avoid spoilers, all notes will be accessible via the Notes button on each summary. Make yourself at home!";

const db = new pg.Client({
  user: process.env.PG_ADMIN_USER,
  host: process.env.PG_ADMIN_HOST,
  database: process.env.PG_ADMIN_DB,
  password: process.env.PG_ADMIN_PASS,
  port: process.env.PG_ADMIN_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

// flash middleware
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// set up global helpers
app.locals.formatNameForDisplay = helpers.formatNameForDisplay;
app.locals.formatDatesForDisplay = helpers.formatDatesForDisplay;

// use global local to access req.user from ejs templates
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// ----------------- functions -----------------
async function getUserPublicBooks(userID) {
  let query = `
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
    AND n.private = false
    ORDER BY n.rating DESC;
  `;

  try {
    const results = await db.query(query, [userID]);
    return results.rows;
  } catch (error) {
    console.log("Error retrieving user's books: " + error);
  }
};

async function getAllUserBooks(userID) {
  let query = `
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
    ORDER BY n.rating DESC;
  `;

  try {
    const results = await db.query(query, [userID]);
    return results.rows;
  } catch (error) {
    console.log("Error retrieving user's books: " + error);
  }
};

async function getAllBooks() {
  let query = `
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
    WHERE n.private = false
    ORDER BY n.rating DESC;
  `;

  try {
    const results = await db.query(query);
    return results.rows;
  } catch (error) {
    console.log("Error retrieving all books: " + error);
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
      book.year AS book_year,
      users.name AS user_name
    FROM note n
    JOIN book ON n.book_id = book.id
    JOIN users ON n.user_id = users.id
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

function isAuthorized(currentUser, postUserID) {
  return currentUser.id == postUserID;
}

async function getUserBio(userID) {
  const results = await db.query('SELECT bio, name FROM users WHERE id = $1;',
    [userID]);
  return results.rows[0];
}

// ----------------- HTTP requests -----------------
// ===== AUTH START =====
app.get("/register", (req, res) => {
  res.render("login.ejs");
});

app.post("/register", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const email = req.body.email;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    if (result.rows.length > 0) {
      // redirect to login when user exists already
      // TODO: log user in instead
      res.redirect("/login");
    } else {
      // encrypt password
      const hash = await bcrypt.hash(password, saltRounds);
      // create transaction
      await db.query("BEGIN");
      // insert hash as hashed password
      const newUserResult = await db.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
        [username, email.toLowerCase(), hash]
      );
      await db.query("COMMIT");
      const newUser = newUserResult.rows[0];
      req.login(newUser, (err) => {
        console.log("success");
        res.redirect("/");
      });
    };
  } catch (error) {
    await db.query("ROLLBACK");
    console.log(error);
    res.redirect("/register");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// starts the OAuth flow, and redirects to google login page with scopes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// handle redirect after google authenticates user
// calls serializeUser(user)
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
)

// handle local login via form
// also calls serializeUser(user)
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// ===== AUTH END =====

app.get("/", async (req, res) => {
  try {
    const data = await getAllBooks();
    res.render("index.ejs", { data: data, userData: { bio: bookBashoIntro, name: null }});
  } catch (error) {
    console.log(error);
  }
});

app.get("/notes/:id", async (req, res) => {
  const noteId = req.params.id;
  try {
    const results = await getNote(noteId);
    res.render("notes/show.ejs", { data: results });
  } catch (error) {
    console.log(error);
  }
});

app.get("/notes/:id/edit", async (req, res) => {
  const idToEdit = req.params.id;
  const data = await getNote(idToEdit);
  if (req.user && req.isAuthenticated() && isAuthorized(req.user, data.user_id)) {
    const dates = {
      start: data.date_started ? formatDate(data.date_started) : '',
      finish: formatDate(data.date_finished),
    }
    res.render("notes/edit.ejs", { data: data, dates: dates });
  } else if (req.user && req.isAuthenticated) {
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});

app.post("/notes/:id/edit", async (req, res) => {
  try {
    const idToEdit = req.params.id;
    var updates = [];
    const queryArray = [];
    const checkIsPrivate = req.body.updatedPrivacy === 'true';

    // create transaction
    await db.query("BEGIN");

    if (req.body.updatedPrivacy) {
      updates.push(`private = $${queryArray.length + 1}`);
      queryArray.push(checkIsPrivate);
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

app.patch("/notes/:id/edit", async (req, res) => {
  const idToEdit = req.params.id;
  const data = await getNote(idToEdit);
  const field = req.body.fieldToUpdate;
  let value = req.body.value;
  if (req.user && req.isAuthenticated() && isAuthorized(req.user, data.user_id)) {
    try {
      // create transaction
      await db.query("BEGIN");
      await db.query(`UPDATE note SET ${field} = $1 WHERE id = $2;`, [value, idToEdit]);
      await db.query("COMMIT");
      res.json({ field: field, value: value });
    } catch (error) {
      console.log(error)
    }
  } else {
    res.redirect('/login');
  }
});

app.get("/add", async (req, res) => {
  if (req.user && req.isAuthenticated()) {
    res.render("notes/add.ejs", {
      bookData: {},
      messages: { error: req.flash("error")}
    });
  } else {
    res.redirect('/login');
  }
});

app.post("/add", async (req, res) => {
  const note = req.body;
  let book;

  // catch cases when user doesn't select a book
  try {
    book = JSON.parse(req.body.selectedBookFormData);
  } catch (error) {
    req.flash("error", "Please select a book");
    return res.render("notes/add.ejs", {
      submittedData: req.body,
      messages: { error: req.flash("error") }
    });
  }

  // keep if block for edge cases
  if (!book || Object.keys(book).length === 0) {
    req.flash("error", "Please select a book");
    return res.render("notes/add.ejs", {
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
      req.user.id,
      bookId
    ]);

    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    req.flash("error", "Failed to create your note!");
    console.error("error occurred: " + error);
    // return to prefilled form if creation failed
    return res.render("notes/add.ejs", {
       submittedData: req.body,
       messages: { error: req.flash("error") }
     });
  }

  res.redirect("/");
});

app.post("/notes/:id/delete", async (req, res) => {
  const idToDelete = req.params.id;
  const data = await getNote(idToDelete);
  if (req.user && req.isAuthenticated() && isAuthorized(req.user, data.user_id)) {
    try {
      await db.query('DELETE FROM note WHERE id = $1', [idToDelete]);
      res.redirect("/");
    } catch (error) {
      console.log(error);
    }
  } else if (req.user && req.isAuthenticated()) {
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});

app.get("/users/:id", async (req, res) => {
  const userID = req.params.id;
  try {
    let results
    if (req.user && req.isAuthenticated() && isAuthorized(req.user, userID)) {
      results = await getAllUserBooks(userID);
    } else {
      results = await getUserPublicBooks(userID);
    }
    const userData = await getUserBio(userID);
    res.render("users/show.ejs", { data: results, userData: { bio: userData.bio, name: userData.name, id: userID }});
  } catch (error) {
    console.log(error);
  }
});

app.post("/users/:id/edit", async (req, res) => {
  const userIDToEdit = req.params.id;
  const fieldToUpdate = req.body.fieldToUpdate === "username" ? "name" : req.body.fieldToUpdate;
  if (req.user && req.isAuthenticated() && isAuthorized(req.user, userIDToEdit)) {
    try {
      await db.query(`
        UPDATE users SET ${fieldToUpdate} = $1 WHERE id = $2`,
        [req.body.value, userIDToEdit]
      );
      res.json({ field: req.body.fieldToUpdate, value: req.body.value });
    } catch (error) {
      console.log(error)
    }
  } else {
    res.redirect("/login");
  }
});

// TODO: create PATCH for user to update username and bio
// TODO: move edit form to user show page (allow in-place edits)

// ===== STRATEGIES START =====
passport.use(
  "local",
  new Strategy(async function verify(email, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        const valid = await bcrypt.compare(password, storedHashedPassword);
        return valid ? cb(null, user) : cb(null, false, { message: "Incorrect password" });
      } else {
        return cb(null, false, { message: "User not found" });
      }
    } catch (err) {
      return cb(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    // standard google profile url -> "https://www.googleapis.com/oauth2/v3/userinfo"
    // callbackURL must match whatever is used in google developer console
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email.toLowerCase(),
        ]);
        if (result.rows.length === 0) {
          const username = profile.email.split("@")[0];
          const newUser = await db.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
            [ username, profile.email.toLowerCase(), "google" ]
          );
          return cb(null, newUser.rows[0]);
        } else {
          // return found user info
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
// ===== STRATEGIES END =====

passport.serializeUser((user, cb) => {
  // null to indicate no errors
  cb(null, user.id);
});

passport.deserializeUser(async (userID, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [userID]);
    // null to indicate no errors
    cb(null, result.rows[0]);
  } catch (err) {
    cb(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

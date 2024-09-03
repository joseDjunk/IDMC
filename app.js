const express = require("express");

const bodyParser = require("body-parser");
const app = express();
// const { connectToDb, getDb } = require("./db");
var con = require("./db");

const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const { sessionSecretKey } = require("./constants");

const mmRouters = require("./routes/marketing-manager");
const adminRouters = require("./routes/admin");
const dmcRouters = require("./routes/dmc");
const sdRouters = require("./routes/sales-director");
const publicRouters = require("./routes/public-routes");

// Configure session store using express-mysql-session
const sessionStore = new MySQLStore(
  {
    expiration: 1000 * 60 * 60 * 24, // Session expiration time (milliseconds), adjust as needed
    createDatabaseTable: true, // Automatically create session table if not exists
    schema: {
      tableName: "sessions", // Custom session table name
      columnNames: {
        session_id: "session_id",
        expires: "expires",
        data: "data",
      },
    },
  },
  con
);

app.use(
  session({
    key: "IDMC",
    secret: sessionSecretKey, // Replace with a secure secret key
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.listen(3000);
app.use(express.static("public"));
app.use(publicRouters);
app.use(mmRouters);
app.use(adminRouters);
app.use(dmcRouters);
app.use(sdRouters);
app.use((req, res) => {
  res.status(404).render("404", { message: "" });
});

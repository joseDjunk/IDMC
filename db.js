const mysql = require("mysql");
const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "IDMC",
  options: {
    encrypt: true, // Use encryption
    enableArithAbort: true, // Required setting
  },
});

con.connect(function (error) {
  if (error) {
    throw error;
  } else {
    console.log("Database connection established");
  }
});
module.exports = con;

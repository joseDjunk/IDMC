const bcrypt = require("bcrypt");
var con = require("./../db");
const { testing } = require("googleapis/build/src/apis/testing");
function index(req, res) {
  res.render("index");
}
function loginPage(req, res) {
  res.render("login");
}
function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Please enter username and password");
  }

  // Query to check both emp_id and username columns
  const query = "SELECT * FROM Auth WHERE emp_id = ? OR username = ?";
  con.query(query, [username, username], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.status(401).send("Incorrect username or password");
    }

    const user = {
      emp_id: results[0].emp_id,
      auth_level: results[0].auth_level,
    };

    bcrypt.compare(password, results[0].password, (err, isMatch) => {
      if (err) throw err;

      if (!isMatch) {
        return res.status(401).send("Incorrect username or password");
      }

      req.session.user = user;
      switch (results[0].auth_level) {
        case 1:
          res.redirect("/mm/");
          break;
        case 2:
          res.redirect("/admin/");
          break;
        case 3:
          res.redirect("/dmc/");
          break;
        case 4:
          res.redirect("/sd/");
          break;

        default:
          res.redirect("/logout");
          break;
      }
    });
  });
}
function logOut(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.sendStatus(500);
    } else {
      res.redirect("/login");
    }
  });
}
function authError(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.sendStatus(500);
    } else {
      res.render("404", {
        message:
          "You donot have permission to view this page. You are logged out from the system",
      });
    }
  });
}
function loadPackages(req, res) {
  // Construct the query based on search criteria
  let query = `SELECT 
    P.package_name, 
    P.no_of_days, 
    P.no_of_nights, 
    P.package_details, 
    P.pdf_url, 
    P.package_type, 
    D.destination_name
FROM 
    Packages P
JOIN 
    Destinations D ON P.destination_id = D.id
WHERE 
    P.delete_status = 1
    AND D.delete_status = 1
    AND P.expiry_date >= CURDATE()
    AND P.start_date <= CURDATE();
    `;

  con.query(query, (err, results) => {
    if (err) {
      console.error("Error executing search query:", err);
      res.status(500).send("Server error");
      return;
    }
    console.log(
      "\n\n\n\n\nResults : " + JSON.stringify(results) + "\n\n\n\n\n"
    );
    res.render("page-viewPackages", { packages: results, testing: "hello" });
  });
}
module.exports = {
  index: index,
  loginPage: loginPage,
  login: login,
  logOut: logOut,
  authError: authError,
  loadPackages: loadPackages,
};

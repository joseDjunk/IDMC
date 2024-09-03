const express = require("express");
const sdController = require("../controller/sales-director");
const sdRouter = express.Router();

function auth(req, res, next) {
  if (!req.session.user || req.session.user.auth_level != 4) {
    console.log("No auth set");
    res.redirect("/authError");
  } else {
    next();
  }
}
sdRouter.get("/sd", auth, sdController.loadHomePage);
sdRouter.get("/sd/home", auth, sdController.loadHomePage);
sdRouter.get("/sd/dmc", auth, sdController.loadDMCPage);
sdRouter.get("/sd/mm", auth, sdController.loadMMPage);

module.exports = sdRouter;

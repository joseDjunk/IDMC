const express = require("express");
const publicRouter = express.Router();
const publicController = require("../controller/public-controller");
publicRouter.get("/", publicController.loginPage);
publicRouter.get("/login", publicController.loginPage);
publicRouter.get("/logout", publicController.logOut);
publicRouter.get("/authError", publicController.authError);
publicRouter.get("/viewPackages", publicController.loadPackages);

publicRouter.post("/login", publicController.login);

module.exports = publicRouter;

const express = require("express");
const dmcController = require("../controller/dmc");
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Define a temporary upload directory

const dmcRouter = express.Router();

function auth(req, res, next) {
  if (!req.session.user || req.session.user.auth_level != 3) {
    console.log("No auth set");
    res.redirect("/authError");
  } else {
    next();
  }
}

dmcRouter.get("/dmc", auth, dmcController.loadHomePage);
dmcRouter.get("/dmc/home", auth, dmcController.loadHomePage);
dmcRouter.get("/dmc/addPackage", auth, dmcController.addPackagePage);

dmcRouter.post("/dmc/updateLead", auth, dmcController.updateLead);
dmcRouter.post(
  "/dmc/addPackage",
  upload.single("file"),
  auth,
  dmcController.addPackage
);

dmcRouter.get("/dmc/leads", (req, res) => {
  res.render("dmc/dmc-leads", { title: "Leads" });
});

dmcRouter.get("/dmc/searchCustomer", (req, res) => {
  res.render("dmc/dmc-searchCustomer", { title: "Search" });
});

dmcRouter.post("/dmc/searchCustomer", (req, res) => {
  res.render("dmc/dmc-customers", { title: "Search" });
});

dmcRouter.get("/dmc/addCustomer", (req, res) => {
  res.render("dmc/dmc-addCustomer", { title: "Add" });
});

dmcRouter.get("/dmc/packages", (req, res) => {
  //   res.render("dmc/dmc-packages", { title: "Packages" });
});

// dmcRouter.get("/dmc/createPackage", (req, res) => {
//   res.render("dmc/dmc-packageForm", {
//     title: "Packages",
//     formData: {
//       title: "Create new package",
//       type: "new",
//     },
//   });
// });

dmcRouter.get("/dmc/updatePackage", (req, res) => {
  id = req.query.id;
  res.render("dmc/dmc-packageForm", {
    title: "Packages",
    formData: {
      title: "Update package : " + id,
      type: "edit",
    },
  });
});

dmcRouter.get("/dmc/download", (req, res) => {
  res.download("./public/assets/tpa.pdf");
});

module.exports = dmcRouter;

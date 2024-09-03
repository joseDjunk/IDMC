const express = require("express");
const mmRouter = express.Router();
const mmController = require("../controller/marketing-manager");
function auth(req, res, next) {
  if (!req.session.user || req.session.user.auth_level != 1) {
    console.log("No auth set");
    res.redirect("/authError");
  } else {
    next();
  }
}
mmRouter.get("/mm", auth, mmController.homePage);
mmRouter.get("/mm/home", auth, mmController.homePage);
mmRouter.get("/mm/searchAgent", auth, mmController.searchAgentPage);
mmRouter.get("/mm/addVisitPage", auth, mmController.addVisitPage);
mmRouter.get("/mm/leadsPage", auth, mmController.leadsPage);
mmRouter.get("/mm/addAgentPage", auth, mmController.addAgentPage);

mmRouter.post("/mm/searchAgent", auth, mmController.searchAgent);
mmRouter.post("/mm/addAgent", auth, mmController.addAgent);
mmRouter.post("/mm/addVisit", auth, mmController.addVisit);

mmRouter.get("/mm/leads", (req, res) => {
  res.render("marketing-manager/page-mm-leads", {
    title: "Leads",
  });
});

mmRouter.get("/mm/addLead", (req, res) => {
  res.render("marketing-manager/page-mm-addLead", {
    title: "Leads",
  });
});

mmRouter.post("/mm/addLead", (req, res) => {
  res.render("marketing-manager/page-mm-leads", {
    title: "Leads",
  });
});

mmRouter.get("/mm/searchCustomer", (req, res) => {
  res.render("marketing-manager/page-mm-searchCustomer", {
    title: "Search Customer",
  });
});

mmRouter.post("/mm/searchCustomer", (req, res) => {
  res.render("marketing-manager/page-mm-customers", {
    title: "Customers found",
  });
});

mmRouter.get("/mm/addCustomer", (req, res) => {
  res.render("marketing-manager/page-mm-addCustomer", {
    title: "Added Customer",
  });
});
mmRouter.post("/mm/addCustomer", (req, res) => {
  res.render("marketing-manager/page-mm-addCustomer", {
    title: "Added Customer",
  });
});
module.exports = mmRouter;

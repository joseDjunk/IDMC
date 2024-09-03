const express = require("express");
const adminController = require("../controller/admin");
const adminRouter = express.Router();
function auth(req, res, next) {
  if (!req.session.user || req.session.user.auth_level != 2) {
    console.log("No auth set");
    res.redirect("/authError");
  } else {
    next();
  }
}
adminRouter.get("/admin", auth, adminController.fetchNewLeads);
adminRouter.get("/admin/home", auth, adminController.fetchNewLeads);
adminRouter.get("/admin/leads", auth, adminController.fetchPendingLeads);
adminRouter.get("/admin/searchAgent", auth, adminController.searchAgentPage);
adminRouter.get("/admin/addLeadPage", auth, adminController.addLeadPage);
adminRouter.get("/admin/addAgent", auth, adminController.addAgentPage);
adminRouter.get("/admin/adminHub", auth, adminController.adminHubPage);
adminRouter.get(
  "/admin/addDestination",
  auth,
  adminController.addDestinationPage
);
adminRouter.get("/admin/addUser", auth, adminController.addUserPage);
adminRouter.get("/admin/addRegion", auth, adminController.addDestinationPage);

adminRouter.get("/admin/addLead", (req, res) => {
  res.render("admin/admin-addLead", { title: "Leads" });
});

// adminRouter.post("/admin/addLead", (req, res) => {
//   res.render("admin/admin-leads", { title: "Leads" });
// });

// API

// Route to update DMC
adminRouter.post("/update-dmc", auth, adminController.updateDMC);
adminRouter.post("/admin/addLead", auth, adminController.insertLead);
adminRouter.post("/admin/searchAgent", auth, adminController.searchAgent);
adminRouter.post("/admin/addAgent", auth, adminController.addAgent);
adminRouter.post("/admin/addDestination", auth, adminController.addDestination);
adminRouter.post("/admin/addUser", auth, adminController.addUser);
adminRouter.post(
  "/admin/updateTargetAmount",
  auth,
  adminController.updateTargetAmount
);

module.exports = adminRouter;

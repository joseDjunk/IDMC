var con = require("./../db");
const { packageType, googleDriveFolder } = require("./../constants");
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
const { start } = require("repl");
// const keyPath = require("./../googleDriveAPIkey.json");
const keyPath = path.join(__dirname, "../googleDriveAPIkey.json"); // Path to your service account key file

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Google Drive authentication
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: SCOPES,
  });

  const authClient = await auth.getClient();
  return authClient;
}
// Function to upload file to Google Drive
async function uploadFile(authClient, filePath, fileName) {
  const drive = google.drive({ version: "v3", auth: authClient });
  const fileMetadata = {
    name: fileName,
    parents: googleDriveFolder,
  };

  const media = {
    mimeType: "application/pdf",
    body: fs.createReadStream(filePath),
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id, webViewLink",
  });

  return file.data;
}

// Function to set file permissions
async function setFilePermissions(authClient, fileId) {
  const drive = google.drive({ version: "v3", auth: authClient });
  const permissions = {
    type: "anyone",
    role: "reader",
  };

  return drive.permissions.create({
    fileId: fileId,
    resource: permissions,
  });
}

// A Function that can provide access to google drive api

function loadHomePage(req, res) {
  //   var dmc_id = req.query.id;
  var dmc_id = 2;

  // Validate dmc_id to be an integer
  if (!dmc_id) {
    dmc_id = 0;
    // return res.status(400).send("Invalid or missing dmc_id");
  }

  // Get today's date
  let endDate = getTodaysDate();
  endDate = new Date(endDate).toISOString().split("T")[0];

  // Get the first day of the current month
  let startDate = getFirstDayOfCurrentMonth();
  startDate = new Date(startDate).toISOString().split("T")[0];

  if (!startDate || !endDate) {
    console.error("Invalid date range");
    return;
  }

  const leadsQuery = `
    SELECT 
        Leads.id AS lead_id,
        Leads.agent_id,
        Leads.destination_id,
        Leads.no_of_days,
        Leads.no_of_nights,
        Leads.amount,
        Leads.sales_person,
        Leads.dmc_id,
        Leads.lead_status,
        Agents.agent_name,
        Destinations.destination_name,
        LeadStatus.lead_status
    FROM 
        Leads
    JOIN 
        Agents ON Leads.agent_id = Agents.id
    JOIN 
        Destinations ON Leads.destination_id = Destinations.id
    JOIN 
        LeadStatus ON Leads.lead_status = LeadStatus.id
    WHERE 
        Leads.dmc_id = ?
        AND Leads.lead_status NOT IN (5, 4)
        AND Leads.delete_status = 1
        AND Agents.delete_status = 1
        AND Destinations.delete_status = 1
        AND LeadStatus.delete_status = 1;
  `;

  const leadStatusQuery = `
    SELECT 
        id,
        lead_status
    FROM 
        LeadStatus
    WHERE
        delete_status = 1;
  `;

  const statsQuery = `
    SELECT 
      SUM(CASE WHEN lead_status = 5 THEN amount ELSE 0 END) AS total_amount,
      COUNT(CASE WHEN lead_status = 5 THEN 1 ELSE NULL END) AS total_sales,
      COUNT(*) AS total_count_leads
    FROM 
      Leads
    WHERE 
      delete_status = 1
      AND dmc_id = ?
      AND lead_created_date BETWEEN ? AND ?
  `;

  // Validate and sanitize the date inputs

  // Execute the queries
  con.query(leadsQuery, [dmc_id], (err, leadsResults) => {
    if (err) {
      console.error("Error executing leads query: " + err.stack);
      return res.status(500).send("Error fetching leads");
    }

    con.query(leadStatusQuery, (err, statusResults) => {
      if (err) {
        console.error("Error executing lead status query: " + err.stack);
        return res.status(500).send("Error fetching lead statuses");
      }
      con.query(statsQuery, [dmc_id, startDate, endDate], (err, statistics) => {
        if (err) {
          console.error("Error executing lead status query: " + err.stack);
          return res.status(500).send("Error fetching lead statuses");
        }

        console.log(
          "DB Values : " + dmc_id + " - " + startDate + " - " + endDate
        );
        console.log(
          "Statistics before formating: " + JSON.stringify(statistics)
        );

        statistics[0].total_amount = formatINR(statistics[0].total_amount);
        console.log("Statistics : " + JSON.stringify(statistics));
        res.render("dmc/home/page-home", {
          title: "Home",
          results: leadsResults,
          leadStatuses: statusResults,
          statistics: statistics,
        });
      });
    });
  });
}
function getTodaysDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
function formatINR(number) {
  // Convert number to string and split into integer and decimal parts
  let parts;
  // Ensure `number` is a valid number
  if (number === null || number === undefined || isNaN(number)) {
    console.error("Invalid number:", number);
    number = 0;
    parts = number.toFixed(2).toString().split(".");
  } else {
    parts = number.toFixed(2).toString().split(".");
    console.log("Parts:", parts);
  }

  // Format integer part with commas for thousands separator
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Return formatted INR currency string
  return `₹ ${parts.join(".")}`;
}

// Function to get the first day of the current month
function getFirstDayOfCurrentMonth() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-based

  return `${year}-${month}-01`;
}

//Contrller for updating the lead from dmc home page
function updateLead(req, res) {
  const { lead_id, amount, status } = req.body;

  // Validate that lead_id is provided
  if (!lead_id) {
    return res.status(400).json({ error: "lead_id is required" });
  }

  // Validate that at least one of amount or status is provided
  if (amount === undefined && status === undefined) {
    return res
      .status(400)
      .json({ error: "Either amount or status must be provided" });
  }

  // Construct the query
  let query = `
    UPDATE Leads
    SET 
        amount = CASE 
                    WHEN ? IS NOT NULL THEN ? 
                    ELSE amount 
                 END,
        lead_status = CASE 
                        WHEN ? IS NOT NULL THEN ? 
                        ELSE lead_status 
                     END
    WHERE 
        id = ?
        AND (
            ? IS NOT NULL 
            OR ? IS NOT NULL
        );
  `;

  // Parameters for the query
  let params = [amount, amount, status, status, lead_id, amount, status];

  // Execute the query
  con.query(query, params, (err, result) => {
    if (err) {
      console.error("Error updating lead:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Lead not found or no changes made" });
    }

    res.json({ message: "Lead updated successfully", status: 1 });
  });
}

//Controller to load createPackage page
function addPackagePage(req, res) {
  var sqlQuery =
    "SELECT destination_name, id FROM Destinations WHERE delete_status =1";
  con.query(sqlQuery, function (error, destinations) {
    if (error) {
      console.log("Failed to load data from Database \nError is :\n" + error);
    } else {
      res.render("dmc/addPackage/page-addPackage", {
        title: "Create Package",
        destinations: destinations,
        packageType: packageType,
      });
    }
  });
}

//Controller to create a new package
async function addPackage(req, res) {
  try {
    const {
      packageName,
      destination,
      package_type,
      amount,
      days,
      nights,
      start_date,
      end_date,
      address,
    } = req.body;
    const file = req.file;

    if (
      !packageName ||
      !destination ||
      !package_type ||
      !amount ||
      !days ||
      !nights ||
      !address ||
      !file
    ) {
      return res.status(400).send("All fields are required.<br>File:" + file);
    }

    // Authorize and upload the file to Google Drive
    const authClient = await authorize();
    const uploadedFile = await uploadFile(
      authClient,
      file.path,
      file.originalname
    );
    console.log("FILE : " + JSON.stringify(uploadedFile));
    await setFilePermissions(authClient, uploadedFile.id);
    // Insert package details into the database
    const sql =
      "INSERT INTO Packages (package_name, destination_id, no_of_days, no_of_nights, package_details, package_type, pdf_url, amount, start_date, expiry_date, delete_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const values = [
      packageName,
      destination,
      days,
      nights,
      address,
      package_type,
      uploadedFile.webViewLink,
      amount,
      start_date,
      end_date,
      1,
    ];
    console.log(values["START DATE : " + start_date]);
    values[start_date] ? values[start_date] : null;
    values[end_date] ? values[end_date] : null;
    con.query(sql, values, (error, results) => {
      if (error) {
        console.error("Error inserting data into Packages table:", error);
        return res.status(500).send("Error adding package.");
      }

      res.redirect("home");
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Error uploading file.");
  } finally {
    // Delete the temporary file from the server
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting temporary file:", err);
      }
    });
  }
}
module.exports = {
  loadHomePage: loadHomePage,
  updateLead: updateLead,
  addPackagePage: addPackagePage,
  addPackage: addPackage,
};

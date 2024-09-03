var con = require("./../db");
const { states } = require("./../constants");
let emp_id;

function homePage(req, res) {
  empId = req.session.user.emp_id;

  if (!empId) {
    return res.status(400).json({ error: "emp_id is required" });
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

  //Query for getting list of Visits
  const query = `
          SELECT 
            av.*, 
            e.first_name AS employee_first_name, 
            e.last_name AS employee_last_name, 
            a.agent_name, 
            a.city,
            ac.first_name AS contact_first_name,
            ac.last_name AS contact_last_name,
            DATE_FORMAT(av.visited_date, '%e %M %Y') AS visited_date
        FROM 
            AgentVisits av
        JOIN 
            Employees e ON av.emp_id = e.emp_id
        JOIN 
            Agents a ON av.agent_id = a.id
        LEFT JOIN 
            AgentContact ac ON av.agent_id = ac.agent_id AND ac.is_primary_contact = 1
        WHERE 
            av.delete_status = 1
            AND av.emp_id = ?
            ORDER BY av.id DESC
    LIMIT 25;
    `;
  // Query 1: Count of Leads
  const query1 = `
    SELECT COUNT(*) AS lead_count
    FROM Leads
    WHERE lead_status = 5
      AND sales_person = ?
      AND delete_status = 1
  AND MONTH(lead_created_date) = MONTH(CURRENT_DATE)
  AND YEAR(lead_created_date) = YEAR(CURRENT_DATE);
  `;

  // Query 2: Sum of Amount
  const query2 = `
    SELECT IFNULL(SUM(amount), 0) AS total_amount
    FROM Leads
    WHERE lead_status = 5
      AND sales_person = ?
      AND delete_status = 1
  AND MONTH(lead_created_date) = MONTH(CURRENT_DATE)
  AND YEAR(lead_created_date) = YEAR(CURRENT_DATE);
  `;

  // Query 3: Count of Visits in Current Month
  const query3 = `
    SELECT COUNT(*) AS visit_count
    FROM AgentVisits
    WHERE emp_id = ?
      AND delete_status = 1
      AND MONTH(visited_date) = MONTH(CURRENT_DATE)
      AND YEAR(visited_date) = YEAR(CURRENT_DATE);
  `;

  // Execute queries
  con.query(query1, [empId], (err1, results1) => {
    if (err1) return callback(err1);

    con.query(query2, [empId], (err2, results2) => {
      if (err2) return callback(err2);

      con.query(query3, [empId], (err3, results3) => {
        if (err3) return callback(err3);
        con.query(query, [empId], (error, results) => {
          if (error) {
            console.error("Error fetching data from AgentVisit table:", error);
            return res
              .status(500)
              .json({ error: "Error fetching data from AgentVisit table" });
          } else {
            // Combine results
            const data = {
              leadCount: results1[0].lead_count,
              totalAmount: formatINR(results2[0].total_amount),
              visitCount: results3[0].visit_count,
            };

            // callback(null, data);
            res.render("marketing-manager/home/page-home", {
              title: "Home MM",
              data: results,
              leadCount: data.leadCount,
              totalAmount: data.totalAmount,
              visitCount: data.visitCount,
            });
          }
          // res.json(results);
        });
      });
    });
  });
}
function addVisitPage(req, res) {
  const agentId = req.query.agent_id;
  empId = req.session.user.emp_id;

  if (!agentId) {
    return res.status(400).json({ error: "agent_id is required" });
  }

  // Query to fetch agent details
  const agentQuery = `
        SELECT 
            agent_name, 
            city ,id
        FROM 
            Agents 
        WHERE 
            id = ?;
    `;

  // Query to fetch agent contacts
  const contactQuery = `
        SELECT 
        id,
            first_name, 
            last_name, 
            office_contact, 
            alt_contact 
        FROM 
            AgentContact 
        WHERE 
            agent_id = ?;
    `;

  // Execute the queries
  con.query(agentQuery, [agentId], (agentError, agentResults) => {
    if (agentError) {
      console.error("Error fetching data from Agents table:", agentError);
      return res
        .status(500)
        .json({ error: "Error fetching data from Agents table" });
    }

    if (agentResults.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    con.query(contactQuery, [agentId], (contactError, contactResults) => {
      if (contactError) {
        console.error(
          "Error fetching data from AgentContact table:",
          contactError
        );
        return res
          .status(500)
          .json({ error: "Error fetching data from AgentContact table" });
      }

      const response = {
        agent: agentResults[0],
        contacts: contactResults,
      };
      console.log("Result : \n\n" + JSON.stringify(response));
      // res.json(response);
      res.render("marketing-manager/addVisit/page-addVisit", {
        title: "Add Visit",
        data: response,
        user: emp_id,
      });
    });
  });
}

function searchAgentPage(req, res) {
  empId = req.session.user.emp_id;

  if (!req.session.user || req.session.user.auth_level != 1) {
    res.redirect("/logout");
  }
  const query = "SELECT id, region_name FROM Regions WHERE delete_status=1";
  con.query(query, (err, regions) => {
    if (err) {
      console.error("Error fetching regions:", err);
      res.status(500).send("Server error");
      return;
    }
    res.render("marketing-manager/searchAgent/page-searchAgent", {
      title: "Search Agent",
      regions,
      states,
    });
  });
}

function searchAgent(req, res) {
  const {
    agent_id,
    agent_name,
    agent_city,
    first_name,
    last_name,
    contact_info,
    region_id,
    agent_state,
  } = req.body;
  if (
    !agent_id &&
    !agent_name &&
    !agent_city &&
    !first_name &&
    !last_name &&
    !contact_info &&
    !region_id &&
    !agent_state
  ) {
    res.render("generalMessagePage", {
      title: "Incomplete data",
      messageTitle: "No data entered",
      message:
        "Please fill some data to search. <br>Please go back and enter some data",
    });
  }
  // Construct the query based on search criteria
  let query = `
         SELECT DISTINCT Agents.id, Agents.agent_name, Agents.address, Agents.city, Agents.district, Agents.state, Agents.pincode, AgentContact.first_name, AgentContact.last_name, AgentContact.office_contact, AgentContact.alt_contact, AgentContact.email_id, Regions.region_name
    FROM Agents
    LEFT JOIN AgentContact ON Agents.id = AgentContact.agent_id
    LEFT JOIN Regions ON Agents.region_id = Regions.id
    WHERE 1=1
    `;

  if (agent_id) query += ` AND Agents.id = ${con.escape(agent_id)}`;
  if (agent_name) query += ` AND Agents.agent_name LIKE '%${agent_name}%'`;
  if (agent_city) query += ` AND Agents.city LIKE '%${agent_city}%'`;
  if (agent_state) query += ` AND Agents.state LIKE '%${agent_state}%'`;
  if (first_name)
    query += ` AND AgentContact.first_name LIKE '%${first_name}%'`;
  if (last_name) query += ` AND AgentContact.last_name LIKE '%${last_name}%'`;
  if (contact_info) {
    query += ` AND (AgentContact.office_contact LIKE '%${contact_info}%' OR
                        AgentContact.alt_contact LIKE '%${contact_info}%' OR
                        AgentContact.email_id LIKE '%${contact_info}%')`;
  }
  if (region_id) query += ` AND Agents.region_id = ${con.escape(region_id)}`;

  con.query(query, (err, results) => {
    if (err) {
      console.error("Error executing search query:", err);
      res.status(500).send("Server error");
      return;
    }
    if (results.length == 0) {
      res.render("generalMessagePage", {
        title: "No agents found",
        messageTitle: "No agents found",
        message:
          "No agents found with the given details. Please go back and change the value in fields",
      });
    }
    res.render("marketing-manager/searchAgent/page-searchAgentResult", {
      title: "Search Agent",
      data: results,
    });
  });
}

function addVisit(req, res) {
  const { agent_id, remarks, date, contact_person } = req.body;
  emp_id = req.session.user.emp_id;
  // Check for required fields
  if (!agent_id || !remarks || !date) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Prepare the SQL query to insert data into AgentVisits table
  const query = `
        INSERT INTO AgentVisits (emp_id,agent_id, remarks, visited_date,contact_person, delete_status)
        VALUES (?,?, ?, ?,?, 1);
    `;

  // Execute the SQL query
  con.query(
    query,
    [emp_id, agent_id, remarks, date, contact_person],
    (err, results) => {
      if (err) {
        console.error("Error inserting data into AgentVisits table:", err);
        return res
          .status(500)
          .json({ error: "Error inserting data into AgentVisits table" });
      }

      //   homePage(req, res);
      res.redirect("home");
    }
  );
}

function leadsPage(req, res) {
  empId = req.session.user.emp_id;

  if (!req.session.user || req.session.user.auth_level != 1) {
    res.redirect("/logout");
  }

  // Validate emp_id
  if (!empId) {
    return res.status(400).json({ error: "emp_id is required" });
  }

  // SQL query to fetch leads and related data
  const query = `
        SELECT
            l.id AS lead_id,
            DATE_FORMAT(l.lead_created_date, '%d-%b-%Y') AS lead_created_date,
            l.amount,
            l.no_of_days,
            l.no_of_nights,
            d.destination_name,
            a.agent_name,
            dmc.dmc_name,
            ls.lead_status AS lead_status
        FROM
            Leads l
        LEFT JOIN
            Destinations d ON l.destination_id = d.id
        LEFT JOIN
            Agents a ON l.agent_id = a.id
        LEFT JOIN
            DMC dmc ON l.dmc_id = dmc.id
        LEFT JOIN
            LeadStatus ls ON l.lead_status = ls.id
        WHERE
            l.sales_person = ?
            AND l.delete_status=1 AND d.delete_status=1 AND a.delete_status=1 AND dmc.delete_status =1 AND ls.delete_status =1 LIMIT 25;
    `;

  // Execute the SQL query
  con.query(query, [empId], (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "Error fetching data from the database" });
    }
    res.render("marketing-manager/readLeads/page-readLeads", {
      title: "Read Leads",
      data: results,
    });
  });
}

function addAgentPage(req, res) {
  empId = req.session.user.emp_id;

  if (!req.session.user || req.session.user.auth_level != 1) {
    res.redirect("/logout");
  }
  fetchRegionsAndDestinations(req, res, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err.message);
    } else {
      console.log("All queries executed succesfully");
    }
  });
}

//gets region and destinatin data for the dropdown in the page
function fetchRegionsAndDestinations(req, res, callback) {
  // SQL query to fetch regions
  const sqlRegions = `
    SELECT id, region_name
    FROM Regions
    WHERE delete_status = 1;
  `;

  // SQL query to fetch destinations
  const sqlDestinations = `
    SELECT id, destination_name
    FROM Destinations
    WHERE delete_status = 1;
  `;

  // Execute queries
  con.query(sqlRegions, (err, regions) => {
    if (err) {
      return callback(err);
    }

    con.query(sqlDestinations, (err, destinations) => {
      if (err) {
        return callback(err);
      }

      callback(
        res.render("marketing-manager/addAgent/page-addAgent", {
          title: "Add Agent",
          regions,
          destinations,
          states,
        })
      );
    });
  });
}

//Function to create a new agent
function addAgent(req, res) {
  const {
    agentName,
    address,
    agentCity,
    agentRegion,
    agentDistrict,
    agentState,
    agentPin,
    firstName,
    lastName,
    contactNumber,
    altContactNumber,
    email,
    // isPrimary,
    parentAgentId,
    // destinationId,
  } = req.body;
  destinationId = [1, 0, 2];
  isPrimary = 1;

  // Validate required fields
  if (
    !agentName ||
    !address ||
    !agentCity ||
    !agentRegion ||
    !agentDistrict ||
    !agentState ||
    !agentPin ||
    !firstName ||
    !lastName ||
    !contactNumber ||
    !email ||
    !Array.isArray(destinationId) ||
    destinationId.length === 0
  ) {
    return res
      .status(400)
      .send(
        "All fields are required and destinationId should be a non-empty array."
      );
  }

  con.beginTransaction((err) => {
    if (err) {
      return res.status(500).send(`Error starting transaction: ${err.message}`);
    }

    const checkUniqueQuery = `
     SELECT 
    * 
FROM 
    Agents a
JOIN 
    AgentContact ac ON ac.agent_id = a.id
WHERE 
    a.agent_name = ? 
    AND (a.city = ? OR a.district = ?)
    OR (ac.office_contact = ? 
    OR ac.alt_contact = ? 
    OR ac.email_id = ?)
    AND a.delete_status = 1
    AND ac.delete_status = 1;

    `;

    con.query(
      checkUniqueQuery,
      [
        agentName,
        agentCity,
        agentDistrict,
        contactNumber,
        altContactNumber,
        email,
      ],
      (err, results) => {
        if (err) {
          return con.rollback(() => {
            res.status(500).send(`Error checking uniqueness: ${err.message}`);
          });
        }

        if (results.length > 0) {
          return con.rollback(() => {
            var message = "<br><br>";
            results.forEach((result) => {
              message +=
                "Agent Name  : <b>" +
                result.agent_name +
                "</b> City : <b>" +
                result.city +
                "</b> District : <b>" +
                result.district +
                "</b><br> Contact Person : <b>" +
                result.first_name +
                " " +
                result.last_name +
                "</b> Official Contact : <b>" +
                result.office_contact +
                "</b> Alternate Contact : <b>" +
                result.alt_contact +
                "</b> Email : <b>" +
                result.email_id +
                "</b><br>";
            });
            res.status(400).render("generalMessagePage", {
              title: "Duplicate Data",
              messageTitle: "Duplicate Data",
              message:
                "Either agent with same city / district Exists Or Contact number, alternate contact number, or email already exists.<br>The fetched data are : " +
                message +
                "<br>If you want to create a new contact person for an agent please <a href='searchAgent'>click here </a>. <br>Please contact administrator for support.",
            });
          });
        }

        const agentInsertQuery = `
        INSERT INTO Agents (agent_name, address, city, region_id, district, state, pincode, delete_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `;

        con.query(
          agentInsertQuery,
          [
            agentName,
            address,
            agentCity,
            agentRegion,
            agentDistrict,
            agentState,
            agentPin,
          ],
          (err, result) => {
            if (err) {
              return con.rollback(() => {
                res.status(500).send(`Error inserting agent: ${err.message}`);
              });
            }

            const newAgentId = result.insertId;

            const contactInsertQuery = `
          INSERT INTO AgentContact (first_name, last_name, agent_id, office_contact, alt_contact, email_id, is_primary_contact, delete_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `;

            con.query(
              contactInsertQuery,
              [
                firstName,
                lastName,
                newAgentId,
                contactNumber,
                altContactNumber,
                email,
                isPrimary ? 1 : 0,
              ],
              (err, result) => {
                if (err) {
                  return con.rollback(() => {
                    res
                      .status(500)
                      .send(`Error inserting agent contact: ${err.message}`);
                  });
                }

                if (isPrimary) {
                  const updatePrimaryContactQuery = `
              UPDATE AgentContact SET is_primary_contact = 0 WHERE agent_id = ? AND id != ?
            `;

                  con.query(
                    updatePrimaryContactQuery,
                    [newAgentId, result.insertId],
                    (err, result) => {
                      if (err) {
                        return con.rollback(() => {
                          res
                            .status(500)
                            .send(
                              `Error updating primary contact: ${err.message}`
                            );
                        });
                      }
                    }
                  );
                }

                const geographyInsertQuery = `
            INSERT INTO AgentGeography (agent_id, destination_id, delete_status)
            VALUES (?, ?, 1)
          `;

                const destinationInsertPromises = destinationId.map(
                  (destId) => {
                    return new Promise((resolve, reject) => {
                      con.query(
                        geographyInsertQuery,
                        [newAgentId, destId],
                        (err, result) => {
                          if (err) {
                            return reject(err);
                          }
                          resolve(result);
                        }
                      );
                    });
                  }
                );

                Promise.all(destinationInsertPromises)
                  .then(() => {
                    if (parentAgentId && parentAgentId !== 0) {
                      const parentAgentInsertQuery = `
                  INSERT INTO ParentAgent (agent_id, parent_agent_id)
                  VALUES (?, ?)
                `;

                      con.query(
                        parentAgentInsertQuery,
                        [newAgentId, parentAgentId],
                        (err, result) => {
                          if (err) {
                            return con.rollback(() => {
                              res
                                .status(500)
                                .send(
                                  `Error inserting parent agent: ${err.message}`
                                );
                            });
                          }
                        }
                      );
                    }

                    con.commit((err) => {
                      if (err) {
                        return con.rollback(() => {
                          res
                            .status(500)
                            .send(
                              `Error committing transaction: ${err.message}`
                            );
                        });
                      }
                      res.redirect("home");
                    });
                  })
                  .catch((err) => {
                    con.rollback(() => {
                      res
                        .status(500)
                        .send(
                          `Error inserting agent geography: ${err.message}`
                        );
                    });
                  });
              }
            );
          }
        );
      }
    );
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
  let parts = number.toFixed(2).toString().split(".");

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

module.exports = {
  homePage: homePage,
  addVisitPage: addVisitPage,
  searchAgentPage: searchAgentPage,
  searchAgent: searchAgent,
  addVisit: addVisit,
  leadsPage: leadsPage,
  addAgentPage: addAgentPage,
  addAgent: addAgent,
};

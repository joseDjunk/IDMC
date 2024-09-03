var con = require("./../db");
const bcrypt = require("bcrypt");
const { states } = require("./../constants");
let employeeTarget;
// Function to execute a SQL query and return results as a promise
function executeQuery(sql) {
  return new Promise((resolve, reject) => {
    con.query(sql, (err, results) => {
      if (err) {
        console.log("Error in execute query function " + num);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}
function fetchLeadsId(req, res) {
  var sqlQuery =
    "SELECT l.id, l.agent_id, l.destination_id, l.no_of_days, l.no_of_nights, l.amount, l.sales_person, l.dmc_id, l.lead_status, a.agent_name, d.destination_name, e.first_name, e.last_name, e.emp_id, dm.dmc_name, ls.lead_status AS lead_status_name FROM Leads l LEFT JOIN Agents a ON l.agent_id = a.id LEFT JOIN Destinations d ON l.destination_id = d.id LEFT JOIN Employees e ON l.sales_person = e.id LEFT JOIN DMC dm ON l.dmc_id = dm.id LEFT JOIN LeadStatus ls ON l.lead_status = ls.id WHERE l.id = 1";
  con.query(sqlQuery, function (error, leads) {
    if (error) {
      console.log("Failed to load data from Database \nError is :\n" + error);
    } else {
      res.render("admin/readLeads/page-readLeads", {
        title: "Leads of " + leads[0].agent_name,
        data: leads[0],
      });
    }
  });
}

function fetchNewLeads(req, res) {
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
  // Query 1: Count of Leads
  const query1 = `
    SELECT COUNT(*) AS lead_count
FROM Leads
WHERE lead_status = 5
  AND delete_status = 1
  AND MONTH(lead_created_date) = MONTH(CURRENT_DATE)
  AND YEAR(lead_created_date) = YEAR(CURRENT_DATE);
  `;

  // Query 2: Sum of Amount
  const query2 = `
    SELECT IFNULL(SUM(amount), 0) AS total_amount
FROM Leads
WHERE lead_status = 5
  AND delete_status = 1
  AND MONTH(lead_created_date) = MONTH(CURRENT_DATE)
  AND YEAR(lead_created_date) = YEAR(CURRENT_DATE);
  `;

  // Query 3: Count of Visits in Current Month
  const query3 = `
   SELECT COUNT(*) AS visit_count
FROM AgentVisits
WHERE delete_status = 1
  AND MONTH(visited_date) = MONTH(CURRENT_DATE)
  AND YEAR(visited_date) = YEAR(CURRENT_DATE);
  `;
  const leadsQuery = `
    SELECT 
        l.id,
        l.agent_id,
        a.agent_name,
        l.destination_id,
        d.destination_name,
        l.no_of_days,
        l.no_of_nights,
        l.amount,
        l.sales_person,
        e.first_name,
        e.last_name,
        e.emp_id,
        l.dmc_id,
        l.lead_status
    FROM 
        Leads l
    LEFT JOIN 
        Agents a ON l.agent_id = a.id
    LEFT JOIN 
        Destinations d ON l.destination_id = d.id
    LEFT JOIN 
        Employees e ON l.sales_person = e.id
    WHERE 
        l.lead_status = 2
    LIMIT 25;
  `;

  const dmcQuery = `
    SELECT 
        id,
        dmc_name
    FROM 
        DMC;
  `;
  // Execute queries
  con.query(query1, [empId], (err1, results1) => {
    if (err1) return callback(err1);

    con.query(query2, [empId], (err2, results2) => {
      if (err2) return callback(err2);

      con.query(query3, [empId], (err3, results3) => {
        if (err3) return callback(err3);
        con.query(leadsQuery, (err, leadsResults) => {
          if (err) {
            console.error("Error executing leads query:", err);
            res.status(500).send("Server error");
            return;
          }

          con.query(dmcQuery, (err, dmcResults) => {
            if (err) {
              console.error("Error executing DMC query:", err);
              res.status(500).send("Server error");
              return;
            }

            // Combine results
            const data = {
              leadCount: results1[0].lead_count,
              totalAmount: formatINR(results2[0].total_amount),
              visitCount: results3[0].visit_count,
            };
            console.log("data : " + JSON.stringify(data));
            res.render("admin/home/page-home", {
              title: "Home",
              leads: leadsResults,
              dmcs: dmcResults,
              leadCount: data.leadCount,
              totalAmount: data.totalAmount,
              visitCount: data.visitCount,
            });
          });
        });
      });
    });
  });
}

function updateDMC(req, res) {
  const { leadId, dmcId } = req.body;
  const updateQuery = `UPDATE Leads SET dmc_id = ?, lead_status=? WHERE id = ?`;

  con.query(updateQuery, [dmcId, "3", leadId], (err, result) => {
    if (err) {
      console.error("Error executing update query:", err);
      res.json({ success: false });
      return;
    }

    res.json({ success: true });
  });
}
function fetchPendingLeads(req, res) {
  const query = `
    SELECT 
    l.id,
    l.no_of_days,
    l.no_of_nights,
    a.agent_name,
    d.destination_name,
    m.dmc_name,
    s.lead_status AS lead_status
FROM 
    Leads l
LEFT JOIN 
    Agents a ON l.agent_id = a.id
LEFT JOIN 
    Destinations d ON l.destination_id = d.id
LEFT JOIN 
    DMC m ON l.dmc_id = m.id
LEFT JOIN 
    LeadStatus s ON l.lead_status = s.id
WHERE 
    l.lead_status NOT IN (4, 5);
  `;

  con.query(query, (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      res.status(500).send("Server error");
      return;
    }
    res.render("admin/readLeads/page-readLeads", {
      title: "Pending Leads",
      data: results,
    });
  });
}
function searchAgentPage(req, res) {
  const query = "SELECT id, region_name FROM Regions WHERE delete_status=1";
  con.query(query, (err, regions) => {
    if (err) {
      console.error("Error fetching regions:", err);
      res.status(500).send("Server error");
      return;
    }
    res.render("admin/searchAgent/page-searchAgent", {
      title: "Search Agent",
      regions,
    });
  });
}
function searchAgent(req, res) {
  const {
    agent_id,
    agent_name,
    first_name,
    last_name,
    contact_info,
    region_id,
  } = req.body;

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
    res.render("admin/searchAgent/page-searchAgentResult", {
      title: "Search Agent",
      data: results,
    });
  });
}
function addAgentPage(req, res) {
  fetchRegionsAndDestinations(req, res, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err.message);
    } else {
      console.log("All queries executed succesfully");
    }
  });
}
function addLeadPage(req, res) {
  const agent_id = req.query.agent_id;

  try {
    return new Promise((resolve, reject) => {
      // Step 1: Fetch agent_name from Agents table provided the agent_id
      let query1 = `
      SELECT agent_name
      FROM Agents
      WHERE id = ?;
    `;

      // Step 2: Fetch id and destination_name from Destinations table
      let query2 = `
      SELECT id, destination_name
      FROM Destinations;
    `;

      // Step 3: Fetch emp_id, first_name, last_name from Employees table where access_level=4 in Auth table
      let query3 = `
      SELECT e.emp_id, e.first_name, e.last_name
      FROM Employees e
    `;

      // Step 4: Fetch id and dmc_name from DMC table
      let query4 = `
      SELECT id, dmc_name
      FROM DMC;
    `;
      try {
        // Execute queries
        con.query(query1, [agent_id], (err, results1) => {
          if (err) {
            reject("Error fetching agent_name: " + err.message);
          } else {
            const agentName = results1[0].agent_name;

            con.query(query2, (err, results2) => {
              if (err) {
                reject("Error fetching destinations: " + err.message);
              } else {
                const destinations = results2; // Array of objects with id and destination_name

                con.query(query3, (err, results3) => {
                  if (err) {
                    reject("Error fetching employees: " + err.message);
                  } else {
                    const employees = results3; // Array of objects with emp_id, first_name, last_name

                    con.query(query4, (err, results4) => {
                      if (err) {
                        reject("Error fetching DMCs: " + err.message);
                      } else {
                        const dmcs = results4; // Array of objects with id and dmc_name

                        // Resolve with all fetched data
                        resolve({
                          agentName: agentName,
                          destinations: destinations,
                          employees: employees,
                          dmcs: dmcs,
                        });
                        res.render("admin/addLead/page-addLead", {
                          title: "Add Lead : " + agentName,
                          agent_name: agentName,
                          agent_id: agent_id,
                          destinations: destinations,
                          employees: employees,
                          dmcs: dmcs,
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      } catch (error) {
        console.log("Some error occured : \n" + error);
      }
    });
  } catch (error) {
    console.error("Error in promise : " + error);
  }
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
        res.render("admin/addAgent/page-addAgent", {
          title: "Add Agent",
          regions,
          destinations,
        })
      );
    });
  });
}
//function to add a new agent
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
      SELECT COUNT(*) AS count FROM AgentContact WHERE office_contact = ? OR alt_contact = ? OR email_id = ?
    `;

    con.query(
      checkUniqueQuery,
      [contactNumber, altContactNumber, email],
      (err, results) => {
        if (err) {
          return con.rollback(() => {
            res.status(500).send(`Error checking uniqueness: ${err.message}`);
          });
        }

        if (results[0].count > 0) {
          return con.rollback(() => {
            res.status(400).render("404", {
              message:
                "Contact number, alternate contact number, or email already exists.",
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
                      fetchNewLeads(req, res);
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

// Function to insert lead into Leads table
function insertLead(req, res) {
  const { agentId, destinationId, noOfDays, noOfNights, salesPerson, dmcId } =
    req.body;
  const amount = "0";
  // Validate agent_id, destination_id, and sales_person existence
  const sqlAgentValidation = `SELECT COUNT(*) AS agentExists FROM Agents WHERE id = ? AND delete_status = 1`;
  const sqlDestinationValidation = `SELECT COUNT(*) AS destinationExists FROM Destinations WHERE id = ? AND delete_status = 1`;
  const sqlSalesPersonValidation = `SELECT COUNT(*) AS salesPersonExists FROM Employees WHERE emp_id = ? AND delete_status = 1`;

  // Insert into Leads table
  const sqlInsert = `
    INSERT INTO Leads (agent_id, destination_id, no_of_days, no_of_nights, amount, sales_person, dmc_id, lead_status, delete_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`;

  // Parameters for validation and insert queries
  const paramsAgentValidation = [agentId];
  const paramsDestinationValidation = [destinationId];
  const paramsSalesPersonValidation = [salesPerson];
  const paramsInsert = [
    agentId,
    destinationId,
    noOfDays,
    noOfNights,
    amount,
    salesPerson,
    dmcId,
  ];

  // Execute validation queries first
  con.query(
    sqlAgentValidation,
    paramsAgentValidation,
    function (err, resultsAgent) {
      if (err) {
        console.error("Error validating agent:", err.message);
        return;
      }

      const agentExists = resultsAgent[0].agentExists;

      if (agentExists === 0) {
        console.error(
          "Agent with id " + agentId + " does not exist or is deleted."
        );
        return;
      }

      // Validate destination
      con.query(
        sqlDestinationValidation,
        paramsDestinationValidation,
        function (err, resultsDestination) {
          if (err) {
            console.error("Error validating destination:", err.message);
            return;
          }

          const destinationExists = resultsDestination[0].destinationExists;

          if (destinationExists === 0) {
            console.error(
              "Destination with id " +
                destinationId +
                " does not exist or is deleted."
            );
            return;
          }

          // Validate sales person
          con.query(
            sqlSalesPersonValidation,
            paramsSalesPersonValidation,
            function (err, resultsSalesPerson) {
              if (err) {
                console.error("Error validating sales person:", err.message);
                return;
              }

              const salesPersonExists = resultsSalesPerson[0].salesPersonExists;

              if (salesPersonExists === 0) {
                console.error(
                  "Sales person with id " +
                    salesPerson +
                    " does not exist or is deleted."
                );
                return;
              }

              // Execute insert query if all validations pass
              con.query(sqlInsert, paramsInsert, function (err, resultInsert) {
                if (err) {
                  console.error("Error inserting lead:", err.message);
                } else {
                  console.log(
                    "Lead inserted successfully with ID:",
                    resultInsert.insertId
                  );
                  fetchNewLeads(req, res);
                }
              });
            }
          );
        }
      );
    }
  );
}

//Controller to route to addDestination form
function addDestinationPage(req, res) {
  const sqlRegions = `
    SELECT id, region_name
    FROM Regions
    WHERE delete_status = 1;
  `;
  con.query(sqlRegions, (err, regions) => {
    if (err) {
      return callback(err);
    }
    res.render("admin/addDestination/page-addDestination", {
      title: "Create a new Destination",
      regions: regions,
      states: states,
    });
  });
}
function addDestination(req, res) {
  const { destination_name, region_id, state, country } = req.body;

  // Validate inputs
  if (!destination_name || !region_id || !state || !country) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Insert into database
  const sqlInsert =
    "INSERT INTO Destinations (destination_name, region_id, state, country, delete_status) VALUES (?, ?, ?, ?, 1)";
  con.query(
    sqlInsert,
    [destination_name, region_id, state, country],
    (err, result) => {
      if (err) {
        console.error("Error inserting destination:", err.message);
        return res
          .status(500)
          .json({ message: "Failed to insert destination" });
      }
      fetchNewLeads(req, res);
    }
  );
}

//Controller to create a new User
function addUserPage(req, res) {
  const sqlRegions = `
    SELECT id, region_name
    FROM Regions
    WHERE delete_status = 1;
  `;
  const sqlDesignations = `
    SELECT id, designation
    FROM Designations
    WHERE delete_status = 1;
  `;

  const sqlDMC = `
    SELECT id, dmc_name
    FROM DMC
    WHERE delete_status = 1;
  `;
  con.query(sqlRegions, (err, regions) => {
    if (err) {
      return callback(err);
    }
    con.query(sqlDesignations, (err, designations) => {
      if (err) {
        return callback(err);
      }
      con.query(sqlDMC, (err, dmc) => {
        if (err) {
          return callback(err);
        }
        res.render("admin/addUser/page-addUser", {
          title: "Create a new Destination",
          regions: regions,
          designations: designations,
          states: states,
          dmc: dmc,
        });
      });
    });
  });
}

// Controller to add a new user
function addUser(req, res) {
  try {
    // Fetching the form parameters
    const {
      first_name,
      last_name,
      emp_id,
      designation_id,
      phone,
      alt_phone,
      personal_email_id,
      official_email_id,
      address,
      city,
      state,
      region_id,
      pincode,
      username,
      password,
      re_password,
      dmc_id,
    } = req.body;

    // Basic validation
    if (
      !first_name ||
      !last_name ||
      !emp_id ||
      !username ||
      !password ||
      !re_password
    ) {
      return res.status(400).send("Required fields are missing.");
    }

    if (password !== re_password) {
      return res.status(400).send("Passwords do not match.");
    }

    // Check if emp_id is unique in Employees table
    con.query(
      "SELECT COUNT(*) AS count FROM Employees WHERE emp_id = ?",
      [emp_id],
      async (err, results) => {
        if (err) throw err;
        if (results[0].count > 0) {
          return res.status(400).send("Employee ID already exists.");
        }

        // Check if username is unique in Auth table
        con.query(
          "SELECT COUNT(*) AS count FROM Auth WHERE username = ?",
          [username],
          async (err, results) => {
            if (err) throw err;
            if (results[0].count > 0) {
              return res.status(400).send("Username already exists.");
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert into Employees table
            const employeeData = {
              emp_id,
              first_name,
              last_name,
              designation_id,
              phone,
              alt_phone,
              personal_email_id,
              official_email_id,
              address,
              city,
              state,
              pincode,
              delete_status: 1,
            };

            con.query(
              "INSERT INTO Employees SET ?",
              employeeData,
              (err, results) => {
                if (err) {
                  console.error(
                    "Error inserting into Employees table:\n\n\n",
                    err
                  );
                  return res.status(500).send("Server error");
                }

                // Insert into Auth table
                const authData = {
                  emp_id,
                  username,
                  password: hashedPassword,
                  delete_status: 1,
                };

                con.query(
                  "INSERT INTO Auth SET ?",
                  authData,
                  (err, results) => {
                    if (err) {
                      console.error("Error inserting into Auth table:", err);
                      return res.status(500).send("Server error");
                    }

                    // If designation_id is 3, insert into DMCEmployees table
                    if (designation_id == 3) {
                      const dmcEmployeeData = {
                        emp_id,
                        dmc_id,
                        delete_status: 1,
                      };

                      con.query(
                        "INSERT INTO DMCEmployees SET ?",
                        dmcEmployeeData,
                        (err, results) => {
                          if (err) {
                            console.error(
                              "Error inserting into DMCEmployees table:",
                              err
                            );
                            return res.status(500).send("Server error");
                          }
                          fetchNewLeads(req, res);
                        }
                      );
                    } else {
                      fetchNewLeads(req, res);
                    }
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("Server error:\n\n\n\n", error);
    res.status(500).send("Server error<br>", error);
  }
}
async function test() {}
//Controller to load Admin Hub Page
function adminHubPage(req, res) {
  //Employee target
  //Agent visit details
  fetchEmployeeTarget()
    .then(() => test())
    .catch((err) => console.error("Error:", err))
    .finally(() => {
      console.log("Employee Target : " + employeeTarget);
      res.render("admin/adminHub/page-adminHub", {
        title: "Admin Hub",
        employeeTarget: employeeTarget,
      });
    });
}

async function fetchEmployeeTarget() {
  let sql;
  try {
    sql = `SELECT 
    E.first_name, 
    E.last_name, 
    ET.emp_id, 
    ET.target_amount
FROM 
    EmployeeTarget ET
JOIN 
    Employees E ON ET.emp_id = E.emp_id
WHERE 
    ET.delete_status = 1;
`;
    const result = await executeQuery(sql);
    employeeTarget = result;
    return result;
  } catch (error) {
    console.log("Error Occured in executing query : " + error);
  }
}

async function updateTargetAmount(req, res) {
  const empId = req.query.empId;
  const targetAmount = req.query.targetAmount;
  console.log("DATA recieved : " + empId + " - " + targetAmount);
  let sql = `UPDATE EmployeeTarget SET target_amount = ${targetAmount} WHERE emp_id='${empId}' AND delete_status=1`;
  const result = await executeQuery(sql);
  if (result.affectedRows > 0) {
    res.send("OK");
  } else {
    res.status(500).send(`Error`);
  }
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
  fetchLeadsId: fetchLeadsId,
  fetchNewLeads: fetchNewLeads,
  updateDMC: updateDMC,
  fetchPendingLeads: fetchPendingLeads,
  searchAgentPage: searchAgentPage,
  searchAgent: searchAgent,
  insertLead: insertLead,
  addAgentPage: addAgentPage,
  addAgent: addAgent,
  addLeadPage: addLeadPage,
  addDestinationPage: addDestinationPage,
  addUserPage: addUserPage,
  addDestination: addDestination,
  addUser: addUser,
  adminHubPage: adminHubPage,
  updateTargetAmount: updateTargetAmount,
};

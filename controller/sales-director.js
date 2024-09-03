const { json, query } = require("express");
var con = require("../db");
const { sql } = require("googleapis/build/src/apis/sql");
let DMCLabels;
let DMCName;
let MMName;
let MMSideBarLabel;
let DMCSideBarLabel;
let leadCountByMonth;
let salesCountByMonth;
let salesCountByDMC;
let amountCountPerDMC;
let SalesCountPerMM;
let pendingLeads;
let salesCountByMonthDMC;
let leadsCountByMonthDMC;
let amountCountPerMM;
let leadStatusArray;
let leadCountbyStatusArray;
let targetpercentage;
let salesCountByMM;
let amountCountPerDMCPerMM;
let statTotalAmount;
let statTotalSales;
let statTotalVisits;
let statTotalLeads;
const target = 200000;

let startDate;
let endDate;

//Getting the names of DMCs

async function DMCList() {
  try {
    const sql = `
           SELECT id, dmc_name AS dmc
FROM DMC
WHERE delete_status = 1;
        `;
    const results = await executeQuery(sql, 5);
    //
    DMCSideBarLabel = results;
    return results;
  } catch (error) {
    throw error;
  }
}
//Fetching the list of all marketing managers
async function getMMList() {
  try {
    const sql = `
           SELECT id,emp_id,emp_id, first_name, last_name
FROM Employees
WHERE delete_status = 1 AND designation_id=1;
        `;
    const results = await executeQuery(sql, 5);
    //
    MMSideBarLabel = results;
    return results;
  } catch (error) {
    throw error;
  }
}

function loadHomePage(req, res) {
  if (req.query.startDate) {
    startDate = req.query.startDate;
  } else {
    startDate = "";
  }

  if (req.query.endDate) {
    endDate = req.query.endDate;
  } else {
    endDate = "";
  }
  getSalesCountByMonth()
    .then(() => getAllLeadsCountByMonth(startDate, endDate))
    .then(() => getSalesCountByMonthPerDMC())
    .then(() => getAmountByMonthPerDMC())
    .then(() => getSalesCountByMonthPerSalesPerson())
    .then(() => fetchPendingLeads())
    .then(() => DMCList())
    .then(() => getMMList())
    .then(() => getAllMMTargetPercentage())
    .then(() => getAllSalesCount(startDate, endDate))
    .then(() => getAllRevenueCount())
    .then(() => getAllVisitsCount())
    .catch((err) => console.error("Error:", err))
    .finally(() => {
      const chartTitleGraph = "Monthly Leads and Sales";
      const chartTitleBarApex = "Monthly Sales";
      const monthLabels = leadCountByMonth.map((data) => data.month); // For Graph
      DMCLabels = salesCountByDMC.map((data) => data.dmc_name); // For multiple
      const salesPerDMC = salesCountByDMC.map((data) => data.lead_count); // For bar apex
      const leadCountByMonths = leadCountByMonth.map((data) => data.lead_count); // For graph
      const salesCountByMonths = salesCountByMonth.map(
        (data) => data.sales_count
      ); //For grpah
      const salesPersonLabel = SalesCountPerMM.map(
        (data) => data.first_name + " " + data.last_name
      ); // For circleChart
      const amountTargeLabel = SalesCountPerMM.map(
        (data) => (data.total_amount * 100) / target
      ); // For circleChart
      const amountLabels = amountCountPerDMC.map((data) => data.total_amount); // Fo Pie
      // Extract sales_person values into one array
      const salesPersons = targetpercentage.map(
        (item) => item.first_name + " " + item.last_name
      );

      // Extract percentage_of_target values into another array
      const percentages = targetpercentage.map(
        (item) => item.percentage_of_target
      );

      res.render("sales-director/home/page-home", {
        title: "home",
        tableTitle: "DMC",
        chartTitleGraph,
        chartTitleBarApex,
        leadCountByMonth: JSON.stringify(leadCountByMonths),
        salesCountByMonth: JSON.stringify(salesCountByMonths),
        monthLabels: JSON.stringify(monthLabels),
        Labels: JSON.stringify(DMCLabels),
        DMCLabels: JSON.stringify(DMCLabels),
        salesPerDMC: JSON.stringify(salesPerDMC),
        amountLabels: JSON.stringify(amountLabels),
        salesPersonLabel: JSON.stringify(salesPersons),
        amountTargeLabel: JSON.stringify(percentages),
        DMCLabel: DMCLabels,
        DMCSideBarLabel: DMCSideBarLabel,
        pendingLeads: pendingLeads,
        MMSideBarLabel: MMSideBarLabel,
        leadCount: statTotalSales,
        totalAmount: statTotalAmount,
        visitCount: statTotalVisits,
        leadsCount: statTotalVisits,
        startDate: startDate ? startDate : "",
        endDate: endDate ? endDate : "",
      });
    });
}
// Function to execute a SQL query and return results as a promise
function executeQuery(sql, num) {
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

// 1. Find count of leads where lead_status = 5 for every month for last 12 months
async function getSalesCountByMonth() {
  let sql;
  if (startDate && endDate) {
    sql = `SELECT
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    CASE WHEN COUNT(*) > 0 THEN 
        COUNT(*) 
    ELSE 
        0 
    END AS sales_count
FROM
    Leads
WHERE
    lead_status = 5
    AND lead_created_date BETWEEN '${startDate}' AND '${endDate}'
GROUP BY
    month
ORDER BY
    month;
`;
  } else {
    sql = `
            SELECT
            DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
            CASE WHEN COUNT(*)>0 THEN 
            COUNT(*) ELSE 0 END AS sales_count
        FROM
            Leads
        WHERE
            lead_status = 5
            AND lead_created_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY
            month
        ORDER BY
            month;
        `;
  }
  try {
    const results = await executeQuery(sql, 1);
    salesCountByMonth = results;
    return results;
  } catch (error) {
    throw error;
  }
}

// 2. Find count of leads for every month for last 12 months
async function getAllLeadsCountByMonth() {
  let sql;
  if (startDate && endDate) {
    sql = `SELECT
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    CASE WHEN COUNT(*) > 0 THEN 
        COUNT(*) 
    ELSE 
        0 
    END AS lead_count
FROM
    Leads
WHERE 
lead_created_date BETWEEN '${startDate}' AND '${endDate}'
GROUP BY
    month
ORDER BY
    month;
`;
  } else {
    sql = `
            SELECT
            DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
            COUNT(*) AS lead_count
        FROM
            Leads
        WHERE
            lead_created_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY
            month
        ORDER BY
            month;

        `;
  }
  try {
    const results = await executeQuery(sql, 2);
    leadCountByMonth = results;

    // Create a map of salesCountByMonth for quick lookup
    const salesMap = new Map(
      salesCountByMonth.map((item) => [item.month, item.sales_count])
    );

    // Iterate over leadCountByMonth to construct the result
    salesCountByMonth = leadCountByMonth.map((item) => ({
      month: item.month,
      sales_count: salesMap.get(item.month) || "0", // Use '0' if month is not in salesMap
    }));
    return results;
  } catch (error) {
    throw error;
  }
}

// 3. Find count of leads where lead_status = 5 for every month for last 12 months for every DMC. For bar APex
async function getSalesCountByMonthPerDMC() {
  let sql;
  if (startDate && endDate) {
    sql = `SELECT
    d.dmc_name,
    COUNT(l.id) AS lead_count
FROM
    DMC d
LEFT JOIN
    Leads l ON d.id = l.dmc_id
           AND l.lead_status = 5
           AND l.lead_created_date BETWEEN '${startDate}' AND '${endDate}'
GROUP BY
    d.dmc_name
ORDER BY
    d.dmc_name;
`;
  } else {
    sql = `
            SELECT
    d.dmc_name,
    COUNT(l.id) AS lead_count
FROM
    DMC d
LEFT JOIN
    Leads l ON d.id = l.dmc_id
           AND l.lead_status = 5
           AND YEAR(l.lead_created_date) = YEAR(CURDATE())
           AND MONTH(l.lead_created_date) = MONTH(CURDATE())
GROUP BY
    d.dmc_name
ORDER BY
    d.dmc_name;
        `;
  }
  try {
    const results = await executeQuery(sql, 3);
    salesCountByDMC = results;
    return results;
  } catch (error) {
    throw error;
  }
}

// 4. Find sum of amount of leads where lead_status = 5 for DMC wise. Used in sd-Pie
async function getAmountByMonthPerDMC() {
  let sql;
  if (startDate && endDate) {
    sql = `SELECT
    DATE_FORMAT(l.lead_created_date, '%Y-%m') AS month,
    d.dmc_name,
    SUM(l.amount) AS total_amount
FROM
    Leads l
JOIN
    DMC d ON l.dmc_id = d.id
WHERE
    l.lead_status = 5
    AND l.lead_created_date BETWEEN '${startDate}' AND '${endDate}'
GROUP BY
    month, d.dmc_name
ORDER BY
    month, d.dmc_name;
`;
  } else {
    sql = `
            SELECT
        DATE_FORMAT(l.lead_created_date, '%Y-%m') AS month,
        d.dmc_name,
        SUM(l.amount) AS total_amount
    FROM
        Leads l
    JOIN
        DMC d ON l.dmc_id = d.id
    WHERE
        l.lead_status = 5
        AND l.lead_created_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    GROUP BY
        month, d.dmc_name
    ORDER BY
        month, d.dmc_name;
        `;
  }
  try {
    const results = await executeQuery(sql, 4);
    amountCountPerDMC = results;

    const result = amountCountPerDMC.reduce((acc, curr) => {
      const { dmc_name, total_amount } = curr;
      if (!acc[dmc_name]) {
        acc[dmc_name] = { dmc_name, total_amount: 0 };
      }
      acc[dmc_name].total_amount += total_amount;
      return acc;
    }, {});

    const aggregatedArray = Object.values(result);

    amountCountPerDMC = aggregatedArray;

    return results;
  } catch (error) {
    throw error;
  }
}

// 5. Find sum of amount of leads where lead_status = 5 for every month for last 12 months sales person wise
async function getSalesCountByMonthPerSalesPerson() {
  try {
    const sql = `
            SELECT
            DATE_FORMAT(l.lead_created_date, '%Y-%m') AS month,
            e.first_name,
            e.last_name,
            SUM(l.amount) AS total_amount
        FROM
            Leads l
        JOIN
            employees e ON l.sales_person = e.emp_id
        WHERE
            l.lead_status = 5
            AND l.lead_created_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        GROUP BY
            month, e.first_name, e.last_name
        ORDER BY
            month, e.first_name, e.last_name;
        `;
    const results = await executeQuery(sql, 5);
    //
    SalesCountPerMM = results;
    return results;
  } catch (error) {
    throw error;
  }
}

// 6. Fetching the pending leads
async function fetchPendingLeads() {
  try {
    const sql = `
           
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
    const results = await executeQuery(sql, 5);
    //
    pendingLeads = results;
    return results;
  } catch (error) {
    throw error;
  }
}

async function getAllMMTargetPercentage() {
  try {
    const sql = ` SELECT 
    L.sales_person,
    E.first_name,
    E.last_name,
    SUM(L.amount) AS total_amount,
    ET.target_amount,
    (SUM(L.amount) / ET.target_amount) * 100 AS percentage_of_target
FROM 
    Leads L
JOIN 
    EmployeeTarget ET ON L.sales_person = ET.emp_id
JOIN 
    Employees E ON L.sales_person = E.emp_id
WHERE 
    E.designation_id = 1
    AND L.delete_status = 1
    AND MONTH(L.lead_created_date) = MONTH(CURRENT_DATE)
    AND YEAR(L.lead_created_date) = YEAR(CURRENT_DATE)
GROUP BY 
    L.sales_person, E.first_name, E.last_name, ET.target_amount;`;
    const results = await executeQuery(sql, 5);
    targetpercentage = results;
  } catch (err) {
    console.error("Error fetching leads data:", err);
  }
}

async function getAllSalesCount(startDate, endDate) {
  let sql;
  if (startDate && endDate) {
    sql = `SELECT COUNT(*) AS lead_count
FROM Leads
WHERE lead_status = 5
  AND delete_status = 1
  AND lead_created_date BETWEEN '${startDate}' AND '${endDate}';
`;
  } else {
    sql = `SELECT COUNT(*) AS lead_count
FROM Leads
WHERE lead_status = 5
  AND delete_status = 1
  AND MONTH(lead_created_date) = MONTH(CURRENT_DATE)
  AND YEAR(lead_created_date) = YEAR(CURRENT_DATE);`;
  }
  try {
    const results = await executeQuery(sql, 15);
    statTotalSales = results[0].lead_count;
  } catch (err) {
    console.error("Error fetching leads data:", err);
  }
}
//Shows the total revenie showed in Revenue card(headCard)
async function getAllRevenueCount() {
  let sql;
  if (startDate && endDate) {
    sql = `SELECT IFNULL(SUM(amount), 0) AS total_amount
FROM Leads
WHERE lead_status = 5
  AND delete_status = 1
  AND lead_created_date BETWEEN '${startDate}' AND '${endDate}';
`;
  } else {
    sql = `SELECT IFNULL(SUM(amount), 0) AS total_amount
FROM Leads
WHERE lead_status = 5
  AND delete_status = 1
  AND MONTH(lead_created_date) = MONTH(CURRENT_DATE)
  AND YEAR(lead_created_date) = YEAR(CURRENT_DATE);`;
  }
  try {
    const results = await executeQuery(sql, 16);
    statTotalAmount = formatINR(results[0].total_amount);
  } catch (err) {
    console.error("Error fetching leads data:", err);
  }
}

async function getAllVisitsCount() {
  let sql;
  if (startDate && endDate) {
    sql = `SELECT COUNT(*) AS visit_count
FROM AgentVisits
WHERE delete_status = 1
  AND visited_date BETWEEN '${startDate}' AND '${endDate}';
`;
  } else {
    sql = `
   SELECT COUNT(*) AS visit_count
FROM AgentVisits
WHERE delete_status = 1
  AND MONTH(visited_date) = MONTH(CURRENT_DATE)
  AND YEAR(visited_date) = YEAR(CURRENT_DATE);`;
  }
  try {
    const results = await executeQuery(sql, 5);

    statTotalVisits = results[0].visit_count;
    // console.log("statTotalVisits : " + statTotalVisits);
  } catch (err) {
    console.error("Error fetching leads data:", err);
  }
}

// FOR DMC Page
function loadDMCPage(req, res) {
  if (req.query.startDate) {
    startDate = req.query.startDate;
  } else {
    startDate = "";
  }

  if (req.query.endDate) {
    endDate = req.query.endDate;
  } else {
    endDate = "";
  }
  getSalesCountByMonthDMC(req)
    .then(() => getLeadsCountByMonthDMC(req))
    .then(() => getAmountByMonthPerMMDMC(req))
    .then(() => fetchPendingLeadsDMC(req))
    .then(() => DMCList())
    .then(() => getDMCName(req))
    .then(() => getMMList(req))
    .then(() => getStats(req))
    .catch((err) => console.error("Error:", err))
    .finally(() => {
      // Extract months, lead_count, and lead_count_5 arrays from json1 and json2
      const months = leadsCountByMonthDMC.map((obj) => obj.month);
      const leadsCount = leadsCountByMonthDMC.map((obj) => obj.lead_count);
      const salesCount = salesCountByMonthDMC.map((obj) => obj.lead_count);

      // Check if arrays have equal lengths
      if (
        months.length !== leadsCount.length ||
        months.length !== salesCount.length
      ) {
        console.error(
          "Error in creating the data output: Array lengths are not equal."
        );
      } else {
      }
      const totalAmounts = amountCountPerMM.map((item) => item.total_amount);
      const fullNames = amountCountPerMM.map(
        (item) => `${item.first_name} ${item.last_name}`
      );
      res.render("sales-director/dmc/page-dmc", {
        title: DMCName[0].dmc,
        tableTitle: "MM",
        monthLabels: JSON.stringify(months),
        leadCountByMonth: JSON.stringify(leadsCount),
        salesCountByMonth: JSON.stringify(salesCount),
        chartTitleGraph: "Monthly Leads and Sales",
        DMCLabel: DMCLabels,
        Labels: JSON.stringify(fullNames),
        amountLabels: JSON.stringify(totalAmounts),
        pendingLeads: pendingLeads,
        DMCSideBarLabel: DMCSideBarLabel,
        DMCName: DMCName[0].dmc,
        DMCId: DMCName[0].id,
        MMSideBarLabel: MMSideBarLabel,
        leadCount: statTotalSales,
        totalAmount: statTotalAmount,
        leadsCount: statTotalLeads,
        visitCount: "",
        startDate: startDate ? startDate : "",
        endDate: endDate ? endDate : "",
      });
    });
}

//Sales count for sd-graph
async function getSalesCountByMonthDMC(req) {
  let sql;
  dmc_id = req.query.dmc_id;
  if (startDate && endDate) {
    sql = `SELECT
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    SUM(CASE WHEN lead_status = 5 THEN 1 ELSE 0 END) AS lead_count
FROM
    Leads
WHERE
    dmc_id = '${dmc_id}'
    AND lead_status IS NOT NULL
    AND lead_created_date BETWEEN '${startDate}' AND '${endDate}'
GROUP BY
    month
ORDER BY
    month;
`;
  } else {
    sql = `
         SELECT
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    SUM(CASE WHEN lead_status = 5 THEN 1 ELSE 0 END) AS lead_count
FROM
    Leads
WHERE
    dmc_id = '${dmc_id}'
    AND lead_status IS NOT NULL
GROUP BY
    month
ORDER BY
    month;

        `;
  }
  try {
    const results = await executeQuery(sql, 101);
    salesCountByMonthDMC = results;
    console.log(
      "Sales Count in sql function : " + JSON.stringify(salesCountByMonthDMC)
    );

    return results;
  } catch (error) {
    throw error;
  }
}
//leads count for sd-graph
async function getLeadsCountByMonthDMC(req) {
  dmc_id = req.query.dmc_id;
  let sql;
  if (startDate && endDate) {
    sql =
      `SELECT 
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    COUNT(id) AS lead_count
FROM 
    Leads
WHERE 
    dmc_id = ` +
      dmc_id +
      ` 
    AND delete_status = 1
    AND lead_created_date BETWEEN '` +
      startDate +
      `' AND '` +
      endDate +
      `'
GROUP BY 
    DATE_FORMAT(lead_created_date, '%Y-%m');
`;
  } else {
    sql =
      `
            SELECT 
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    COUNT(id) AS lead_count
FROM 
    Leads
WHERE 
    dmc_id = ` +
      dmc_id +
      ` 
    AND delete_status = 1
GROUP BY 
    DATE_FORMAT(lead_created_date, '%Y-%m');
        `;
  }
  try {
    const results = await executeQuery(sql, 1);
    leadsCountByMonthDMC = results;
    return results;
  } catch (error) {
    throw error;
  }
}

//Sales amount for sd-pie
async function getAmountByMonthPerMMDMC(req) {
  let sql;
  if (startDate && endDate) {
    sql = `SELECT
        DATE_FORMAT(l.lead_created_date, '%Y-%m') AS month,
        d.first_name,d.last_name,
        SUM(l.amount) AS total_amount
    FROM
        Leads l
    JOIN
        Employees d ON l.sales_person = d.emp_id
    WHERE
        l.lead_status = 5
    AND l.lead_created_date BETWEEN '${startDate}' AND '${endDate}'
        AND l.dmc_id='${dmc_id}'
    GROUP BY
        month, d.id
    ORDER BY
        month, d.id;
`;
  } else {
    sql =
      `
           SELECT
        DATE_FORMAT(l.lead_created_date, '%Y-%m') AS month,
        d.first_name,d.last_name,
        SUM(l.amount) AS total_amount
    FROM
        Leads l
    JOIN
        Employees d ON l.sales_person = d.emp_id
    WHERE
        l.lead_status = 5
        AND l.lead_created_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        AND l.dmc_id=` +
      dmc_id +
      `
    GROUP BY
        month, d.id
    ORDER BY
        month, d.id;
        `;
  }
  try {
    const results = await executeQuery(sql, 4);
    amountCountPerMM = results;
    console.log("Data for pie : " + JSON.stringify(amountCountPerMM));
    // Split the data into two arrays
    const finalArray = Object.values(
      amountCountPerMM.reduce((acc, item) => {
        const key = `${item.first_name}-${item.last_name}`;

        // If the key already exists, accumulate the total_amount
        if (!acc[key]) {
          acc[key] = {
            first_name: item.first_name,
            last_name: item.last_name,
            total_amount: 0,
          };
        }

        // Sum the total_amount
        acc[key].total_amount += item.total_amount;

        return acc;
      }, {})
    );
    amountCountPerMM = finalArray;
    return results;
  } catch (error) {
    throw error;
  }
}

//Pending leads for dmc
async function fetchPendingLeadsDMC(req) {
  dmc_id = req.query.dmc_id;

  try {
    const sql =
      `
           SELECT 
    l.id,
    l.no_of_days,
    l.no_of_nights,
    a.agent_name,
    d.destination_name,
    e.first_name,
    e.last_name,
    s.lead_status AS lead_status
FROM 
    Leads l
LEFT JOIN 
    Agents a ON l.agent_id = a.id
LEFT JOIN 
    Destinations d ON l.destination_id = d.id
LEFT JOIN 
    EMployees e ON l.sales_person = e.emp_id
LEFT JOIN 
    LeadStatus s ON l.lead_status = s.id
WHERE 
    l.lead_status NOT IN (4, 5) AND l.dmc_id =` +
      dmc_id +
      `;
        `;
    const results = await executeQuery(sql, 5);
    //
    pendingLeads = results;
    return results;
  } catch (error) {
    throw error;
  }
}

//getting the name of DMC from id
async function getDMCName(req) {
  dmc_id = req.query.dmc_id;

  try {
    const sql =
      `
           SELECT dmc_name AS dmc
FROM DMC
WHERE id=` +
      dmc_id +
      ` AND delete_status = 1;
        `;
    const results = await executeQuery(sql, 5);
    //
    DMCName = results;
    return results;
  } catch (error) {
    throw error;
  }
}

//getting the name of MM from id
async function getMMName(req) {
  mm_id = req.query.mm_id;
  try {
    const sql = ` SELECT emp_id,first_name,last_name
FROM Employees
WHERE emp_id ='${mm_id}' AND delete_status = 1;
        `;
    const results = await executeQuery(sql, 5);
    //
    MMName = results;
    return results;
  } catch (error) {
    throw error;
  }
}

async function getStats(req, res) {
  var dmc_id = req.query.dmc_id;

  // Get today's date
  let endDate = getTodaysDate();
  endDate = new Date(endDate).toISOString().split("T")[0];

  // Get the first day of the current month
  let startDate = getFirstDayOfCurrentMonth();
  startDate = new Date(startDate).toISOString().split("T")[0];
  try {
    const sql = ` 
    SELECT 
      SUM(CASE WHEN lead_status = 5 THEN amount ELSE 0 END) AS total_amount,
      COUNT(CASE WHEN lead_status = 5 THEN 1 ELSE NULL END) AS total_sales,
      COUNT(*) AS total_count_leads
    FROM 
      Leads
    WHERE 
      delete_status = 1
      AND dmc_id = '${dmc_id}'
      AND lead_created_date BETWEEN '${startDate}' AND '${endDate}'
        `;
    const results = await executeQuery(sql, 5);
    //
    statistics = results;
    statTotalSales = results[0].total_sales;
    statTotalAmount = results[0].total_amount;
    statTotalLeads = results[0].total_count_leads;
    return results;
  } catch (error) {
    throw error;
  }
}

function loadMMPage(req, res) {
  if (req.query.startDate) {
    startDate = req.query.startDate;
  } else {
    startDate = "";
  }

  if (req.query.endDate) {
    endDate = req.query.endDate;
  } else {
    endDate = "";
  }
  getMMList()
    .then(() => DMCList())
    .then(() => getMMName(req))
    .then(() => getLeadStatusCount(req))
    .then(() => getMMTargetPercentage(req))
    .then(() => getSalesCountByMonthMM(req))
    .then(() => getLeadsCountByMonthMM(req))
    .then(() => getSalesCountByMonthPerMM(req))
    .then(() => getAmountByMonthPerDMCPerMM(req))
    .then(() => fetchPendingLeadsByMM(req))
    .then(() => getAllSalesCountMM(req, res))
    .then(() => getAllRevenueCountMM(req, res))
    .then(() => getAllVisitsCountMM(req, res))
    .catch((err) => console.error("Error:", err))
    .finally(() => {
      // Extract months, lead_count, and lead_count_5 arrays from json1 and json2
      const months = leadsCountByMonthDMC.map((obj) => obj.month);
      const leadsCount = leadsCountByMonthDMC.map((obj) => obj.lead_count);
      const salesCount = salesCountByMonthDMC.map((obj) => obj.lead_count);
      const salesPerDMC = salesCountByMM.map((data) => data.lead_count); // For bar apex
      DMCLabels = salesCountByMM.map((data) => data.dmc_name); // For multiple
      const amountLabels = amountCountPerDMCPerMM.map(
        (data) => data.total_amount
      ); // Fo Pie
      res.render("sales-director/marketing-manager/page-marketing-manager", {
        title: MMName[0].first_name + " " + MMName[0].last_name,
        tableTitle: "DMC",
        DMCSideBarLabel: DMCSideBarLabel,
        MMSideBarLabel: MMSideBarLabel,
        MMId: MMName[0].emp_id,
        leadCountbyStatusArray: JSON.stringify(leadCountbyStatusArray),
        leadStatusArray: JSON.stringify(leadStatusArray),
        targetPercentage: JSON.stringify(
          targetpercentage[0].percentage_of_target
        ),
        targetAmount: JSON.stringify(targetpercentage[0].target_amount),
        salesAmount: JSON.stringify(targetpercentage[0].total_amount),
        monthLabels: JSON.stringify(months),
        leadCountByMonth: JSON.stringify(leadsCount),
        salesCountByMonth: JSON.stringify(salesCount),
        chartTitleGraph:
          "Monthly Leads and Sales of " +
          MMName[0].first_name +
          " " +
          MMName[0].last_name,
        salesPerDMC: JSON.stringify(salesPerDMC),
        DMCLabels: JSON.stringify(DMCLabels),
        chartTitleBarApex:
          "Sales by " +
          MMName[0].first_name +
          " " +
          MMName[0].last_name +
          " for DMCs",
        amountLabels: JSON.stringify(amountLabels),
        Labels: JSON.stringify(DMCLabels),
        pendingLeads: pendingLeads,
        leadCount: statTotalSales,
        totalAmount: statTotalAmount,
        visitCount: statTotalVisits,
        leadsCount: statTotalSales,
        startDate: startDate ? startDate : "",
        endDate: endDate ? endDate : "",
      });
    });
}

//Data for sales funnel
async function getLeadStatusCount(req) {
  mm_id = req.query.mm_id;
  let sql;
  if (startDate && endDate) {
    sql = `SELECT 
    (SELECT COUNT(id) 
     FROM Leads 
     WHERE delete_status = 1 
       AND sales_person = '${mm_id}' 
       AND lead_created_date BETWEEN '${startDate}' AND '${endDate}') AS total_leads,
     
    (SELECT COUNT(id) 
     FROM Leads 
     WHERE delete_status = 1 
       AND sales_person = '${mm_id}' 
       AND lead_created_date BETWEEN '${startDate}' AND '${endDate}'
       AND lead_status != 4 
       AND lead_status != 5) AS active_leads,
     
    (SELECT COUNT(id) 
     FROM Leads 
     WHERE delete_status = 1 
       AND sales_person = '${mm_id}' 
       AND lead_created_date BETWEEN '${startDate}' AND '${endDate}'
       AND lead_status = 4) AS rejected,
     
    (SELECT COUNT(id) 
     FROM Leads 
     WHERE delete_status = 1 
       AND sales_person = '${mm_id}' 
       AND lead_created_date BETWEEN '${startDate}' AND '${endDate}'
       AND lead_status = 5) AS sales;
`;
  } else {
    sql = ` 
    SELECT 
      (SELECT COUNT(id) 
       FROM Leads 
       WHERE delete_status = 1 
         AND sales_person = '${mm_id}' 
         AND MONTH(lead_created_date) = MONTH(CURRENT_DATE())
         AND YEAR(lead_created_date) = YEAR(CURRENT_DATE())) AS total_leads,
         
      (SELECT COUNT(id) 
       FROM Leads 
       WHERE delete_status = 1 
         AND sales_person = '${mm_id}'
         AND MONTH(lead_created_date) = MONTH(CURRENT_DATE())
         AND YEAR(lead_created_date) = YEAR(CURRENT_DATE())
         AND lead_status != 4 
         AND lead_status != 5) AS active_leads,
         
      (SELECT COUNT(id) 
       FROM Leads 
       WHERE delete_status = 1 
         AND sales_person = '${mm_id}' 
         AND MONTH(lead_created_date) = MONTH(CURRENT_DATE())
         AND YEAR(lead_created_date) = YEAR(CURRENT_DATE())
         AND lead_status = 4) AS rejected,
         
      (SELECT COUNT(id) 
       FROM Leads 
       WHERE delete_status = 1 
         AND sales_person = '${mm_id}' 
         AND MONTH(lead_created_date) = MONTH(CURRENT_DATE())
         AND YEAR(lead_created_date) = YEAR(CURRENT_DATE())
         AND lead_status = 5) AS sales;`;
  }
  try {
    const results = await executeQuery(sql, 5);
    if (results.length === 0) {
      return { keys: [], values: [] };
    }

    leadStatusArray = Object.keys(results[0]);
    leadCountbyStatusArray = Object.values(results[0]);
    return { leadStatusArray, leadCountbyStatusArray };
  } catch (err) {
    console.error("Error fetching leads data:", err);
  }
}

async function getMMTargetPercentage(req) {
  mm_id = req.query.mm_id;
  const sql = ` SELECT 
    SUM(L.amount) AS total_amount,
    ET.target_amount,
ROUND((SUM(L.amount) / ET.target_amount) * 100, 0) AS percentage_of_target
FROM 
    Leads L
JOIN 
    EmployeeTarget ET
ON 
    L.sales_person = ET.emp_id
WHERE 
    L.sales_person = '${mm_id}'
    AND L.delete_status = 1
    AND L.lead_status=5
    AND MONTH(L.lead_created_date) = MONTH(CURRENT_DATE)
    AND YEAR(L.lead_created_date) = YEAR(CURRENT_DATE);`;

  try {
    const results = await executeQuery(sql, 5);
    targetpercentage = results;
  } catch (err) {
    console.error("Error fetching leads data:", err);
  }
}

//Sales count for sd-graph
async function getSalesCountByMonthMM(req) {
  mm_id = req.query.mm_id;
  let sql;
  if (startDate && endDate) {
    sql = `SELECT
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    SUM(CASE WHEN lead_status = 5 THEN 1 ELSE 0 END) AS lead_count
FROM
    Leads
WHERE
    sales_person = '${mm_id}'
    AND lead_status IS NOT NULL
    AND lead_created_date BETWEEN '${startDate}' AND '${endDate}'
GROUP BY
    month
ORDER BY
    month;
`;
  } else {
    sql = `
    
         SELECT
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    SUM(CASE WHEN lead_status = 5 THEN 1 ELSE 0 END) AS lead_count
FROM
    Leads
WHERE
    sales_person = '${mm_id}'
    AND lead_status IS NOT NULL
GROUP BY
    month
ORDER BY
    month;
        `;
  }
  try {
    const results = await executeQuery(sql, 2);
    salesCountByMonthDMC = results;
    return results;
  } catch (error) {
    throw error;
  }
}
//leads count for sd-graph
async function getLeadsCountByMonthMM(req) {
  mm_id = req.query.mm_id;
  let sql;
  if (startDate && endDate) {
    sql = `SELECT 
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    COUNT(id) AS lead_count
FROM 
    Leads
WHERE 
    sales_person = '${mm_id}' 
    AND delete_status = 1
    AND lead_created_date BETWEEN '${startDate}' AND '${endDate}'
GROUP BY 
    month;
`;
  } else {
    sql = `
            SELECT 
    DATE_FORMAT(lead_created_date, '%Y-%m') AS month,
    COUNT(id) AS lead_count
FROM 
    Leads
WHERE sales_person= '${mm_id}' AND delete_status = 1
GROUP BY 
    month;
        `;
  }
  try {
    const results = await executeQuery(sql, 1);
    leadsCountByMonthDMC = results;
    return results;
  } catch (error) {
    throw error;
  }
}

//Sales details to bar diagran in MM page
async function getSalesCountByMonthPerMM(req) {
  mm_id = req.query.mm_id;
  let sql;
  if (startDate && endDate) {
    sql = `SELECT
    d.dmc_name,
    COUNT(l.id) AS lead_count
FROM
    DMC d
LEFT JOIN
    Leads l ON d.id = l.dmc_id
           AND l.lead_status = 5
           AND l.sales_person = '${mm_id}'
           AND l.lead_created_date BETWEEN '${startDate}' AND '${endDate}'
GROUP BY
    d.dmc_name
ORDER BY
    d.dmc_name;
`;
  } else {
    sql = `
            SELECT
    d.dmc_name,
    COUNT(l.id) AS lead_count
FROM
    DMC d
LEFT JOIN
    Leads l ON d.id = l.dmc_id
           AND l.lead_status = 5
           AND l.sales_person='${mm_id}'
           AND YEAR(l.lead_created_date) = YEAR(CURDATE())
           AND MONTH(l.lead_created_date) = MONTH(CURDATE())
GROUP BY
    d.dmc_name
ORDER BY
    d.dmc_name;
        `;
  }
  try {
    const results = await executeQuery(sql, 3);
    salesCountByMM = results;
    return results;
  } catch (error) {
    throw error;
  }
}

async function getAmountByMonthPerDMCPerMM(req) {
  mm_id = req.query.mm_id;
  let sql;
  if (startDate && endDate) {
    sql = `SELECT
    d.dmc_name,
    l.sales_person,
    SUM(l.amount) AS total_amount
FROM
    Leads l
JOIN
    DMC d ON l.dmc_id = d.id
WHERE
    l.lead_status = 5
    AND l.lead_created_date BETWEEN '${startDate}' AND '${endDate}'
    AND l.sales_person = '${mm_id}'
GROUP BY
    d.dmc_name, l.sales_person
ORDER BY
    d.dmc_name, l.sales_person;
`;
  } else {
    sql = `SELECT
    d.dmc_name,
    l.sales_person,
    SUM(l.amount) AS total_amount
FROM
    Leads l
JOIN
    DMC d ON l.dmc_id = d.id
WHERE
    l.lead_status = 5
    AND MONTH(l.lead_created_date) = MONTH(CURRENT_DATE)
    AND YEAR(l.lead_created_date) = YEAR(CURRENT_DATE)
    AND l.sales_person = '${mm_id}'
GROUP BY
    d.dmc_name, l.sales_person
ORDER BY
    d.dmc_name, l.sales_person;
        `;
  }
  try {
    const results = await executeQuery(sql, 4);
    amountCountPerDMCPerMM = results;

    return results;
  } catch (error) {
    throw error;
  }
}
async function fetchPendingLeadsByMM(req) {
  mm_id = req.query.mm_id;
  try {
    const sql = `
           
    SELECT 
    l.id,
    l.no_of_days,
    l.no_of_nights,
    a.agent_name,
    d.destination_name,
    n.dmc_name,
    s.lead_status AS lead_status
FROM 
    Leads l
LEFT JOIN 
    Agents a ON l.agent_id = a.id
LEFT JOIN 
    Destinations d ON l.destination_id = d.id
LEFT JOIN 
    Employees m ON l.sales_person = m.emp_id
LEFT JOIN 
    LeadStatus s ON l.lead_status = s.id
LEFT JOIN 
    DMC n ON l.dmc_id = n.id
WHERE 
    l.lead_status NOT IN (4, 5) AND l.delete_status=1 AND l.sales_person='${mm_id}';
        `;
    const results = await executeQuery(sql, 5);
    //
    pendingLeads = results;
    return results;
  } catch (error) {
    throw error;
  }
}

async function getAllSalesCountMM(req, res) {
  mm_id = req.query.mm_id;
  try {
    const sql = `    SELECT COUNT(*) AS lead_count
FROM Leads
WHERE lead_status = 5
  AND delete_status = 1
  AND sales_person='${mm_id}'
  AND MONTH(lead_created_date) = MONTH(CURRENT_DATE)
  AND YEAR(lead_created_date) = YEAR(CURRENT_DATE);;`;
    const results = await executeQuery(sql, 15);
    statTotalSales = results[0].lead_count;
  } catch (err) {
    console.error("Error fetching leads data:", err);
  }
}

async function getAllRevenueCountMM(req, res) {
  mm_id = req.query.mm_id;

  try {
    const sql = `SELECT IFNULL(SUM(amount), 0) AS total_amount
FROM Leads
WHERE lead_status = 5
  AND delete_status = 1
  AND sales_person='${mm_id}'
  AND MONTH(lead_created_date) = MONTH(CURRENT_DATE)
  AND YEAR(lead_created_date) = YEAR(CURRENT_DATE);;`;
    const results = await executeQuery(sql, 16);
    statTotalAmount = formatINR(results[0].total_amount);
  } catch (err) {
    console.error("Error fetching leads data:", err);
  }
}

async function getAllVisitsCountMM(req, res) {
  mm_id = req.query.mm_id;

  try {
    const sql = `
   SELECT COUNT(*) AS visit_count
FROM AgentVisits
WHERE delete_status = 1
AND emp_id='${mm_id}'
  AND MONTH(visited_date) = MONTH(CURRENT_DATE)
  AND YEAR(visited_date) = YEAR(CURRENT_DATE);`;
    const results = await executeQuery(sql, 5);
    statTotalVisits = results[0].visit_count;
  } catch (err) {
    console.error("Error fetching leads data:", err);
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
  loadHomePage: loadHomePage,
  loadDMCPage: loadDMCPage,
  getSalesCountByMonthDMC: getSalesCountByMonthDMC,
  getLeadsCountByMonthDMC: getLeadsCountByMonthDMC,
  loadMMPage: loadMMPage,
};

import * as db from "./db.js";

let statuses = [];
function setStatus(text) {
  document.querySelector("#status").textContent = text;
  statuses.push(text);
  console.log(text);
}

db.emitter.addEventListener("execcomplete", (e) => {
  setStatus(e.detail.message);
  document.querySelector("#total-db-ms").textContent = `${Math.round(
    db.total_sql_time
  )} total ms in db`;
});

const sheets = [
  { title: "Categories", sql: "select * from [Categories];" },
  { title: "Customers", sql: "select * from [Customers];" },
  {
    title: "EmployeeTerritories",
    sql: "select * from [EmployeeTerritories];",
  },
  { title: "Employees", sql: "select * from [Employees];" },
  { title: "OrderDetails", sql: "select * from [Order Details];" },
  {
    title: "OrderDetailsByProduct",
    sql: "select ProductID, COUNT(*) num, AVG(UnitPrice) average_price, AVG(Quantity) average_quantity from [Order Details] GROUP BY ProductID ORDER BY num DESC",
  },
  { title: "Orders", sql: "select * from [Orders];" },
  { title: "Products", sql: "select * from [Products];" },
  { title: "Regions", sql: "select * from [Regions];" },
  { title: "Shippers", sql: "select * from [Shippers];" },
  { title: "Suppliers", sql: "select * from [Suppliers];" },
  { title: "Territories", sql: "select * from [Territories];" },
];

async function runQuery(sheet) {
  let exec = await db.init();
  let result = await exec(sheet.sql);
  return result.result;
}

setStatus("Initializing database");
db.init();
(async function () {
  let exec = await db.init();
  let foo = await runQuery(sheets[0]);
  console.log("READY", foo);
  setStatus(foo);
})();

import "/style.css";
import * as db from "./db.js";
import lit_table from "./tables/lit.js";
import vanilla_table from "./tables/lit.js";
import revo from "./tables/revo.js";
import handsontable from "./tables/handsontable.js";

let results = document.querySelector("#results");
let statuses = [];
const DEFAULT_SHEET = new URLSearchParams(window.location.search).get("sheet");
const DEFAULT_GRID = new URLSearchParams(window.location.search).get("grid");
const DEFAULT_STEP =
  parseInt(new URLSearchParams(window.location.search).get("step")) || 0;
const RAF = new URLSearchParams(window.location.search).has("raf");
let AUTORUN = new URLSearchParams(window.location.search).has("autorun");

if (DEFAULT_STEP) {
  document.querySelector("#step").value = DEFAULT_STEP;
}
if (DEFAULT_GRID) {
  try {
    document.querySelector(`[name=grid][value=${DEFAULT_GRID}]`).checked = true;
  } catch (e) {
    console.error(e);
  }
}

function noop() {}
const queryOptions = () => [...document.querySelectorAll(`[name="query"]`)];
const gridOptions = () => [...document.querySelectorAll(`[name="grid"]`)];
const currentGrid = () => {
  switch (document.querySelector(`[name="grid"]:checked`)?.value) {
    case "none":
      return noop;
    case "lit":
      return lit_table;
    case "vanilla":
      return vanilla_table;
    case "revo":
      return revo;
    case "handsontable":
      return handsontable;
    default:
      return null;
  }
};
const currentStep = () => parseInt(document.querySelector("#step").value);
const currentSheet = () =>
  sheets.find(
    (el) =>
      el.title == document.querySelector("input[name=query]:checked")?.value
  );
function setStatus(text) {
  document.querySelector("#status").textContent = text;
  statuses.push(text);
  document.querySelector("#logs pre").textContent = statuses.join("\n");
}

document.addEventListener("keypress", (e) => {
  if (e.key === "l") {
    document.querySelector("#show-logs").click();
  }
});

document.querySelector("#show-logs").addEventListener("click", () => {
  document.querySelector("#logs").showModal();
});

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

for (let { title, sql } of sheets) {
  let input = document.createElement("input");
  input.type = "radio";
  input.name = "query";
  input.value = title;
  input.id = `query-${title}`;
  input.checked = title === DEFAULT_SHEET;
  let label = document.createElement("label");
  label.textContent = title;
  label.htmlFor = `query-${title}`;
  document.querySelector("#query-options").append(input, label);
}

document.addEventListener("change", (e) => {
  if (e.target.name === "query") {
    setStatus(`Sheet changed to ${e.target.value}`);
    runQuery();
  }
  if (e.target.name === "grid") {
    setStatus(`Grid changed to ${e.target.value}`);
    runQuery();
  }
});

let running = false;
document.querySelector("#run").addEventListener("click", async () => {
  if (running) {
    console.log("Currently running, ignoring request");
    return;
  }
  running = true;

  let step = currentStep();
  let totalStepTime = 0;

  let permutations = [];
  for (let grid of gridOptions()) {
    for (let query of queryOptions()) {
      permutations.push([grid, query]);
    }
  }

  setStatus(
    `Autorun started with ${permutations.length} permutations and step ${step}ms`
  );
  let start = performance.now();
  performance.mark(`autorun-started`);
  for (let [grid, query] of permutations) {
    performance.mark(`query-started: ${query.value} - ${grid.value}`);
    // Not actually clicking the option radios because we don't want it to respond
    // to events, we're going to drive it ourselves
    grid.checked = true;
    query.checked = true;
    await runQuery();
    performance.mark(`query-complete: ${query.value} - ${grid.value}`);

    performance.mark(`raf: ${query.value} - ${grid.value}`);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    // TODO - the test seems more inconsistent and doesn't seem to paint cross-browser without this.
    // Is this a lit-html thing, or something else? With revo even this second rAF doesn't seem to
    // trigger a render... For now also have a `step` option to slow things down
    if (RAF) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    performance.mark(`raf: ${query.value} - ${grid.value}`);
    // Todo - is there a way to accurately measure something like
    // el.scrollTop = el.scrollTopMax
    if (step) {
      let stepStart = performance.now();
      await new Promise((resolve) => setTimeout(resolve, step));
      totalStepTime += performance.now() - stepStart;
    }

    const queryMeasure = performance.measure(
      `query-started: ${query.value} - ${grid.value}`,
      `query-complete: ${query.value} - ${grid.value}`
    );
    console.log(
      `query: ${query.value} - ${grid.value}`,
      `${queryMeasure.duration}ms`
    );
  }
  performance.mark(`autorun-complete`);
  // console.log(performance.measure(`autorun-complete`, `autorun-started`));
  setStatus(
    `All sheets rendered in ${Math.round(
      performance.measure(`autorun-complete`, `autorun-started`).duration -
        totalStepTime
    )} ms`
  );
  running = false;
  // First time run should open logs immediately if autorunning
  if (AUTORUN) {
    document.querySelector("#show-logs").click();
    AUTORUN = false;
  }
});

async function runQuery() {
  let { title, sql } = currentSheet();
  let renderer = currentGrid();
  results.textContent = "";
  let exec = await db.init();
  let result = await exec(sql);
  // console.log(title, result);
  let { resultRows, columnNames } = result.result;
  if (resultRows.length === 0) {
    return;
  }
  let step = performance.now();

  const container = document.createElement("div");
  results.append(container);
  const data = [columnNames, ...resultRows];
  renderer({ container, data });

  if (renderer !== noop) {
    setStatus(
      `Grid creation for ${title}: ${Math.round(performance.now() - step)} ms`
    );
  }
  return {
    result,
  };
}

if (currentSheet()) {
  runQuery();
}

setStatus("Initializing database");
db.init();
if (AUTORUN) {
  (async function () {
    await db.init();
    document.querySelector("#run").click();
  })();
}

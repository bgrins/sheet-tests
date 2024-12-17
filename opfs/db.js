import northwind_create from "/sample_data/northwind.js";
let db = null;
export let total_sql_time = 0;

const DEBUG = new URLSearchParams(window.location.search).has("debug");
export let emitter = new EventTarget();
export function init() {
  if (db) {
    return db;
  }
  db = new Promise(async (resolve) => {
    const config = {
      debug: DEBUG
        ? (...args) => console.debug("worker debug", ...args)
        : undefined,
      onunhandled: function (ev) {
        console.error("Unhandled worker message:", ev.data);
      },
      onerror: function (ev) {
        console.error("worker error:", ev);
      },
      onready: async function () {
        // let northwind_create = await fetch("create.sql").then((r) => r.text());
        await promiser("open", {
          filename: "northwind.db",
        });

        async function exec(sql) {
          let s = performance.now();
          let result = await promiser("exec", {
            sql,
            resultRows: [],
            columnNames: [],
          });
          let time = performance.now() - s;
          total_sql_time += time;

          const execcomplete = new CustomEvent("execcomplete", {
            detail: {
              time,
              message: `Query \`${sql
                .substring(0, 45)
                .replace(/(\r\n|\n|\r)/gm, "")}\` took ${Math.round(time)}ms`,
              sql,
            },
          });

          emitter.dispatchEvent(execcomplete);
          return result;
        }

        await exec(northwind_create);

        resolve(exec);
      },
    };

    const promiser = self.sqlite3Worker1Promiser(config);
  });
  return db;
}

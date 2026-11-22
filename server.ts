import { readFileSync } from "fs";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import cron from "node-cron";
import { scrapeDersPlan } from "./src/scraper/plan-scraper";
import { scrapeSections } from "./src/scraper/section-scraper";
import { db } from "./src/lib/db";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

// deploy-release writes the deployed commit here and checks /healthz for it.
let revision = "dev";
try {
  revision = readFileSync("REVISION", "utf8").trim();
} catch {}

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Loopback only by default: nginx is the public entry point.
  const host = process.env.HOST ?? "127.0.0.1";
  createServer((req, res) => {
    if (req.url === "/healthz") {
      db.$queryRaw`SELECT 1`.then(
        () => {
          res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
          res.end(revision + "\n");
        },
        (err) => {
          console.error("[healthz] database check failed:", err);
          res.writeHead(503, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
          res.end("database unavailable\n");
        },
      );
      return;
    }
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, host, () => {
    console.log(`> Ready on http://${host}:${port} (${dev ? "dev" : "prod"})`);
  });

  // Scrape open sections daily at 03:00
  cron.schedule("0 3 * * *", () => {
    scrapeSections().catch((err) => console.error("[cron] section scrape failed:", err));
  });

  // Scrape course plans weekly on Sunday at 04:00
  cron.schedule("0 4 * * 0", () => {
    scrapeDersPlan().catch((err) => console.error("[cron] plan scrape failed:", err));
  });
});

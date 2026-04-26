import { createServer } from "http";
import { parse } from "url";
import next from "next";
import cron from "node-cron";
import { scrapeDersPlan } from "./src/scraper/plan-scraper";
import { scrapeSections } from "./src/scraper/section-scraper";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? "dev" : "prod"})`);
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

import { scrapeDersPlan } from "../src/scraper/plan-scraper";
import { HOUR, DAY, WEEK } from "../src/lib/freshness";

const NAMED: Record<string, number> = { hour: HOUR, day: DAY, week: WEEK, none: 0 };

function parseThreshold(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  if (raw in NAMED) return NAMED[raw];
  const ms = parseInt(raw, 10);
  return isNaN(ms) ? fallback : ms;
}

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

const includeCoursePlans = arg("plans") !== "false";
const planThreshold  = parseThreshold(arg("plan-threshold"),  WEEK);
const groupThreshold = parseThreshold(arg("group-threshold"), WEEK);

console.log({ includeCoursePlans, planThreshold, groupThreshold });

scrapeDersPlan({ includeCoursePlans, planThreshold, groupThreshold })
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });

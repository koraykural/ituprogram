import { db } from "../src/lib/db";

db.faculty.count().then(async (faculties) => {
  const planTypes = await db.planType.count();
  const programs = await db.program.count();
  console.log({ faculties, planTypes, programs });
  await db.$disconnect();
});

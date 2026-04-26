/*
  Warnings:

  - You are about to drop the column `electiveGroupName` on the `PlanEntry` table. All the data in the column will be lost.
  - You are about to drop the column `isCompulsory` on the `PlanEntry` table. All the data in the column will be lost.
  - The `ects` column on the `PlanEntry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `PlanEntry` table without a default value. This is not possible if the table is not empty.
  - Made the column `courseCode` on table `PlanEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "PlanEntry" DROP CONSTRAINT "PlanEntry_semesterId_fkey";

-- DropForeignKey
ALTER TABLE "PlanSemester" DROP CONSTRAINT "PlanSemester_planId_fkey";

-- AlterTable
ALTER TABLE "PlanEntry" DROP COLUMN "electiveGroupName",
DROP COLUMN "isCompulsory",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "semesterId" DROP NOT NULL,
ALTER COLUMN "courseCode" SET NOT NULL,
DROP COLUMN "ects",
ADD COLUMN     "ects" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ElectiveGroup" (
    "id" SERIAL NOT NULL,
    "semesterId" INTEGER NOT NULL,
    "obsGroupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "credit" DOUBLE PRECISION,

    CONSTRAINT "ElectiveGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniquePlanEntry" (
    "courseCode" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "language" TEXT,
    "credit" DOUBLE PRECISION,
    "ects" DOUBLE PRECISION,

    CONSTRAINT "UniquePlanEntry_pkey" PRIMARY KEY ("courseCode")
);

-- AddForeignKey
ALTER TABLE "PlanSemester" ADD CONSTRAINT "PlanSemester_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CoursePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectiveGroup" ADD CONSTRAINT "ElectiveGroup_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "PlanSemester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntry" ADD CONSTRAINT "PlanEntry_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "PlanSemester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntry" ADD CONSTRAINT "PlanEntry_electiveGroupId_fkey" FOREIGN KEY ("electiveGroupId") REFERENCES "ElectiveGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

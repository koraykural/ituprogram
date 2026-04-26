-- CreateTable
CREATE TABLE "CoursePlan" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programCode" TEXT NOT NULL,

    CONSTRAINT "CoursePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanSemester" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,

    CONSTRAINT "PlanSemester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEntry" (
    "id" SERIAL NOT NULL,
    "semesterId" INTEGER NOT NULL,
    "courseCode" TEXT,
    "courseTitle" TEXT NOT NULL,
    "language" TEXT,
    "isCompulsory" BOOLEAN NOT NULL,
    "credit" DOUBLE PRECISION,
    "ects" TEXT,
    "electiveGroupId" INTEGER,
    "electiveGroupName" TEXT,

    CONSTRAINT "PlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanSemester_planId_number_key" ON "PlanSemester"("planId", "number");

-- AddForeignKey
ALTER TABLE "CoursePlan" ADD CONSTRAINT "CoursePlan_programCode_fkey" FOREIGN KEY ("programCode") REFERENCES "Program"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanSemester" ADD CONSTRAINT "PlanSemester_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CoursePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntry" ADD CONSTRAINT "PlanEntry_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "PlanSemester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

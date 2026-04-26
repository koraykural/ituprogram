-- CreateTable
CREATE TABLE "Faculty" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanType" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanType_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Program" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facultyId" INTEGER NOT NULL,
    "planTypeCode" TEXT NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Section" (
    "crn" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "teachingMethod" TEXT,
    "instructor" TEXT,
    "buildings" TEXT[],
    "days" TEXT[],
    "times" TEXT[],
    "rooms" TEXT[],
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "enrolled" INTEGER NOT NULL DEFAULT 0,
    "majorRestrictions" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("crn")
);

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_planTypeCode_fkey" FOREIGN KEY ("planTypeCode") REFERENCES "PlanType"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

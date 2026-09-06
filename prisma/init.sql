-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('Client', 'SalonAdmin', 'Master');

-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('Confirmed', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "public"."TimeSlotStatus" AS ENUM ('Available', 'Booked', 'Cancelled');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailVerification" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Salon" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "phone" TEXT,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalonAdmin" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "salonId" UUID NOT NULL,

    CONSTRAINT "SalonAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MasterProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "salonId" UUID NOT NULL,
    "bio" TEXT,
    "specialization" TEXT,
    "rating" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Service" (
    "id" UUID NOT NULL,
    "salonId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MasterService" (
    "id" UUID NOT NULL,
    "masterProfileId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,

    CONSTRAINT "MasterService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MasterTimeSlot" (
    "id" UUID NOT NULL,
    "masterId" UUID NOT NULL,
    "scheduleDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "public"."TimeSlotStatus" NOT NULL DEFAULT 'Available',

    CONSTRAINT "MasterTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "id" UUID NOT NULL,
    "salonId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "masterId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "timeSlotId" UUID NOT NULL,
    "clientNotes" TEXT,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'Confirmed',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "EmailVerification_email_isUsed_idx" ON "public"."EmailVerification"("email", "isUsed");

-- CreateIndex
CREATE UNIQUE INDEX "SalonAdmin_userId_key" ON "public"."SalonAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterProfile_userId_key" ON "public"."MasterProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterService_masterProfileId_serviceId_key" ON "public"."MasterService"("masterProfileId", "serviceId");

-- CreateIndex
CREATE INDEX "MasterTimeSlot_masterId_scheduleDate_idx" ON "public"."MasterTimeSlot"("masterId", "scheduleDate");

-- CreateIndex
CREATE INDEX "Appointment_masterId_appointmentDate_idx" ON "public"."Appointment"("masterId", "appointmentDate");

-- AddForeignKey
ALTER TABLE "public"."SalonAdmin" ADD CONSTRAINT "SalonAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalonAdmin" ADD CONSTRAINT "SalonAdmin_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterProfile" ADD CONSTRAINT "MasterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterProfile" ADD CONSTRAINT "MasterProfile_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterService" ADD CONSTRAINT "MasterService_masterProfileId_fkey" FOREIGN KEY ("masterProfileId") REFERENCES "public"."MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterService" ADD CONSTRAINT "MasterService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MasterTimeSlot" ADD CONSTRAINT "MasterTimeSlot_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "public"."MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "public"."Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "public"."MasterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "public"."MasterTimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


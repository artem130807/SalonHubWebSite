import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "Healthy",
    service: "BarberBooking.Next",
    timestampUtc: new Date().toISOString(),
  });
}

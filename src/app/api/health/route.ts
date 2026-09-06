import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "Healthy",
    service: "barber-booking-network",
    timestampUtc: new Date().toISOString(),
  });
}

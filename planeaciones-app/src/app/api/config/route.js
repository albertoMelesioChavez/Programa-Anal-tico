import { NextResponse } from "next/server";

const disabledResponse = () =>
  NextResponse.json(
    {
      error:
        "La configuración de IA se administra automáticamente desde el servidor.",
    },
    { status: 410 },
  );

export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}

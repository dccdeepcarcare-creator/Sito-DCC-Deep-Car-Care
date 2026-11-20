import { NextResponse } from "next/server";
import { getCatalog } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getCatalog();
  return NextResponse.json(data);
}
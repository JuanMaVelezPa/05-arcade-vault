import { NextResponse } from "next/server";

import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("Supabase health check failed:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Supabase health check threw:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

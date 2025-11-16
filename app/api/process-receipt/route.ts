// app/api/process-receipt/route.ts  (App Router)
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const ab  = await file.arrayBuffer();
    const base64 = Buffer.from(ab).toString("base64");

    const model  = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent([
      "Return ONLY JSON: {merchant,total,tax,date,category,emoji}",
      { inlineData: { data: base64, mimeType: "image/jpeg" } }
    ]);

    const txt = result.response.text().replace(/```json|```/g, "");
    const data = JSON.parse(txt);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

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

    // Use a currently supported multimodal model ID
    const model  = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `Analyze this receipt image and return ONLY valid JSON with no markdown:
{
  "merchant": "store name",
  "total": number,
  "tax": number,
  "date": "YYYY-MM-DD",
  "category": "Meals & Entertainment|Travel|Software & Subscriptions|Office Supplies|Shopping|Other",
  "emoji": "relevant emoji",
  "currency": "ISO currency code from receipt (PLN, USD, EUR, etc)"
}
CRITICAL: 
- Extract the ACTUAL currency shown on the receipt. If you see "zł", return "PLN". If you see "$", return "USD". If you see "€", return "EUR". If you are unsure, make your best reasonable guess.
- Category must be EXACTLY one of: "Meals & Entertainment", "Travel", "Software & Subscriptions", "Office Supplies", "Shopping", or "Other".`;

    const result = await model.generateContent([
      prompt,
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

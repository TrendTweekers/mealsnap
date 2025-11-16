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

    const prompt = `Analyze the receipt image and return ONLY valid JSON with no markdown, no commentary.

{
  "merchant": "Clean store/brand name with no extra text",
  "total": number,
  "tax": number | null,
  "date": "YYYY-MM-DD" | null,
  "category": "Meals & Entertainment" | "Travel" | "Software & Subscriptions" | "Office Supplies" | "Shopping" | "Other",
  "emoji": "one relevant emoji",
  "currency": "PLN" | "USD" | "EUR" | "GBP" | "other detected currency code"
}

CRITICAL RULES:

1. **Merchant**
   - Extract only the true store name (e.g., "COS", "ZARA", "H&M").
   - Remove extra words like street addresses, hashtags, IDs, timestamps, or register numbers.
   - NEVER make up a merchant if unreadable — return null.

2. **Total**
   - Extract the final total the customer paid.
   - Convert commas to dots if needed ("450,20" → 450.20).
   - Must be a number, not a string.

3. **Tax**
   - If the receipt includes VAT, sales tax, or GST — extract it.
   - If tax is not explicitly shown, return null. Do NOT guess.

4. **Date**
   - Normalize all formats to "YYYY-MM-DD".
   - Accept formats like "12/11/24", "2024-11-12", "11.12.2024".
   - If no date is present, return null.

5. **Category (must be EXACT)**
   - Meals & Entertainment
   - Travel
   - Software & Subscriptions
   - Office Supplies
   - Shopping
   - Other

6. **Currency detection**
   - Detect the EXACT currency printed:
       - "zł" → PLN
       - "PLN" → PLN
       - "$" → USD
       - "€" → EUR
       - "£" → GBP
   - If ambiguous, choose the most likely based on symbols.
   - Never guess symbols that don't appear.

7. **JSON formatting**
   - Return ONLY valid JSON.
   - No markdown, no backticks, no explanations.`;

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

// app/api/process-receipt/route.ts  (App Router)
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { normalizeMerchantName } from "@/lib/merchant-utils";
import type { ParsedReceipt } from "@/lib/types";

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

    const prompt = `
  You are a highly accurate receipt-parsing engine.

  Analyze the receipt image and return ONLY valid JSON with no markdown, no backticks, and no commentary.

  The JSON MUST match this structure:

  {
    "merchant": string | null,
    "merchantNormalized": string | null,
    "total": number,
    "subtotal": number | null,
    "tax": number | null,
    "taxRate": number | null,
    "date": "YYYY-MM-DD" | null,
    "category": "Meals & Entertainment" | "Travel" | "Software & Subscriptions" | "Office Supplies" | "Shopping" | "Other",
    "emoji": string,
    "currency": string,
    "lineItems": [
      {
        "description": string,
        "quantity": number | null,
        "unitPrice": number | null,
        "total": number
      }
    ],
    "language": string | null
  }

  CRITICAL RULES:

  1) MERCHANT
  - Extract only the clean store/brand name, e.g. "Biedronka", "Żabka", "Cos", "Zara", "H&M".
  - Remove addresses, register numbers, timestamps, hashtags, or IDs.
  - If unreadable, return null.
  - "merchantNormalized" should be a cleaned and standardized version:
    - Trim whitespace
    - Capitalize naturally (e.g. "COS", "Zara", "Biedronka")
    - If you strongly recognize a known chain (Biedronka, Żabka, Lidl, Carrefour, Kaufland, Aldi, Rossmann, Hebe, Zara, H&M, Reserved, CCC, Auchan, Pepco, Primark, Ikea, Apple, Starbucks, McDonald's, KFC, Decathlon), use that exact spelling in "merchantNormalized".

  2) TOTAL / SUBTOTAL / TAX
  - "total": the final amount the customer pays (gross).
  - "subtotal": amount before tax or VAT if clearly shown; otherwise null.
  - "tax": VAT / sales tax / GST amount if explicitly visible; otherwise null.
  - "taxRate": numeric percentage if visible (e.g. 23 for 23%); otherwise null.
  - Always convert commas to dots (e.g. "450,20" -> 450.20).
  - Values must be numbers, not strings.

  3) DATE
  - Normalize to "YYYY-MM-DD".
  - Accept formats like "12/11/24", "2024-11-12", "11.12.2024", "12-11-2024".
  - If multiple dates exist, choose the purchase date, not the print or fiscal ID date.
  - If you cannot find the date, return null.

  4) CATEGORY (must be EXACT)
  Map the receipt to exactly ONE of:
  - "Meals & Entertainment" (restaurants, cafes, bars, food for social/business)
  - "Travel" (transport, fuel, hotels, flights, taxis, Uber, trains)
  - "Software & Subscriptions" (SaaS, digital tools, apps, online services)
  - "Office Supplies" (stationery, printers, paper, ink, office equipment)
  - "Shopping" (general purchases, fashion, cosmetics, groceries, mixed retail)
  - "Other" (anything that does not fit above)

  5) CURRENCY
  Detect the exact currency from the receipt:
  - "zł" or "PLN" -> "PLN"
  - "€" or "EUR" -> "EUR"
  - "$" or "USD" -> "USD"
  - "£" or "GBP" -> "GBP"
  If another official currency code is clearly present, use that. Do NOT invent unknown codes.

  6) LINE ITEMS
  - Extract each visible product or service line as one entry in "lineItems".
  - "description": short, human-readable label from the line.
  - "quantity": if clearly visible (e.g. "x2" or "2 pcs"); otherwise null.
  - "unitPrice": if clearly visible; otherwise null.
  - "total": line total after quantity.
  - If the receipt is very long, focus on the main items that contribute to the total.

  7) MULTILINGUAL RECEIPTS (PL / EN / DE and others)
  - Handle common Polish, English and German terms (e.g. "Paragon fiskalny", "Brutto", "Netto", "Kwota", "Do zapłaty", "Total", "Tax", "MwSt").
  - Set "language" to the main language code of the receipt:
    - Polish -> "pl"
    - English -> "en"
    - German -> "de"
    - If unclear, best guess or null.

  8) EMOJI
  - Pick exactly one emoji that represents the overall type of spending:
    - Meals & Entertainment -> 🍽️ or ☕
    - Travel -> ✈️ or 🚗
    - Software & Subscriptions -> 💻
    - Office Supplies -> 📎 or 🖨️
    - Shopping -> 🛍️ or 🛒
    - Other -> 💸

  9) JSON ONLY
  - Return ONLY raw JSON.
  - No markdown, no fences, no explanations, no comments.
  `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType: "image/jpeg" } }
    ]);

    const txt = result.response.text().replace(/```json|```/g, "").trim();
    let parsed: ParsedReceipt;
    
    try {
      parsed = JSON.parse(txt);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Normalize merchant name
    parsed.merchantNormalized =
      normalizeMerchantName(parsed.merchantNormalized || parsed.merchant) ??
      parsed.merchant ??
      null;

    // Ensure required fields have defaults
    if (!parsed.lineItems || !Array.isArray(parsed.lineItems)) {
      parsed.lineItems = [];
    }
    if (parsed.subtotal === undefined) parsed.subtotal = null;
    if (parsed.tax === undefined) parsed.tax = null;
    if (parsed.taxRate === undefined) parsed.taxRate = null;
    if (parsed.language === undefined) parsed.language = null;

    return NextResponse.json({ ok: true, data: parsed });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

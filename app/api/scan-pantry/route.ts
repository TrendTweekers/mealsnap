import { NextRequest, NextResponse } from "next/server";
import { kv } from '@vercel/kv'

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("OPENAI_API_KEY is not set. /api/scan-pantry will fail.");
}

export async function POST(req: NextRequest) {
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Server not configured: missing OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  try {
    // Limit request body size (10MB max)
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Image too large. Maximum size: 10MB." },
        { status: 413 }
      )
    }

    const body = await req.json();
    const { imageBase64, userId } = body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json(
        { ok: false, error: "imageBase64 is required." },
        { status: 400 }
      );
    }

    // Validate base64 string length (approximate max 10MB)
    if (imageBase64.length > 15 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Image data too large. Maximum size: 10MB." },
        { status: 413 }
      )
    }

    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    // Additional validation: base64 should be reasonable length
    if (base64Data.length < 100 || base64Data.length > 14 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Invalid image data size." },
        { status: 400 }
      )
    }

    const prompt = `
You are helping with pantry / fridge inventory from a photo.

Your job:
1. Look ONLY at what is clearly visible in the photo.
2. List simple, everyday ingredient names (English, singular form).
3. It is better to miss a borderline item than to guess.
4. Do NOT invent ingredients that are not obviously in the image.
5. Do NOT infer hidden items (inside boxes, drawers, behind packaging).
6. Avoid brand names. Use generic names like "yogurt", "ketchup", "mustard".
7. If you are unsure what something is, skip it.

Special rules:
- Do NOT output donuts, dumplings, or other baked goods unless they are clearly and unmistakably visible as that item.
- If a package could contain many things (e.g. a closed box, bag, jar with unreadable label), ignore it or describe it generically (e.g. "cereal", "pasta") ONLY if the label or shape makes it very obvious.
- Do NOT add extra staples like salt, pepper, oil, sugar unless they are clearly visible in the image.

Output format:
Return a single JSON object with this exact shape and nothing else:

{
  "ingredients": [
    "ingredient 1",
    "ingredient 2",
    "ingredient 3"
  ]
}

Rules for output:
- Always return valid JSON.
- No comments, no explanations, no trailing commas.
- "ingredients" must be an array of strings.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("scan-pantry OpenAI error:", response.status, errText);
      
      // Track failed scan (non-blocking)
      try {
        fetch(`${req.nextUrl.origin}/api/track-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'anonymous',
            ingredientCount: 0,
            success: false,
          }),
        }).catch(() => {}) // Silent fail
      } catch {}
      
      return NextResponse.json(
        {
          ok: false,
          error: `OpenAI HTTP error: ${response.status}`,
          details: errText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    if (!rawText) {
      // Track failed scan (non-blocking)
      try {
        fetch(`${req.nextUrl.origin}/api/track-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'anonymous',
            ingredientCount: 0,
            success: false,
          }),
        }).catch(() => {}) // Silent fail
      } catch {}
      
      return NextResponse.json(
        { ok: false, error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    const cleanedText = String(rawText).replace(/```json|```/g, "").trim();

    let parsed: any;
    let items: string[];

    try {
      parsed = JSON.parse(cleanedText);
    } catch (err) {
      console.error("scan-pantry JSON parse failed. Raw model output:", cleanedText);
      
      // Track failed scan (non-blocking)
      try {
        fetch(`${req.nextUrl.origin}/api/track-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'anonymous',
            ingredientCount: 0,
            success: false,
          }),
        }).catch(() => {}) // Silent fail
      } catch {}
      
      return NextResponse.json(
        { ok: false, error: "Unable to parse model response.", raw: cleanedText },
        { status: 500 }
      );
    }

    // Handle both old format (array) and new format (object with ingredients array)
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && Array.isArray(parsed.ingredients)) {
      items = parsed.ingredients;
    } else {
      // Track failed scan (non-blocking)
      try {
        fetch(`${req.nextUrl.origin}/api/track-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'anonymous',
            ingredientCount: 0,
            success: false,
          }),
        }).catch(() => {}) // Silent fail
      } catch {}
      
      return NextResponse.json(
        { ok: false, error: "Model response is not in expected format.", raw: parsed },
        { status: 500 }
      );
    }

    // Track scan statistics (non-blocking)
    try {
      fetch(`${req.nextUrl.origin}/api/track-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'anonymous',
          ingredientCount: items.length,
          success: true,
        }),
      }).catch(err => {
        // Silent fail - tracking shouldn't block response
        console.warn('Failed to track scan:', err)
      })
    } catch (trackErr) {
      // Silent fail
    }

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    console.error("scan-pantry unexpected error:", err);
    
    // Track failed scan (non-blocking) - userId already extracted above
    try {
      fetch(`${req.nextUrl.origin}/api/track-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'anonymous',
          ingredientCount: 0,
          success: false,
        }),
      }).catch(() => {}) // Silent fail
    } catch {}
    
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error during pantry scan.",
        details: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}

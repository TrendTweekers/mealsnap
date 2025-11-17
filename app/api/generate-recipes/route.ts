import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("[generate-recipes] Missing OPENAI_API_KEY in env.");
}

export async function POST(req: NextRequest) {
  try {
    // --- 1. Read & validate body -----------------------------------------
    const body = await req.json().catch((err) => {
      console.error("[generate-recipes] Failed to parse request JSON:", err);
      return null;
    });

    const rawIngredients = body?.ingredients;

    const ingredients: string[] | null =
      Array.isArray(rawIngredients)
        ? rawIngredients
            .map((i: unknown) => String(i ?? "").trim())
            .filter((i) => i.length > 0)
        : null;

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No ingredients provided." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server is not configured with an OpenAI API key. Set OPENAI_API_KEY in .env.local.",
        },
        { status: 500 }
      );
    }

    // --- 2. Build very explicit JSON-only prompt --------------------------
    const prompt = `
You are a cooking assistant.

User gives you a list of ingredients currently in their fridge/pantry.

INGREDIENTS:
${ingredients.join(", ")}

TASK:
1. Create 6–8 very simple, realistic recipes using ONLY these ingredients plus very basic pantry staples:
   - Allowed extra staples: salt, pepper, oil, water, sugar, basic dried herbs.
   - DO NOT invent ingredients that are clearly not available (no "Silesian dumplings" etc.).
   - Aim for variety: include breakfast, lunch, dinner, and snack options when possible.

2. Each recipe should:
   - Have: title, mealType ("breakfast" | "lunch" | "dinner" | "snack"),
           timeMinutes (approx total time),
           difficulty ("easy" | "medium"),
           youAlreadyHave (list of ingredients from the fridge list),
           youNeedToBuy (small list of extra ingredients, can be empty),
           steps (5–8 short numbered steps).

3. Also create a shopping list that merges and deduplicates all "youNeedToBuy" items across recipes.

RESPONSE FORMAT:
Return ONLY valid JSON in this exact structure (no comments, no prose):

{
  "recipes": [
    {
      "title": "string",
      "mealType": "breakfast" | "lunch" | "dinner" | "snack",
      "timeMinutes": number,
      "difficulty": "easy" | "medium",
      "youAlreadyHave": ["string", "..."],
      "youNeedToBuy": ["string", "..."],
      "steps": ["Step 1...", "Step 2...", "..."]
    }
  ],
  "shoppingList": [
    "item 1",
    "item 2"
  ]
}

RULES:
- Response MUST be valid JSON that can be parsed by JSON.parse in JavaScript.
- Do NOT wrap the JSON in backticks or a \`\`\`json code block.
- Do NOT include any additional text before or after the JSON.
`;

    // --- 3. Call OpenAI ---------------------------------------------------
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
            content: prompt,
          },
        ],
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate-recipes] OpenAI HTTP error:", response.status, errText);
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
      return NextResponse.json(
        { ok: false, error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    console.log("[generate-recipes] Raw model response:", rawText);

    // --- 4. Clean & parse JSON safely -------------------------------------
    let cleaned = rawText.trim();

    // just in case the model still uses ```json ... ```
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```/i, "");
      cleaned = cleaned.replace(/```$/i, "").trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("[generate-recipes] JSON.parse failed:", err, {
        cleaned,
      });
      return NextResponse.json(
        { ok: false, error: "LLM JSON parse error" },
        { status: 500 }
      );
    }

    if (
      !parsed ||
      !Array.isArray(parsed.recipes) ||
      !Array.isArray(parsed.shoppingList)
    ) {
      console.error(
        "[generate-recipes] Unexpected JSON shape from model:",
        parsed
      );
      return NextResponse.json(
        { ok: false, error: "LLM JSON shape error" },
        { status: 500 }
      );
    }

    // --- 5. Return normalized payload -------------------------------------
    return NextResponse.json(
      {
        ok: true,
        recipes: parsed.recipes,
        shoppingList: parsed.shoppingList,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[generate-recipes] route error:", err);

    const message =
      typeof err?.message === "string"
        ? err.message
        : "Unexpected server error during recipe generation.";

    return NextResponse.json(
      {
        ok: false,
        error: message.startsWith("[OpenAI Error]")
          ? "OpenAI HTTP error"
          : message,
        details: message,
      },
      { status: 500 }
    );
  }
}

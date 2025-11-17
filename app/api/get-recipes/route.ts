import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { ingredients } = await req.json();

  const params = new URLSearchParams({
    q: ingredients.join(","),
    app_id: process.env.EDAMAM_APP_ID!,
    app_key: process.env.EDAMAM_APP_KEY!,
    type: "public",
    to: "3"
  });

  const res = await fetch(`https://api.edamam.com/api/recipes/v2?${params}`);
  const data = await res.json();

  const recipes = data.hits.map((h: any) => ({
    title: h.recipe.label,
    image: h.recipe.image,
    url: h.recipe.url,
    missing: h.recipe.ingredientLines.filter((line: string) =>
      !ingredients.some((i: string) =>
        line.toLowerCase().includes(i.toLowerCase())
      )
    )
  }));

  return NextResponse.json({ recipes });
}


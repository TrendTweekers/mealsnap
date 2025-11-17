"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Clock, ChefHat, RefreshCw, ListChecks } from "lucide-react";

type ShoppingItem = {
  name: string;
  quantity?: string;
};

type Recipe = {
  id: string;
  title: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | string;
  timeMinutes: number;
  difficulty: "easy" | "medium" | "hard" | string;
  servings: number;
  ingredientsHave: string[];
  ingredientsMissing: ShoppingItem[];
  instructions: string[];
};

export default function RecipesPage() {
  const [ingredients, setIngredients] = React.useState<string[]>([]);
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [shoppingList, setShoppingList] = React.useState<ShoppingItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newIngredient, setNewIngredient] = React.useState("");

  // Initialize from sessionStorage if available (from pantry scan)
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem('pantryIngredients');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const validIngredients = parsed.filter((x) => typeof x === "string" && x.trim().length > 0);
          setIngredients(validIngredients);
          // Clear from sessionStorage after reading
          sessionStorage.removeItem('pantryIngredients');
        }
      }
    } catch (e) {
      console.error("Failed to parse ingredients from sessionStorage:", e);
    }
  }, []);

  // Fetch recipes whenever ingredients change *after* initial load
  const fetchRecipes = React.useCallback(async () => {
    if (!ingredients || ingredients.length === 0) {
      setError("Add at least one ingredient first.");
      setRecipes([]);
      setShoppingList([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.error("generate-recipes error:", data);

        const message =
          data?.error ||
          (res.status === 400
            ? "Add at least one ingredient first."
            : "Failed to generate recipes.");

        setError(message);
        setRecipes([]);
        setShoppingList([]);
        return;
      }

      // Transform API response to match frontend expectations
      const transformedRecipes = (data.recipes || []).map((r: any, idx: number) => ({
        id: r.id || `recipe-${idx}`,
        title: r.title || "Untitled recipe",
        mealType: r.mealType || "lunch",
        timeMinutes: r.timeMinutes || 15,
        difficulty: r.difficulty || "easy",
        servings: r.servings || 2,
        ingredientsHave: r.youAlreadyHave || [],
        ingredientsMissing: (r.youNeedToBuy || []).map((item: string) => ({ name: item })),
        instructions: r.steps || [],
      }));

      // Transform shopping list from array of strings to array of objects
      const transformedShoppingList = (data.shoppingList || []).map((item: string) => ({
        name: item,
      }));

      setRecipes(transformedRecipes);
      setShoppingList(transformedShoppingList);
    } catch (err) {
      console.error("generate-recipes fetch error:", err);
      setError("Network error while generating recipes.");
      setRecipes([]);
      setShoppingList([]);
    } finally {
      setLoading(false);
    }
  }, [ingredients]);

  // Trigger initial fetch once ingredients are loaded
  React.useEffect(() => {
    if (ingredients.length > 0) {
      fetchRecipes();
    }
  }, [ingredients, fetchRecipes]);

  // --- Ingredient editing helpers ---
  const removeIngredient = (item: string) => {
    setIngredients((prev) => prev.filter((x) => x !== item));
  };

  const addIngredient = () => {
    const trimmed = newIngredient.trim();
    if (!trimmed) return;
    setIngredients((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed],
    );
    setNewIngredient("");
  };

  const handleRegenerate = () => {
    fetchRecipes();
  };

  const hasData = recipes.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Recipes from your fridge
        </h1>
        <p className="text-sm text-muted-foreground">
          Based on ingredients we saw in your fridge/pantry. You can edit them
          below and regenerate recipes.
        </p>
      </header>

      {/* 2. INGREDIENT EDITOR */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Ingredients detected</CardTitle>
            <p className="text-xs text-muted-foreground">
              Remove or add ingredients, then click{" "}
              <span className="font-medium">Generate recipes</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewIngredient("")}
              disabled={loading}
            >
              Clear input
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerate}
              disabled={loading || ingredients.length === 0}
            >
              {loading && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              {loading ? "Generating..." : "Generate recipes"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Chips */}
          <div className="flex flex-wrap gap-2">
            {ingredients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No ingredients set. Add a few below to get recipes.
              </p>
            )}
            {ingredients.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1 text-xs"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeIngredient(item)}
                  className="ml-1 rounded-full px-1 text-[10px] hover:bg-muted"
                  aria-label={`Remove ${item}`}
                >
                  ✕
                </button>
              </Badge>
            ))}
          </div>

          {/* Add new ingredient */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="flex-1 rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={'Add ingredient manually (e.g. "garlic", "pasta")'}
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addIngredient();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              disabled={!newIngredient.trim()}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. ERROR STATE */}
      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-2 py-4">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Oops – something went wrong
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {error}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. RECIPES LIST */}
      <div className="space-y-4">
        {hasData ? (
          recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))
        ) : !loading && !error ? (
          <p className="text-sm text-muted-foreground">
            No recipes yet. Add ingredients above and click{" "}
            <span className="font-medium">Generate recipes</span>.
          </p>
        ) : null}
      </div>

      {/* 5. SHOPPING LIST */}
      {shoppingList.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Shopping list
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                All missing ingredients across your recipes, deduped.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const text = shoppingList
                  .map((item) =>
                    `${item.name}${
                      item.quantity ? ` – ${item.quantity}` : ""
                    }`,
                  )
                  .join("\n");
                navigator.clipboard
                  .writeText(text)
                  .catch((err) =>
                    console.error("Failed to copy shopping list:", err),
                  );
              }}
            >
              Copy list
            </Button>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {shoppingList.map((item) => (
              <div key={item.name} className="flex gap-1">
                <span className="before:content-['•'] before:mr-1">
                  {item.name}
                  {item.quantity ? ` – ${item.quantity}` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Recipe card with nicer layout + collapsible steps ---

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [showSteps, setShowSteps] = React.useState(true);

  const mealColor: Record<string, string> = {
    breakfast: "bg-amber-100 text-amber-900",
    lunch: "bg-emerald-100 text-emerald-900",
    dinner: "bg-indigo-100 text-indigo-900",
    snack: "bg-pink-100 text-pink-900",
  };

  const mealBadgeClass =
    mealColor[recipe.mealType] ??
    "bg-slate-100 text-slate-900";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg">{recipe.title}</CardTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ChefHat className="h-3 w-3" />
              {recipe.difficulty || "easy"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {recipe.timeMinutes || 15} min
            </span>
            <span>· {recipe.servings || 1} servings</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={mealBadgeClass}>
            {recipe.mealType || "meal"}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setShowSteps((s) => !s)}
          >
            {showSteps ? "Hide steps" : "Show steps"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-5">
        {/* Have / need lists */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              You already have:
            </p>
            <ul className="text-sm list-disc pl-4 space-y-0.5">
              {recipe.ingredientsHave?.length
                ? recipe.ingredientsHave.map((item) => (
                    <li key={item}>{item}</li>
                  ))
                : <li>—</li>}
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              You need to buy:
            </p>
            <ul className="text-sm list-disc pl-4 space-y-0.5">
              {recipe.ingredientsMissing?.length
                ? recipe.ingredientsMissing.map((item) => (
                    <li key={item.name}>
                      {item.name}
                      {item.quantity ? ` – ${item.quantity}` : ""}
                    </li>
                  ))
                : <li>Nothing – you already have everything 🎉</li>}
            </ul>
          </div>
        </div>

        {/* Steps */}
        {showSteps && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Steps:
            </p>
            <ol className="text-sm list-decimal pl-5 space-y-0.5">
              {recipe.instructions?.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

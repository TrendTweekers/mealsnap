# MealSnap - Project Summary

## 🍳 What is MealSnap?

**MealSnap** is an AI-powered recipe generator that turns your pantry into delicious meals. Users simply snap a photo of their fridge or pantry, and the app uses computer vision to detect ingredients, then generates personalized recipes based on what they have available.

### Key Features:
- 📸 **Pantry Scanning**: Take a photo or upload an image of your ingredients
- 🤖 **AI Ingredient Detection**: Automatically identifies food items from photos
- 🍽️ **Recipe Generation**: Creates 3-4 personalized recipes using detected ingredients
- ❤️ **Favorites System**: Save recipes you love for later
- 🛒 **Shopping Lists**: Automatically generates lists of missing ingredients
- 📱 **Mobile-First Design**: Beautiful, responsive UI optimized for all devices

---

## 🤖 AI Models & Prompts

### **Model: OpenAI GPT-4o (gpt-4o)**

We use **OpenAI's GPT-4o** for both vision and text generation tasks:

1. **Pantry Scanning** (`/api/scan-pantry`)
   - **Model**: `gpt-4o` (with vision capabilities)
   - **Task**: Image-to-text ingredient detection
   - **Input**: Base64-encoded image of fridge/pantry
   - **Output**: JSON array of detected ingredients

2. **Recipe Generation** (`/api/generate-recipes`)
   - **Model**: `gpt-4o`
   - **Task**: Text-to-text recipe generation
   - **Input**: List of ingredients
   - **Output**: JSON object with recipes and shopping list

---

### 📝 Prompt Details

#### **1. Pantry Scanning Prompt** (`/api/scan-pantry/route.ts`)

```
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
```

**API Configuration:**
- `model`: `"gpt-4o"`
- `max_tokens`: 500
- `response_format`: `{ type: "json_object" }`
- Uses vision API with base64 image input

---

#### **2. Recipe Generation Prompt** (`/api/generate-recipes/route.ts`)

```
You are a cooking assistant.

User gives you a list of ingredients currently in their fridge/pantry.

INGREDIENTS:
[ingredient list]

TASK:
1. Create 3–4 very simple, realistic recipes using ONLY these ingredients plus very basic pantry staples:
   - Allowed extra staples: salt, pepper, oil, water, sugar, basic dried herbs.
   - DO NOT invent ingredients that are clearly not available (no "Silesian dumplings" etc.).

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
- Do NOT wrap the JSON in backticks or a ```json code block.
- Do NOT include any additional text before or after the JSON.
```

**API Configuration:**
- `model`: `"gpt-4o"`
- `max_tokens`: 2000
- `response_format`: `{ type: "json_object" }`

---

## 🛠️ Technology Stack

### **Frontend:**
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Font**: Inter (Google Fonts)
- **State Management**: React Hooks (useState, useEffect)
- **Storage**: localStorage for favorites persistence

### **Backend:**
- **API Routes**: Next.js API Routes
- **AI Provider**: OpenAI GPT-4o
- **Image Processing**: Base64 encoding/decoding

### **Design System:**
- **Primary Color**: Emerald-600 (#10B981)
- **Secondary Color**: Emerald-500 (#059669)
- **Accent Color**: Emerald-400 (#34D399)
- **Background**: Gradient from emerald-50 to white
- **Typography**: Inter font family with extrabold headings

---

## 📋 What We've Built

### **Phase 1: Core Functionality**
1. ✅ **Pantry Scanning API** (`/api/scan-pantry`)
   - Accepts base64 image input
   - Uses GPT-4o Vision to detect ingredients
   - Returns JSON array of detected items
   - Robust error handling and JSON parsing

2. ✅ **Recipe Generation API** (`/api/generate-recipes`)
   - Takes ingredient list as input
   - Generates 3-4 personalized recipes
   - Creates shopping list of missing ingredients
   - Returns structured JSON with recipes and shopping list

3. ✅ **Main Application Flow**
   - Home page with scan functionality
   - Ingredients review/edit page
   - Recipes display page
   - Shopping list generation

### **Phase 2: UI/UX Overhaul**
1. ✅ **Professional Design System**
   - Custom MealSnap logo (lettuce + tomato icon)
   - Consistent emerald color palette
   - Inter typography with proper hierarchy
   - Clean white cards with subtle shadows

2. ✅ **Enhanced Recipe Cards**
   - Colorful gradient headers by meal type:
     - Breakfast: Orange-amber gradient
     - Lunch: Emerald-green gradient
     - Dinner: Purple-indigo gradient
     - Snack: Pink-rose gradient
   - Subtle pattern overlays
   - Smooth hover animations
   - Expandable cooking steps

3. ✅ **Navigation & Layout**
   - Sticky header with logo and navigation
   - Breadcrumb navigation (Home → Ingredients → Recipes)
   - Floating action button for quick scanning
   - Mobile-responsive design

### **Phase 3: Favorites Feature**
1. ✅ **Favorites System**
   - Heart icon button on each recipe card
   - Toggle between outlined (not saved) and filled (saved)
   - localStorage persistence (`mealsnap_favorites` key)
   - Favorites count badge in navigation
   - Dedicated Favorites page with empty state

2. ✅ **User Experience**
   - Smooth animations and transitions
   - Professional empty states
   - Friendly copy and messaging
   - Mobile-optimized touch targets (56px minimum)

### **Phase 4: Polish & Deploy**
1. ✅ **Code Quality**
   - Comprehensive `.gitignore` file
   - TypeScript type safety
   - Error handling and validation
   - Clean code structure

2. ✅ **Production Ready**
   - Environment variable management
   - API key security
   - Responsive design
   - Loading states and error messages

---

## 🎨 Design Philosophy

**"Airbnb meets Wolt meets a modern recipe app"**

- **Professional**: Clean, trustworthy, Series B startup quality
- **Warm & Inviting**: Soft gradients, rounded corners, friendly copy
- **Modern**: Smooth animations, micro-interactions, premium feel
- **Accessible**: Large touch targets, clear typography, intuitive navigation

---

## 🔐 Environment Variables Required

```env
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 📦 Key Files Structure

```
mealsnap/
├── app/
│   ├── api/
│   │   ├── scan-pantry/
│   │   │   └── route.ts          # Pantry scanning API
│   │   └── generate-recipes/
│   │       └── route.ts          # Recipe generation API
│   ├── page.tsx                  # Main application component
│   ├── layout.tsx                # Root layout with Inter font
│   └── globals.css               # Global styles
├── components/
│   └── mealsnap-logo.tsx         # Custom logo component
└── .gitignore                    # Git ignore rules
```

---

## 🚀 Deployment Status

- ✅ Code complete and production-ready
- ✅ Favorites feature implemented
- ✅ UI/UX polished and professional
- ⏳ Ready for GitHub repository creation
- ⏳ Ready for Vercel deployment

---

## 📝 Next Steps (Future Enhancements)

1. **User Accounts**: Authentication and cloud sync for favorites
2. **Recipe Sharing**: Share recipes with friends
3. **Nutritional Info**: Add calorie and nutrition data
4. **Meal Planning**: Weekly meal planning features
5. **Grocery Integration**: Direct integration with Instacart/Amazon Fresh
6. **Recipe History**: Track what you've cooked before
7. **Dietary Preferences**: Filter recipes by dietary restrictions

---

**Built with ❤️ using OpenAI GPT-4o**


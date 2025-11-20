# AI Training Insights vs AI Prompt Generator - Comparison Guide

This document explains how both AI improvement features work in the ChefAI admin panel, their purposes, and how they complement each other.

---

## 📊 AI Training Insights

### **Purpose**
Analyze which ingredients the AI **misses** (false negatives) when users manually add ingredients after scanning. This helps identify patterns in what the AI fails to detect.

### **How It Works**

#### **1. Data Collection**
- **Trigger**: When users manually add ingredients via the "Add ingredient manually" input
- **Tracking**: `/api/track-ingredient` route
- **Data Stored**:
  - Ingredient name (normalized)
  - Whether it was visible in the scan (`wasVisible` flag)
  - Scan ID (if available)
  - Timestamp
  - Reason (e.g., "packaging", "in_container", "partially_visible")

#### **2. Data Analysis** (`/api/admin/training-data`)
- Fetches all manually added ingredients from Vercel KV
- Calculates **miss rate** for each ingredient:
  ```
  missRate = (missedCount / totalManualCount) × 100
  ```
- Calculates overall **accuracy score**:
  ```
  accuracyScore = ((totalScans - totalMissed) / totalScans) × 100
  ```
- Identifies **common issues** based on ingredient patterns:
  - Chicken/meat → "packaging", "in_container"
  - Garlic/onion → "small_size", "behind_other_items"
  - Butter/cheese → "packaging", "similar_to_others"

#### **3. Admin Panel Display**
Shows:
- **Current Accuracy Score** (color-coded: green ≥85%, yellow ≥70%, red <70%)
- **Top Missed Ingredients** (last 7 days)
  - Ingredient name
  - Miss count
  - Miss rate percentage
  - Common issues
- **Improvement Suggestions** (text-based recommendations)
- **Export CSV** button (download training data)
- **Generate Improved Prompt** button (legacy - uses old API)

### **Key Features**
- ✅ Focuses on **false negatives** (missed detections)
- ✅ Based on **manual ingredient additions**
- ✅ Shows **miss rates** per ingredient
- ✅ Provides **text-based suggestions**
- ✅ **Exportable** data for analysis

### **Limitations**
- Only tracks ingredients that users manually add
- Requires user to explicitly add missed items
- Suggestions are **static** (pre-written patterns)
- Doesn't automatically improve the prompt

---

## ✨ AI Prompt Generator

### **Purpose**
Automatically generate an **improved scan prompt** using GPT-4o, analyzing both false positives AND false negatives to create a data-driven, optimized prompt.

### **How It Works**

#### **1. Data Collection**
- **False Positives**: Tracked when users remove AI-detected ingredients (`/api/track-incorrect-detection`)
- **False Negatives**: Tracked when users add ingredients within 120 seconds of scan (`/api/track-missed-detection`)
- **Both** stored in Vercel KV with counts and rates

#### **2. Prompt Generation** (`/api/admin/generate-prompt-improvement`)
- Fetches current base prompt
- Collects telemetry data:
  - Total scans
  - False positive rate
  - False negative rate
  - Top 5 false positives (with counts)
  - Top 5 false negatives (with counts)
- Sends to **GPT-4o** with improvement instructions:
  ```
  "Based on this telemetry data, revise the prompt to:
  1. Reduce false positives for top problematic ingredients
  2. Improve detection of frequently missed ingredients
  3. Adjust confidence thresholds if needed
  4. Add specific rules for problematic items
  5. Keep the same structure and format"
  ```
- GPT-4o returns a **complete revised prompt**
- Stores improved prompt in KV for review

#### **3. Admin Panel Display**
Shows:
- **"Generate Improved Scan Prompt"** button
- Loading state while GPT-4o generates
- **Generated prompt** (full text, copy-ready)
- **Telemetry summary**:
  - Total scans used
  - FP rate
  - FN rate
- **Copy button** for easy prompt copying

### **Key Features**
- ✅ Uses **GPT-4o** to generate prompts (AI-powered)
- ✅ Analyzes **both FP and FN** data
- ✅ Creates **complete revised prompt** (not just suggestions)
- ✅ **Data-driven** (uses actual telemetry)
- ✅ **Actionable** (copy-ready prompt to use)

### **Limitations**
- Requires GPT-4o API call (costs ~$0.01-0.02 per generation)
- Generated prompt needs **manual review** before deployment
- Doesn't automatically update the prompt (you copy/paste it)

---

## 🔄 How They Work Together

### **Complementary Roles**

| Aspect | AI Training Insights | AI Prompt Generator |
|--------|---------------------|---------------------|
| **Focus** | False negatives (missed items) | Both FP & FN |
| **Data Source** | Manual ingredient additions | Removals + additions |
| **Output** | Text suggestions + metrics | Complete revised prompt |
| **Automation** | Manual analysis | AI-generated |
| **Action Required** | Manual prompt editing | Copy/paste prompt |
| **Cost** | Free (KV reads) | ~$0.01-0.02 per generation |

### **Workflow**

```
1. Users scan fridges → AI detects ingredients
   ↓
2. Users remove incorrect items → Tracked as FP
   ↓
3. Users add missed items → Tracked as FN
   ↓
4. Admin checks "AI Training Insights"
   → See which ingredients are missed most
   → See accuracy score
   → Get text suggestions
   ↓
5. Admin clicks "AI Prompt Generator"
   → GPT-4o analyzes FP/FN data
   → Generates improved prompt
   → Admin reviews and copies
   ↓
6. Admin updates scan-pantry/route.ts
   → Pastes improved prompt
   → Deploys
   ↓
7. Improved accuracy → Repeat cycle
```

---

## 📈 Comparison Table

| Feature | AI Training Insights | AI Prompt Generator |
|---------|---------------------|---------------------|
| **What it analyzes** | Missed ingredients (FN only) | Both FP & FN |
| **Data collection** | Manual additions | Removals + additions |
| **Output type** | Metrics + suggestions | Complete prompt |
| **Intelligence** | Rule-based patterns | GPT-4o AI |
| **Cost** | Free | ~$0.01-0.02 |
| **Time to use** | Instant | 5-10 seconds |
| **Actionability** | Manual editing needed | Copy-ready |
| **Best for** | Understanding problems | Solving problems |

---

## 🎯 When to Use Each

### **Use AI Training Insights When:**
- ✅ You want to **understand** what the AI misses
- ✅ You need **metrics** and **accuracy scores**
- ✅ You want to **export data** for analysis
- ✅ You prefer **manual prompt editing**
- ✅ You want **free** analysis

### **Use AI Prompt Generator When:**
- ✅ You want **automatic prompt improvement**
- ✅ You need a **complete revised prompt** (not just suggestions)
- ✅ You want to analyze **both FP and FN** together
- ✅ You want **AI-powered** optimization
- ✅ You're ready to **deploy improvements**

---

## 💡 Best Practice Workflow

### **Weekly Improvement Cycle:**

1. **Monitor** (AI Training Insights)
   - Check accuracy score
   - Review top missed ingredients
   - Export CSV for tracking trends

2. **Analyze** (Both tools)
   - Compare FP vs FN rates
   - Identify patterns
   - Note problematic ingredients

3. **Generate** (AI Prompt Generator)
   - Click "Generate Improved Scan Prompt"
   - Review GPT-4o's suggestions
   - Check telemetry summary

4. **Review** (Manual)
   - Read improved prompt carefully
   - Verify it addresses issues
   - Test logic makes sense

5. **Deploy** (Manual)
   - Copy improved prompt
   - Update `app/api/scan-pantry/route.ts`
   - Deploy to production

6. **Monitor** (Repeat)
   - Watch accuracy improve
   - Track FP/FN rates
   - Repeat cycle weekly

---

## 🔍 Technical Details

### **AI Training Insights API** (`/api/admin/training-data`)
- **Method**: GET
- **Data Source**: `missed_ingredients:all`, `manual_ingredients:all`
- **Calculations**: Miss rates, accuracy scores
- **Output**: JSON with missed ingredients, suggestions, accuracy

### **AI Prompt Generator API** (`/api/admin/generate-prompt-improvement`)
- **Method**: POST
- **Data Source**: `incorrect_detections:all`, `missed_detections:all`
- **AI Model**: GPT-4o
- **Output**: Complete revised prompt text + telemetry

### **Data Flow**

```
User Actions
  ↓
Track Events (FP/FN)
  ↓
Vercel KV Storage
  ↓
Admin APIs (aggregate data)
  ↓
Admin Panel (display)
  ↓
AI Prompt Generator (GPT-4o analysis)
  ↓
Improved Prompt (copy-ready)
```

---

## 🚀 Future Enhancements

### **Potential Improvements:**

1. **Auto-Deploy Option**
   - Automatically update prompt after review
   - A/B test different prompt versions

2. **Prompt Versioning**
   - Track which prompt version is active
   - Rollback to previous versions
   - Compare accuracy across versions

3. **Scheduled Improvements**
   - Auto-generate prompts weekly
   - Email notifications with suggestions

4. **Integration**
   - Combine both tools into one workflow
   - One-click "Analyze & Improve" button

---

## 📝 Summary

**AI Training Insights** = **Diagnostic Tool**
- Shows you what's wrong
- Provides metrics and suggestions
- Helps you understand problems

**AI Prompt Generator** = **Solution Tool**
- Generates fixes automatically
- Creates actionable prompts
- Helps you solve problems

**Together** = **Complete Improvement System**
- Understand → Analyze → Generate → Deploy → Monitor → Repeat

Both tools work together to create a self-improving AI system that gets better over time through data-driven prompt optimization.


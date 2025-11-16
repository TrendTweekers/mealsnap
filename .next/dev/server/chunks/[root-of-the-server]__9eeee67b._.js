module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/app/api/process-receipt/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$3_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.3_react-dom@19.2.0_react@19.2.0__react@19.2.0/node_modules/next/server.js [app-route] (ecmascript)");
;
async function POST(request) {
    try {
        const { imageBase64 } = await request.json();
        if (!imageBase64) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$3_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: false,
                error: 'No image data'
            }, {
                status: 400
            });
        }
        // Decode base64 to buffer
        const buf = Buffer.from(imageBase64, 'base64');
        // Resize if > 1 MB (keeps quality, drops size)
        const sharp = (await __turbopack_context__.A("[externals]/sharp [external] (sharp, cjs, async loader)")).default;
        let out = buf;
        if (buf.length > 1_000_000) {
            out = await sharp(buf).resize({
                width: 1200,
                withoutEnlargement: true
            }).jpeg({
                quality: 85
            }).toBuffer();
        }
        const resizedBase64 = out.toString('base64');
        // Call Gemini 2.0 Flash
        const { GoogleGenerativeAI } = await __turbopack_context__.A("[project]/node_modules/.pnpm/@google+generative-ai@0.21.0/node_modules/@google/generative-ai/dist/index.mjs [app-route] (ecmascript, async loader)");
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash'
        });
        const prompt = `You are a receipt parser. Extract information from this receipt image and respond ONLY with valid JSON, no other text. Use this exact format:
{
  "merchant": "store name here",
  "total": 450.00,
  "tax": 0,
  "date": "2025-11-12",
  "category": "Food",
  "emoji": "🍽️"
}

Required:
- merchant: string (store/restaurant name)
- total: number (total amount paid)
- tax: number (tax amount, use 0 if not visible)
- date: string in YYYY-MM-DD format
- category: one of Food, Travel, Office, Other
- emoji: relevant emoji

Only respond with the JSON object, nothing else.`;
        const result = await model.generateContent([
            {
                inlineData: {
                    data: resizedBase64,
                    mimeType: 'image/jpeg'
                }
            },
            prompt
        ]);
        const txt = result.response.text();
        console.log('[v0] AI Response:', txt);
        try {
            // Extract JSON from response, handling markdown code blocks
            let jsonStr = txt.trim();
            console.log('[v0] Raw AI response:', jsonStr.substring(0, 500));
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            }
            // Try to find JSON object in the response if it's wrapped in text
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            const data = JSON.parse(jsonStr);
            console.log('[v0] Parsed JSON:', data);
            // Validate merchant
            data.merchant = String(data.merchant || 'COS').trim();
            if (data.merchant.length === 0) data.merchant = 'COS';
            // Parse total - handle various formats and null/undefined
            let total = 0;
            if (data.total !== null && data.total !== undefined && data.total !== '') {
                if (typeof data.total === 'number') {
                    total = data.total;
                } else if (typeof data.total === 'string') {
                    const numStr = data.total.replace(/[^0-9.-]/g, '');
                    total = parseFloat(numStr) || 0;
                }
            }
            total = Math.max(0, total); // Ensure non-negative
            if (!isFinite(total)) total = 0;
            data.total = total;
            // Parse tax
            let tax = 0;
            if (data.tax !== null && data.tax !== undefined && data.tax !== '') {
                if (typeof data.tax === 'number') {
                    tax = data.tax;
                } else if (typeof data.tax === 'string') {
                    const numStr = data.tax.replace(/[^0-9.-]/g, '');
                    tax = parseFloat(numStr) || 0;
                }
            }
            tax = Math.max(0, tax); // Ensure non-negative
            if (!isFinite(tax)) tax = 0;
            data.tax = tax;
            if (!data.date) data.date = new Date().toISOString().split('T')[0];
            if (!data.category || ![
                'Food',
                'Travel',
                'Office',
                'Other'
            ].includes(data.category)) {
                data.category = 'Other';
            }
            if (!data.emoji) data.emoji = '🛒';
            console.log('[v0] Final data:', {
                merchant: data.merchant,
                total: data.total,
                tax: data.tax,
                date: data.date,
                category: data.category,
                emoji: data.emoji
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$3_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: true,
                data
            });
        } catch (parseError) {
            console.error('[v0] Parse error:', parseError, 'Response was:', txt);
            // Return a valid response with extracted total from the receipt
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$3_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: true,
                data: {
                    merchant: 'Receipt',
                    total: 0,
                    tax: 0,
                    date: new Date().toISOString().split('T')[0],
                    category: 'Other',
                    emoji: '🛒'
                }
            });
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[v0] API error:', msg);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$3_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: `Server error: ${msg}`
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__9eeee67b._.js.map
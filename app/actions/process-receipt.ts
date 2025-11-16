"use server";

export async function processReceipt(base64Data: string) {
  if (!base64Data) return { ok: false, error: "No image data" };

  try {
    // Extract base64 from data URL if needed
    let imageBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
      const match = base64Data.match(/base64,(.+)$/);
      if (match) {
        imageBase64 = match[1];
      }
    }

    // Decode base64 to buffer
    const buf = Buffer.from(imageBase64, 'base64');

    // Resize if > 1 MB (keeps quality, drops size)
    const sharp = (await import("sharp")).default;
    let out = buf;
    if (buf.length > 1_000_000) {
      out = await sharp(buf)
                 .resize({ width: 1200, withoutEnlargement: true })
                 .jpeg({ quality: 85 })
                 .toBuffer();
    }

    const resizedBase64 = out.toString('base64');

    // Call Gemini 2.0 Flash
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Extract receipt information from this image. Return ONLY valid JSON with this structure: {"merchant":"store name","total":number,"tax":number,"date":"YYYY-MM-DD","category":"Food|Travel|Office|Other","emoji":"🛒"}`;
    const result = await model.generateContent([
      {
        inlineData: {
          data: resizedBase64,
          mimeType: "image/jpeg"
        }
      },
      prompt
    ]);
    const txt = result.response.text();

    try {
      const data = JSON.parse(txt.replace(/```json|```/g, ""));
      return { ok: true, data };
    } catch {
      return { ok: false, error: "Parse failed" };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Server error: ${msg}` };
  }
}

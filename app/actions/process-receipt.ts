'use server'

interface ExtractedReceipt {
  merchant: string
  amount: number
  category: string
  items?: string[]
}

export async function processReceiptAction(imageData: string): Promise<ExtractedReceipt> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

  if (!GOOGLE_API_KEY) {
    throw new Error('Google API key not configured on server.')
  }

  try {
    let base64Image = imageData
    let mimeType = 'image/jpeg'
    
    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        base64Image = matches[2]
      }
    }
    
    base64Image = base64Image.replace(/\s/g, '')

    if (!base64Image || base64Image.length === 0) {
      throw new Error('Invalid image data provided')
    }

    console.log('[v0] Processing receipt with', { mimeType, base64ImageLength: base64Image.length })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: 'Extract receipt information. Return ONLY valid JSON:\n{"merchant":"store name","amount":number,"category":"Food|Travel|Office|Other","items":["item1"]}',
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image,
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
          }
        })
      }
    )

    const responseText = await response.text()
    console.log('[v0] API Response status:', response.status)

    if (responseText.trim().startsWith('<') || responseText.trim().startsWith('<!')) {
      throw new Error('Invalid API key or API endpoint error. Check your GOOGLE_API_KEY environment variable.')
    }

    if (!response.ok) {
      console.log('[v0] API Error response:', responseText.substring(0, 500))
      throw new Error(`API returned ${response.status}: ${responseText.substring(0, 200)}`)
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.log('[v0] Failed to parse response:', responseText.substring(0, 200))
      throw new Error(`Failed to parse API response: ${responseText.substring(0, 200)}`)
    }

    console.log('[v0] API Response data:', JSON.stringify(data).substring(0, 300))

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error('No response from AI model')
    }

    console.log('[v0] AI response text:', content)

    let extracted: ExtractedReceipt
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('Could not find JSON in response')
    }

    // Validate extracted data
    if (!extracted.merchant || extracted.amount === undefined || !extracted.category) {
      throw new Error('Incomplete receipt data extracted')
    }

    extracted.amount = typeof extracted.amount === 'number' ? extracted.amount : parseFloat(String(extracted.amount))

    console.log('[v0] Successfully extracted:', extracted)
    return extracted
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[v0] Error in processReceiptAction:', message)
    throw error
  }
}

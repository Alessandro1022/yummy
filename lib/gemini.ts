// ============================================================
// GEMINI AI CLIENT — Free tier via Google AI API
// Model: gemini-1.5-flash (free, fast, generous limits)
// ============================================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  // Strip any accidental markdown fences
  return text.replace(/```json\n?|\n?```/g, '').trim()
}

export async function callGeminiJSON<T>(systemPrompt: string, userMessage: string): Promise<T> {
  const raw = await callGemini(systemPrompt, userMessage)
  try {
    return JSON.parse(raw) as T
  } catch {
    // Try to extract JSON from the response if it has extra text
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as T
    throw new Error(`Failed to parse Gemini JSON: ${raw.slice(0, 200)}`)
  }
}

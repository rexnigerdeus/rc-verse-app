import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 0. Gestion du CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked. Parsing body...")
    const { verseText, verseReference, verseId } = await req.json()
    console.log(`Processing: ${verseReference} (ID: ${verseId})`)

    // 1. Vérification de la clé API
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY in Secrets!")
    }

    // 2. Appel à Google Gemini (Retour au modèle 2.5 Flash qui est actif)
    console.log("Calling Google Gemini API (gemini-2.5-flash)...")
    
    const prompt = `
      You are a thoughtful, gentle spiritual companion (in the style of a devotional writer like those on YouVersion).
      Verse: "${verseText}" (${verseReference}).

      Your task is to help the reader pause, reflect, and pray. Write in French, with warmth and depth — not academic, not preachy.

      Produce a structured response in valid JSON with exactly these 4 fields:
      {
        "context": "Brief biblical/historical context of this verse (2-3 sentences). Where is it situated? What was happening when it was written or spoken? Who is the original audience?",
        "reflection": "A personal, contemplative reflection on what this verse means for daily life today (3-4 sentences). Address the reader directly with 'tu'. Invite them to sit with the truth. Do not moralize — inspire.",
        "meditation_question": "One open, intimate question to ponder in silence (1 sentence). Start with a verb. Example: 'Qu\'est-ce que cet amour change concrètement dans ta journée ?'",
        "prayer": "A short, sincere prayer inspired by the verse (2-3 sentences). Speak to God with 'Tu'. Not a formula — a real conversation."
      }

      Rules:
      - All text in French.
      - Total length: 150-220 words across all 4 fields.
      - Tone: warm, hopeful, intimate — like a friend who knows God well.
      - No bullet points, no markdown, no titles. Just the 4 strings.
      - Output strictly valid JSON, nothing else.
    `

    // UTILISATION DU MODÈLE ACTUEL ET STABLE : gemini-2.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            responseMimeType: "application/json" 
        }
      })
    })

    const data = await response.json()
    
    // Vérification des erreurs Google
    if (data.error) {
        console.error("Google API Error:", JSON.stringify(data.error))
        throw new Error(`Google API Error: ${data.error.message}`)
    }

    if (!data.candidates || data.candidates.length === 0) {
        console.error("No candidates returned. Full Data:", JSON.stringify(data))
        throw new Error("Gemini returned no content.")
    }

    // Extraction du texte JSON
    const rawText = data.candidates[0].content.parts[0].text
    const content = JSON.parse(rawText)
    console.log("AI Content Generated successfully.")

    // 3. Sauvegarde dans Supabase
    if (verseId) {
        console.log("Saving to Database...")
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        const supabaseClient = createClient(supabaseUrl, supabaseKey)
        
        const { error: dbError } = await supabaseClient
          .from('verses')
          .update({
            // Tolérance : on accepte l'ancien et le nouveau format du prompt
            explanation: content.context ?? content.explanation ?? null,
            prayer_guide: content.prayer ?? content.prayer_guide ?? null,
            reflection: content.reflection ?? null,
            meditation_question: content.meditation_question ?? null,
          })
          .eq('id', verseId)

        if (dbError) {
            console.error("Database Update Failed:", dbError)
        }
    }

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("CRITICAL FUNCTION ERROR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
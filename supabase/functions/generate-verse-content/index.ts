import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 0. Gestion du CORS (pour que l'app puisse appeler la fonction)
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

    // 2. Appel à Google Gemini (Version 2.5 Flash confirmée par vos logs)
    console.log("Calling Google Gemini API (gemini-2.5-flash)...")
    
    const prompt = `
      You are a spiritual assistant.
      Verse: "${verseText}" (${verseReference}).
      
      Task:
      1. Write a deep, comforting theological explanation in French (2 sentences).
      2. Write a short prayer in French based on this verse (2 sentences).
      
      Output strictly valid JSON format like this:
      {
        "explanation": "...",
        "prayer": "..."
      }
    `

    // NOTEZ LE CHANGEMENT ICI : gemini-2.5-flash
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
            explanation: content.explanation, 
            prayer_guide: content.prayer 
          })
          .eq('id', verseId)

        if (dbError) {
            console.error("Database Update Failed:", dbError)
            // On ne bloque pas le retour client même si la sauvegarde échoue, 
            // mais c'est bien de le loguer.
        }
    }

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("CRITICAL FUNCTION ERROR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
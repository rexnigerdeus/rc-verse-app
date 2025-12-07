// supabase/functions/get-scripture/index.ts

// CHANGED: We now also import the Request type
import { Request, serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CHANGED: We defined the headers directly in this file
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const API_URL = "https://api.scripture.api.bible/v1/bibles";

serve(async (req: Request) => {
  // CHANGED: Added 'req: Request' type
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bibleId, passageId } = await req.json();
    const apiKey = Deno.env.get("API_BIBLE_KEY");

    if (!apiKey) {
      throw new Error("API key not found");
    }

    const url = `${API_URL}/${bibleId}/passages/${passageId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "api-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from api.bible");
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    // CHANGED: Added 'error: any' type
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

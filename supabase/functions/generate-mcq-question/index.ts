
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, difficulty } = await req.json();
    
    if (!topic || !difficulty) {
      return new Response(
        JSON.stringify({ error: 'Topic and difficulty are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const prompt = `Generate a multiple choice question about "${topic}" with difficulty level "${difficulty}".

Please respond with ONLY a valid JSON object in this exact format:
{
  "question": "The question text here",
  "description": "Optional description or context",
  "options": [
    {"text": "Option 1 text", "isCorrect": false},
    {"text": "Option 2 text", "isCorrect": false},
    {"text": "Option 3 text", "isCorrect": true},
    {"text": "Option 4 text", "isCorrect": false}
  ]
}

Requirements:
- Generate exactly 4 options
- Mark exactly one option as correct (isCorrect: true)
- Make the question appropriate for the specified difficulty level
- Ensure the question is clear and unambiguous
- Make sure all options are plausible but only one is correct`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate question' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the JSON response from Gemini
    let questionData;
    try {
      // Clean the response to extract just the JSON
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      questionData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse generated content:', generatedText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse generated question' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate the structure
    if (!questionData.question || !Array.isArray(questionData.options) || questionData.options.length !== 4) {
      return new Response(
        JSON.stringify({ error: 'Invalid question format generated' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Ensure exactly one correct answer
    const correctCount = questionData.options.filter(opt => opt.isCorrect).length;
    if (correctCount !== 1) {
      return new Response(
        JSON.stringify({ error: 'Generated question must have exactly one correct answer' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(JSON.stringify(questionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-mcq-question function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, difficulty } = await req.json();
    
    console.log('Generating coding question for topic:', topic, 'difficulty:', difficulty);

    const prompt = `Generate a coding question based on the following requirements:

Topic: ${topic}
Difficulty: ${difficulty}

Please generate a comprehensive coding question with the following structure and return ONLY a valid JSON object with no additional text:

{
  "title": "A clear, concise title for the coding problem",
  "description": "A detailed description of the problem including constraints, input format, output format, and any special requirements. Make it comprehensive but clear.",
  "solutionTemplates": {
    "c": "Complete C solution template with includes, function signature, and basic structure for reading input and producing output",
    "cpp": "Complete C++ solution template with includes, function signature, and basic structure for reading input and producing output", 
    "java": "Complete Java solution template with class structure, main method, and function signature for reading input and producing output",
    "python": "Complete Python solution template with function signature and basic structure for reading input and producing output"
  },
  "examples": [
    {
      "input": "Sample input 1",
      "output": "Expected output 1", 
      "explanation": "Clear explanation of why this input produces this output"
    },
    {
      "input": "Sample input 2",
      "output": "Expected output 2",
      "explanation": "Clear explanation of why this input produces this output"
    }
  ],
  "testCases": {
    "visible": [
      {
        "input": "Visible test case 1 input",
        "output": "Expected output 1",
        "marks": 5
      },
      {
        "input": "Visible test case 2 input", 
        "output": "Expected output 2",
        "marks": 5
      }
    ],
    "hidden": [
      {
        "input": "Hidden test case 1 input",
        "output": "Expected output 1",
        "marks": 10
      },
      {
        "input": "Hidden test case 2 input",
        "output": "Expected output 2", 
        "marks": 10
      },
      {
        "input": "Hidden test case 3 input",
        "output": "Expected output 3",
        "marks": 10
      },
      {
        "input": "Hidden test case 4 input",
        "output": "Expected output 4",
        "marks": 10
      },
      {
        "input": "Hidden test case 5 input",
        "output": "Expected output 5",
        "marks": 10
      },
      {
        "input": "Hidden test case 6 input",
        "output": "Expected output 6",
        "marks": 10
      },
      {
        "input": "Hidden test case 7 input",
        "output": "Expected output 7",
        "marks": 10
      },
      {
        "input": "Hidden test case 8 input",
        "output": "Expected output 8",
        "marks": 10
      }
    ]
  }
}

Make sure the problem is appropriate for ${difficulty} difficulty level. For easy problems, use basic algorithms and data structures. For medium problems, use intermediate concepts. For hard problems, use advanced algorithms and complex logic.

The solution templates should provide a starting structure that students can build upon, including necessary imports/includes and function signatures, but should not contain the complete solution.

Return ONLY the JSON object, no markdown formatting or additional text.`;

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
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response received');
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    console.log('Generated text:', generatedText);

    // Clean up the response to extract JSON
    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let questionData;
    try {
      questionData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.error('Raw text:', cleanedText);
      throw new Error('Failed to parse generated question data');
    }

    return new Response(JSON.stringify(questionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-coding-question function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate coding question' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

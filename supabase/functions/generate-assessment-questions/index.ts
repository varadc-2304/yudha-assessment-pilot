
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId, constraints } = await req.json();
    
    if (!assessmentId || !constraints || !Array.isArray(constraints)) {
      return new Response(
        JSON.stringify({ error: 'Assessment ID and constraints are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    let totalOrderIndex = 0;

    for (const constraint of constraints) {
      const { topic, question_type, difficulty, number_of_questions } = constraint;

      for (let i = 0; i < number_of_questions; i++) {
        if (question_type === 'mcq') {
          // Generate MCQ question
          const mcqPrompt = `Generate a multiple choice question about "${topic}" with difficulty level "${difficulty}".

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
- Ensure the question is clear and unambiguous`;

          const mcqResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: mcqPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              }
            }),
          });

          if (mcqResponse.ok) {
            const mcqData = await mcqResponse.json();
            const generatedText = mcqData.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (generatedText) {
              try {
                const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const questionData = JSON.parse(jsonMatch[0]);
                  
                  // Insert MCQ question
                  const { data: mcqQuestion, error: mcqError } = await supabase
                    .from('mcq_questions')
                    .insert({
                      assessment_id: assessmentId,
                      title: questionData.question,
                      description: questionData.description || '',
                      marks: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
                      order_index: totalOrderIndex++
                    })
                    .select()
                    .single();

                  if (mcqError) throw mcqError;

                  // Insert MCQ options
                  const options = questionData.options.map((opt: any, index: number) => ({
                    mcq_question_id: mcqQuestion.id,
                    text: opt.text,
                    is_correct: opt.isCorrect,
                    order_index: index
                  }));

                  const { error: optionsError } = await supabase
                    .from('mcq_options')
                    .insert(options);

                  if (optionsError) throw optionsError;
                }
              } catch (parseError) {
                console.error('Failed to parse MCQ question:', parseError);
              }
            }
          }
        } else if (question_type === 'coding') {
          // Generate coding question
          const codingPrompt = `Generate a coding question based on the following requirements:

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
      }
    ]
  }
}

Make sure the problem is appropriate for ${difficulty} difficulty level.`;

          const codingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: codingPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              }
            }),
          });

          if (codingResponse.ok) {
            const codingData = await codingResponse.json();
            const generatedText = codingData.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (generatedText) {
              try {
                let cleanedText = generatedText.trim();
                if (cleanedText.startsWith('```json')) {
                  cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (cleanedText.startsWith('```')) {
                  cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }

                const questionData = JSON.parse(cleanedText);
                
                // Insert coding question
                const { data: codingQuestion, error: codingError } = await supabase
                  .from('coding_questions')
                  .insert({
                    assessment_id: assessmentId,
                    title: questionData.title,
                    description: questionData.description,
                    marks: difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30,
                    order_index: totalOrderIndex++
                  })
                  .select()
                  .single();

                if (codingError) throw codingError;

                // Insert coding languages
                const languages = Object.entries(questionData.solutionTemplates).map(([lang, template]) => ({
                  coding_question_id: codingQuestion.id,
                  coding_lang: lang,
                  solution_template: template as string
                }));

                const { error: languagesError } = await supabase
                  .from('coding_languages')
                  .insert(languages);

                if (languagesError) throw languagesError;

                // Insert examples
                const examples = questionData.examples.map((example: any, index: number) => ({
                  coding_question_id: codingQuestion.id,
                  input: example.input,
                  output: example.output,
                  explanation: example.explanation,
                  order_index: index
                }));

                const { error: examplesError } = await supabase
                  .from('coding_examples')
                  .insert(examples);

                if (examplesError) throw examplesError;

                // Insert test cases
                const allTestCases = [
                  ...questionData.testCases.visible.map((tc: any, index: number) => ({
                    coding_question_id: codingQuestion.id,
                    input: tc.input,
                    output: tc.output,
                    marks: tc.marks,
                    is_hidden: false,
                    order_index: index
                  })),
                  ...questionData.testCases.hidden.map((tc: any, index: number) => ({
                    coding_question_id: codingQuestion.id,
                    input: tc.input,
                    output: tc.output,
                    marks: tc.marks,
                    is_hidden: true,
                    order_index: index + questionData.testCases.visible.length
                  }))
                ];

                const { error: testCasesError } = await supabase
                  .from('test_cases')
                  .insert(allTestCases);

                if (testCasesError) throw testCasesError;
              } catch (parseError) {
                console.error('Failed to parse coding question:', parseError);
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Questions generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-assessment-questions function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

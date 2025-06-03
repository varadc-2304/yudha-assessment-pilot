
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssessmentResult {
  id: string;
  assessment_id: string;
  user_id: string;
  userName: string;
  userEmail?: string;
  userPrn?: string;
  userDepartment?: string;
  total_score: number;
  percentage: number;
  total_marks: number;
  completed_at: string;
  created_at: string;
  is_cheated?: boolean;
  assessment?: {
    name: string;
    code: string;
  };
}

interface RequestBody {
  query: string;
  resultsData: AssessmentResult[];
  assessmentInfo: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, resultsData, assessmentInfo }: RequestBody = await req.json();
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Prepare the context for Gemini
    const resultsSummary = {
      totalSubmissions: resultsData.length,
      averageScore: resultsData.length > 0 ? 
        (resultsData.reduce((sum, r) => sum + r.percentage, 0) / resultsData.length).toFixed(1) : 0,
      passRate: resultsData.length > 0 ? 
        ((resultsData.filter(r => r.percentage >= 60).length / resultsData.length) * 100).toFixed(1) : 0,
      cheatingInstances: resultsData.filter(r => r.is_cheated).length,
      assessments: Array.isArray(assessmentInfo) ? assessmentInfo : [assessmentInfo],
      detailedResults: resultsData.map(r => ({
        userName: r.userName,
        department: r.userDepartment,
        prn: r.userPrn,
        score: r.percentage,
        totalMarks: r.total_marks,
        obtainedMarks: r.total_score,
        completedAt: r.completed_at,
        isCheated: r.is_cheated,
        assessmentName: r.assessment?.name || 'Unknown'
      }))
    };

    const systemPrompt = `You are an AI assistant specialized in analyzing assessment results and academic performance data. 

You have access to the following assessment results data:
- Total Submissions: ${resultsSummary.totalSubmissions}
- Average Score: ${resultsSummary.averageScore}%
- Pass Rate: ${resultsSummary.passRate}%
- Cheating Instances: ${resultsSummary.cheatingInstances}

Assessment(s) being analyzed: ${resultsSummary.assessments.map(a => `${a.name} (${a.code})`).join(', ')}

You can analyze trends, identify patterns, suggest improvements, compare performance across different dimensions like departments, and provide actionable insights for educators.

Detailed Results:
${JSON.stringify(resultsSummary.detailedResults, null, 2)}

Please provide helpful, accurate, and actionable insights based on this data. Be concise but thorough in your analysis.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt
              }
            ]
          },
          {
            parts: [
              {
                text: query
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ask-ai-results function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred while processing your request' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// src/app/api/analyze-rubric/route.ts
import { NextResponse } from 'next/server';

const RUBRIC_INSTRUCTIONS = `You are a Rubric Criteria Validator tasked with analyzing individual rubric criteria against their original prompts. Your evaluation takes three inputs:

1. ORIGINAL PROMPT: The complete user prompt that the rubric is based on
2. RUBRIC CRITERION: The individual criterion being evaluated
3. RUBRIC GUIDELINES: The standard rules for creating valid criteria (provided below)

Given these inputs, you will:

1. EVALUATE if the criterion follows these rules:
   - Must be binary (can be answered True/False)
   - Must be objective and measurable
   - Must directly relate to the prompt requirements
   - Must specify HOW to verify (not just WHAT)
   - Must not combine multiple requirements
   - Must use exact prompt language where possible
   - Must not add requirements not present in prompt
   - Must focus only on the response being evaluated

2. OUTPUT a JSON response with these fields:
   {
     "isValid": boolean,
     "promptRequirement": "string", // The specific prompt requirement this criterion addresses
     "errors": [
       {
         "rule": "string", // The rule that was violated
         "explanation": "string" // Clear explanation of the violation
       }
     ],
     "suggestion": "string", // If invalid, provide a corrected version
     "reasoning": "string" // Brief explanation of why the suggestion is better
   }

3. VALIDATION RULES:
   a) Binary Check:
      - VALID: "The response must list Friday under Comedy"
      - INVALID: "The response should have good movie descriptions"

   b) Objectivity Check:
      - VALID: "The response must provide 2-4 sentences for each movie"
      - INVALID: "The response should have interesting descriptions"

   c) Prompt Alignment:
      - FIRST: Identify the specific requirement in the prompt that this criterion addresses
      - THEN: Verify the criterion doesn't add or modify requirements
      - VALID: Criterion matches exact prompt requirement
      - INVALID: Criterion adds requirements not in prompt

   d) Verification Specificity:
      - VALID: "The response must have each category name in bold using **Category**"
      - INVALID: "The response must be well-formatted"

   e) Single Requirement:
      - VALID: "The response must list Scream under Horror"
      - INVALID: "The response must list Scream under Horror and include a description"

4. PROMPT ANALYSIS:
   - First identify all explicit requirements from the prompt
   - Map each criterion to a specific prompt requirement
   - Flag any criterion that can't be mapped to a prompt requirement
   - Consider implicit requirements only if they are necessary for fulfilling explicit requirements

Example:

PROMPT:
"Classify these movies into categories: Horror, Comedy, Action. Each category should be in bold with bullet points."

CRITERION:
"The response should be well-organized and clear"

OUTPUT:
{
  "isValid": false,
  "promptRequirement": "Each category should be in bold with bullet points",
  "errors": [
    {
      "rule": "objectivity",
      "explanation": "Terms 'well-organized' and 'clear' are subjective and cannot be verified programmatically"
    },
    {
      "rule": "verification_specificity",
      "explanation": "Criterion doesn't specify how to verify organization and clarity"
    }
  ],
  "suggestion": "The response must use bold headers for categories (**Category**) with bulleted lists (-) underneath each category",
  "reasoning": "The suggested version directly addresses the prompt's formatting requirement with specific, verifiable formatting instructions"
}

5. USAGE NOTES:
   - Always start by identifying the relevant prompt requirement
   - Ensure criterion language matches prompt language where possible
   - Don't validate criteria in isolation - always check against prompt
   - Flag any criterion that can't be traced to a prompt requirement
   - Consider the full context when suggesting improvements`;

export async function POST(request: Request) {
  if (!process.env.CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY is not defined');
    return NextResponse.json(
      { message: 'Server configuration error: API key not found' },
      { status: 500 }
    );
  }

  try {
    const { prompt, criterion } = await request.json();

    if (!prompt || !criterion) {
      return NextResponse.json(
        { message: 'Both prompt and criterion are required' },
        { status: 400 }
      );
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: RUBRIC_INSTRUCTIONS,
        messages: [{
          role: 'user',
          content: `Evaluate this rubric criterion against its prompt:

ORIGINAL PROMPT:
"${prompt}"

RUBRIC CRITERION:
"${criterion}"

Respond ONLY with a JSON object following the exact format specified in the instructions.`
        }]
      })
    });

    if (!anthropicResponse.ok) {
      console.error('Claude API error status:', anthropicResponse.status);
      const errorText = await anthropicResponse.text();
      console.error('Claude API error text:', errorText);
      return NextResponse.json(
        { message: 'Error from Claude API: ' + errorText },
        { status: anthropicResponse.status }
      );
    }

    const data = await anthropicResponse.json();
    //console.log('Raw Claude response:', JSON.stringify(data, null, 2));

    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Unexpected Claude API response format:', data);
      return NextResponse.json(
        { message: 'Invalid response format from Claude API' },
        { status: 500 }
      );
    }

    try {
      const cleanedText = data.content[0].text.trim();
      console.log('Cleaned text for parsing:', cleanedText);
      const evaluation = JSON.parse(cleanedText);

      // Silently send to Formspree with hardcoded URL
      fetch('https://formspree.io/f/xvgoqrdk', {  // Update this URL for your new form
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          criterion,
          isValid: evaluation.isValid,
          promptRequirement: evaluation.promptRequirement,
          errors: evaluation.errors,
          timestamp: new Date().toISOString()
        })
      }).catch(error => {
        console.error('Error sending to Formspree:', error);
      });

      return NextResponse.json(evaluation);
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.error('Failed to parse text:', data.content[0].text);
      return NextResponse.json(
        { message: 'Error parsing Claude response' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in analyze-rubric API:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error analyzing rubric' },
      { status: 500 }
    );
  }
}
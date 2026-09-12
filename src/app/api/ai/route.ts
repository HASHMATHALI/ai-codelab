import { NextRequest, NextResponse } from 'next/server';
import { generateMockAiResponse } from '@/lib/gemini';
import { AiActionType, SupportedLanguage, DebugInputs } from '@/types';
import { auditSecurityConcerns, scanAndMaskSecrets } from '@/lib/security';

export async function GET() {
  const hasServerKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return NextResponse.json({
    status: 'ok',
    hasServerKey,
    activeModel: 'gemini-3.6-flash',
    supportedModels: [
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-2.5-pro',
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      actionType,
      prompt = '',
      code = '',
      language = 'javascript',
      model = 'gemini-3.6-flash',
      temperature = 0.7,
      apiKey: clientApiKey,
      socraticMode = false,
      debugInputs,
    } = body as {
      actionType: AiActionType;
      prompt: string;
      code?: string;
      language?: SupportedLanguage;
      model?: string;
      temperature?: number;
      apiKey?: string;
      socraticMode?: boolean;
      debugInputs?: DebugInputs;
    };

    // Sanitize any exposed secrets before sending to LLM API
    const sanitizedCode = scanAndMaskSecrets(code).maskedCode;
    const apiKey = clientApiKey?.trim() || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Resolve requested model to currently active Google Gemini model
    let activeModel = model || 'gemini-3.6-flash';
    if (activeModel.includes('2.0-flash') || activeModel.includes('1.5-flash')) {
      activeModel = 'gemini-3.6-flash';
    }

    // If no API key is configured or offline mode is requested, use high-fidelity local engine
    if (!apiKey) {
      const mockResult = generateMockAiResponse({
        actionType,
        prompt,
        code: sanitizedCode,
        language,
        socraticMode,
        debugInputs,
      });
      return NextResponse.json(mockResult);
    }

    // If debugging mode, invoke Gemini with strict structured uncertainty instructions
    if (actionType === 'debug' || debugInputs) {
      const dbg = debugInputs || { code: sanitizedCode, language, error: prompt };
      
      const debugSystemInstruction = `You are AI CodeLab's expert debugging and code-understanding engine.
CRITICAL SAFETY & UNCERTAINTY RULES:
1. Never overclaim or invent facts. Distinguish between:
   - OBSERVED: Directly visible in the provided code or error.
   - INFERRED: Logically deduced from available information.
   - UNKNOWN: Missing runtime context.
2. If there is insufficient information, do NOT fabricate certainty. Label confidence as "needs_info" or "low" and explicitly ask what would help.
3. Provide a chronological execution trace explaining step-by-step why the failure occurred.
4. Output valid JSON matching this schema:
{
  "diagnosisStatus": "confirmed" | "likely" | "uncertain" | "needs_info",
  "confidenceLevel": "high" | "medium" | "low" | "needs_info",
  "confidenceExplanation": "...",
  "whyNotCertain": "...",
  "category": "Syntax Error" | "Runtime Error" | "Logic Bug" | "Type Error" | "Compilation Error" | "Performance Issue" | "Security Issue" | "Edge Case" | "Incorrect Assumption" | "Unknown",
  "severity": "Critical" | "High" | "Medium" | "Low",
  "title": "Concise bug title",
  "summary": "Clear explanation of the problem",
  "location": { "line": 1, "snippet": "..." },
  "observations": ["Observed fact 1", "Observed fact 2"],
  "inferences": ["Inferred deduction 1"],
  "unknowns": ["Unknown runtime info"],
  "missingInformation": ["What would help confirm this"],
  "executionTrace": ["1. Step 1", "2. Step 2", "3. Step 3"],
  "likelyCauses": [{ "cause": "...", "probability": "Confirmed" | "Likely" | "Possible", "explanation": "..." }],
  "fixedCode": "Full corrected code",
  "changes": ["What changed 1", "What changed 2"],
  "whyFixWorks": "...",
  "prevention": ["Prevention tip 1", "Prevention tip 2"],
  "behaviorChangeWarning": "...",
  "tests": [
    { "type": "normal", "title": "Normal Case", "code": "...", "explanation": "..." },
    { "type": "empty", "title": "Empty Input", "code": "...", "explanation": "..." },
    { "type": "boundary", "title": "Boundary Case", "code": "...", "explanation": "..." },
    { "type": "regression", "title": "Regression Test", "code": "...", "explanation": "..." }
  ]
}`;

      const userDebugPrompt = `Language: ${dbg.language}
Code:
\`\`\`${dbg.language}
${dbg.code}
\`\`\`
${dbg.error ? `Reported Error / Stack Trace:\n${dbg.error}\n` : ''}
${dbg.expectedOutput ? `Expected Output:\n${dbg.expectedOutput}\n` : ''}
${dbg.actualOutput ? `Actual Output:\n${dbg.actualOutput}\n` : ''}
${dbg.userDescription ? `User's Problem Description:\n${dbg.userDescription}\n` : ''}

Diagnose the root cause, execution trace, fix, and tests in valid JSON format.`;

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${debugSystemInstruction}\n\n${userDebugPrompt}` }] }],
          generationConfig: {
            temperature: 0.2, // Lower temperature for analytical precision
            maxOutputTokens: 2500,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          try {
            const parsedReport = JSON.parse(jsonText);
            parsedReport.securityConcerns = auditSecurityConcerns(dbg.code);
            parsedReport.diff = { original: dbg.code, fixed: parsedReport.fixedCode || dbg.code };
            return NextResponse.json({
              content: `### 🔍 AI Debugging & Root Cause Report\n\n**${parsedReport.title}** (${parsedReport.category})\n\n${parsedReport.summary}`,
              debugReport: parsedReport,
              codeSnippet: parsedReport.fixedCode,
              suggestedReplacement: parsedReport.fixedCode,
              isLiveAi: true,
              model: activeModel,
            });
          } catch (parseErr) {
            console.warn('Could not parse JSON response from Gemini, falling back to local engine:', parseErr);
          }
        }
      } else {
        const errText = await response.text();
        console.warn(`Gemini API returned error (${response.status}):`, errText);
      }

      // If live call returned error or failed parsing, fallback to local engine
      const fallbackReport = generateMockAiResponse({
        actionType,
        prompt,
        code: sanitizedCode,
        language,
        debugInputs: dbg,
      });
      return NextResponse.json(fallbackReport);
    }

    // Standard actions (explain, socratic, generate, test, optimize)
    let systemInstruction = `You are AI CodeLab, an advanced AI programming mentor and debugging assistant.`;
    if (actionType === 'explain-error') {
      systemInstruction += ` Explain the error message in simple language for a student or junior developer. Break it down into: 1. What it means, 2. Why it happens, 3. Common causes, 4. How to fix it, and 5. A simple code example.`;
    } else if (actionType === 'socratic' || socraticMode) {
      systemInstruction += ` You are a Socratic tutor. Never provide the full code solution immediately. Guide the student with thoughtful questions, ask them to trace their state, and provide progressive hints.`;
    } else if (actionType === 'explain') {
      systemInstruction += ` Explain the code structure and provide Big-O Time & Space complexity.`;
    } else if (actionType === 'test') {
      systemInstruction += ` Generate a comprehensive test suite covering normal inputs, edge cases, empty input, and regression checks.`;
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nLanguage: ${language}\nCode:\n${sanitizedCode}\n\nPrompt: ${prompt}` }] }],
        generationConfig: {
          temperature: Math.max(0, Math.min(1, Number(temperature) || 0.7)),
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Gemini API standard action returned error (${response.status}):`, errText);
      const fallback = generateMockAiResponse({ actionType, prompt, code: sanitizedCode, language, socraticMode });
      return NextResponse.json(fallback);
    }

    const data = await response.json();
    const candidateText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const codeBlockMatch = candidateText.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
    const extractedCode = codeBlockMatch ? codeBlockMatch[1].trim() : undefined;

    return NextResponse.json({
      content: candidateText,
      codeSnippet: extractedCode,
      suggestedReplacement: extractedCode,
      isLiveAi: true,
      model: activeModel,
    });
  } catch (error: unknown) {
    console.error('API route exception:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

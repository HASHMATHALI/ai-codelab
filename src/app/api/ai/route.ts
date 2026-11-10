import { NextRequest, NextResponse } from 'next/server';
import { generateMockAiResponse } from '@/lib/gemini';
import { AiActionType, SupportedLanguage, DebugInputs } from '@/types';
import { auditSecurityConcerns, scanAndMaskSecrets } from '@/lib/security';

const SUPPORTED_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-pro'] as const;
const DEFAULT_MODEL = SUPPORTED_MODELS[0];
const MAX_CODE_CHARS = 50_000;
const MAX_PROMPT_CHARS = 8_000;

function callGemini(model: string, apiKey: string, payload: unknown) {
  // Key travels in a header (never the URL) so it cannot leak into logs or error messages.
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  });
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Calls the requested model and, when it is overloaded or rate limited, falls
 * through the other allow-listed models before giving up.
 */
async function callGeminiWithFallback(model: string, apiKey: string, payload: unknown) {
  const candidates = [model, ...SUPPORTED_MODELS.filter((m) => m !== model)];
  let response: Response | undefined;
  let usedModel = model;
  for (const candidate of candidates) {
    usedModel = candidate;
    try {
      response = await callGemini(candidate, apiKey, payload);
    } catch (err) {
      console.warn(`Gemini request to ${candidate} failed:`, err instanceof Error ? err.message : err);
      continue;
    }
    if (response.ok || !RETRYABLE_STATUS.has(response.status)) break;
    console.warn(`Gemini model ${candidate} unavailable (${response.status}), trying next model.`);
  }
  return { response, usedModel };
}

export async function GET() {
  const hasServerKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return NextResponse.json({
    status: 'ok',
    hasServerKey,
    activeModel: DEFAULT_MODEL,
    supportedModels: SUPPORTED_MODELS,
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

    if (typeof code !== 'string' || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'code and prompt must be strings' }, { status: 400 });
    }
    const debugPayloadSize = debugInputs ? JSON.stringify(debugInputs).length : 0;
    if (code.length > MAX_CODE_CHARS || prompt.length > MAX_PROMPT_CHARS || debugPayloadSize > MAX_CODE_CHARS + MAX_PROMPT_CHARS) {
      return NextResponse.json({ error: 'Input too large. Limit code to 50,000 characters and prompts to 8,000.' }, { status: 413 });
    }

    // Sanitize any exposed secrets before sending to LLM API
    const sanitizedCode = scanAndMaskSecrets(code).maskedCode;
    const apiKey = clientApiKey?.trim() || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Resolve requested model to currently active Google Gemini model
    // Only allow-listed models reach the upstream URL (prevents path injection with the server key).
    const activeModel = (SUPPORTED_MODELS as readonly string[]).includes(model) ? model : DEFAULT_MODEL;

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
      // Secrets are masked server-side too, so a direct API caller cannot forward them to the LLM.
      const dbg = debugInputs
        ? { ...debugInputs, code: scanAndMaskSecrets(String(debugInputs.code ?? '')).maskedCode }
        : { code: sanitizedCode, language, error: prompt };
      
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

      const { response, usedModel } = await callGeminiWithFallback(activeModel, apiKey, {
          contents: [{ role: 'user', parts: [{ text: `${debugSystemInstruction}\n\n${userDebugPrompt}` }] }],
          generationConfig: {
            temperature: 0.2, // Lower temperature for analytical precision
            maxOutputTokens: 2500,
            responseMimeType: 'application/json',
          },
        });

      if (response?.ok) {
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
              model: usedModel,
            });
          } catch (parseErr) {
            console.warn('Could not parse JSON response from Gemini, falling back to local engine:', parseErr);
          }
        }
      } else {
        const errText = response ? await response.text() : 'no response from any model';
        console.warn(`Gemini API returned error (${response?.status ?? 'network'}):`, errText);
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

    const { response, usedModel } = await callGeminiWithFallback(activeModel, apiKey, {
        contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nLanguage: ${language}\nCode:\n${sanitizedCode}\n\nPrompt: ${prompt}` }] }],
        generationConfig: {
          temperature: Math.max(0, Math.min(1, Number(temperature) || 0.7)),
          maxOutputTokens: 2048,
        },
      });

    if (!response?.ok) {
      const errText = response ? await response.text() : 'no response from any model';
      console.warn(`Gemini API standard action returned error (${response?.status ?? 'network'}):`, errText);
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
      model: usedModel,
    });
  } catch (error: unknown) {
    console.error('API route exception:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

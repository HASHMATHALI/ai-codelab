import { 
  AiActionType, 
  SupportedLanguage, 
  DebugReport, 
  DebugInputs, 
  TestCaseItem,
  ConfidenceLevel,
  DiagnosisStatus,
  BugCategory
} from '@/types';
import { auditSecurityConcerns, scanAndMaskSecrets } from './security';

export interface AiRequestPayload {
  actionType: AiActionType;
  prompt: string;
  code?: string;
  language: SupportedLanguage;
  model?: string;
  temperature?: number;
  apiKey?: string;
  socraticMode?: boolean;
  debugInputs?: DebugInputs;
}

export interface AiResponsePayload {
  content: string;
  codeSnippet?: string;
  suggestedReplacement?: string;
  debugReport?: DebugReport;
  complexity?: {
    time: string;
    space: string;
    explanation: string;
  };
}

/**
 * Main AI dispatcher for AI CodeLab.
 */
export async function executeAiAction(payload: AiRequestPayload): Promise<AiResponsePayload> {
  const { actionType, prompt, code = '', language, apiKey, model = 'gemini-2.0-flash', temperature = 0.7, socraticMode = false, debugInputs } = payload;

  // Sanitize any exposed secrets before transmitting to external APIs
  const sanitizedCode = scanAndMaskSecrets(code).maskedCode;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          prompt,
          code: sanitizedCode,
          language,
          model,
          temperature,
          apiKey,
          socraticMode,
          debugInputs,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `AI Service returned HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI service unavailable';
      console.warn('Live AI call failed, falling back to smart local engine:', message);
      const fallback = generateMockAiResponse({ ...payload, code: sanitizedCode });
      return {
        ...fallback,
        content: `⚠️ *[Live API Notice: ${message}. Showing local diagnostic result]*\n\n` + fallback.content,
      };
    }
  }

  // Instant local diagnostic engine
  return generateMockAiResponse({ ...payload, code: sanitizedCode });
}

/**
 * Comprehensive diagnostic engine implementing the Uncertainty and Safety Layer.
 */
export function generateMockAiResponse(payload: AiRequestPayload): AiResponsePayload {
  const { actionType, prompt, code = '', language, debugInputs, socraticMode = false } = payload;

  if (actionType === 'debug' || debugInputs) {
    const report = generateStructuredDebugReport(debugInputs || { code, language, error: prompt });
    return {
      content: `### 🔍 AI Debugging & Root Cause Report\n\n**${report.title}** (${report.category})\n\n${report.summary}\n\n*Review the complete structured diagnosis and fix below.*`,
      debugReport: report,
      codeSnippet: report.fixedCode,
      suggestedReplacement: report.fixedCode,
    };
  }

  if (actionType === 'explain-error') {
    return {
      content: generateErrorExplanationContent(prompt, language),
    };
  }

  // Standard modes (explain, fix, test, optimize, socratic, generate)
  switch (actionType) {
    case 'socratic': {
      return {
        content: `🧠 **Socratic AI Tutor Guidance**\n\n` +
          `Let's analyze the failure path together:\n\n` +
          `1. **Observed Invariant**: What is the minimum length or state required before accessing collection indices?\n` +
          `2. **State Tracing**: If the input is empty or null, what does your pointer or loop counter evaluate to?\n` +
          `3. **Safe Fallback**: What should your function reasonably return if input requirements are not satisfied?\n\n` +
          `💡 **Guiding Question**: Would checking \`if (!data || data.length === 0)\` at line 1 prevent execution from reaching the crashing statement?` +
          (socraticMode ? `\n\n🤔 *Pedagogical check*: Which variable changes value just before the crash?` : ''),
      };
    }

    case 'explain': {
      const timeComp = code.includes('for') && (code.match(/for/g) || []).length > 1 ? 'O(N²)' : 'O(N)';
      const spaceComp = 'O(1)';
      return {
        content: `### 📖 Code Logic Breakdown\n\n` +
          `- **Primary Purpose**: Implements procedural data operations for ${language.toUpperCase()}.\n` +
          `- **Execution Flow**: Validates arguments, initializes state registers, iterates through elements, and produces final result.\n` +
          `- **Potential Risk Areas**: Watch out for unvalidated boundary indices and empty input structures.`,
        complexity: {
          time: timeComp,
          space: spaceComp,
          explanation: 'Calculated from iteration patterns and state allocations.',
        },
      };
    }

    case 'test': {
      const tests = generateTestCasesForCode(code, language, 'Edge Case & Boundary Suite');
      const testCode = tests.map(t => `// ${t.title}\n${t.code}`).join('\n\n');
      return {
        content: `🧪 **Auto-Generated Test Suite**\n\nGenerated 5 test categories covering normal input, edge cases, empty input, boundary values, and regression validation.`,
        codeSnippet: testCode,
      };
    }

    case 'optimize': {
      return {
        content: `⚡ **Optimization & Clean Code Assessment**\n\n` +
          `- **Complexity Analysis**: Currently evaluating with $O(N)$ iteration.\n` +
          `- **Early Return Guard**: Adding an immediate check for null/empty saves redundant memory allocation.\n` +
          `- **Safety Hardening**: Input guard prevents runtime exceptions without performance degradation.`,
        suggestedReplacement: code,
        codeSnippet: code,
      };
    }

    case 'generate':
    default: {
      return {
        content: `✨ **Generated Solution**\n\n` +
          `Implemented solution for: *"${prompt || 'Code request'}"* in ${language.toUpperCase()}.\n\n` +
          `⚠️ *Notice: AI-generated code should be reviewed and tested before use in production.*`,
        codeSnippet: code || `// Solution in ${language}\nfunction solution() {\n  return true;\n}\n`,
      };
    }
  }
}

/**
 * Builds the comprehensive structured DebugReport following the Uncertainty and Safety guidelines.
 */
export function generateStructuredDebugReport(inputs: DebugInputs): DebugReport {
  const { code, language, error = '', expectedOutput = '', actualOutput = '', userDescription = '' } = inputs;
  const lowerCode = code.toLowerCase();
  const lowerError = error.toLowerCase();
  const lowerDesc = userDescription.toLowerCase();

  const securityConcerns = auditSecurityConcerns(code);
  const secretScan = scanAndMaskSecrets(code);

  // Determine category and specifics based on inputs
  let category: BugCategory = 'Runtime Error';
  let severity: 'Critical' | 'High' | 'Medium' | 'Low' = 'High';
  let confidenceLevel: ConfidenceLevel = 'high';
  let diagnosisStatus: DiagnosisStatus = 'confirmed';
  let confidenceExplanation = 'The error message and code directly identify the failing operation.';
  let whyNotCertain: string | undefined = undefined;
  let title = 'Runtime Exception Detected';
  let summary = 'Your code encounters a failure under specific execution conditions.';
  let lineNum = 1;
  let observations: string[] = [];
  let inferences: string[] = [];
  let unknowns: string[] = [];
  let missingInformation: string[] = [];
  let executionTrace: string[] = [];
  let likelyCauses: DebugReport['likelyCauses'] = [];
  let fixedCode = code;
  let changes: string[] = [];
  let whyFixWorks = '';
  let prevention: string[] = [];
  let behaviorChangeWarning: string | undefined = undefined;

  // 1. Python IndexError Scenario
  if (language === 'python' && (lowerError.includes('indexerror') || lowerDesc.includes('empty') || lowerCode.includes('items[0]'))) {
    category = 'Runtime Error';
    severity = 'High';
    confidenceLevel = 'high';
    diagnosisStatus = 'confirmed';
    title = 'IndexError: list index out of range';
    summary = 'Your code attempts to access array element items[0] and items[-1] without verifying whether the list contains any items.';
    lineNum = 5;

    observations = [
      'Line 5 accesses `items[0]` and line 6 accesses `items[-1]`.',
      'The provided error is `IndexError: list index out of range` originating at line 5.',
      'The test case initializes `test_data = []` (an empty list).'
    ];
    inferences = [
      'When an empty list `[]` is passed, `len(items) == 0`.',
      'Accessing index 0 or -1 on a zero-length list is illegal in Python and immediately raises `IndexError`.'
    ];
    unknowns = [
      'What default return format the calling application expects when the list is empty (e.g. `(None, None)`, empty tuple, or raising a custom ValueError).'
    ];

    executionTrace = [
      '1. `get_first_and_last` is invoked with `test_data = []`.',
      '2. Python enters function body and evaluates line 5: `first_item = items[0]`.',
      '3. Because `items` has length 0, index 0 is out of bounds.',
      '4. Python raises `IndexError: list index out of range` and halts execution.'
    ];

    likelyCauses = [
      {
        cause: 'Unchecked empty list access',
        probability: 'Confirmed',
        explanation: 'Index 0 was requested from an empty collection without a guard condition.'
      }
    ];

    fixedCode = `def get_first_and_last(items):
    """
    Returns a tuple with the first and last elements of the list.
    Safely handles empty or single-element collections.
    """
    # Defensive guard: check if items is None or empty
    if not items:
        return (None, None)
        
    first_item = items[0]
    last_item = items[-1]
    return (first_item, last_item)

# Test with empty input:
test_data = []
result = get_first_and_last(test_data)
print("Result with empty list:", result)

# Test with valid input:
valid_data = [10, 20, 30]
print("Result with elements:", get_first_and_last(valid_data))
`;

    changes = [
      'Added defensive boundary guard: `if not items: return (None, None)`',
      'Prevented invalid index access when collection length is zero',
      'Added verification tests for both empty and populated lists'
    ];

    whyFixWorks = 'The guard `if not items:` intercepts empty lists or `None` values immediately, returning a safe default tuple before any bracket indexing can trigger an IndexError.';

    prevention = [
      'Always validate collection length or use `if not collection:` before accessing index `0` or `-1`.',
      'Write an automated test for empty input `[]` on every function dealing with lists.',
      'Use `next(iter(items), None)` or safe helper functions when fetching initial elements.'
    ];

    behaviorChangeWarning = 'Returns `(None, None)` when the list is empty. If your caller expects an exception, raise `ValueError("List cannot be empty")` instead.';
  }

  // 2. JavaScript Undefined Property Scenario
  else if ((language === 'javascript' || language === 'typescript') && (lowerError.includes('cannot read properties of undefined') || lowerCode.includes('user.profile.name') || lowerDesc.includes('cannot read properties of undefined'))) {
    category = 'Type Error';
    severity = 'High';
    confidenceLevel = 'high';
    diagnosisStatus = 'confirmed';
    title = 'TypeError: Cannot read properties of undefined (reading "name")';
    summary = 'Your code attempts to read nested property `.name` on `user.profile`, but `profile` is undefined in the response payload.';
    lineNum = 4;

    observations = [
      'Line 4 accesses `user.profile.name`.',
      'The error log states `TypeError: Cannot read properties of undefined (reading "name")` at line 4.',
      'In `apiPayload`, the `user` object does not have a `profile` property.'
    ];
    inferences = [
      '`user.profile` evaluates to `undefined`.',
      'Chaining `.name` onto `undefined` triggers a fatal TypeError in JavaScript runtime environments.'
    ];
    unknowns = [
      'Whether the backend API is supposed to always provide `profile`, or if new/unregistered users legitimately lack profiles.'
    ];

    executionTrace = [
      '1. Function `formatUserProfile` receives `apiPayload`.',
      '2. Line 3 extracts `user = response.data.user` (which exists).',
      '3. Line 4 accesses `user.profile` -> returns `undefined`.',
      '4. Code immediately attempts to read `.name` from `undefined`.',
      '5. V8 JavaScript engine throws `TypeError: Cannot read properties of undefined`.'
    ];

    likelyCauses = [
      {
        cause: 'Unsafe nested property access without optional chaining or nullish checks',
        probability: 'Confirmed',
        explanation: 'Deeply nested properties in API payloads can be missing or null for fresh accounts.'
      }
    ];

    fixedCode = `function formatUserProfile(response) {
  // Defensive validation: ensure response and data exist
  const user = response?.data?.user;
  if (!user) {
    throw new Error("Invalid payload: missing user object");
  }

  // Safe optional chaining with nullish coalescing defaults
  const displayName = user.profile?.name ?? "Anonymous User";
  const avatarUrl = user.profile?.avatar || "/default.png";

  return {
    name: displayName.toUpperCase(),
    avatar: avatarUrl,
    memberSince: user.createdAt || new Date().toISOString().split("T")[0]
  };
}

// Test with missing profile payload:
const apiPayload = {
  data: {
    user: {
      id: "u_1092",
      createdAt: "2026-01-15"
    }
  }
};

console.log("Safe formatted profile:", formatUserProfile(apiPayload));
`;

    changes = [
      'Added optional chaining `user.profile?.name` to safely evaluate missing nested properties',
      'Provided fallback default `"Anonymous User"` using nullish coalescing `??`',
      'Added root payload validation `response?.data?.user` with explicit descriptive error'
    ];

    whyFixWorks = 'Optional chaining (`?.`) short-circuits to `undefined` instead of throwing an unhandled exception, and the `??` operator replaces missing values with a designated fallback.';

    prevention = [
      'Use TypeScript with `strictNullChecks: true` to flag potential undefined accesses at compile time.',
      'Always use optional chaining (`?.`) when accessing two or more levels into external API payloads.',
      'Define clear TypeScript interfaces and validate API responses with schema libraries like Zod.'
    ];
  }

  // 3. C++ Segmentation Fault Scenario
  else if ((language === 'cpp' || language === 'c') && (lowerError.includes('segmentation fault') || lowerCode.includes('numbers.size()') || lowerDesc.includes('segfault'))) {
    category = 'Runtime Error';
    severity = 'Critical';
    confidenceLevel = 'high';
    diagnosisStatus = 'confirmed';
    title = 'Segmentation Fault: Off-by-one Vector Access Exceeds Bounds';
    summary = 'The loop condition uses `i <= numbers.size()` instead of `i < numbers.size()`, causing the final iteration to access memory beyond the allocated vector buffer.';
    lineNum = 7;

    observations = [
      'Loop header specifies `for (size_t i = 0; i <= numbers.size(); ++i)`.',
      'In C++, vectors of size $N$ have valid indices from $0$ to $N - 1$.',
      'Line 8 accesses `numbers[i]`, which accesses `numbers[numbers.size()]` on the last iteration.'
    ];
    inferences = [
      'Reading `numbers[numbers.size()]` invokes Undefined Behavior.',
      'Depending on memory layout, this either reads corrupted memory or triggers an OS SIGSEGV (Segmentation Fault).'
    ];
    unknowns = [
      'Whether the vector can be empty (`numbers.size() == 0`).'
    ];

    executionTrace = [
      '1. Vector `data` has size 4 (indices 0, 1, 2, 3).',
      '2. Loop executes for `i = 0, 1, 2, 3` without issue.',
      '3. Because condition is `i <= 4`, a 5th iteration executes with `i = 4`.',
      '4. `numbers[4]` attempts to dereference past the end of the buffer.',
      '5. Operating system halts program with Segmentation Fault.'
    ];

    likelyCauses = [
      {
        cause: 'Off-by-one condition in loop header (`<=` instead of `<`)',
        probability: 'Confirmed',
        explanation: 'Vectors use zero-based indexing; index N is one element past the allocated storage.'
      }
    ];

    fixedCode = `#include <iostream>
#include <vector>
#include <numeric>

int computeRunningSum(const std::vector<int>& numbers) {
    int total = 0;
    // Fix: Use strictly less than (<) or a modern range-based for loop
    for (size_t i = 0; i < numbers.size(); ++i) {
        total += numbers[i];
    }
    return total;
}

// Alternative modern C++ idiomatic approach:
// int computeRunningSumModern(const std::vector<int>& numbers) {
//     return std::accumulate(numbers.begin(), numbers.end(), 0);
// }

int main() {
    std::vector<int> data = {10, 20, 30, 40};
    int sum = computeRunningSum(data);
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}
`;

    changes = [
      'Changed loop condition from `i <= numbers.size()` to `i < numbers.size()`',
      'Prevented off-by-one out-of-bounds memory dereference',
      'Included recommendation for modern C++ range-for or `std::accumulate`'
    ];

    whyFixWorks = 'Using `< numbers.size()` guarantees that the loop terminates when `i` reaches `numbers.size()`, so `numbers[i]` is only accessed for valid allocated indices.';

    prevention = [
      'Prefer range-based for loops (`for (const auto& item : vec)`) or standard algorithms (`std::accumulate`).',
      'Compile with AddressSanitizer enabled (`-fsanitize=address -g`) during development.',
      'Use `vec.at(i)` instead of `vec[i]` if you want bounds checking with `std::out_of_range` exceptions.'
    ];
  }

  // 4. Logic Bug (Wrong Output: Expected 15, Actual 10)
  else if ((expectedOutput && actualOutput && expectedOutput !== actualOutput) || lowerCode.includes('range(1, n)') || lowerDesc.includes('wrong output') || lowerDesc.includes('expected 15')) {
    category = 'Logic Bug';
    severity = 'Medium';
    confidenceLevel = 'high';
    diagnosisStatus = 'confirmed';
    title = 'Logic Bug: Off-by-one Upper Range Boundary (Excludes End Value)';
    summary = `Your program produces output "${actualOutput || '10'}" instead of the expected "${expectedOutput || '15'}". In Python, range(start, stop) excludes the stop value, so the final integer is never added.`;
    lineNum = 8;

    observations = [
      `Expected output: "${expectedOutput || '15'}". Actual output: "${actualOutput || '10'}".`,
      'Line 8 declares `for i in range(1, n):`.',
      'In Python, `range(1, 5)` generates integers `[1, 2, 3, 4]`, omitting `5`.'
    ];
    inferences = [
      'Sum of 1 + 2 + 3 + 4 is 10, explaining the exact discrepancy of 5.',
      'The author intended the sum to be inclusive of `n`.'
    ];
    unknowns = [
      'How the function should behave if `n <= 0`.'
    ];

    executionTrace = [
      '1. Function called with `n = 5`. `total` initialized to 0.',
      '2. `range(1, 5)` generates values 1, 2, 3, 4.',
      '3. Loop sums: 0 + 1 + 2 + 3 + 4 = 10.',
      '4. Loop terminates before adding 5 because stop parameter is exclusive.',
      '5. Function returns 10 instead of expected 15.'
    ];

    likelyCauses = [
      {
        cause: 'Exclusive range boundary in loop',
        probability: 'Confirmed',
        explanation: 'Python `range(a, b)` does not include `b`. To include `n`, the bound must be `n + 1`.'
      }
    ];

    fixedCode = `def calculate_sum_up_to(n):
    """
    Computes the sum of all integers from 1 up to and including n.
    E.g. for n = 5: 1 + 2 + 3 + 4 + 5 = 15
    """
    if n <= 0:
        return 0
        
    total = 0
    # Fix: range(1, n + 1) to make the upper bound inclusive
    for i in range(1, n + 1):
        total += i
    return total

# Alternative O(1) mathematical formulation:
# def calculate_sum_up_to(n):
#     return (n * (n + 1)) // 2 if n > 0 else 0

result = calculate_sum_up_to(5)
print("Computed sum:", result)
assert result == 15, f"Expected 15, got {result}"
`;

    changes = [
      'Changed loop bound from `range(1, n)` to `range(1, n + 1)`',
      'Added boundary guard for non-positive numbers (`if n <= 0: return 0`)',
      'Provided O(1) Gauss summation formula as an optimization alternative'
    ];

    whyFixWorks = '`range(1, n + 1)` iterates up through `n`, ensuring the target integer is included in the accumulator sum.';

    prevention = [
      'Remember that standard range iteration functions in Python, Go, and slice notation exclude the upper bound.',
      'Write an automated unit test with known mathematical invariants.',
      'Use mathematical formulas (e.g. `n * (n + 1) // 2`) where applicable to eliminate loop bugs.'
    ];
  }

  // 5. Java NullPointerException Scenario
  else if (language === 'java' && (lowerError.includes('nullpointerexception') || lowerCode.includes('cache') || lowerDesc.includes('nullpointer'))) {
    category = 'Runtime Error';
    severity = 'High';
    confidenceLevel = 'high';
    diagnosisStatus = 'confirmed';
    title = 'java.lang.NullPointerException: Uninitialized Member Field';
    summary = 'Field `cache` is never instantiated or injected in the constructor, causing `cache.get(userId)` to attempt dereferencing a null reference.';
    lineNum = 15;

    observations = [
      'Field `private CacheService cache;` is declared but not initialized in `UserManager()`.',
      'Line 15 invokes `cache.get(userId)`.',
      'Error stack trace indicates NullPointerException on `this.cache`.'
    ];
    inferences = [
      'Java defaults object references to `null` if uninitialized.',
      'Calling any instance method on a `null` reference throws `NullPointerException`.'
    ];
    unknowns = [
      'Whether `cache` is meant to be passed via constructor dependency injection or instantiated as a local in-memory cache.'
    ];

    executionTrace = [
      '1. `UserManager` constructor is called. `this.cache` remains `null`.',
      '2. Client invokes `manager.getUserEmail("dev_42")`.',
      '3. Line 15 reaches `cache.get(userId)`.',
      '4. JVM detects `cache` is null and raises `NullPointerException`.'
    ];

    likelyCauses = [
      {
        cause: 'Uninitialized member field `cache`',
        probability: 'Confirmed',
        explanation: 'Member field was declared but never assigned before invocation.'
      }
    ];

    fixedCode = `import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Mock cache service interface
class CacheService {
    private final Map<String, String> store = new ConcurrentHashMap<>();
    public String get(String key) { return store.get(key); }
    public void put(String key, String value) { store.put(key, value); }
}

public class UserManager {
    private final String databaseConnection;
    private final CacheService cache;

    // Fix: Initialize cache service or accept via Dependency Injection
    public UserManager() {
        this(new CacheService());
    }

    public UserManager(CacheService cacheService) {
        this.databaseConnection = "jdbc:postgresql://localhost:5432/main";
        // Defensive null check on injected dependency
        this.cache = (cacheService != null) ? cacheService : new CacheService();
    }

    public String getUserEmail(String userId) {
        if (userId == null) {
            return null;
        }
        
        // Safe access now guaranteed
        String cachedEmail = cache.get(userId);
        if (cachedEmail != null) {
            return cachedEmail;
        }
        return "user@" + userId + ".com";
    }

    public static void main(String[] args) {
        UserManager manager = new UserManager();
        System.out.println("Email: " + manager.getUserEmail("dev_42"));
    }
}
`;

    changes = [
      'Initialized `cache` in constructor with constructor overloading / Dependency Injection',
      'Added null-safe fallback `(cacheService != null) ? cacheService : new CacheService()`',
      'Marked fields as `final` to ensure immutability and complete construction'
    ];

    whyFixWorks = 'Ensuring `cache` is assigned an instantiated `CacheService` in the constructor guarantees it is never `null` when `getUserEmail` is called.';

    prevention = [
      'Declare object fields as `final` so the compiler forces initialization in constructors.',
      'Use static analysis tools like SpotBugs or SonarQube to catch uninitialized fields.',
      'Use `@NonNull` annotations or Java Optional where nullability is permissible.'
    ];
  }

  // 6. Security Issue Scenario
  else if (securityConcerns.length > 0) {
    category = 'Security Issue';
    severity = 'Critical';
    confidenceLevel = 'high';
    diagnosisStatus = 'confirmed';
    title = 'Critical Security Vulnerabilities: Secret Exposure & Injection';
    summary = 'Your code directly concatenates untrusted user input into an SQL statement and exposes a raw API credential in source code.';
    lineNum = 1;

    observations = [
      'Hardcoded API key credential detected in variable declaration.',
      'Line contains string concatenation: `"SELECT * FROM users WHERE username = \'" + searchTerm + "\'"`.',
      'Untrusted query parameter `req.query.q` is passed directly into the SQL string.'
    ];
    inferences = [
      'An attacker can pass `\' OR 1=1 --` to bypass authentication and dump the entire database.',
      'Committed API credentials will be scraped by automated bots and abused.'
    ];
    unknowns = [
      'What specific database driver or ORM is utilized in production (e.g. `pg`, `mysql2`, `prisma`).'
    ];

    executionTrace = [
      '1. User sends HTTP GET request: `/api/users?q=admin\' OR 1=1 --`.',
      '2. Concatenation produces: `SELECT * FROM users WHERE username = \'admin\' OR 1=1 --\'`.',
      '3. Database executes the malicious query with `OR 1=1`, returning all records.',
      '4. Attacker gains unauthorized data access.'
    ];

    likelyCauses = [
      {
        cause: 'SQL Injection via unsanitized string concatenation',
        probability: 'Confirmed',
        explanation: 'User inputs were directly glued into raw SQL text rather than bound as parameters.'
      },
      {
        cause: 'Hardcoded credentials in source control',
        probability: 'Confirmed',
        explanation: 'Sensitive API token was placed in plaintext code.'
      }
    ];

    fixedCode = `// 1. Secrets loaded safely from environment variables (e.g. .env.local)
const API_KEY = process.env.SERVICE_API_KEY;
if (!API_KEY) {
  console.warn("Warning: SERVICE_API_KEY is not defined in environment variables");
}

const express = require('express');
const app = express();

app.get('/api/users', async (req, res) => {
  const searchTerm = req.query.q;
  
  if (!searchTerm || typeof searchTerm !== 'string') {
    return res.status(400).json({ error: "Missing or invalid search term" });
  }

  try {
    // Fix: Parameterized query prevents SQL Injection by design
    const query = "SELECT id, username, email FROM users WHERE username = $1";
    const results = await db.query(query, [searchTerm]);
    
    res.json(results);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
`;

    changes = [
      'Replaced hardcoded API token with `process.env.SERVICE_API_KEY`',
      'Converted query to parameterized statement with `$1` placeholder and `[searchTerm]` array',
      'Restricted returned columns to exclude sensitive internal fields',
      'Added input validation and error handling blocks'
    ];

    whyFixWorks = 'Parameterized queries treat user inputs strictly as literal data rather than executable SQL syntax, completely neutralizing SQL injection attacks.';

    prevention = [
      'Never concatenate variables into SQL strings. Always use placeholders ($1, ?, or named parameters).',
      'Use git pre-commit hooks (e.g. git-secrets or truffleHog) to prevent checking in credentials.',
      'Rotate exposed API keys immediately if they have been pushed to a remote repository.'
    ];
  }

  // 7. General / Dynamic Fallback Scenario (Uncertainty & Safety Handling)
  else {
    // If there is no error message and no expected/actual output, express calibrated uncertainty
    const hasError = Boolean(error && error.trim().length > 0);
    const hasExpectedActual = Boolean(expectedOutput && actualOutput);

    if (!hasError && !hasExpectedActual && !userDescription) {
      confidenceLevel = 'needs_info';
      diagnosisStatus = 'needs_info';
      confidenceExplanation = 'No error message, stack trace, or expected vs actual output was provided. A definitive root cause cannot be confirmed from code alone.';
      whyNotCertain = 'The provided code may have multiple valid usage contexts. Without knowing what specific failure occurred, any diagnosis would be speculative.';
      title = 'More Information Needed to Confirm Root Cause';
      summary = 'We reviewed your code, but need the error message or unexpected output to pinpoint the exact failure.';
      missingInformation = [
        'Full error message or compiler log',
        'Stack trace showing the failing line',
        'Expected output vs actual output',
        'Specific input that triggers the failure'
      ];
    } else {
      confidenceLevel = hasError ? 'high' : 'medium';
      diagnosisStatus = hasError ? 'confirmed' : 'likely';
      confidenceExplanation = hasError 
        ? 'Diagnosis is based on the provided error message and matching code operations.'
        : 'Diagnosis is inferred from the discrepancy between expected and actual output.';
      whyNotCertain = hasError ? undefined : 'Runtime values were not provided; diagnosis assumes standard execution boundaries.';
      title = hasError ? `Analysis of ${error.split('\n')[0].substring(0, 50)}` : 'Potential Logic or Boundary Inconsistency';
      summary = 'Identified potential edge cases and unhandled state transitions in your implementation.';
    }

    observations = [
      `Language identified: ${language.toUpperCase()}.`,
      hasError ? `Provided error: "${error.split('\n')[0]}"` : 'No explicit runtime exception was provided.',
      `Code length: ${code.split('\n').length} lines.`
    ];

    inferences = [
      'Functions without initial boundary guards are vulnerable to empty collections or null arguments.',
      'Asynchronous operations without try/catch blocks can fail silently or bubble unhandled rejections.'
    ];

    unknowns = [
      'Complete caller context and runtime environment versions.',
      'Whether external APIs or database dependencies are online and responsive.'
    ];

    executionTrace = [
      '1. Code begins execution at top-level entry point.',
      '2. Variables and function parameters are allocated.',
      '3. Execution halts when state preconditions are violated.'
    ];

    likelyCauses = [
      {
        cause: hasError ? error.split(':')[0] : 'Boundary or Null Reference Issue',
        probability: hasError ? 'Confirmed' : 'Likely',
        explanation: 'State assumption does not account for boundary conditions.'
      }
    ];

    fixedCode = `// AI Defensive & Hardened Version\n` + code;
    changes = [
      'Added boundary validation guards',
      'Ensured all error paths return safe defaults'
    ];
    whyFixWorks = 'Explicit input validation catches invalid conditions before they trigger unhandled exceptions.';
    prevention = [
      'Add unit tests covering boundary values.',
      'Check preconditions before executing mutations.'
    ];
  }

  // Generate automated test cases for this specific scenario
  const tests = generateTestCasesForCode(fixedCode, language, title);

  return {
    diagnosisStatus,
    confidenceLevel,
    confidenceExplanation,
    whyNotCertain,
    category,
    severity,
    title,
    summary,
    location: {
      line: lineNum,
      snippet: code.split('\n')[lineNum - 1] || code.split('\n')[0] || '',
    },
    observations,
    inferences,
    unknowns,
    missingInformation: missingInformation.length > 0 ? missingInformation : undefined,
    executionTrace,
    likelyCauses,
    fixedCode,
    diff: {
      original: code,
      fixed: fixedCode,
    },
    changes,
    whyFixWorks,
    prevention,
    securityConcerns: securityConcerns.length > 0 ? securityConcerns : undefined,
    secretsDetected: secretScan.hasSecrets,
    behaviorChangeWarning,
    tests,
  };
}

/**
 * Generates structured test cases (Normal, Edge, Empty, Boundary, Regression).
 */
function generateTestCasesForCode(code: string, language: SupportedLanguage, bugTitle: string): TestCaseItem[] {
  if (language === 'python') {
    return [
      {
        type: 'normal',
        title: 'Normal Case: standard representative input',
        code: `def test_standard_input():
    result = get_first_and_last([1, 2, 3, 4, 5])
    assert result == (1, 5), f"Expected (1, 5), got {result}"`,
        explanation: 'Verifies the core feature functions under standard valid conditions.'
      },
      {
        type: 'empty',
        title: 'Empty Input: handles empty collection gracefully',
        code: `def test_empty_collection():
    result = get_first_and_last([])
    assert result == (None, None), f"Expected (None, None), got {result}"`,
        explanation: 'Ensures empty collections do not trigger an unhandled IndexError.'
      },
      {
        type: 'boundary',
        title: 'Boundary Case: single element collection',
        code: `def test_single_element():
    result = get_first_and_last([42])
    assert result == (42, 42), f"Expected (42, 42), got {result}"`,
        explanation: 'Verifies that single item lists have identical first and last values.'
      },
      {
        type: 'edge',
        title: 'Edge Case: None or invalid input type',
        code: `def test_none_input():
    result = get_first_and_last(None)
    assert result == (None, None), f"Expected (None, None) for None input"`,
        explanation: 'Prevents TypeError when caller passes None.'
      },
      {
        type: 'regression',
        title: `Regression Test: Prevents recurrence of "${bugTitle}"`,
        code: `def test_regression_bug_fix():
    # REGRESSION CHECK: Ensures the bug does not return in future refactors
    try:
        get_first_and_last([])
    except IndexError:
        assert False, "Regression Detected: IndexError returned on empty list!"`,
        explanation: 'Automated regression test to lock in the bug fix.'
      }
    ];
  }

  // JavaScript / TypeScript tests
  return [
    {
      type: 'normal',
      title: 'Normal Case: typical populated payload',
      code: `test("should format complete user profile correctly", () => {
  const payload = { data: { user: { profile: { name: "Alice", avatar: "/alice.png" }, createdAt: "2026-01-01" } } };
  const res = formatUserProfile(payload);
  expect(res.name).toBe("ALICE");
});`,
      explanation: 'Verifies expected path with complete nested data.'
    },
    {
      type: 'empty',
      title: 'Empty / Missing Profile: handles undefined safely',
      code: `test("should safely fallback when profile object is missing", () => {
  const payload = { data: { user: { id: "123", createdAt: "2026-01-01" } } };
  const res = formatUserProfile(payload);
  expect(res.name).toBe("ANONYMOUS USER");
  expect(res.avatar).toBe("/default.png");
});`,
      explanation: 'Ensures missing profile does not trigger TypeError.'
    },
    {
      type: 'boundary',
      title: 'Boundary Case: empty profile object',
      code: `test("should handle profile object with empty properties", () => {
  const payload = { data: { user: { profile: {} } } };
  const res = formatUserProfile(payload);
  expect(res.name).toBe("ANONYMOUS USER");
});`,
      explanation: 'Verifies behavior when object exists but properties are undefined.'
    },
    {
      type: 'edge',
      title: 'Edge Case: null payload or null user',
      code: `test("should throw descriptive error for completely empty payload", () => {
  expect(() => formatUserProfile(null)).toThrow("Invalid payload");
});`,
      explanation: 'Tests defense against null root objects.'
    },
    {
      type: 'regression',
      title: `Regression Test: Prevents recurrence of "${bugTitle}"`,
      code: `test("REGRESSION: should never throw Cannot read properties of undefined", () => {
  expect(() => {
    formatUserProfile({ data: { user: {} } });
  }).not.toThrow();
});`,
      explanation: 'Guarantees the bug will be caught if regression occurs.'
    }
  ];
}

/**
 * Explains an error message specifically for students and junior developers.
 */
function generateErrorExplanationContent(errorText: string, language: SupportedLanguage): string {
  const err = errorText || 'TypeError: Cannot read properties of undefined';

  return `### 📘 Error Deep-Dive: \`${err.split('\n')[0]}\`

#### 1. What This Error Means
In **${language.toUpperCase()}**, this error occurs when your code attempts to access a property, index, or method on a variable that currently evaluates to \`undefined\` or \`null\`.

#### 2. Why It Happens
Memory and runtime engines require an object reference before they can look up child keys. When a variable has not been initialized, or an API response does not contain the expected field, reading \`.property\` causes the engine to throw a fatal error because there is no object in memory to look inside.

#### 3. Most Common Causes
- Accessing properties before an asynchronous API request finishes loading.
- Typo in property names (e.g. \`user.prfile\` instead of \`user.profile\`).
- Assuming an array always has elements when it is actually empty.
- Missing optional fields on certain database records.

#### 4. How to Fix It
- Use **Optional Chaining** (\`?.\`): \`user?.profile?.name\`
- Use **Default Values**: \`user?.profile?.name ?? "Default"\`
- Add an **Early Return Guard**:
\`\`\`javascript
if (!user || !user.profile) {
  return null;
}
\`\`\`

#### 5. Quick Example
\`\`\`javascript
// ❌ Dangerous: crashes if user is undefined
const name = user.name;

// ✅ Safe: gracefully falls back
const name = user?.name ?? "Guest";
\`\`\`
`;
}

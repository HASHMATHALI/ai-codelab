import { SecurityConcern } from '@/types';

// Regex patterns to detect sensitive credentials and API keys
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey|secret|token|auth[_-]?token|access[_-]?token|private[_-]?key|password|passwd|pwd)\s*[:=]\s*["']([a-zA-Z0-9_\-\.]{12,})["']/gi,
  /(?:AIza[0-9A-Za-z-_]{35})/g, // Google API key
  /(?:ghp_[0-9a-zA-Z]{36})/g,   // GitHub Personal Access Token
  /(?:sk-[a-zA-Z0-9]{32,})/g,   // OpenAI API Key
  /(?:-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/g,
];

// Vulnerability patterns for defensive warnings
const SQL_INJECTION_PATTERN = /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:WHERE|VALUES|SET)\s+.*?(\+\s*['"]?\$?\{?|[a-zA-Z0-9_]+\s*\+\s*['"])/i;
const COMMAND_INJECTION_PATTERN = /(?:child_process|exec\(|spawn\(|system\(|popen\(|os\.system\(|subprocess\.Popen\()/i;
const DANGEROUS_EVAL_PATTERN = /(?:eval\(|new\s+Function\(|setTimeout\(\s*["'])/i;

export interface SecretScanResult {
  hasSecrets: boolean;
  maskedCode: string;
  detectedCount: number;
}

/**
 * Scans code for hardcoded secrets, returns count and a sanitized masked version.
 */
export function scanAndMaskSecrets(code: string): SecretScanResult {
  let masked = code;
  let count = 0;

  for (const pattern of SECRET_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      count++;
      // Mask the key portion while preserving variable name
      const splitIdx = match.indexOf('=') !== -1 ? match.indexOf('=') : match.indexOf(':');
      if (splitIdx !== -1) {
        const prefix = match.substring(0, splitIdx + 1);
        return `${prefix} "[REDACTED_SECRET_FOR_SAFETY]"`;
      }
      return `"[REDACTED_SECRET]"`;
    });
  }

  return {
    hasSecrets: count > 0,
    maskedCode: masked,
    detectedCount: count,
  };
}

/**
 * Identifies high-risk security flaws (SQL injection, command execution, hardcoded credentials).
 */
export function auditSecurityConcerns(code: string): SecurityConcern[] {
  const concerns: SecurityConcern[] = [];

  const secretScan = scanAndMaskSecrets(code);
  if (secretScan.hasSecrets) {
    concerns.push({
      risk: 'Hardcoded Secret / Credential Detected',
      severity: 'High',
      remediation: 'Remove the secret from source code immediately and load it from environment variables or a secrets manager. Rotate the credential if already committed.',
    });
  }

  if (SQL_INJECTION_PATTERN.test(code)) {
    concerns.push({
      risk: 'SQL Injection Vulnerability',
      severity: 'Critical',
      remediation: 'Never concatenate untrusted input into SQL queries. Use parameterized queries, prepared statements, or an ORM with automatic escaping.',
    });
  }

  if (COMMAND_INJECTION_PATTERN.test(code)) {
    concerns.push({
      risk: 'Command / Shell Injection Risk',
      severity: 'High',
      remediation: 'Avoid invoking OS shell commands with variable parameters. If necessary, use strict argument arrays without shell interpolation.',
    });
  }

  if (DANGEROUS_EVAL_PATTERN.test(code)) {
    concerns.push({
      risk: 'Arbitrary Code Execution (eval / dynamic function)',
      severity: 'High',
      remediation: 'Avoid eval() or dynamic code construction as it allows attackers to execute arbitrary code within the runtime process.',
    });
  }

  return concerns;
}

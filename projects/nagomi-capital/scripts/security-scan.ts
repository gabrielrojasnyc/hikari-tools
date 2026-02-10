/**
 * Peta Policy - Credential Security Scanner
 * 
 * This scanner runs checks to ensure no secrets are hardcoded in source code.
 * It can be run manually or as part of CI/CD.
 * 
 * Usage:
 *   npx ts-node scripts/security-scan.ts
 *   
 * Exit codes:
 *   0 - No issues found
 *   1 - Security violations detected
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

interface SecurityRule {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'ERROR' | 'WARNING';
  description: string;
}

interface Violation {
  file: string;
  line: number;
  column: number;
  rule: SecurityRule;
  match: string;
}

// Security scanning rules
const RULES: SecurityRule[] = [
  {
    id: 'PET-001',
    name: 'Hardcoded API Key',
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][a-zA-Z0-9_\-]{16,}["']/i,
    severity: 'ERROR',
    description: 'Potential hardcoded API key detected',
  },
  {
    id: 'PET-002',
    name: 'Hardcoded Secret',
    pattern: /(?:secret[_-]?key|secretkey|api[_-]?secret)\s*[:=]\s*["'][a-zA-Z0-9_\-]{16,}["']/i,
    severity: 'ERROR',
    description: 'Potential hardcoded secret key detected',
  },
  {
    id: 'PET-003',
    name: 'Hardcoded Token',
    pattern: /(?:token|bearer)\s*[:=]\s*["'][a-zA-Z0-9_\-]{20,}["']/i,
    severity: 'ERROR',
    description: 'Potential hardcoded token detected',
  },
  {
    id: 'PET-004',
    name: 'OpenAI/OpenRouter Key Pattern',
    pattern: /sk-[a-zA-Z0-9]{20,}/,
    severity: 'ERROR',
    description: 'OpenAI/OpenRouter API key pattern detected',
  },
  {
    id: 'PET-005',
    name: 'Telegram Bot Token',
    pattern: /\d{9,10}:AA[A-Za-z0-9_-]{30,}/,
    severity: 'ERROR',
    description: 'Telegram bot token pattern detected',
  },
  {
    id: 'PET-006',
    name: 'Private Key',
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
    severity: 'ERROR',
    description: 'Private key content detected',
  },
  {
    id: 'PET-007',
    name: 'Password in Code',
    pattern: /password\s*[:=]\s*["'][^"']{4,}["']/i,
    severity: 'WARNING',
    description: 'Potential hardcoded password detected',
  },
  {
    id: 'PET-008',
    name: 'Environment Variable Access',
    pattern: /process\.env\.[A-Z_]*(?:KEY|SECRET|TOKEN|PRIVATE)/i,
    severity: 'WARNING',
    description: 'Direct environment variable access for sensitive data. Use credentials.ts instead.',
  },
  {
    id: 'PET-009',
    name: 'X API Bearer Token',
    pattern: /AAAAAAAAAAAAAAAAAAAA[A-Za-z0-9%]{20,}/,
    severity: 'ERROR',
    description: 'X/Twitter API bearer token pattern detected',
  },
  {
    id: 'PET-010',
    name: 'Alpaca API Key Pattern',
    pattern: /PK[A-Z0-9]{18,20}/,
    severity: 'ERROR',
    description: 'Alpaca API key pattern detected',
  },
  {
    id: 'PET-011',
    name: 'TODO/FIXME Security Note',
    pattern: /(?:TODO|FIXME|XXX).*\b(?:security|secret|password|token|key)\b/i,
    severity: 'WARNING',
    description: 'Security-related TODO/FIXME found - may indicate incomplete security work',
  },
];

// Files and directories to exclude
const EXCLUDES = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '*.d.ts',
  'security-scan.ts', // Don't scan self
  '.env.example',     // Example file is OK
  'SECURITY.md',      // Documentation may contain patterns
];

// Extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.js', '.json', '.yaml', '.yml', '.env'];

/**
 * Check if a file should be excluded from scanning
 */
function shouldExclude(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  for (const exclude of EXCLUDES) {
    if (exclude.includes('*')) {
      // Glob pattern
      const regex = new RegExp(exclude.replace(/\*/g, '.*'));
      if (regex.test(normalizedPath)) return true;
    } else if (normalizedPath.includes(exclude)) {
      return true;
    }
  }
  
  // Check extension
  const ext = extname(filePath);
  if (!SCAN_EXTENSIONS.includes(ext)) {
    // Also allow files without extension if they're .env files
    if (!filePath.includes('.env')) return true;
  }
  
  return false;
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (shouldExclude(fullPath)) continue;
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`${COLORS.red}Error reading directory ${dir}:${COLORS.reset}`, error);
  }
  
  return files;
}

/**
 * Scan a single file for security violations
 */
function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      for (const rule of RULES) {
        // Check for rule matches
        const matches = line.match(rule.pattern);
        
        if (matches) {
          // Filter out false positives
          if (isFalsePositive(line, rule)) continue;
          
          violations.push({
            file: relative(PROJECT_ROOT, filePath),
            line: lineNumber,
            column: line.indexOf(matches[0]) + 1,
            rule,
            match: matches[0].substring(0, 50) + (matches[0].length > 50 ? '...' : ''), // Truncate
          });
        }
      }
    }
  } catch (error) {
    console.error(`${COLORS.red}Error scanning ${filePath}:${COLORS.reset}`, error);
  }
  
  return violations;
}

/**
 * Check if a match is a false positive
 */
function isFalsePositive(line: string, rule: SecurityRule): boolean {
  // Skip comments explaining what NOT to do
  if (line.includes('DO NOT') || line.includes('NEVER')) return false;
  
  // Skip lines that are clearly comments about security
  if (/^\s*(?:\/\/|#|\*|\*/)\.\s*(?:security|credential)/i.test(line)) return true;
  
  // Skip import statements for credentials.ts (legitimate use)
  if (line.includes('credentials') && line.includes('from')) return true;
  
  // Skip lines with "example" or "placeholder" in them
  if (/example|placeholder|your_|xxx|test_/i.test(line)) return true;
  
  // Skip the actual credentials.ts file (it has legitimate patterns)
  if (line.includes('CredentialError') || line.includes('credentialLoader')) return true;
  
  return false;
}

/**
 * Print violation report
 */
function printReport(violations: Violation[]): void {
  if (violations.length === 0) {
    console.log(`${COLORS.green}${COLORS.bold}✓ No security violations found${COLORS.reset}`);
    return;
  }
  
  console.log(`\n${COLORS.red}${COLORS.bold}⚠️  Security Violations Detected${COLORS.reset}\n`);
  
  // Group by file
  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) || [];
    list.push(v);
    byFile.set(v.file, list);
  }
  
  for (const [file, fileViolations] of byFile) {
    console.log(`${COLORS.bold}${file}${COLORS.reset}`);
    
    for (const v of fileViolations) {
      const severityColor = v.rule.severity === 'ERROR' ? COLORS.red : COLORS.yellow;
      console.log(
        `  ${severityColor}[${v.rule.severity}]${COLORS.reset} ` +
        `${COLORS.blue}${v.rule.id}${COLORS.reset} ` +
        `Line ${v.line}:${v.column} - ${v.rule.name}`
      );
      console.log(`    ${v.rule.description}`);
      console.log(`    Match: "${v.match}"`);
    }
    console.log();
  }
  
  const errors = violations.filter(v => v.rule.severity === 'ERROR').length;
  const warnings = violations.filter(v => v.rule.severity === 'WARNING').length;
  
  console.log(`${COLORS.bold}Summary:${COLORS.reset}`);
  console.log(`  ${COLORS.red}${errors} error(s)${COLORS.reset}`);
  console.log(`  ${COLORS.yellow}${warnings} warning(s)${COLORS.reset}`);
  console.log(`  ${violations.length} total violation(s)\n`);
}

/**
 * Main scan function
 */
async function main(): Promise<void> {
  console.log(`${COLORS.bold}🔒 Peta Policy - Credential Security Scanner${COLORS.reset}\n`);
  console.log(`Scanning directory: ${PROJECT_ROOT}`);
  console.log(`Rules loaded: ${RULES.length}\n`);
  
  const startTime = Date.now();
  const files = getAllFiles(PROJECT_ROOT);
  console.log(`Files to scan: ${files.length}\n`);
  
  const allViolations: Violation[] = [];
  
  for (const file of files) {
    const violations = scanFile(file);
    allViolations.push(...violations);
  }
  
  const duration = Date.now() - startTime;
  
  printReport(allViolations);
  
  console.log(`Scan completed in ${duration}ms`);
  
  // Exit with error code if violations found
  const hasErrors = allViolations.some(v => v.rule.severity === 'ERROR');
  
  if (hasErrors) {
    console.log(`${COLORS.red}${COLORS.bold}❌ Commit blocked: Fix errors before committing${COLORS.reset}\n`);
    process.exit(1);
  }
  
  if (allViolations.length > 0) {
    console.log(`${COLORS.yellow}Warnings found but no errors. Review recommended.${COLORS.reset}\n`);
  }
  
  process.exit(0);
}

// Run if called directly
if (import.meta.url === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`${COLORS.red}Scan failed:${COLORS.reset}`, error);
    process.exit(1);
  });
}

export { scanFile, RULES };

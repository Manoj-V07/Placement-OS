import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const execPromise = promisify(exec);
const execFilePromise = promisify(execFile);

export interface CommitAudit {
  sha: string;
  author: string;
  date: string;
  message: string;
  filesChanged: string[];
  linesAdded?: number;
  linesDeleted?: number;
  qualityRating: 'good' | 'suspicious' | 'low_effort';
  discrepancyNote?: string;
}

export interface SecurityFinding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  file?: string;
  line?: number;
}

export interface SecretFinding {
  type: string;
  description: string;
  file: string;
  line?: number;
}

export interface RepoAnalysisEvidence {
  repoName: string;
  owner: string;
  totalCommits: number;
  totalFiles: number;
  totalLinesOfCode: number;
  languagesDetected: Record<string, number>;
  commits: CommitAudit[];
  cadence: {
    firstCommitDate: string;
    lastCommitDate: string;
    spanDays: number;
    commitFrequencyDescription: string;
    singleCommitDumpDetected: boolean;
  };
  commitMetrics: {
    meaningfulCommitRatio: number;
    commitMessageQualityScore: number;
    commitVsCodeConsistencyScore: number;
    genuineIncrementalDevelopment: boolean;
    analysisNotes: string;
  };
  projectStructure: {
    hasBackendFolder: boolean;
    hasFrontendFolder: boolean;
    isMonorepo: boolean;
    hasTests: boolean;
    hasDocker: boolean;
    hasCiCd: boolean;
    topLevelFolders: string[];
  };
  detectedTechnologies: string[];
  dependenciesDetected: {
    frameworks: string[];
    databases: string[];
    authMechanisms: string[];
    testingFrameworks: string[];
    libraries: string[];
    devOps: string[];
  };
  securityFindings: SecurityFinding[];
  secretFindings: SecretFinding[];
  npmAuditSummary?: {
    totalVulnerabilities: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  documentation: {
    hasReadme: boolean;
    readmeContentPreview: string;
    readmeWordCount: number;
    architectureDiagramFound: boolean;
    setupInstructionsFound: boolean;
    apiDocumentationFound: boolean;
  };
  liveUrlCheck?: {
    checked: boolean;
    url?: string;
    isReachable: boolean;
    statusCode?: number;
    latencyMs?: number;
    error?: string;
  };
  featureEvidence: Record<string, { detected: boolean; evidenceSnippet: string }>;
}

export class GitAnalyzerService {
  /**
   * Parse GitHub URL into owner and repository name
   */
  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    if (!url) return null;
    const cleanUrl = url.trim().replace(/\.git$/, '');
    const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    const shortMatch = cleanUrl.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shortMatch) {
      return { owner: shortMatch[1], repo: shortMatch[2] };
    }
    return null;
  }

  /**
   * Clone repository into a safe, isolated temporary directory with depth & size limit
   */
  async cloneToSandbox(githubUrl: string): Promise<{ tempDir: string; cleanup: () => Promise<void> }> {
    const parsed = this.parseGitHubUrl(githubUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${githubUrl}`);
    }

    const uniqueId = `placementos_repo_${crypto.randomBytes(6).toString('hex')}`;
    const tempDir = path.join(os.tmpdir(), uniqueId);
    await fs.mkdir(tempDir, { recursive: true });

    const cloneUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;
    
    try {
      // Safe shallow clone with 50 commits to balance deep analysis with safety and speed
      await execPromise(`git clone --depth 50 "${cloneUrl}" .`, {
        cwd: tempDir,
        timeout: 45000, // 45 second timeout limit
        maxBuffer: 20 * 1024 * 1024 // 20MB buffer limit
      });
    } catch (err: any) {
      // Cleanup on failure
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
      throw new Error(`Failed to clone GitHub repository (${parsed.owner}/${parsed.repo}): ${err.message || 'Clone timeout or permission error'}`);
    }

    const cleanup = async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn(`[GitAnalyzer] Failed to cleanup temp dir ${tempDir}:`, e);
      }
    };

    return { tempDir, cleanup };
  }

  /**
   * Analyze Git Commits, History Cadence, and Message-to-Code Consistency
   */
  async analyzeGitHistory(repoDir: string): Promise<{
    commits: CommitAudit[];
    totalCommits: number;
    cadence: RepoAnalysisEvidence['cadence'];
    metrics: RepoAnalysisEvidence['commitMetrics'];
  }> {
    try {
      // Get commit log with custom delimiter: hash|author|date|message
      const { stdout: logOutput } = await execPromise(
        'git log --pretty=format:"%H|%an|%ad|%s" --date=iso-strict -n 50',
        { cwd: repoDir, timeout: 10000 }
      );

      const lines = logOutput.split('\n').filter(l => l.trim().length > 0);
      const commits: CommitAudit[] = [];

      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 4) continue;
        const sha = parts[0].trim();
        const author = parts[1].trim();
        const date = parts[2].trim();
        const message = parts.slice(3).join('|').trim();

        // Get files changed in this specific commit
        let filesChanged: string[] = [];
        try {
          const { stdout: diffOutput } = await execPromise(
            `git diff-tree --no-commit-id --name-only -r ${sha}`,
            { cwd: repoDir, timeout: 5000 }
          );
          filesChanged = diffOutput.split('\n').map(f => f.trim()).filter(Boolean);
        } catch {}

        // Evaluate message quality and relevance
        const lowerMsg = message.toLowerCase();
        const isGeneric = [
          'update', 'fix', 'fixed', 'changes', 'first commit', 'init', 'initial commit',
          'test', 'wip', 'done', 'commit', 'minor fix', 'bug fix'
        ].includes(lowerMsg) || lowerMsg.length < 8;

        // Discrepancy checks:
        let discrepancyNote: string | undefined;
        let qualityRating: 'good' | 'suspicious' | 'low_effort' = 'good';

        if (isGeneric) {
          qualityRating = 'low_effort';
          discrepancyNote = `Vague or low-effort commit message ("${message}") does not detail what was implemented.`;
        } else if (
          (lowerMsg.includes('auth') || lowerMsg.includes('login')) &&
          !filesChanged.some(f => f.toLowerCase().includes('auth') || f.toLowerCase().includes('user') || f.toLowerCase().includes('login'))
        ) {
          qualityRating = 'suspicious';
          discrepancyNote = `Commit claimed authentication changes, but touched unrelated files: ${filesChanged.slice(0, 3).join(', ')}`;
        } else if (
          (lowerMsg.includes('database') || lowerMsg.includes('migration') || lowerMsg.includes('schema')) &&
          !filesChanged.some(f => f.toLowerCase().includes('db') || f.toLowerCase().includes('model') || f.toLowerCase().includes('schema') || f.toLowerCase().includes('prisma') || f.toLowerCase().includes('migration'))
        ) {
          qualityRating = 'suspicious';
          discrepancyNote = `Commit claimed database/schema changes, but none of the touched files look related.`;
        }

        commits.push({
          sha,
          author,
          date,
          message,
          filesChanged,
          qualityRating,
          discrepancyNote
        });
      }

      const totalCommits = commits.length;
      if (totalCommits === 0) {
        return {
          commits: [],
          totalCommits: 0,
          cadence: {
            firstCommitDate: '',
            lastCommitDate: '',
            spanDays: 0,
            commitFrequencyDescription: 'No commits detected',
            singleCommitDumpDetected: true
          },
          metrics: {
            meaningfulCommitRatio: 0,
            commitMessageQualityScore: 0,
            commitVsCodeConsistencyScore: 0,
            genuineIncrementalDevelopment: false,
            analysisNotes: 'Empty repository or no Git history found.'
          }
        };
      }

      // Cadence calculation
      const dates = commits.map(c => new Date(c.date).getTime()).filter(t => !isNaN(t));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const spanDays = Math.max(0, Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));

      const singleCommitDump = totalCommits <= 2 && (spanDays === 0 || commits[0].filesChanged.length > 30);

      // Scoring
      const goodCommits = commits.filter(c => c.qualityRating === 'good').length;
      const suspiciousCommits = commits.filter(c => c.qualityRating === 'suspicious').length;
      const lowEffortCommits = commits.filter(c => c.qualityRating === 'low_effort').length;

      const meaningfulCommitRatio = Math.round((goodCommits / totalCommits) * 100);
      const commitMessageQualityScore = Math.max(10, Math.min(100, Math.round(100 - (lowEffortCommits / totalCommits) * 60 - (suspiciousCommits / totalCommits) * 40)));
      const commitVsCodeConsistencyScore = Math.max(10, Math.min(100, Math.round(100 - (suspiciousCommits / totalCommits) * 80)));

      const genuineIncrementalDevelopment = !singleCommitDump && totalCommits >= 5 && meaningfulCommitRatio >= 50;

      let analysisNotes = '';
      if (singleCommitDump) {
        analysisNotes = 'Single-commit dump detected. The codebase appears to have been uploaded in bulk rather than developed incrementally through git.';
      } else if (suspiciousCommits > 0) {
        analysisNotes = `Found ${suspiciousCommits} commit(s) where commit messages do not correspond to the actual files changed in that commit.`;
      } else {
        analysisNotes = `Repository demonstrates authentic incremental engineering across ${totalCommits} audited commits over ${spanDays} day(s).`;
      }

      return {
        commits,
        totalCommits,
        cadence: {
          firstCommitDate: minDate.toISOString(),
          lastCommitDate: maxDate.toISOString(),
          spanDays,
          commitFrequencyDescription: `${totalCommits} commits over ${spanDays} day(s)`,
          singleCommitDumpDetected: singleCommitDump
        },
        metrics: {
          meaningfulCommitRatio,
          commitMessageQualityScore,
          commitVsCodeConsistencyScore,
          genuineIncrementalDevelopment,
          analysisNotes
        }
      };
    } catch (e: any) {
      console.error('[GitAnalyzer] Git history analysis failed:', e);
      return {
        commits: [],
        totalCommits: 0,
        cadence: {
          firstCommitDate: '',
          lastCommitDate: '',
          spanDays: 0,
          commitFrequencyDescription: 'Git log query failed',
          singleCommitDumpDetected: false
        },
        metrics: {
          meaningfulCommitRatio: 0,
          commitMessageQualityScore: 0,
          commitVsCodeConsistencyScore: 0,
          genuineIncrementalDevelopment: false,
          analysisNotes: 'Failed to read git commit history.'
        }
      };
    }
  }

  /**
   * Traverse project files, detect languages, count files and lines
   */
  async inspectProjectStructure(repoDir: string): Promise<{
    totalFiles: number;
    totalLinesOfCode: number;
    languagesDetected: Record<string, number>;
    fileList: string[];
    structure: RepoAnalysisEvidence['projectStructure'];
  }> {
    const ignoreDirs = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'venv', '__pycache__', '.pytest_cache', 'target', 'vendor', '.idea', '.vscode']);
    const extMap: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript (React)',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript (React)',
      '.py': 'Python',
      '.go': 'Go',
      '.java': 'Java',
      '.rs': 'Rust',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.sql': 'SQL',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.md': 'Markdown'
    };

    const fileList: string[] = [];
    let totalLinesOfCode = 0;
    const languagesDetected: Record<string, number> = {};

    async function walk(dir: string, relativePath = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (ignoreDirs.has(entry.name)) continue;
          await walk(path.join(dir, entry.name), path.join(relativePath, entry.name));
        } else if (entry.isFile()) {
          const relFile = path.join(relativePath, entry.name).replace(/\\/g, '/');
          fileList.push(relFile);

          const ext = path.extname(entry.name).toLowerCase();
          const lang = extMap[ext] || 'Other';
          languagesDetected[lang] = (languagesDetected[lang] || 0) + 1;

          // Count lines of code for source files
          if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs', '.cpp', '.c', '.cs', '.php', '.rb', '.sql'].includes(ext)) {
            try {
              const content = await fs.readFile(path.join(dir, entry.name), 'utf-8');
              const lines = content.split('\n').length;
              totalLinesOfCode += lines;
            } catch {}
          }
        }
      }
    }

    await walk(repoDir);

    const topEntries = await fs.readdir(repoDir, { withFileTypes: true });
    const topLevelFolders = topEntries.filter(e => e.isDirectory() && !ignoreDirs.has(e.name)).map(e => e.name);

    const hasBackendFolder = topLevelFolders.some(f => /backend|server|api|srv/i.test(f));
    const hasFrontendFolder = topLevelFolders.some(f => /frontend|client|web|ui/i.test(f));
    const isMonorepo = hasBackendFolder && hasFrontendFolder;
    const hasTests = fileList.some(f => /test|spec|__tests__|tests\//i.test(f));
    const hasDocker = fileList.some(f => /dockerfile|docker-compose/i.test(f));
    const hasCiCd = fileList.some(f => /\.github\/workflows|\.gitlab-ci\.yml|jenkins/i.test(f));

    return {
      totalFiles: fileList.length,
      totalLinesOfCode,
      languagesDetected,
      fileList,
      structure: {
        hasBackendFolder,
        hasFrontendFolder,
        isMonorepo,
        hasTests,
        hasDocker,
        hasCiCd,
        topLevelFolders
      }
    };
  }

  /**
   * Parse package.json, requirements.txt, go.mod, etc. to detect verified dependencies
   */
  async detectTechnologies(repoDir: string, fileList: string[]): Promise<{
    detectedTechnologies: string[];
    dependencies: RepoAnalysisEvidence['dependenciesDetected'];
  }> {
    const techs = new Set<string>();
    const frameworks = new Set<string>();
    const databases = new Set<string>();
    const authMechanisms = new Set<string>();
    const testingFrameworks = new Set<string>();
    const libraries = new Set<string>();
    const devOps = new Set<string>();

    // 1. Check package.json (root, frontend, backend)
    const packageJsonPaths = fileList.filter(f => f === 'package.json' || f.endsWith('/package.json'));
    for (const p of packageJsonPaths) {
      try {
        const content = await fs.readFile(path.join(repoDir, p), 'utf-8');
        const pkg = JSON.parse(content);
        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        for (const dep of Object.keys(allDeps)) {
          // Frameworks
          if (dep === 'next') { techs.add('Next.js'); frameworks.add('Next.js'); }
          if (dep === 'react') { techs.add('React'); frameworks.add('React'); }
          if (dep === 'vue') { techs.add('Vue.js'); frameworks.add('Vue.js'); }
          if (dep === 'express') { techs.add('Express.js'); frameworks.add('Express.js'); }
          if (dep === '@nestjs/core') { techs.add('NestJS'); frameworks.add('NestJS'); }
          if (dep === 'fastify') { techs.add('Fastify'); frameworks.add('Fastify'); }

          // Databases
          if (dep === '@prisma/client' || dep === 'prisma') { techs.add('Prisma'); databases.add('Prisma ORM'); }
          if (dep === 'mongoose') { techs.add('MongoDB'); databases.add('MongoDB (Mongoose)'); }
          if (dep === 'typeorm') { techs.add('TypeORM'); databases.add('TypeORM'); }
          if (dep === 'pg') { techs.add('PostgreSQL'); databases.add('PostgreSQL (pg)'); }
          if (dep === 'mysql2') { techs.add('MySQL'); databases.add('MySQL'); }
          if (dep === 'redis' || dep === 'ioredis') { techs.add('Redis'); databases.add('Redis Cache'); }
          if (dep === 'firebase-admin' || dep === 'firebase') { techs.add('Firebase/Firestore'); databases.add('Firebase Firestore'); }

          // Auth
          if (dep === 'jsonwebtoken') { techs.add('JWT Authentication'); authMechanisms.add('JSON Web Tokens (JWT)'); }
          if (dep === 'passport') { techs.add('Passport.js'); authMechanisms.add('Passport.js'); }
          if (dep === 'bcrypt' || dep === 'bcryptjs') { techs.add('Bcrypt Hashing'); authMechanisms.add('Bcrypt Password Hashing'); }
          if (dep === 'next-auth') { techs.add('NextAuth.js'); authMechanisms.add('NextAuth.js'); }
          if (dep.includes('clerk')) { techs.add('Clerk Auth'); authMechanisms.add('Clerk Authentication'); }
          if (dep.includes('supabase')) { techs.add('Supabase'); authMechanisms.add('Supabase Auth'); }

          // Testing
          if (dep === 'jest') { techs.add('Jest'); testingFrameworks.add('Jest'); }
          if (dep === 'vitest') { techs.add('Vitest'); testingFrameworks.add('Vitest'); }
          if (dep === 'cypress') { techs.add('Cypress'); testingFrameworks.add('Cypress E2E'); }
          if (dep === 'playwright' || dep === '@playwright/test') { techs.add('Playwright'); testingFrameworks.add('Playwright'); }
          if (dep === 'supertest') { techs.add('Supertest'); testingFrameworks.add('Supertest API Testing'); }

          // Libraries & APIs
          if (dep === 'axios') libraries.add('Axios HTTP Client');
          if (dep === 'tailwindcss') { techs.add('TailwindCSS'); libraries.add('TailwindCSS'); }
          if (dep === 'socket.io' || dep === 'socket.io-client') { techs.add('WebSockets'); libraries.add('Socket.io (WebSockets)'); }
          if (dep === 'graphql') { techs.add('GraphQL'); libraries.add('GraphQL API'); }
          if (dep === 'zod' || dep === 'joi') libraries.add('Schema Validation (Zod/Joi)');
        }
      } catch {}
    }

    // 2. Check Python requirements
    const pyReqPaths = fileList.filter(f => /requirements\.txt|pyproject\.toml|Pipfile/i.test(f));
    for (const p of pyReqPaths) {
      try {
        const content = await fs.readFile(path.join(repoDir, p), 'utf-8');
        if (/fastapi/i.test(content)) { techs.add('FastAPI'); frameworks.add('FastAPI'); }
        if (/django/i.test(content)) { techs.add('Django'); frameworks.add('Django'); }
        if (/flask/i.test(content)) { techs.add('Flask'); frameworks.add('Flask'); }
        if (/sqlalchemy/i.test(content)) { techs.add('SQLAlchemy'); databases.add('SQLAlchemy ORM'); }
        if (/psycopg2/i.test(content)) { techs.add('PostgreSQL'); databases.add('PostgreSQL'); }
        if (/pytest/i.test(content)) { techs.add('Pytest'); testingFrameworks.add('Pytest'); }
        if (/celery/i.test(content)) { techs.add('Celery'); libraries.add('Celery Task Queue'); }
        if (/redis/i.test(content)) { techs.add('Redis'); databases.add('Redis'); }
      } catch {}
    }

    // 3. Check DevOps & Containers
    if (fileList.some(f => /dockerfile/i.test(f))) {
      techs.add('Docker');
      devOps.add('Dockerfile Containerization');
    }
    if (fileList.some(f => /docker-compose/i.test(f))) {
      techs.add('Docker Compose');
      devOps.add('Multi-container Docker Compose');
    }
    if (fileList.some(f => /\.github\/workflows/i.test(f))) {
      techs.add('GitHub Actions');
      devOps.add('GitHub Actions CI/CD Pipeline');
    }
    if (fileList.some(f => /vercel\.json/i.test(f))) {
      devOps.add('Vercel Deployment Config');
    }

    return {
      detectedTechnologies: Array.from(techs),
      dependencies: {
        frameworks: Array.from(frameworks),
        databases: Array.from(databases),
        authMechanisms: Array.from(authMechanisms),
        testingFrameworks: Array.from(testingFrameworks),
        libraries: Array.from(libraries),
        devOps: Array.from(devOps)
      }
    };
  }

  /**
   * Run Semgrep-compatible Static Analysis & Secret Detection Rules
   */
  async runSecurityAndCodeAudit(repoDir: string, fileList: string[]): Promise<{
    securityFindings: SecurityFinding[];
    secretFindings: SecretFinding[];
    npmAuditSummary?: RepoAnalysisEvidence['npmAuditSummary'];
  }> {
    const securityFindings: SecurityFinding[] = [];
    const secretFindings: SecretFinding[] = [];

    // Static code scanning rules across files
    const codeFiles = fileList.filter(f => /\.(ts|tsx|js|jsx|py|go|java|php)$/i.test(f)).slice(0, 80);

    for (const relFile of codeFiles) {
      try {
        const fullPath = path.join(repoDir, relFile);
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((lineText, idx) => {
          const lineNum = idx + 1;

          // 1. Hardcoded Secrets Rules
          if (/(api[_-]?key|secret|private[_-]?key|password|token)\s*[:=]\s*["'][a-zA-Z0-9_\-\.]{16,}["']/i.test(lineText) && !lineText.includes('process.env')) {
            secretFindings.push({
              type: 'Hardcoded Secret / Token',
              description: 'Potential API key or password literal hardcoded in source file.',
              file: relFile,
              line: lineNum
            });
          }
          if (/BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY/i.test(lineText)) {
            secretFindings.push({
              type: 'Private Key Detected',
              description: 'Cryptographic private key committed to git.',
              file: relFile,
              line: lineNum
            });
          }

          // 2. Dangerous functions / code injection
          if (/\beval\s*\(/i.test(lineText)) {
            securityFindings.push({
              ruleId: 'security.javascript.eval-injection',
              severity: 'critical',
              description: 'Use of eval() detected, allowing arbitrary code execution.',
              file: relFile,
              line: lineNum
            });
          }
          if (/child_process\.(exec|spawn)\s*\([^)]*\+/i.test(lineText)) {
            securityFindings.push({
              ruleId: 'security.command-injection',
              severity: 'high',
              description: 'Potential Command Injection: unescaped dynamic string passed to shell execution.',
              file: relFile,
              line: lineNum
            });
          }

          // 3. Raw SQL Injection patterns
          if (/(query|execute)\s*\(\s*["'`].*\$\{.*\}.*["'`]\s*\)/i.test(lineText) && !lineText.includes('prisma') && !lineText.includes('mongoose')) {
            securityFindings.push({
              ruleId: 'security.sql-injection',
              severity: 'high',
              description: 'Raw SQL template literal interpolation detected; prone to SQL Injection.',
              file: relFile,
              line: lineNum
            });
          }

          // 4. Insecure CORS
          if (/cors\s*\(\s*\{[^}]*origin\s*:\s*["']\*["']/i.test(lineText) && lineText.includes('credentials')) {
            securityFindings.push({
              ruleId: 'security.cors-wildcard-credentials',
              severity: 'medium',
              description: 'Wildcard CORS origin configured with credentials enabled.',
              file: relFile,
              line: lineNum
            });
          }
        });
      } catch {}
    }

    // Try running native npm audit if package-lock.json is present in a safe manner
    let npmAuditSummary: RepoAnalysisEvidence['npmAuditSummary'] | undefined;
    const hasPackageLock = fileList.some(f => f === 'package-lock.json');
    if (hasPackageLock) {
      try {
        const { stdout } = await execPromise('npm audit --json', {
          cwd: repoDir,
          timeout: 10000,
          maxBuffer: 5 * 1024 * 1024
        });
        const audit = JSON.parse(stdout);
        const vulns = audit.metadata?.vulnerabilities || {};
        npmAuditSummary = {
          totalVulnerabilities: (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0) + (vulns.low || 0),
          critical: vulns.critical || 0,
          high: vulns.high || 0,
          moderate: vulns.moderate || 0,
          low: vulns.low || 0
        };
      } catch (err: any) {
        if (err.stdout) {
          try {
            const audit = JSON.parse(err.stdout);
            const vulns = audit.metadata?.vulnerabilities || {};
            npmAuditSummary = {
              totalVulnerabilities: (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0) + (vulns.low || 0),
              critical: vulns.critical || 0,
              high: vulns.high || 0,
              moderate: vulns.moderate || 0,
              low: vulns.low || 0
            };
          } catch {}
        }
      }
    }

    return {
      securityFindings,
      secretFindings,
      npmAuditSummary
    };
  }

  /**
   * Inspect Documentation (README.md)
   */
  async inspectDocumentation(repoDir: string, fileList: string[]): Promise<RepoAnalysisEvidence['documentation']> {
    const readmeFile = fileList.find(f => /^readme(\.md|\.markdown|\.txt)?$/i.test(f));
    if (!readmeFile) {
      return {
        hasReadme: false,
        readmeContentPreview: '',
        readmeWordCount: 0,
        architectureDiagramFound: false,
        setupInstructionsFound: false,
        apiDocumentationFound: false
      };
    }

    try {
      const content = await fs.readFile(path.join(repoDir, readmeFile), 'utf-8');
      const words = content.trim().split(/\s+/).length;
      const lower = content.toLowerCase();

      return {
        hasReadme: true,
        readmeContentPreview: content.slice(0, 1500),
        readmeWordCount: words,
        architectureDiagramFound: /architecture|diagram|mermaid|flowchart|data flow|system design/i.test(content) || /!\[.*\]\(.*\)/i.test(content),
        setupInstructionsFound: /getting started|installation|how to run|npm install|docker-compose up|prerequisites/i.test(content),
        apiDocumentationFound: /api endpoints|endpoints|swagger|rest api|post \/|get \//i.test(content)
      };
    } catch {
      return {
        hasReadme: false,
        readmeContentPreview: '',
        readmeWordCount: 0,
        architectureDiagramFound: false,
        setupInstructionsFound: false,
        apiDocumentationFound: false
      };
    }
  }

  /**
   * Safe probe of user-declared Live URL
   */
  async probeLiveUrl(liveUrl?: string): Promise<RepoAnalysisEvidence['liveUrlCheck']> {
    if (!liveUrl || !liveUrl.startsWith('http')) {
      return { checked: false, isReachable: false };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout probe
      const res = await fetch(liveUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'PlacementOS-Readiness-Audit/1.0' }
      });
      clearTimeout(timeout);

      return {
        checked: true,
        url: liveUrl,
        isReachable: res.ok || res.status < 400,
        statusCode: res.status,
        latencyMs: Date.now() - start
      };
    } catch (e: any) {
      return {
        checked: true,
        url: liveUrl,
        isReachable: false,
        error: e.message || 'Connection refused or timeout'
      };
    }
  }

  /**
   * Search for claimed feature implementation evidence in codebase
   */
  async searchFeatureEvidence(repoDir: string, fileList: string[], features: string[]): Promise<Record<string, { detected: boolean; evidenceSnippet: string }>> {
    const result: Record<string, { detected: boolean; evidenceSnippet: string }> = {};
    const sampleFiles = fileList.filter(f => /\.(ts|tsx|js|jsx|py|go|java)$/i.test(f)).slice(0, 40);

    // Read small snippets from sample files
    const fileContents: Array<{ path: string; content: string }> = [];
    for (const f of sampleFiles) {
      try {
        const text = await fs.readFile(path.join(repoDir, f), 'utf-8');
        fileContents.push({ path: f, content: text });
      } catch {}
    }

    for (const feat of features) {
      const keywords = feat.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      let found = false;
      let snippet = 'No code evidence found matching feature claim.';

      for (const fc of fileContents) {
        const matchedKeywords = keywords.filter(k => fc.content.toLowerCase().includes(k));
        if (matchedKeywords.length >= Math.min(2, keywords.length)) {
          found = true;
          snippet = `Found implementation evidence in ${fc.path} (matched: ${matchedKeywords.join(', ')})`;
          break;
        }
      }

      result[feat] = {
        detected: found,
        evidenceSnippet: snippet
      };
    }

    return result;
  }

  /**
   * Main orchestrator: analyzes the entire repository safely and gathers empirical evidence
   */
  async analyzeRepository(githubUrl: string, declaredFeatures: string[] = [], liveUrl?: string): Promise<RepoAnalysisEvidence> {
    const parsed = this.parseGitHubUrl(githubUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${githubUrl}`);
    }

    const { tempDir, cleanup } = await this.cloneToSandbox(githubUrl);

    try {
      const gitHistory = await this.analyzeGitHistory(tempDir);
      const structureInspect = await this.inspectProjectStructure(tempDir);
      const techInspect = await this.detectTechnologies(tempDir, structureInspect.fileList);
      const securityAudit = await this.runSecurityAndCodeAudit(tempDir, structureInspect.fileList);
      const docInspect = await this.inspectDocumentation(tempDir, structureInspect.fileList);
      const liveCheck = await this.probeLiveUrl(liveUrl);
      const featureEv = await this.searchFeatureEvidence(tempDir, structureInspect.fileList, declaredFeatures);

      return {
        repoName: parsed.repo,
        owner: parsed.owner,
        totalCommits: gitHistory.totalCommits,
        totalFiles: structureInspect.totalFiles,
        totalLinesOfCode: structureInspect.totalLinesOfCode,
        languagesDetected: structureInspect.languagesDetected,
        commits: gitHistory.commits,
        cadence: gitHistory.cadence,
        commitMetrics: gitHistory.metrics,
        projectStructure: structureInspect.structure,
        detectedTechnologies: techInspect.detectedTechnologies,
        dependenciesDetected: techInspect.dependencies,
        securityFindings: securityAudit.securityFindings,
        secretFindings: securityAudit.secretFindings,
        npmAuditSummary: securityAudit.npmAuditSummary,
        documentation: docInspect,
        liveUrlCheck: liveCheck,
        featureEvidence: featureEv
      };
    } finally {
      await cleanup();
    }
  }
}

export const gitAnalyzer = new GitAnalyzerService();

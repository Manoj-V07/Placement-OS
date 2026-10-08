import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type SupportedLanguage = 'python' | 'cpp' | 'c' | 'java';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  errorDetails?: string;
}

export interface TestCaseResult {
  testCaseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  executionTimeMs: number;
  errorSnippet?: string;
  isHidden?: boolean;
}

// Clean and normalize output string
export function normalizeOutput(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Execute code locally using installed compilers with child_process
 */
async function executeLocally(
  language: SupportedLanguage,
  code: string,
  stdinInput: string,
  timeoutMs = 3000
): Promise<{ stdout: string; stderr: string; exitCode: number; executionTimeMs: number; compilationError?: string }> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsa-sandbox-'));
  const startTime = Date.now();

  try {
    let executableCommand = '';
    let executableArgs: string[] = [];

    if (language === 'python') {
      const filePath = path.join(tempDir, 'solution.py');
      fs.writeFileSync(filePath, code, 'utf-8');
      executableCommand = 'python';
      executableArgs = [filePath];
    } else if (language === 'cpp') {
      const srcPath = path.join(tempDir, 'solution.cpp');
      const exePath = path.join(tempDir, 'solution.exe');
      fs.writeFileSync(srcPath, code, 'utf-8');

      // Compile with g++
      const compileRes = await runProcess('g++', ['-O2', '-std=c++17', srcPath, '-o', exePath], '', 8000);
      if (compileRes.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileRes.stderr,
          exitCode: compileRes.exitCode,
          executionTimeMs: Date.now() - startTime,
          compilationError: compileRes.stderr || 'Compilation failed'
        };
      }
      executableCommand = exePath;
      executableArgs = [];
    } else if (language === 'c') {
      const srcPath = path.join(tempDir, 'solution.c');
      const exePath = path.join(tempDir, 'solution.exe');
      fs.writeFileSync(srcPath, code, 'utf-8');

      // Compile with gcc
      const compileRes = await runProcess('gcc', ['-O2', srcPath, '-o', exePath], '', 8000);
      if (compileRes.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileRes.stderr,
          exitCode: compileRes.exitCode,
          executionTimeMs: Date.now() - startTime,
          compilationError: compileRes.stderr || 'Compilation failed'
        };
      }
      executableCommand = exePath;
      executableArgs = [];
    } else if (language === 'java') {
      // For Java, make sure class name matches file or standard Solution / Main
      let className = 'Solution';
      const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      if (classMatch && classMatch[1]) {
        className = classMatch[1];
      }
      const srcPath = path.join(tempDir, `${className}.java`);
      fs.writeFileSync(srcPath, code, 'utf-8');

      // Compile with javac
      const compileRes = await runProcess('javac', [srcPath], '', 10000);
      if (compileRes.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileRes.stderr,
          exitCode: compileRes.exitCode,
          executionTimeMs: Date.now() - startTime,
          compilationError: compileRes.stderr || 'Compilation failed'
        };
      }
      executableCommand = 'java';
      executableArgs = ['-cp', tempDir, className];
    }

    // Run the compiled/interpreted program
    const execStartTime = Date.now();
    const runRes = await runProcess(executableCommand, executableArgs, stdinInput, timeoutMs);
    const executionTimeMs = Date.now() - execStartTime;

    return {
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      exitCode: runRes.exitCode,
      executionTimeMs
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Execute child process safely with stdin and timeout
 */
function runProcess(
  cmd: string,
  args: string[],
  stdin: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isSettled = false;

    const child = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // Ignore
        }
        resolve({ stdout, stderr, exitCode: -1, timedOut: true });
      }
    }, timeoutMs);

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.stdout.on('data', (data) => {
      if (stdout.length < 50000) {
        stdout += data.toString();
      }
    });

    child.stderr.on('data', (data) => {
      if (stderr.length < 50000) {
        stderr += data.toString();
      }
    });

    child.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr: stderr + '\n' + err.message, exitCode: 1, timedOut: false });
      }
    });

    child.on('close', (code) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? 0, timedOut: false });
      }
    });
  });
}

/**
 * Fallback cloud runner via Piston API
 */
async function executeViaPiston(
  language: SupportedLanguage,
  code: string,
  stdinInput: string
): Promise<{ stdout: string; stderr: string; exitCode: number; executionTimeMs: number; compilationError?: string }> {
  const languageMap: Record<SupportedLanguage, { language: string; version: string }> = {
    python: { language: 'python', version: '3.10.0' },
    cpp: { language: 'cpp', version: '10.2.0' },
    c: { language: 'c', version: '10.2.0' },
    java: { language: 'java', version: '15.0.2' }
  };

  const target = languageMap[language];
  const startTime = Date.now();

  const response = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: target.language,
      version: target.version,
      files: [{ content: code }],
      stdin: stdinInput,
      run_timeout: 4000
    }),
    signal: AbortSignal.timeout(10000)
  });

  const data = await response.json() as any;
  const executionTimeMs = Date.now() - startTime;

  if (data.compile && data.compile.code !== 0) {
    return {
      stdout: '',
      stderr: data.compile.stderr || data.compile.output || '',
      exitCode: data.compile.code,
      executionTimeMs,
      compilationError: data.compile.output || data.compile.stderr
    };
  }

  const run = data.run || {};
  return {
    stdout: run.stdout || run.output || '',
    stderr: run.stderr || '',
    exitCode: run.code ?? 0,
    executionTimeMs
  };
}

/**
 * Execute single test case and return evaluation
 */
export async function runTestCase(
  language: SupportedLanguage,
  code: string,
  input: string,
  expectedOutput: string,
  testCaseIndex: number,
  isHidden = false,
  timeoutMs = 3000
): Promise<TestCaseResult> {
  let execRes: { stdout: string; stderr: string; exitCode: number; executionTimeMs: number; compilationError?: string };

  try {
    // Attempt local execution first
    execRes = await executeLocally(language, code, input, timeoutMs);
  } catch (localErr: any) {
    // Fallback to Piston API if local execution encountered an environment or missing compiler error
    console.warn('Local execution failed, falling back to Piston sandbox:', localErr.message);
    try {
      execRes = await executeViaPiston(language, code, input);
    } catch (pistonErr: any) {
      return {
        testCaseIndex,
        input: isHidden ? '[Hidden]' : input,
        expectedOutput: isHidden ? '[Hidden]' : expectedOutput,
        actualOutput: '',
        status: 'Runtime Error',
        executionTimeMs: 0,
        errorSnippet: `Execution system error: ${pistonErr.message}`,
        isHidden
      };
    }
  }

  // 1. Compilation Error check
  if (execRes.compilationError) {
    return {
      testCaseIndex,
      input: isHidden ? '[Hidden]' : input,
      expectedOutput: isHidden ? '[Hidden]' : expectedOutput,
      actualOutput: '',
      status: 'Compilation Error',
      executionTimeMs: execRes.executionTimeMs,
      errorSnippet: execRes.compilationError,
      isHidden
    };
  }

  // 2. Time Limit Exceeded check
  if (execRes.exitCode === -1) {
    return {
      testCaseIndex,
      input: isHidden ? '[Hidden]' : input,
      expectedOutput: isHidden ? '[Hidden]' : expectedOutput,
      actualOutput: '',
      status: 'Time Limit Exceeded',
      executionTimeMs: timeoutMs,
      errorSnippet: 'Time limit exceeded (> 3000ms)',
      isHidden
    };
  }

  // 3. Runtime Error check
  if (execRes.exitCode !== 0) {
    return {
      testCaseIndex,
      input: isHidden ? '[Hidden]' : input,
      expectedOutput: isHidden ? '[Hidden]' : expectedOutput,
      actualOutput: execRes.stdout,
      status: 'Runtime Error',
      executionTimeMs: execRes.executionTimeMs,
      errorSnippet: execRes.stderr || `Process exited with error code ${execRes.exitCode}`,
      isHidden
    };
  }

  // 4. Output verification
  const normalizedActual = normalizeOutput(execRes.stdout);
  const normalizedExpected = normalizeOutput(expectedOutput);

  if (normalizedActual === normalizedExpected) {
    return {
      testCaseIndex,
      input: isHidden ? '[Hidden]' : input,
      expectedOutput: isHidden ? '[Hidden]' : expectedOutput,
      actualOutput: isHidden ? '[Hidden]' : normalizedActual,
      status: 'Accepted',
      executionTimeMs: execRes.executionTimeMs,
      isHidden
    };
  } else {
    return {
      testCaseIndex,
      input: isHidden ? '[Hidden]' : input,
      expectedOutput: isHidden ? '[Hidden]' : expectedOutput,
      actualOutput: isHidden ? '[Hidden]' : normalizedActual,
      status: 'Wrong Answer',
      executionTimeMs: execRes.executionTimeMs,
      isHidden
    };
  }
}

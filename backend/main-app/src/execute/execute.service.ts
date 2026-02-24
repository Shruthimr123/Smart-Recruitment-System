import { Injectable } from '@nestjs/common';
import { RunCodeDto } from './dto/run-code.dto';
import { LANGUAGE_CONFIG } from '../utils/language-config';
import { ProblemService } from '../problem/problem.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { v4 as uuid } from 'uuid';
import { ParamMeta } from 'src/utils/Wrappers/types';
import { wrapUserCode } from '../utils/wrap-user-code';
import { TestResult } from './dto/test-result.interface';
import { SubmissionService } from 'src/submissions/submission.service';

function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

@Injectable()
export class ExecuteService {
  constructor(
    private readonly problemService: ProblemService,
    private readonly submissionService: SubmissionService,
  ) {}

  /** Run arbitrary code inside the appropriate Docker image */
  /** Run arbitrary code inside the appropriate Docker image */
  async runCode({ language, code, input = '' }: RunCodeDto) {
    const config = LANGUAGE_CONFIG[language];
    if (!config) return { error: 'Unsupported language' };

    // --- create temp source file ---
    const filename = path.join(
      os.tmpdir(),
      language === 'java' ? 'Main.java' : `${uuid()}${config.extension}`,
    );
    fs.writeFileSync(filename, code);

    // --- docker command ---
    const dockerFilePath = `/app/${path.basename(filename)}`;

    // Extra volume: mount wrappers folder if defined
    let extraVol = '';
    if (config.extraVolume) {
      if (language === 'cpp') {
        extraVol = `-v "${config.extraVolume}:/app/wrappers:ro"`;
      } else if (language === 'java' || language === 'csharp') {
        extraVol = `-v "${config.extraVolume}:/app/libs:ro"`;
      }
    }

    // Build the full command - include setupCommand if it exists
    let fullCommand = config.command(dockerFilePath);
    if (config.setupCommand) {
      fullCommand = `${config.setupCommand} && ${fullCommand}`;
    }

    const dockerCommand = `docker run --rm -i -m 256m --cpus=0.5 \
    -v "${filename}:${dockerFilePath}" ${extraVol} -w /app ${config.image} \
    sh -c "${fullCommand}"`;

    try {
      const result = await this.runWithInput(dockerCommand, input);

      fs.existsSync(filename) && fs.unlinkSync(filename);
      if (language === 'java') {
        const classFile = path.join(os.tmpdir(), 'Main.class');
        fs.existsSync(classFile) && fs.unlinkSync(classFile);
      }
      return result;
    } catch (err: any) {
      fs.existsSync(filename) && fs.unlinkSync(filename);
      return {
        stdout: '',
        stderr: err.message || 'Unknown error',
        exitCode: 1,
      };
    }
  }

  private runWithInput(
    command: string,
    input: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const child = spawn(command, { shell: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));

      child.on('close', (code) =>
        resolve({ stdout, stderr, exitCode: code ?? 1 }),
      );

      child.stdin.write(input + '\n');
      child.stdin.end();
    });
  }

  /** Validate all test cases for a problem */
  async validateSubmission({
    problemKey,
    language,
    userCode,
  }: {
    problemKey: string;
    language: 'python' | 'javascript' | 'c' | 'cpp' | 'java' | 'csharp';
    userCode: string;
  }) {
    const problem = await this.problemService.getProblemForExecution(
      problemKey,
      language,
    );
    if (!problem) return { status: 'error', error: 'Problem not found' };

    const { signature, functionName, testCases } = problem;
    if (!signature || !functionName) {
      return { status: 'error', error: 'Signature or function name missing' };
    }

    const results: TestResult[] = [];

    const normalizeArray = (arr: any): any => {
      if (Array.isArray(arr)) {
        return arr.map(normalizeArray).sort();
      }
      if (arr && typeof arr === 'object') {
        const sortedObj: any = {};
        Object.keys(arr)
          .sort()
          .forEach((k) => (sortedObj[k] = normalizeArray(arr[k])));
        return sortedObj;
      }
      return arr;
    };

    for (const tc of testCases) {
      const wrappedCode = wrapUserCode({
        language,
        userCode,
        signature,
        functionName,

        testCases: [tc],
      });

      const exec = await this.runCode({
        language,
        code: wrappedCode,
        input: JSON.stringify({
          functionName,
          testCases: [tc],
          userCode,
        }),
      });

      if ('error' in exec) {
        results.push({
          input: tc.input,
          expected: tc.expectedOutput?.result ?? tc.expectedOutput,
          actual: '',
          passed: false,
          stderr: exec.stderr || '',
        });
        continue;
      }

      // --- Language-specific parsing ---
      let actual: any;

      try {
        actual = JSON.parse(exec.stdout);
      } catch {
        actual = exec.stdout.trim();
      }

      // --- Normalize based on language ---
      if (language === 'cpp' || language === 'c') {
        if (actual && typeof actual === 'object' && 'result' in actual) {
          actual = actual.result;
        }
      } else if (language === 'csharp') {
        // C# prints possibly extra newlines or multiple outputs for multiple test cases
        if (typeof exec.stdout === 'string') {
          const lines = exec.stdout
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          const lastLine = lines.at(-1) ?? '';

          try {
            actual = JSON.parse(lastLine);
          } catch {
            actual = lastLine;
          }
        }
      }

      const expected = tc.expectedOutput?.result ?? tc.expectedOutput;
      const passed = deepEqual(
        normalizeArray(actual),
        normalizeArray(expected),
      );

      results.push({
        input: tc.input,
        expected,
        actual,
        passed,
        stderr: exec.stderr,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;
    return {
      status: passedCount === results.length ? 'Passed' : 'Failed',
      total: results.length,
      passed: passedCount,
      output: results.map((r) => JSON.stringify(r.actual)).join('\n'),
      testResults: results,
    };
  }

  /** Save submission result */
  async submitCode({
    applicantId,
    problemKey,
    userCode,
    language,
    isAutoSubmitted = false,
  }: {
    applicantId: string;
    problemKey: string;
    userCode: string;
    language: 'python' | 'javascript' | 'c' | 'cpp' | 'java' | 'csharp';
    isAutoSubmitted?: boolean;
  }) {
    const result = await this.validateSubmission({
      userCode,
      problemKey,
      language,
    });
    if ('error' in result) return result;

    await this.submissionService.create({
      applicantId,
      problemKey,
      code: userCode,
      output: result.output,
      testResults: result.testResults,
      status: result.status,
      isAutoSubmitted,
    });

    return { ...result, submitted: true };
  }
}

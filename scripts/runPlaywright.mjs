import { spawn } from 'child_process';
import { generateTestRunId } from './testRunId.mjs';

const suite = process.argv[2]; // 'governance' or 'sessions'
if (!suite) {
    console.error('Usage: node runPlaywright.mjs <suite>');
    process.exit(1);
}

const runId = generateTestRunId();
const outputPath = `test-results/playwright/${suite}/${runId}`;

// Map suites to their specific test files/directories
const suiteConfigs = {
    governance: 'tests/governance-integrity.spec.ts',
    sessions: 'tests/session-stabilization.spec.ts'
};

const testTarget = suiteConfigs[suite];
if (!testTarget) {
    console.error(`Unknown suite: ${suite}. Handled: ${Object.keys(suiteConfigs).join(', ')}`);
    process.exit(1);
}

const args = [
    'test',
    testTarget,
    `--output=${outputPath}`
];

console.log(`[AEGIS-TEST] Running ${suite} tests...`);
console.log(`[AEGIS-TEST] Output Directory: ${outputPath}`);

const playwright = spawn('npx', ['playwright', ...args], {
    stdio: 'inherit',
    shell: true
});

playwright.on('close', (code) => {
    process.exit(code);
});

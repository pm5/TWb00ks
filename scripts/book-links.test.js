/**
 * Unit tests for book-links.js CLI
 * These tests verify the script structure and logic
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to run the CLI script
function runCLI(args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'book-links.js');
    const child = spawn('node', [scriptPath, ...args], {
      cwd: path.dirname(__dirname),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Add timeout
    setTimeout(() => {
      child.kill();
      reject(new Error('Process timeout'));
    }, 5000);
  });
}

// Test 1: Show usage when no command provided
async function testNoCommand() {
  console.log('Test 1: Show usage when no command provided');
  try {
    const result = await runCLI([]);

    if (result.code !== 1) {
      throw new Error(`Expected exit code 1, got ${result.code}`);
    }

    // Check both stdout and stderr for usage message
    const output = result.stdout + result.stderr;

    if (!output.includes('Usage:')) {
      throw new Error('Expected usage message in output');
    }

    if (!output.includes('npm run review-links')) {
      throw new Error('Expected "npm run review-links" in usage');
    }

    if (!output.includes('npm run find-links')) {
      throw new Error('Expected "npm run find-links" in usage');
    }

    console.log('✓ Test 1 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
    return false;
  }
}

// Test 2: Invalid command shows usage
async function testInvalidCommand() {
  console.log('Test 2: Invalid command shows usage');
  try {
    const result = await runCLI(['invalid']);

    if (result.code !== 1) {
      throw new Error(`Expected exit code 1, got ${result.code}`);
    }

    // Check both stdout and stderr for usage message
    const output = result.stdout + result.stderr;

    if (!output.includes('Usage:')) {
      throw new Error('Expected usage message in output');
    }

    console.log('✓ Test 2 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
    return false;
  }
}

// Test 3: Script is executable and loads properly
async function testScriptStructure() {
  console.log('Test 3: Script structure validation');
  try {
    const fs = await import('fs');
    const scriptPath = path.join(__dirname, 'book-links.js');
    const content = fs.readFileSync(scriptPath, 'utf8');

    // Check for required functions
    if (!content.includes('async function reviewSession()')) {
      throw new Error('Missing reviewSession function');
    }

    if (!content.includes('async function generateLinks()')) {
      throw new Error('Missing generateLinks function');
    }

    if (!content.includes('function displayBookLinks(')) {
      throw new Error('Missing displayBookLinks function');
    }

    if (!content.includes('async function openLinksInBrowser(')) {
      throw new Error('Missing openLinksInBrowser function');
    }

    if (!content.includes('function hasMissingLinks(')) {
      throw new Error('Missing hasMissingLinks function');
    }

    // Check for required imports
    if (!content.includes("import readline from 'readline'")) {
      throw new Error('Missing readline import');
    }

    if (!content.includes("import open from 'open'")) {
      throw new Error('Missing open import');
    }

    if (!content.includes("from './lib/book-links-core.js'")) {
      throw new Error('Missing book-links-core import');
    }

    console.log('✓ Test 3 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Running book-links.js CLI tests\n');
  console.log('═'.repeat(50));
  console.log('');

  const results = await Promise.all([
    testNoCommand(),
    testInvalidCommand(),
    testScriptStructure(),
  ]);

  console.log('═'.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\nTests completed: ${passed}/${total} passed`);

  if (passed === total) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});

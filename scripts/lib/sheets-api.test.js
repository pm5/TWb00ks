/**
 * Manual test suite for sheets-api.js
 *
 * To run these tests:
 * 1. Ensure you have set up scripts/.credentials.json with valid service account credentials
 * 2. Update the TEST_SHEET_ID below with your test sheet ID
 * 3. Run: node scripts/lib/sheets-api.test.js
 */

import {
  initSheetsClient,
  readSheetTab,
  writeSheetRange,
  findRowByTitle,
  getColumnIndex,
  columnIndexToLetter,
} from './sheets-api.js';

// Configuration - Update these with your test sheet details
// IMPORTANT: Use a separate test sheet, not the production sheet!
// Set TEST_SHEET_ID environment variable or create a test-specific sheet
const TEST_SHEET_ID = process.env.TEST_SHEET_ID || '1Z0JUS0fw5SFaX1-oht6jEx5i8XI888vx5F9jm9BEggI';
const TEST_TAB_NAME = '暫貼區';

console.warn('⚠️  Using sheet ID:', TEST_SHEET_ID);
console.warn('⚠️  Make sure this is a TEST sheet, not production!');

// Test results tracking
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual: ${JSON.stringify(actual)}`);
    failed++;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Running sheets-api.js tests');
  console.log('='.repeat(60));
  console.log();

  // Test 1: columnIndexToLetter
  console.log('Test Suite: columnIndexToLetter');
  console.log('-'.repeat(40));
  try {
    assertEqual(columnIndexToLetter(0), 'A', 'Index 0 should be A');
    assertEqual(columnIndexToLetter(1), 'B', 'Index 1 should be B');
    assertEqual(columnIndexToLetter(25), 'Z', 'Index 25 should be Z');
    assertEqual(columnIndexToLetter(26), 'AA', 'Index 26 should be AA');
    assertEqual(columnIndexToLetter(27), 'AB', 'Index 27 should be AB');
    assertEqual(columnIndexToLetter(51), 'AZ', 'Index 51 should be AZ');
    assertEqual(columnIndexToLetter(52), 'BA', 'Index 52 should be BA');
    assertEqual(columnIndexToLetter(701), 'ZZ', 'Index 701 should be ZZ');
    assertEqual(columnIndexToLetter(702), 'AAA', 'Index 702 should be AAA');

    // Test negative index
    try {
      columnIndexToLetter(-1);
      assert(false, 'Should throw error for negative index');
    } catch (error) {
      assert(error.message.includes('Invalid column index'), 'Should throw error for negative index');
    }
  } catch (error) {
    console.error(`Error in columnIndexToLetter tests: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 2: getColumnIndex
  console.log('Test Suite: getColumnIndex');
  console.log('-'.repeat(40));
  try {
    const headers = ['Title', '博客來', '金石堂', '誠品'];
    assertEqual(getColumnIndex(headers, 'Title'), 0, 'Should find Title at index 0');
    assertEqual(getColumnIndex(headers, '博客來'), 1, 'Should find 博客來 at index 1');
    assertEqual(getColumnIndex(headers, '誠品'), 3, 'Should find 誠品 at index 3');
    assertEqual(getColumnIndex(headers, 'NotFound'), -1, 'Should return -1 for non-existent column');
    assertEqual(getColumnIndex(null, 'Title'), -1, 'Should return -1 for null headers');
    assertEqual(getColumnIndex([], 'Title'), -1, 'Should return -1 for empty headers');
  } catch (error) {
    console.error(`Error in getColumnIndex tests: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 3: initSheetsClient
  console.log('Test Suite: initSheetsClient');
  console.log('-'.repeat(40));
  try {
    const client = await initSheetsClient();
    assert(client !== null, 'Should initialize sheets client');
    assert(typeof client.spreadsheets !== 'undefined', 'Client should have spreadsheets property');

    // Test caching - second call should return same instance
    const client2 = await initSheetsClient();
    assert(client === client2, 'Should return cached client on second call');
  } catch (error) {
    console.error(`Error initializing sheets client: ${error.message}`);
    console.error('Make sure you have set up .credentials.json file');
    failed++;
  }
  console.log();

  // Test 4: readSheetTab
  console.log('Test Suite: readSheetTab');
  console.log('-'.repeat(40));
  try {
    // Read the entire tab
    const data = await readSheetTab(TEST_SHEET_ID, TEST_TAB_NAME);
    assert(Array.isArray(data), 'Should return an array');
    assert(data.length > 0, 'Should return non-empty data');
    console.log(`  Read ${data.length} rows from ${TEST_TAB_NAME}`);

    // Read with specific range
    const rangeData = await readSheetTab(TEST_SHEET_ID, TEST_TAB_NAME, 'A1:B5');
    assert(Array.isArray(rangeData), 'Should return an array for range');
    assert(rangeData.length <= 5, 'Should return at most 5 rows for A1:B5 range');
    console.log(`  Read ${rangeData.length} rows with range A1:B5`);

    // Test error handling - non-existent tab
    try {
      await readSheetTab(TEST_SHEET_ID, 'NonExistentTab123456');
      assert(false, 'Should throw error for non-existent tab');
    } catch (error) {
      assert(error.message.includes('not found'), 'Should throw "not found" error for non-existent tab');
    }
  } catch (error) {
    console.error(`Error reading sheet tab: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 5: findRowByTitle
  console.log('Test Suite: findRowByTitle');
  console.log('-'.repeat(40));
  try {
    // First, read data to see what titles are available
    const data = await readSheetTab(TEST_SHEET_ID, TEST_TAB_NAME, 'A1:H10');
    if (data.length > 1) {
      // Use the first title from the sheet (row 2, assuming row 1 is headers)
      const firstTitle = data[1] && data[1][0];
      if (firstTitle) {
        console.log(`  Searching for title: "${firstTitle}"`);
        const result = await findRowByTitle(TEST_SHEET_ID, TEST_TAB_NAME, firstTitle);
        assert(result !== null, 'Should find existing title');
        assert(result.rowIndex >= 2, 'Row index should be at least 2 (after headers)');
        assert(Array.isArray(result.rowData), 'Should include rowData array');
        assert(Array.isArray(result.headers), 'Should include headers array');
        console.log(`  Found at row ${result.rowIndex}`);
      }

      // Test with non-existent title
      const notFound = await findRowByTitle(TEST_SHEET_ID, TEST_TAB_NAME, 'NonExistentBookTitle12345');
      assert(notFound === null, 'Should return null for non-existent title');
    } else {
      console.log('  Skipping - sheet appears to be empty');
    }
  } catch (error) {
    console.error(`Error in findRowByTitle: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 6: writeSheetRange (optional - only if you want to test writes)
  console.log('Test Suite: writeSheetRange');
  console.log('-'.repeat(40));
  console.log('  Skipping write tests to avoid modifying production data');
  console.log('  To test writes, create a separate test sheet and uncomment the write test code');
  console.log();

  /*
  // Uncomment this section to test writes on a test sheet
  try {
    // Write a test value
    const testValues = [['Test Link']];
    const result = await writeSheetRange(TEST_SHEET_ID, 'TestTab', 'A1', testValues);
    assert(result.updatedCells === 1, 'Should update 1 cell');

    // Verify the write
    const readBack = await readSheetTab(TEST_SHEET_ID, 'TestTab', 'A1');
    assert(readBack[0][0] === 'Test Link', 'Should read back the written value');
  } catch (error) {
    console.error(`Error in writeSheetRange: ${error.message}`);
    failed++;
  }
  */

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('Test Results:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

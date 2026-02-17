/**
 * Unit tests for book-links-core.js (no API calls required)
 * Tests the core business logic without requiring Google Sheets credentials
 *
 * To run: node scripts/lib/book-links-core.unit.test.js
 */

import { loadConfig, resetConfigCache } from './book-links-core.js';

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

function runTests() {
  console.log('='.repeat(60));
  console.log('Running book-links-core.js Unit Tests');
  console.log('='.repeat(60));
  console.log();

  // Test 1: Config loading and structure
  console.log('Test Suite: Configuration Loading & Validation');
  console.log('-'.repeat(40));
  try {
    resetConfigCache();
    const config = loadConfig();

    // Basic structure
    assert(config !== null, 'Config should be loaded');
    assert(typeof config === 'object', 'Config should be an object');

    // Required fields
    assert(typeof config.sheetId === 'string', 'Should have sheetId string');
    assert(config.sheetId.length > 0, 'sheetId should not be empty');
    assert(typeof config.stagingTabName === 'string', 'Should have stagingTabName string');
    assert(config.stagingTabName.length > 0, 'stagingTabName should not be empty');
    assert(typeof config.mainTabName === 'string', 'Should have mainTabName string');
    assert(config.mainTabName.length > 0, 'mainTabName should not be empty');
    assert(typeof config.searchEngine === 'string', 'Should have searchEngine string');
    assert(
      config.searchEngine === 'google' || config.searchEngine === 'duckduckgo',
      'searchEngine should be google or duckduckgo'
    );

    // Bookstores array
    assert(Array.isArray(config.bookstores), 'Bookstores should be an array');
    assert(config.bookstores.length > 0, 'Should have at least one bookstore');

    // Verify expected bookstores
    const expectedIds = ['books', 'kingstone', 'eslite', 'momo', 'kobo', 'readmoo', 'taaze'];
    assertEqual(config.bookstores.length, 7, 'Should have exactly 7 bookstores');

    for (const expectedId of expectedIds) {
      const bookstore = config.bookstores.find(b => b.id === expectedId);
      assert(bookstore !== undefined, `Should have bookstore: ${expectedId}`);
    }

    // Verify each bookstore structure
    for (const bookstore of config.bookstores) {
      assert(typeof bookstore.id === 'string', `Bookstore ${bookstore.id}: should have id`);
      assert(typeof bookstore.name === 'string', `Bookstore ${bookstore.id}: should have name`);
      assert(typeof bookstore.domain === 'string', `Bookstore ${bookstore.id}: should have domain`);
      assert(typeof bookstore.columnName === 'string', `Bookstore ${bookstore.id}: should have columnName`);
      assert(
        bookstore.searchUrl === null || typeof bookstore.searchUrl === 'string',
        `Bookstore ${bookstore.id}: searchUrl should be null or string`
      );
    }

    // Test caching
    const config2 = loadConfig();
    assert(config === config2, 'Should return same cached instance');

    // Test cache reset
    resetConfigCache();
    const config3 = loadConfig();
    assert(config !== config3, 'Should return new instance after cache reset');
    assertEqual(config.sheetId, config3.sheetId, 'Config content should be same after reset');

    console.log(`  ✓ Config validation complete: ${config.bookstores.length} bookstores`);
  } catch (error) {
    console.error(`✗ Error in config tests: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 2: Column name mapping
  console.log('Test Suite: Column Name Mapping');
  console.log('-'.repeat(40));
  try {
    const config = loadConfig();

    // Verify column names match expected Chinese names
    const expectedMapping = {
      books: '博客來',
      kingstone: '金石堂',
      eslite: '誠品',
      momo: 'momo',
      kobo: 'Kobo',
      readmoo: 'readmoo',
      taaze: 'tazze', // Note: Column name is "tazze" (with two z's)
    };

    for (const [id, expectedColumnName] of Object.entries(expectedMapping)) {
      const bookstore = config.bookstores.find(b => b.id === id);
      assertEqual(
        bookstore.columnName,
        expectedColumnName,
        `${id} should have columnName "${expectedColumnName}"`
      );
    }
  } catch (error) {
    console.error(`✗ Error in column mapping tests: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 3: Search URL configuration
  console.log('Test Suite: Search URL Configuration');
  console.log('-'.repeat(40));
  try {
    const config = loadConfig();

    // These bookstores should have searchUrl
    const withSearchUrl = ['books', 'kingstone', 'eslite'];
    for (const id of withSearchUrl) {
      const bookstore = config.bookstores.find(b => b.id === id);
      assert(
        bookstore.searchUrl !== null && bookstore.searchUrl.includes('{title}'),
        `${bookstore.name} should have searchUrl with {title} placeholder`
      );
    }

    // These bookstores should NOT have searchUrl (rely on I'm Feeling Lucky)
    const withoutSearchUrl = ['momo', 'kobo', 'readmoo', 'taaze'];
    for (const id of withoutSearchUrl) {
      const bookstore = config.bookstores.find(b => b.id === id);
      assert(
        bookstore.searchUrl === null,
        `${bookstore.name} should have null searchUrl`
      );
    }
  } catch (error) {
    console.error(`✗ Error in search URL tests: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 4: Domain configuration
  console.log('Test Suite: Domain Configuration');
  console.log('-'.repeat(40));
  try {
    const config = loadConfig();

    const expectedDomains = {
      books: 'books.com.tw',
      kingstone: 'kingstone.com.tw',
      eslite: 'eslite.com',
      momo: 'momoshop.com.tw',
      kobo: 'kobo.com',
      readmoo: 'readmoo.com',
      taaze: 'taaze.tw',
    };

    for (const [id, expectedDomain] of Object.entries(expectedDomains)) {
      const bookstore = config.bookstores.find(b => b.id === id);
      assertEqual(
        bookstore.domain,
        expectedDomain,
        `${bookstore.name} should have domain "${expectedDomain}"`
      );
    }
  } catch (error) {
    console.error(`✗ Error in domain tests: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 5: Links object structure
  console.log('Test Suite: Links Object Structure');
  console.log('-'.repeat(40));
  try {
    const config = loadConfig();

    // Simulate a links object
    const sampleLinks = {
      books: 'https://www.books.com.tw/products/123',
      kingstone: 'https://www.kingstone.com.tw/products/456',
      eslite: 'NOT_FOUND',
      momo: '',
      kobo: 'https://www.kobo.com/book/789',
      readmoo: '',
      taaze: 'https://www.taaze.tw/products/101',
    };

    // Verify all expected bookstore IDs are present
    for (const bookstore of config.bookstores) {
      assert(
        bookstore.id in sampleLinks,
        `Links object should have key for ${bookstore.id}`
      );
    }

    // Count different link states
    let valid = 0;
    let notFound = 0;
    let empty = 0;

    for (const [id, value] of Object.entries(sampleLinks)) {
      if (!value || value === '') {
        empty++;
      } else if (value === 'NOT_FOUND') {
        notFound++;
      } else {
        valid++;
      }
    }

    console.log(`  Sample links: ${valid} valid, ${notFound} not found, ${empty} empty`);
    assert(valid > 0, 'Should have some valid links');
    assert(valid + notFound + empty === config.bookstores.length, 'Should account for all bookstores');
  } catch (error) {
    console.error(`✗ Error in links structure tests: ${error.message}`);
    failed++;
  }
  console.log();

  // Summary
  console.log();
  console.log('='.repeat(60));
  console.log('Test Results:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('✓ All unit tests passed!');
    console.log();
    console.log('These tests validate the configuration and data structures.');
    console.log('For integration tests with Google Sheets, run: node scripts/lib/book-links-core.test.js');
    process.exit(0);
  } else {
    console.log('✗ Some unit tests failed');
    process.exit(1);
  }
}

// Run the tests
try {
  runTests();
} catch (error) {
  console.error('Fatal error running tests:', error);
  process.exit(1);
}

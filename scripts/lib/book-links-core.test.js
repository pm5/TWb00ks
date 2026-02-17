/**
 * Manual test suite for book-links-core.js
 *
 * To run these tests:
 * 1. Ensure you have set up scripts/.credentials.json with valid service account credentials
 * 2. Ensure bookstores.config.json is properly configured
 * 3. Run: node scripts/lib/book-links-core.test.js
 */

import {
  loadConfig,
  readStagingArea,
  writeStagingLinks,
  findBookInMain,
  mergeLinksToMain,
  generateMissingLinks,
  resetConfigCache,
} from './book-links-core.js';

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
  console.log('Running book-links-core.js tests');
  console.log('='.repeat(60));
  console.log();

  // Test 1: loadConfig
  console.log('Test Suite: loadConfig');
  console.log('-'.repeat(40));
  try {
    const config = loadConfig();
    assert(config !== null, 'Should load configuration');
    assert(typeof config.sheetId === 'string', 'Should have sheetId');
    assert(typeof config.stagingTabName === 'string', 'Should have stagingTabName');
    assert(typeof config.mainTabName === 'string', 'Should have mainTabName');
    assert(typeof config.searchEngine === 'string', 'Should have searchEngine');
    assert(Array.isArray(config.bookstores), 'Should have bookstores array');
    assert(config.bookstores.length > 0, 'Should have at least one bookstore');

    // Test caching
    const config2 = loadConfig();
    assert(config === config2, 'Should return cached config on second call');

    // Test config structure
    const firstBookstore = config.bookstores[0];
    assert(typeof firstBookstore.id === 'string', 'Bookstore should have id');
    assert(typeof firstBookstore.name === 'string', 'Bookstore should have name');
    assert(typeof firstBookstore.columnName === 'string', 'Bookstore should have columnName');
    assert(typeof firstBookstore.domain === 'string', 'Bookstore should have domain');

    console.log(`  Loaded config with ${config.bookstores.length} bookstores`);
    console.log(`  Sheet ID: ${config.sheetId}`);
    console.log(`  Staging tab: ${config.stagingTabName}`);
    console.log(`  Main tab: ${config.mainTabName}`);
    console.log(`  Search engine: ${config.searchEngine}`);
  } catch (error) {
    console.error(`Error loading config: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 2: readStagingArea
  console.log('Test Suite: readStagingArea');
  console.log('-'.repeat(40));
  try {
    const books = await readStagingArea();
    assert(Array.isArray(books), 'Should return an array');
    console.log(`  Found ${books.length} books in staging area`);

    if (books.length > 0) {
      const firstBook = books[0];
      assert(typeof firstBook.rowIndex === 'number', 'Book should have rowIndex');
      assert(firstBook.rowIndex >= 2, 'Row index should be at least 2');
      assert(typeof firstBook.title === 'string', 'Book should have title');
      assert(typeof firstBook.links === 'object', 'Book should have links object');

      console.log(`  First book: "${firstBook.title}" (row ${firstBook.rowIndex})`);
      console.log(`  Links:`, firstBook.links);

      // Validate links structure
      const config = loadConfig();
      for (const bookstore of config.bookstores) {
        assert(
          bookstore.id in firstBook.links,
          `Book should have link for bookstore: ${bookstore.id}`
        );
      }
    } else {
      console.log('  Note: Staging area is empty');
    }
  } catch (error) {
    console.error(`Error reading staging area: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 3: findBookInMain
  console.log('Test Suite: findBookInMain');
  console.log('-'.repeat(40));
  try {
    // First, get a book from staging area to test with
    const stagingBooks = await readStagingArea();

    if (stagingBooks.length > 0) {
      const testTitle = stagingBooks[0].title;
      console.log(`  Searching for: "${testTitle}"`);

      const result = await findBookInMain(testTitle);

      if (result) {
        assert(result !== null, 'Should find book in main tab');
        assert(typeof result.rowIndex === 'number', 'Should have rowIndex');
        assert(Array.isArray(result.rowData), 'Should have rowData');
        assert(Array.isArray(result.headers), 'Should have headers');
        console.log(`  Found at row ${result.rowIndex} in main tab`);
      } else {
        console.log(`  Book not found in main tab (this is OK for testing)`);
        assert(result === null, 'findBookInMain should return null when not found');
      }

      // Test with non-existent title
      const notFound = await findBookInMain('NonExistentBookTitle12345XYZ');
      assert(notFound === null, 'Should return null for non-existent title');
    } else {
      console.log('  Skipping - no books in staging area to test with');
    }
  } catch (error) {
    console.error(`Error finding book in main: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 4: generateMissingLinks
  console.log('Test Suite: generateMissingLinks');
  console.log('-'.repeat(40));
  console.log('  Note: This test makes real API calls and may take time');
  try {
    // Test with a book that has some missing links
    const testBook = {
      title: '原子習慣',
      links: {
        books: 'https://www.books.com.tw/products/123',
        kingstone: '', // Missing
        eslite: 'NOT_FOUND', // Will regenerate
        momo: '',
        kobo: '',
        readmoo: '',
        taaze: '',
      },
    };

    console.log(`  Generating missing links for: "${testBook.title}"`);
    console.log(`  Current links:`, testBook.links);

    const updatedLinks = await generateMissingLinks(testBook);

    assert(typeof updatedLinks === 'object', 'Should return links object');
    assert(
      updatedLinks.books === testBook.links.books,
      'Should not modify existing valid link'
    );

    // Check that missing links were generated
    const config = loadConfig();
    for (const bookstore of config.bookstores) {
      assert(
        bookstore.id in updatedLinks,
        `Should have link for bookstore: ${bookstore.id}`
      );

      const originalValue = testBook.links[bookstore.id];
      const newValue = updatedLinks[bookstore.id];

      if (!originalValue || originalValue === 'NOT_FOUND') {
        assert(
          newValue && newValue !== originalValue,
          `Should generate new link for ${bookstore.id}`
        );
      }
    }

    console.log(`  Updated links:`, updatedLinks);
  } catch (error) {
    console.error(`Error generating missing links: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 5: writeStagingLinks (optional - only run if explicitly enabled)
  console.log('Test Suite: writeStagingLinks');
  console.log('-'.repeat(40));
  console.log('  Skipping write tests to avoid modifying production data');
  console.log('  To test writes, set TEST_WRITES=true and run again');
  console.log();

  if (process.env.TEST_WRITES === 'true') {
    try {
      const stagingBooks = await readStagingArea();
      if (stagingBooks.length > 0) {
        const testBook = stagingBooks[0];
        console.log(`  Testing write for: "${testBook.title}" (row ${testBook.rowIndex})`);

        // Save original links
        const originalLinks = { ...testBook.links };

        // Write test links
        const testLinks = {
          books: 'TEST_LINK_1',
          kingstone: 'TEST_LINK_2',
        };

        const writeResult = await writeStagingLinks(testBook.rowIndex, testLinks);
        assert(writeResult.updatedCells > 0, 'Should update cells');
        console.log(`  Updated ${writeResult.updatedCells} cells`);

        // Restore original links
        await writeStagingLinks(testBook.rowIndex, originalLinks);
        console.log('  Restored original links');
      }
    } catch (error) {
      console.error(`Error in writeStagingLinks: ${error.message}`);
      failed++;
    }
    console.log();
  }

  // Test 6: mergeLinksToMain (read-only test)
  console.log('Test Suite: mergeLinksToMain');
  console.log('-'.repeat(40));
  console.log('  Testing merge logic without writing');
  try {
    // Test 6a: Book not found in main tab
    const nonExistentTitle = 'NonExistentBookForTesting12345XYZ';
    const testLinks = {
      books: 'https://test.com/1',
      kingstone: 'https://test.com/2',
    };

    const result1 = await mergeLinksToMain(nonExistentTitle, testLinks);
    assert(result1.success === false, 'Should return success=false when book not found');
    assert(result1.error.includes('not found'), 'Should include error message');
    assert(result1.updatedCells === 0, 'Should not update any cells');
    console.log(`  ✓ Correctly handles book not found: ${result1.error}`);

    // Test 6b: Validation errors
    try {
      await mergeLinksToMain('', testLinks);
      assert(false, 'Should throw error for empty title');
    } catch (error) {
      assert(error.message.includes('non-empty string'), 'Should throw error for empty title');
    }

    try {
      await mergeLinksToMain('Test', null);
      assert(false, 'Should throw error for null links');
    } catch (error) {
      assert(error.message.includes('object'), 'Should throw error for null links');
    }

    console.log('  Note: Full merge testing requires TEST_WRITES=true');
  } catch (error) {
    console.error(`Error in mergeLinksToMain: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 7: Error handling
  console.log('Test Suite: Error Handling');
  console.log('-'.repeat(40));
  try {
    // Test invalid rowIndex
    try {
      await writeStagingLinks(1, {});
      assert(false, 'Should throw error for rowIndex < 2');
    } catch (error) {
      assert(error.message.includes('Invalid rowIndex'), 'Should throw error for invalid rowIndex');
    }

    try {
      await writeStagingLinks(0, {});
      assert(false, 'Should throw error for rowIndex = 0');
    } catch (error) {
      assert(error.message.includes('Invalid rowIndex'), 'Should throw error for rowIndex = 0');
    }

    // Test generateMissingLinks without title
    try {
      await generateMissingLinks({});
      assert(false, 'Should throw error for book without title');
    } catch (error) {
      assert(error.message.includes('title property'), 'Should throw error for missing title');
    }
  } catch (error) {
    console.error(`Unexpected error in error handling tests: ${error.message}`);
    failed++;
  }
  console.log();

  // Test 8: Config cache reset
  console.log('Test Suite: Config Cache');
  console.log('-'.repeat(40));
  try {
    const config1 = loadConfig();
    resetConfigCache();
    const config2 = loadConfig();
    // They should be equal in content but different objects after reset
    assert(config1.sheetId === config2.sheetId, 'Config content should be same after reset');
    assert(config1 !== config2, 'Config object should be different after reset');
  } catch (error) {
    console.error(`Error in config cache tests: ${error.message}`);
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
    console.log('✓ All tests passed!');
    console.log();
    console.log('Note: Some tests were skipped to avoid modifying data.');
    console.log('To run full tests including writes, use: TEST_WRITES=true node scripts/lib/book-links-core.test.js');
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

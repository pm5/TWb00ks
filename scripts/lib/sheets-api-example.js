/**
 * Example usage of the sheets-api.js library
 *
 * This demonstrates how to use each function in the API.
 */

import {
  initSheetsClient,
  readSheetTab,
  writeSheetRange,
  findRowByTitle,
  getColumnIndex,
  columnIndexToLetter,
} from './sheets-api.js';

// Load configuration
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../bookstores.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function exampleUsage() {
  console.log('='.repeat(60));
  console.log('Example: Using sheets-api.js');
  console.log('='.repeat(60));
  console.log();

  try {
    // Example 1: Initialize the client
    console.log('1. Initializing Google Sheets client...');
    await initSheetsClient();
    console.log('   ✓ Client initialized successfully');
    console.log();

    // Example 2: Read data from staging area
    console.log('2. Reading data from staging area (暫貼區)...');
    const stagingData = await readSheetTab(
      config.sheetId,
      config.stagingTabName,
      'A1:H10' // Read first 10 rows, columns A-H
    );
    console.log(`   ✓ Read ${stagingData.length} rows`);
    if (stagingData.length > 0) {
      console.log(`   Headers: ${stagingData[0].join(', ')}`);
    }
    console.log();

    // Example 3: Find column index
    console.log('3. Finding column indices...');
    if (stagingData.length > 0) {
      const headers = stagingData[0];
      const titleIndex = getColumnIndex(headers, 'Title');
      const booksIndex = getColumnIndex(headers, '博客來');

      console.log(`   Title column index: ${titleIndex} (${columnIndexToLetter(titleIndex)})`);
      console.log(`   博客來 column index: ${booksIndex} (${columnIndexToLetter(booksIndex)})`);
    }
    console.log();

    // Example 4: Find a book by title
    console.log('4. Finding a book by title...');
    if (stagingData.length > 1) {
      const firstBookTitle = stagingData[1][0];
      if (firstBookTitle) {
        console.log(`   Searching for: "${firstBookTitle}"`);
        const result = await findRowByTitle(
          config.sheetId,
          config.stagingTabName,
          firstBookTitle
        );

        if (result) {
          console.log(`   ✓ Found at row ${result.rowIndex}`);
          console.log(`   Row data: ${result.rowData.slice(0, 3).join(', ')}...`);
        }
      }
    }
    console.log();

    // Example 5: Convert column indices to letters
    console.log('5. Converting column indices to letters...');
    const examples = [
      { index: 0, expected: 'A' },
      { index: 7, expected: 'H' },
      { index: 25, expected: 'Z' },
      { index: 26, expected: 'AA' },
    ];

    for (const ex of examples) {
      const letter = columnIndexToLetter(ex.index);
      console.log(`   Index ${ex.index} = ${letter}`);
    }
    console.log();

    // Example 6: Write data (commented out to avoid modifying production data)
    console.log('6. Writing data to sheet (example - not executed)...');
    console.log('   Example code:');
    console.log('   ```javascript');
    console.log('   const values = [[');
    console.log('     "https://www.books.com.tw/products/12345",');
    console.log('     "https://www.kingstone.com.tw/book/12345"');
    console.log('   ]];');
    console.log('   ');
    console.log('   const result = await writeSheetRange(');
    console.log('     config.sheetId,');
    console.log('     config.stagingTabName,');
    console.log('     "B2:C2", // Write to columns B and C, row 2');
    console.log('     values');
    console.log('   );');
    console.log('   ```');
    console.log();

    console.log('='.repeat(60));
    console.log('✓ All examples completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage();
}

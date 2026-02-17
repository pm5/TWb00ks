/**
 * Google AppScript for Book Links Approval
 *
 * Provides spreadsheet-native approval workflows for bookstore links:
 * 1. Cell-level approval: Approve a single bookstore link
 * 2. Row-level approval: Approve all links for one or more books
 *
 * Critical Rules:
 * - Never overwrite existing links (only update empty or "NOT_FOUND")
 * - Validate book exists in main tab before merging
 * - Show clear error messages to users
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  STAGING_TAB: '暫貼區',
  MAIN_TAB: '成人書單',
  BOOKSTORES: ['博客來', '金石堂', '誠品', 'momo', 'Kobo', 'readmoo', 'tazze']
};

// ============================================================================
// MENU SETUP
// ============================================================================

/**
 * Adds custom menu to spreadsheet when opened
 * This function runs automatically when the spreadsheet is opened
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Book Links')
    .addItem('Approve Selected Cell', 'approveSelectedCell')
    .addItem('Approve Selected Row(s)', 'approveSelectedRows')
    .addToUi();
}

// ============================================================================
// USER-FACING APPROVAL FUNCTIONS
// ============================================================================

/**
 * Approve a single bookstore link (cell-level approval)
 *
 * Usage:
 * 1. Select a single cell in the staging tab containing a bookstore link
 * 2. Click "Book Links" → "Approve Selected Cell"
 * 3. The link will be copied to the main tab (if cell is empty or "NOT_FOUND")
 *
 * Validation:
 * - Must be in staging tab
 * - Must select exactly one cell
 * - Cell must be in a bookstore column (not title or other columns)
 * - Book must exist in main tab
 */
function approveSelectedCell() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();

  // Validate: must be in staging tab
  if (sheet.getName() !== CONFIG.STAGING_TAB) {
    SpreadsheetApp.getUi().alert(
      'Error: Wrong Tab\n\n' +
      'Please select a cell in the "' + CONFIG.STAGING_TAB + '" tab.\n' +
      'Current tab: ' + sheet.getName()
    );
    return;
  }

  // Validate: exactly one cell selected
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) {
    SpreadsheetApp.getUi().alert(
      'Error: Invalid Selection\n\n' +
      'Please select exactly ONE cell containing a bookstore link.\n' +
      'Currently selected: ' + range.getNumRows() + ' rows × ' + range.getNumColumns() + ' columns'
    );
    return;
  }

  const row = range.getRow();
  const column = range.getColumn();

  // Validate: not header row
  if (row === 1) {
    SpreadsheetApp.getUi().alert(
      'Error: Header Row Selected\n\n' +
      'Please select a cell in a data row (not the header row).'
    );
    return;
  }

  // Get headers to identify columns
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columnName = headers[column - 1]; // Convert 1-based to 0-based

  // Validate: must be a bookstore column
  if (!CONFIG.BOOKSTORES.includes(columnName)) {
    SpreadsheetApp.getUi().alert(
      'Error: Not a Bookstore Column\n\n' +
      'Selected column: ' + columnName + '\n\n' +
      'Please select a cell in one of these bookstore columns:\n' +
      CONFIG.BOOKSTORES.join(', ')
    );
    return;
  }

  // Get book title from the same row
  const titleColumnIndex = findTitleColumnIndex(headers);
  if (titleColumnIndex === -1) {
    SpreadsheetApp.getUi().alert(
      'Error: Title Column Not Found\n\n' +
      'Could not find a column named "書名" or "Title" in the staging tab.'
    );
    return;
  }

  const title = sheet.getRange(row, titleColumnIndex + 1).getValue();
  if (!title || !title.toString().trim()) {
    SpreadsheetApp.getUi().alert(
      'Error: Missing Title\n\n' +
      'The selected row does not have a book title. Cannot proceed with approval.'
    );
    return;
  }

  // Get the link value to approve
  const linkValue = range.getValue();
  if (!linkValue || !linkValue.toString().trim()) {
    SpreadsheetApp.getUi().alert(
      'Error: Empty Cell\n\n' +
      'The selected cell is empty. There is no link to approve.'
    );
    return;
  }

  // Execute approval
  try {
    const result = mergeSingleLink(title.toString().trim(), columnName, linkValue.toString().trim());

    if (result.success) {
      SpreadsheetApp.getUi().alert(
        'Success!\n\n' +
        'Book: ' + title + '\n' +
        'Bookstore: ' + columnName + '\n' +
        'Action: ' + result.message
      );
    } else {
      SpreadsheetApp.getUi().alert(
        'Error\n\n' + result.error
      );
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Unexpected Error\n\n' + error.message
    );
  }
}

/**
 * Approve all links for one or more books (row-level approval)
 *
 * Usage:
 * 1. Select one or more rows in the staging tab (select the row numbers)
 * 2. Click "Book Links" → "Approve Selected Row(s)"
 * 3. All links in the selected rows will be copied to main tab
 *
 * Validation:
 * - Must be in staging tab
 * - Must select one or more complete rows
 * - Cannot include header row
 * - Each book must exist in main tab
 */
function approveSelectedRows() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();

  // Validate: must be in staging tab
  if (sheet.getName() !== CONFIG.STAGING_TAB) {
    SpreadsheetApp.getUi().alert(
      'Error: Wrong Tab\n\n' +
      'Please select rows in the "' + CONFIG.STAGING_TAB + '" tab.\n' +
      'Current tab: ' + sheet.getName()
    );
    return;
  }

  const startRow = range.getRow();
  const numRows = range.getNumRows();

  // Validate: not header row
  if (startRow === 1) {
    SpreadsheetApp.getUi().alert(
      'Error: Header Row Selected\n\n' +
      'Please select data rows only (not the header row).\n' +
      'Start from row 2 or later.'
    );
    return;
  }

  // Get headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const titleColumnIndex = findTitleColumnIndex(headers);

  if (titleColumnIndex === -1) {
    SpreadsheetApp.getUi().alert(
      'Error: Title Column Not Found\n\n' +
      'Could not find a column named "書名" or "Title" in the staging tab.'
    );
    return;
  }

  // Get bookstore column indices
  const bookstoreColumns = {};
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (CONFIG.BOOKSTORES.includes(header)) {
      bookstoreColumns[header] = i;
    }
  }

  // Process each selected row
  const results = {
    total: 0,
    approved: 0,
    skipped: 0,
    errors: []
  };

  for (let i = 0; i < numRows; i++) {
    const rowIndex = startRow + i;
    const rowData = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

    const title = rowData[titleColumnIndex];
    if (!title || !title.toString().trim()) {
      // Skip rows without title
      continue;
    }

    results.total++;

    // Extract all bookstore links from this row
    const links = {};
    for (const bookstore in bookstoreColumns) {
      const columnIndex = bookstoreColumns[bookstore];
      const value = rowData[columnIndex];
      if (value && value.toString().trim()) {
        links[bookstore] = value.toString().trim();
      }
    }

    // Merge all links for this book
    try {
      const result = mergeAllLinks(title.toString().trim(), links);

      if (result.success) {
        results.approved++;
      } else {
        results.skipped++;
        results.errors.push(title + ': ' + result.error);
      }
    } catch (error) {
      results.skipped++;
      results.errors.push(title + ': ' + error.message);
    }
  }

  // Show summary
  let message = 'Approval Summary\n\n';
  message += 'Total books processed: ' + results.total + '\n';
  message += 'Successfully approved: ' + results.approved + '\n';
  message += 'Skipped/Errors: ' + results.skipped + '\n';

  if (results.errors.length > 0) {
    message += '\nErrors:\n';
    message += results.errors.join('\n');
  }

  SpreadsheetApp.getUi().alert(message);
}

// ============================================================================
// CORE MERGE FUNCTIONS
// ============================================================================

/**
 * Merge a single bookstore link to the main tab
 *
 * @param {string} title - Book title
 * @param {string} bookstore - Bookstore column name (e.g., "博客來")
 * @param {string} linkValue - The URL to merge
 * @returns {Object} Result with success flag and message
 */
function mergeSingleLink(title, bookstore, linkValue) {
  // Find book in main tab
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MAIN_TAB);
  if (!mainSheet) {
    return {
      success: false,
      error: 'Main tab "' + CONFIG.MAIN_TAB + '" not found in this spreadsheet.'
    };
  }

  const bookInMain = findBookInMainTab(title, mainSheet);
  if (!bookInMain) {
    return {
      success: false,
      error: 'Book "' + title + '" not found in main tab "' + CONFIG.MAIN_TAB + '".\n\n' +
             'Books must exist in the main tab before links can be approved.'
    };
  }

  const { rowIndex, headers } = bookInMain;

  // Find bookstore column in main tab
  const bookstoreColumnIndex = headers.indexOf(bookstore);
  if (bookstoreColumnIndex === -1) {
    return {
      success: false,
      error: 'Bookstore column "' + bookstore + '" not found in main tab.'
    };
  }

  // Check current value in main tab
  const currentValue = mainSheet.getRange(rowIndex, bookstoreColumnIndex + 1).getValue();
  const currentValueStr = currentValue ? currentValue.toString().trim() : '';

  // Rule: Only update if empty or "NOT_FOUND"
  if (currentValueStr && currentValueStr !== 'NOT_FOUND') {
    return {
      success: true,
      message: 'No update needed - cell already has a value: ' + currentValueStr
    };
  }

  // Write the new value
  mainSheet.getRange(rowIndex, bookstoreColumnIndex + 1).setValue(linkValue);

  return {
    success: true,
    message: 'Link approved and copied to main tab'
  };
}

/**
 * Merge all bookstore links for a book to the main tab
 *
 * @param {string} title - Book title
 * @param {Object} links - Object mapping bookstore names to URLs
 * @returns {Object} Result with success flag and message
 */
function mergeAllLinks(title, links) {
  // Find book in main tab
  const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MAIN_TAB);
  if (!mainSheet) {
    return {
      success: false,
      error: 'Main tab "' + CONFIG.MAIN_TAB + '" not found in this spreadsheet.'
    };
  }

  const bookInMain = findBookInMainTab(title, mainSheet);
  if (!bookInMain) {
    return {
      success: false,
      error: 'Book "' + title + '" not found in main tab.'
    };
  }

  const { rowIndex, headers } = bookInMain;

  let updatedCount = 0;

  // Merge each bookstore link
  for (const bookstore in links) {
    const linkValue = links[bookstore];

    // Find bookstore column
    const bookstoreColumnIndex = headers.indexOf(bookstore);
    if (bookstoreColumnIndex === -1) {
      // Column doesn't exist in main tab - skip
      continue;
    }

    // Check current value
    const currentValue = mainSheet.getRange(rowIndex, bookstoreColumnIndex + 1).getValue();
    const currentValueStr = currentValue ? currentValue.toString().trim() : '';

    // Rule: Only update if empty or "NOT_FOUND"
    if (!currentValueStr || currentValueStr === 'NOT_FOUND') {
      mainSheet.getRange(rowIndex, bookstoreColumnIndex + 1).setValue(linkValue);
      updatedCount++;
    }
  }

  return {
    success: true,
    updatedCount: updatedCount,
    message: 'Merged ' + updatedCount + ' link(s) to main tab'
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find a book in the main tab by title
 *
 * @param {string} title - Book title to search for
 * @param {Sheet} mainSheet - The main sheet object
 * @returns {Object|null} Object with rowIndex and headers, or null if not found
 */
function findBookInMainTab(title, mainSheet) {
  const data = mainSheet.getDataRange().getValues();

  if (!data || data.length === 0) {
    return null;
  }

  // Get headers (first row)
  const headers = data[0];
  const titleColumnIndex = findTitleColumnIndex(headers);

  if (titleColumnIndex === -1) {
    return null;
  }

  // Search for title (case-insensitive, trimmed)
  const searchTitle = title.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cellValue = row[titleColumnIndex];

    if (cellValue && cellValue.toString().trim().toLowerCase() === searchTitle) {
      return {
        rowIndex: i + 1, // Convert 0-based array index to 1-based sheet row
        headers: headers,
        rowData: row
      };
    }
  }

  return null;
}

/**
 * Find the title column index in the headers array
 *
 * @param {Array} headers - Array of column headers
 * @returns {number} Zero-based column index, or -1 if not found
 */
function findTitleColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && (
      header.toString().toLowerCase().includes('title') ||
      header.toString().includes('書名') ||
      header.toString() === 'Title'
    )) {
      return i;
    }
  }
  return -1;
}

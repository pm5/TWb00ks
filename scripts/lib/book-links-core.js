/**
 * Core CLI Logic for Book Links Management
 * High-level operations for reading, writing, and merging bookstore links
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAllLinks } from './link-generator.js';
import { columnIndexToLetter, findRowByTitle, getColumnIndex, readSheetTab, writeSheetRange } from './sheets-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '../bookstores.config.json');

let cachedConfig = null;

/**
 * Load configuration from bookstores.config.json
 * @returns {Object} Configuration object with sheetId, tabNames, searchEngine, and bookstores
 * @throws {Error} If config file doesn't exist or is invalid
 */
export function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `Configuration file not found at: ${CONFIG_PATH}\n` +
        `Please ensure bookstores.config.json exists in the scripts directory.`,
    );
  }

  try {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configContent);

    // Validate required fields
    if (!config.sheetId) {
      throw new Error('Configuration missing required field: sheetId');
    }
    if (!config.stagingTabName) {
      throw new Error('Configuration missing required field: stagingTabName');
    }
    if (!config.mainTabName) {
      throw new Error('Configuration missing required field: mainTabName');
    }
    if (!config.searchEngine) {
      throw new Error('Configuration missing required field: searchEngine');
    }
    if (!Array.isArray(config.bookstores) || config.bookstores.length === 0) {
      throw new Error('Configuration missing required field: bookstores (must be non-empty array)');
    }

    cachedConfig = config;
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse configuration file: ${error.message}\n` + `Please ensure ${CONFIG_PATH} contains valid JSON.`,
      );
    }
    throw error;
  }
}

/**
 * Get all books from the staging area (暫貼區)
 * @returns {Promise<Array<Object>>} Array of book objects with rowIndex, title, and links
 * @throws {Error} If sheet read fails or structure is invalid
 */
export async function readStagingArea() {
  const config = loadConfig();
  const data = await readSheetTab(config.sheetId, config.stagingTabName);

  if (!data || data.length === 0) {
    return [];
  }

  const headers = data[0];

  // Find title column
  const titleColumnIndex = headers.findIndex(
    (header) => header && (header.toLowerCase().includes('title') || header.includes('書名') || header === 'Title'),
  );

  if (titleColumnIndex === -1) {
    throw new Error(
      `Could not find Title column in staging area "${config.stagingTabName}".\n` +
        `Available headers: ${headers.join(', ')}`,
    );
  }

  // Map bookstore column names to indices
  const bookstoreColumns = {};
  for (const bookstore of config.bookstores) {
    const columnIndex = getColumnIndex(headers, bookstore.columnName);
    if (columnIndex !== -1) {
      bookstoreColumns[bookstore.id] = columnIndex;
    }
  }

  // Build book objects
  const books = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const title = row[titleColumnIndex];

    // Skip rows without a title
    if (!title || !title.trim()) {
      continue;
    }

    // Extract links for each bookstore
    const links = {};
    for (const bookstore of config.bookstores) {
      const columnIndex = bookstoreColumns[bookstore.id];
      if (columnIndex !== undefined) {
        links[bookstore.id] = row[columnIndex] || '';
      } else {
        // Column doesn't exist in sheet
        links[bookstore.id] = '';
      }
    }

    books.push({
      rowIndex: i + 1, // Convert 0-based array index to 1-based sheet row
      title: title.trim(),
      links: links,
    });
  }

  return books;
}

/**
 * Write bookstore links to a specific row in the staging area
 * @param {number} rowIndex - 1-based row index in the sheet
 * @param {Object} links - Object mapping bookstore IDs to URLs
 * @returns {Promise<Object>} Update result with updatedCells count
 * @throws {Error} If write fails or rowIndex is invalid
 */
export async function writeStagingLinks(rowIndex, links) {
  if (!rowIndex || rowIndex < 2) {
    throw new Error(`Invalid rowIndex: ${rowIndex}. Must be >= 2 (row 1 is headers).`);
  }

  const config = loadConfig();
  const data = await readSheetTab(config.sheetId, config.stagingTabName);

  if (!data || data.length === 0) {
    throw new Error(`Staging area "${config.stagingTabName}" is empty.`);
  }

  const headers = data[0];

  // Build array of values to write for each bookstore column
  const updates = [];

  for (const bookstore of config.bookstores) {
    const columnIndex = getColumnIndex(headers, bookstore.columnName);

    if (columnIndex === -1) {
      // Column doesn't exist in sheet - skip
      continue;
    }

    const columnLetter = columnIndexToLetter(columnIndex);
    const range = `${columnLetter}${rowIndex}`;
    const value = links[bookstore.id] || '';

    updates.push({
      range: range,
      value: value,
    });
  }

  // Write all updates (batch them into single call for efficiency)
  if (updates.length === 0) {
    return { updatedCells: 0 };
  }

  // For now, write them one by one (could optimize with batchUpdate later)
  let totalUpdated = 0;
  for (const update of updates) {
    const result = await writeSheetRange(config.sheetId, config.stagingTabName, update.range, [[update.value]]);
    totalUpdated += result.updatedCells;
  }

  return { updatedCells: totalUpdated };
}

/**
 * Find a book in the main tab by title
 * @param {string} title - Book title to search for
 * @returns {Promise<Object|null>} Object with rowIndex and rowData, or null if not found
 * @throws {Error} If sheet read fails
 */
export async function findBookInMain(title) {
  const config = loadConfig();
  return await findRowByTitle(config.sheetId, config.mainTabName, title);
}

/**
 * Merge bookstore links from staging to main tab with validation
 * Critical rules:
 * 1. Only update empty fields or "NOT_FOUND"
 * 2. Never overwrite existing links
 * 3. Book must exist in main tab (error if not)
 *
 * @param {string} title - Book title to merge
 * @param {Object} links - Object mapping bookstore IDs to URLs
 * @returns {Promise<Object>} Result object with success status and details
 */
export async function mergeLinksToMain(title, links) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('Title parameter must be a non-empty string');
  }

  if (!links || typeof links !== 'object') {
    throw new Error('Links parameter must be an object');
  }

  const config = loadConfig();

  // Rule 2: Validate book exists in main tab
  const bookInMain = await findBookInMain(title);

  if (!bookInMain) {
    return {
      success: false,
      error: `Book "${title}" not found in main tab "${config.mainTabName}". Cannot merge links.`,
      updatedCells: 0,
    };
  }

  const { rowIndex, rowData, headers } = bookInMain;

  // Determine which fields to update based on Rule 1
  const updates = [];

  for (const bookstore of config.bookstores) {
    const columnIndex = getColumnIndex(headers, bookstore.columnName);

    if (columnIndex === -1) {
      // Column doesn't exist in main tab - skip
      continue;
    }

    const currentValue = (rowData[columnIndex] || '').trim();
    const newValue = (links[bookstore.id] || '').trim();

    // Rule 1: Only update if current value is empty or "NOT_FOUND", and new value is a real link
    const shouldUpdate = (!currentValue || currentValue === 'NOT_FOUND') && newValue && newValue !== 'NOT_FOUND';

    if (shouldUpdate) {
      const columnLetter = columnIndexToLetter(columnIndex);
      const range = `${columnLetter}${rowIndex}`;

      updates.push({
        range: range,
        value: newValue,
        bookstoreId: bookstore.id,
      });
    }
  }

  // Write updates
  if (updates.length === 0) {
    return {
      success: true,
      updatedCells: 0,
      message: `No updates needed for "${title}" - all fields already populated.`,
    };
  }

  let totalUpdated = 0;
  for (const update of updates) {
    const result = await writeSheetRange(config.sheetId, config.mainTabName, update.range, [[update.value]]);
    totalUpdated += result.updatedCells;
  }

  return {
    success: true,
    updatedCells: totalUpdated,
    message: `Successfully merged ${totalUpdated} link(s) to "${title}" in main tab.`,
  };
}

/**
 * Read all bookstore links from the main tab
 * Returns a map of title -> { bookstoreId: url }
 * @returns {Promise<Object>} Map of book titles to their links in main tab
 */
export async function readMainTabLinks() {
  const config = loadConfig();
  const data = await readSheetTab(config.sheetId, config.mainTabName);

  if (!data || data.length === 0) return {};

  const headers = data[0];

  const titleColumnIndex = headers.findIndex(
    (header) => header && (header.toLowerCase().includes('title') || header.includes('書名') || header === 'Title'),
  );

  if (titleColumnIndex === -1) return {};

  const bookstoreColumns = {};
  for (const bookstore of config.bookstores) {
    const columnIndex = getColumnIndex(headers, bookstore.columnName);
    if (columnIndex !== -1) {
      bookstoreColumns[bookstore.id] = columnIndex;
    }
  }

  const result = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const title = row[titleColumnIndex];
    if (!title || !title.trim()) continue;

    const links = {};
    for (const bookstore of config.bookstores) {
      const columnIndex = bookstoreColumns[bookstore.id];
      if (columnIndex !== undefined) {
        links[bookstore.id] = row[columnIndex] || '';
      }
    }
    result[title.trim()] = links;
  }

  return result;
}

/**
 * Generate missing links for a book
 * Only generates links for bookstores where:
 * - The value is empty/missing OR "NOT_FOUND" in staging, AND
 * - The value is empty/missing OR "NOT_FOUND" in the main tab
 *
 * @param {Object} book - Book object with title and links
 * @param {string} book.title - Book title
 * @param {Object} book.links - Current links object from staging
 * @param {Object} mainTabLinks - Map of title -> { bookstoreId: url } from main tab
 * @returns {Promise<Object>} Object with new/updated links
 */
export async function generateMissingLinks(book, mainTabLinks = {}) {
  if (!book || !book.title) {
    throw new Error('Book object must have a title property');
  }

  const config = loadConfig();
  const { title, links } = book;
  const mainLinks = mainTabLinks[title] || {};

  // Identify which bookstores need link generation
  const bookstoresToGenerate = config.bookstores.filter((bookstore) => {
    const stagingValue = (links[bookstore.id] || '').trim();
    const mainValue = (mainLinks[bookstore.id] || '').trim();
    const stagingPopulated = stagingValue && stagingValue !== 'NOT_FOUND';
    const mainPopulated = mainValue && mainValue !== 'NOT_FOUND';
    return !stagingPopulated && !mainPopulated;
  });

  if (bookstoresToGenerate.length === 0) {
    // All links already present
    return links;
  }

  // Generate links for missing bookstores
  const generatedLinks = await generateAllLinks(title, bookstoresToGenerate, config.searchEngine);

  // Merge generated links with existing links
  const updatedLinks = { ...links };
  for (const [bookstoreId, url] of Object.entries(generatedLinks)) {
    updatedLinks[bookstoreId] = url;
  }

  return updatedLinks;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfigCache() {
  cachedConfig = null;
}

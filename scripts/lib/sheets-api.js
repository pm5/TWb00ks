import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_PATH = path.join(__dirname, '../.credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheetsClient = null;
let authClient = null;

/**
 * Initialize the Google Sheets API client with service account credentials
 * @returns {Promise<Object>} Initialized sheets API client
 * @throws {Error} If credentials file doesn't exist or is invalid
 */
export async function initSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  // Check if credentials file exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Credentials file not found at: ${CREDENTIALS_PATH}\n\n` +
      `Setup instructions:\n` +
      `1. Copy the example credentials file:\n` +
      `   cp scripts/.credentials.json.example scripts/.credentials.json\n\n` +
      `2. Create a Google Cloud service account:\n` +
      `   - Go to https://console.cloud.google.com/\n` +
      `   - Create a new project or select an existing one\n` +
      `   - Enable the Google Sheets API\n` +
      `   - Create a service account under IAM & Admin > Service Accounts\n` +
      `   - Create and download a JSON key for the service account\n\n` +
      `3. Copy the service account credentials into scripts/.credentials.json\n\n` +
      `4. Share your Google Sheet with the service account email:\n` +
      `   - Open your Google Sheet\n` +
      `   - Click "Share" and add the service account email (found in the credentials file)\n` +
      `   - Give it "Editor" permissions\n`
    );
  }

  // Read and parse credentials
  let credentials;
  try {
    const credentialsContent = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    credentials = JSON.parse(credentialsContent);
  } catch (error) {
    throw new Error(
      `Failed to read or parse credentials file: ${error.message}\n` +
      `Please ensure ${CREDENTIALS_PATH} contains valid JSON.`
    );
  }

  // Validate credentials structure
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error(
      `Invalid credentials file. Missing required fields: client_email or private_key.\n` +
      `Please ensure your credentials file is a valid service account JSON key.`
    );
  }

  // Initialize auth client
  try {
    authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    const client = await authClient.getClient();

    sheetsClient = google.sheets({ version: 'v4', auth: client });

    return sheetsClient;
  } catch (error) {
    throw new Error(
      `Failed to initialize Google Sheets client: ${error.message}\n` +
      `Please check your credentials and ensure the Google Sheets API is enabled.`
    );
  }
}

/**
 * Read data from a specific sheet tab and range
 * @param {string} sheetId - The Google Sheet ID
 * @param {string} tabName - The name of the tab/sheet
 * @param {string} range - The A1 notation range (e.g., "A1:Z100")
 * @returns {Promise<Array<Array<string>>>} 2D array of cell values
 * @throws {Error} If sheet/tab not found or API error occurs
 */
export async function readSheetTab(sheetId, tabName, range) {
  const sheets = await initSheetsClient();

  const fullRange = range ? `${tabName}!${range}` : tabName;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: fullRange,
    });

    return response.data.values || [];
  } catch (error) {
    if (error.code === 404) {
      throw new Error(
        `Sheet tab "${tabName}" not found in spreadsheet.\n` +
        `Please check that the tab name is correct and the sheet is shared with the service account.`
      );
    }

    if (error.code === 403) {
      throw new Error(
        `Permission denied accessing the sheet.\n` +
        `Please ensure the sheet is shared with the service account email: ${authClient?.email || 'unknown'}`
      );
    }

    if (error.code === 429) {
      throw new Error(
        `Rate limit exceeded. Please wait a moment and try again.`
      );
    }

    if (error.message && error.message.includes('ETIMEDOUT')) {
      throw new Error(
        `Network timeout while accessing Google Sheets. Please check your internet connection and try again.`
      );
    }

    throw new Error(
      `Failed to read from sheet: ${error.message}`
    );
  }
}

/**
 * Write data to a specific sheet tab and range
 * @param {string} sheetId - The Google Sheet ID
 * @param {string} tabName - The name of the tab/sheet
 * @param {string} range - The A1 notation range (e.g., "B2:B10")
 * @param {Array<Array<string>>} values - 2D array of values to write
 * @returns {Promise<Object>} Update response with updatedCells count
 * @throws {Error} If write fails or API error occurs
 */
export async function writeSheetRange(sheetId, tabName, range, values) {
  const sheets = await initSheetsClient();

  const fullRange = `${tabName}!${range}`;

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: fullRange,
      valueInputOption: 'USER_ENTERED', // Parse formulas and formats
      requestBody: {
        values: values,
      },
    });

    return {
      updatedCells: response.data.updatedCells,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
    };
  } catch (error) {
    if (error.code === 404) {
      throw new Error(
        `Sheet tab "${tabName}" not found in spreadsheet.\n` +
        `Please check that the tab name is correct.`
      );
    }

    if (error.code === 403) {
      throw new Error(
        `Permission denied writing to the sheet.\n` +
        `Please ensure the sheet is shared with "Editor" permissions for the service account.`
      );
    }

    if (error.code === 429) {
      throw new Error(
        `Rate limit exceeded. Please wait a moment and try again.`
      );
    }

    throw new Error(
      `Failed to write to sheet: ${error.message}`
    );
  }
}

/**
 * Find a row in the sheet by matching title in the Title column
 * @param {string} sheetId - The Google Sheet ID
 * @param {string} tabName - The name of the tab/sheet
 * @param {string} title - The book title to search for
 * @returns {Promise<Object|null>} Object with rowIndex and rowData, or null if not found
 */
export async function findRowByTitle(sheetId, tabName, title) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('Title parameter must be a non-empty string');
  }

  const data = await readSheetTab(sheetId, tabName);

  if (!data || data.length === 0) {
    return null;
  }

  // Assume first row is headers
  const headers = data[0];
  const titleColumnIndex = headers.findIndex(
    header => header && (
      header.toLowerCase().includes('title') ||
      header.includes('書名') ||
      header === 'Title'
    )
  );

  if (titleColumnIndex === -1) {
    throw new Error(
      `Could not find Title column in sheet "${tabName}".\n` +
      `Available headers: ${headers.join(', ')}`
    );
  }

  // Search for the title (case-insensitive, trimmed)
  const searchTitle = title.trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cellValue = row[titleColumnIndex];

    if (cellValue && cellValue.trim().toLowerCase() === searchTitle) {
      return {
        rowIndex: i + 1, // Convert 0-based array index to 1-based sheet row (accounting for header row)
        rowData: row,
        headers: headers,
      };
    }
  }

  return null;
}

/**
 * Get the index of a column by its name from the headers row
 * @param {Array<string>} headers - Array of column headers
 * @param {string} columnName - The column name to find
 * @returns {number} Zero-based column index, or -1 if not found
 */
export function getColumnIndex(headers, columnName) {
  if (!headers || !Array.isArray(headers)) {
    return -1;
  }

  return headers.findIndex(header =>
    header && header.trim() === columnName.trim()
  );
}

/**
 * Convert a zero-based column index to A1 notation letter
 * @param {number} index - Zero-based column index (0 = A, 1 = B, etc.)
 * @returns {string} Column letter(s) in A1 notation (e.g., "A", "Z", "AA")
 */
export function columnIndexToLetter(index) {
  if (index < 0) {
    throw new Error(`Invalid column index: ${index}. Index must be non-negative.`);
  }

  let letter = '';
  let num = index;

  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }

  return letter;
}

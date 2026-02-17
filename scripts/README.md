# Book Links Management Tools

This directory contains tools for managing bookstore purchase links in the Taiwan democracy books collection.

## Overview

These tools help automate the process of:
1. Reading book titles from the Google Sheets "暫貼區" (staging area) tab
2. Auto-generating bookstore purchase links
3. Allowing human review of the generated links
4. Merging approved links back to the "成人書單" (main) tab

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install the required packages:
- `googleapis` - For Google Sheets API access
- `open` - For opening browser windows to review links

### 2. Configure Google Sheets API Credentials

To access Google Sheets programmatically, you need a service account:

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google Sheets API:**
   - In the Cloud Console, go to "APIs & Services" > "Library"
   - Search for "Google Sheets API" and enable it

3. **Create Service Account:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details and create

4. **Generate JSON Key:**
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key" > "JSON"
   - Download the JSON file

5. **Setup Credentials File:**
   - Copy `scripts/.credentials.json.example` to `scripts/.credentials.json`
   - Replace the contents with your downloaded JSON key file

6. **Share Sheet with Service Account:**
   - Open your Google Sheet
   - Share it with the service account email (found in the JSON file as `client_email`)
   - Grant "Editor" permissions

### 3. Configuration File

The `bookstores.config.json` file contains:

- **searchEngine**: Search engine to use for generating links (currently "google")
- **sheetId**: Google Sheets ID (already configured)
- **stagingTabName**: Name of the staging area tab ("暫貼區")
- **mainTabName**: Name of the main data tab ("成人書單")
- **bookstores**: Array of bookstore configurations

Each bookstore has:
- **id**: Unique identifier
- **name**: Display name (Chinese)
- **columnName**: Column name in Google Sheets
- **searchUrl**: URL pattern for search (use `{title}` placeholder), or `null` if no direct search

## Bookstores Configured

| ID | Name | Search URL |
|----|------|------------|
| books | 博客來 | https://search.books.com.tw/search/query/key/{title} |
| kingstone | 金石堂 | https://www.kingstone.com.tw/search/search?q={title} |
| eslite | 誠品 | https://www.eslite.com/Search?q={title} |
| momo | momo | (requires manual search) |
| kobo | Kobo | (requires manual search) |
| readmoo | Readmoo | (requires manual search) |
| taaze | 讀冊 | (requires manual search) |

## Usage

### Sync Data from Google Sheets

```bash
npm run sync
```

This command syncs book data from Google Sheets to the local `books_data.ts` file.

### Generate Bookstore Links (Coming Soon)

```bash
node scripts/generate-links.js
```

This will:
1. Read book titles from "暫貼區" tab
2. Generate search links for each bookstore
3. Open links in browser for manual verification
4. Save results back to the sheet

### Review Links (Coming Soon)

```bash
node scripts/review-links.js
```

This will:
1. Display books with generated links
2. Allow approval/rejection of each link
3. Update the staging area with review status

### Merge to Main Tab (Coming Soon)

```bash
node scripts/merge-links.js
```

This will:
1. Take approved links from "暫貼區"
2. Merge them into "成人書單" tab
3. Update existing book records with new bookstore links

## Files

- `bookstores.config.json` - Configuration file for bookstores and sheet settings
- `.credentials.json` - Google Sheets API credentials (git-ignored)
- `.credentials.json.example` - Template for credentials file
- `sync-data.js` - Existing script to sync sheet data to local files
- `README.md` - This file

## Security Notes

- **Never commit** `.credentials.json` to git (it's in `.gitignore`)
- Keep your service account credentials secure
- Share the Google Sheet only with necessary service accounts
- Rotate credentials if they are accidentally exposed

## Troubleshooting

### "Permission denied" errors
- Ensure the service account email has Editor access to the Google Sheet
- Check that Google Sheets API is enabled in your Cloud project

### "Invalid credentials" errors
- Verify `.credentials.json` is valid JSON
- Ensure the file contains the complete private key with BEGIN/END markers

### "Sheet not found" errors
- Verify the `sheetId` in `bookstores.config.json` matches your Google Sheet
- Check that tab names (`stagingTabName`, `mainTabName`) exist in the sheet

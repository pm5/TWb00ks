# Book Links CLI - Implementation Documentation

## Overview

The Book Links CLI is an interactive tool for generating and reviewing bookstore links for books in your Google Sheets database. It provides two modes of operation:

1. **Interactive Review Mode** (`npm run review-links`) - Generate links, open them in browser, and interactively approve/reject
2. **Batch Generation Mode** (`npm run find-links`) - Generate links automatically without review

## Features

### Interactive Review Mode

- Loads books with missing links from the staging area (暫貼區)
- For each book:
  - Generates missing bookstore links
  - Displays formatted output with status indicators (✓ for valid URLs, ○ for NOT_FOUND)
  - Opens all valid links simultaneously in browser tabs
  - Prompts user for approval (Y/N)
  - If approved: Saves to staging AND merges to main tab
  - If rejected: Skips to next book
- Graceful error handling (continues on failure)
- Shows comprehensive summary at end
- Supports Ctrl+C for clean interruption

### Batch Generation Mode

- Automatically generates missing links for all books
- Saves directly to staging area
- No browser opening or user interaction
- Shows progress and error summary

## Installation

The required dependencies are already in `package.json`:

```json
{
  "dependencies": {
    "googleapis": "^144.0.0",
    "@google/genai": "^1.40.0",
    "open": "^10.1.0"
  }
}
```

Run `npm install` to ensure all dependencies are installed.

## Configuration

The system uses `/app/scripts/bookstores.config.json` for configuration:

```json
{
  "searchEngine": "google",
  "sheetId": "your-sheet-id",
  "stagingTabName": "暫貼區",
  "mainTabName": "成人書單",
  "bookstores": [
    {
      "id": "books",
      "name": "博客來",
      "columnName": "博客來",
      "domain": "books.com.tw",
      "searchUrl": "https://search.books.com.tw/search/query/key/{title}"
    }
    // ... more bookstores
  ]
}
```

## Usage

### Interactive Review

```bash
npm run review-links
# or
node scripts/book-links.js review
```

**Workflow:**
1. Loads books with missing links from staging area
2. For each book:
   - Generates links for missing bookstores
   - Shows formatted output:
     ```
     📚 書名: 原子習慣
     ═══════════════════════════
     ✓ 博客來: https://books.com.tw/...
     ✓ 金石堂: https://kingstone.com.tw/...
     ○ momo: NOT_FOUND
     ```
   - Opens valid links in browser (skips empty and NOT_FOUND)
   - Waits 1.5 seconds for tabs to load
   - Prompts: "Are all links correct? (Y/N): "
   - If Y: Saves to staging + merges to main
   - If N: Skips to next book
3. Shows final summary

**Summary Output:**
```
═══════════════════════════
Review Session Complete
═══════════════════════════
✓ Approved: 5
⊘ Skipped: 2
✗ Errors: 1

Error Summary:
  1. Failed to generate links for "Book Title": timeout
```

### Batch Generation

```bash
npm run find-links
# or
node scripts/book-links.js generate
```

**Workflow:**
1. Loads books with missing links
2. For each book:
   - Generates missing links
   - Saves to staging area
   - Shows progress indicator
3. Shows final summary

**Output Example:**
```
📚 Batch Link Generation

Found 10 book(s) with missing links

[1/10] 原子習慣
  ✓ Generated and saved to staging
[2/10] 深度工作力
  ✓ Generated and saved to staging
...

═══════════════════════════
Generation Complete
═══════════════════════════
✓ Generated: 9
✗ Errors: 1
```

## Error Handling

The CLI handles errors gracefully:

1. **Link Generation Errors**: If link generation fails for a book, it shows a warning, records the error, and continues to the next book
2. **Writing Errors**: If writing to staging fails, records the error and continues
3. **Merge Errors**: If merging to main fails (e.g., book not found), shows warning but doesn't stop the process
4. **Fatal Errors**: Only exits on truly fatal errors (config not found, Google API auth failure)

**Example Error Messages:**
```
✗ Failed to generate links for "Book Title": Request timeout
⚠ Book "Book Title" not found in main tab "成人書單". Cannot merge links.
  Links saved to staging area only
```

## Implementation Details

### File Structure

```
/app/scripts/
├── book-links.js              # Main CLI script (this implementation)
├── bookstores.config.json     # Configuration file
├── lib/
│   ├── book-links-core.js     # Core operations (read, write, merge)
│   ├── link-generator.js      # Link generation logic
│   └── sheets-api.js          # Google Sheets API wrapper
└── book-links.test.js         # Unit tests
```

### Key Functions

**Main CLI Functions:**
- `reviewSession()` - Interactive review workflow
- `generateLinks()` - Batch generation workflow
- `displayBookLinks()` - Format and display book links
- `openLinksInBrowser()` - Open valid links in browser tabs
- `hasMissingLinks()` - Check if book has missing links
- `askYesNo()` - Readline prompt helper

**Core Library Functions (from book-links-core.js):**
- `loadConfig()` - Load configuration
- `readStagingArea()` - Get books from staging
- `generateMissingLinks()` - Generate missing links for a book
- `writeStagingLinks()` - Write links to staging area
- `mergeLinksToMain()` - Merge approved links to main tab

### Link Validation

The CLI only opens links that meet ALL criteria:
- ✓ Not empty/undefined
- ✓ Not equal to "NOT_FOUND"
- ✓ Starts with "http" (valid URL)

### Browser Tab Opening

Uses the `open` package to open links:
- Opens all valid links simultaneously (not sequentially)
- Catches and logs errors if opening fails
- Waits 1.5 seconds after opening for tabs to load

### Visual Design

Uses ANSI color codes for better UX:
- Blue/Cyan: Headers and informational text
- Green: Success messages (✓)
- Yellow: Warnings and skipped items (⊘)
- Red: Errors (✗)
- Gray: Dimmed text for metadata

### Ctrl+C Handling

The review session handles SIGINT gracefully:
```javascript
rl.on('SIGINT', () => {
  console.log('\n⚠ Review interrupted by user');
  console.log(`Summary: ${approved} approved, ${skipped} skipped, ${errors} errors`);
  rl.close();
  process.exit(0);
});
```

## Testing

Run the test suite:

```bash
node scripts/book-links.test.js
```

**Tests:**
1. Show usage when no command provided
2. Invalid command shows usage
3. Script structure validation (checks for required functions and imports)

## Integration with Existing System

The CLI integrates with the existing book links system:

1. **Uses existing core library** (`book-links-core.js`)
2. **Follows existing patterns** (config loading, staging/main workflow)
3. **Respects merge rules**:
   - Only updates empty fields or "NOT_FOUND" in main tab
   - Never overwrites existing links
   - Requires book to exist in main tab

## Troubleshooting

### "Configuration file not found"
- Ensure `/app/scripts/bookstores.config.json` exists
- Check file permissions

### "Authentication error"
- Ensure Google API credentials are set up
- Check `credentials.json` and `token.json` exist

### "No books with missing links found"
- Verify staging area has books with empty link fields
- Check that column names in config match sheet headers

### Browser doesn't open
- Check that `open` package is installed
- Verify you're in a graphical environment (not headless server)

## Future Enhancements

Potential improvements:
1. Progress bar during link generation
2. Configurable delay between browser tab opens
3. Export results to JSON/CSV
4. Undo last approval
5. Batch review multiple books before saving
6. Custom filters (by author, date added, etc.)

## License

This is part of the 民主富二代補課小站 project.

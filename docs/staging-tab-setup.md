# 暫貼區 Tab Setup Guide

This guide explains how to set up the staging area tab (暫貼區) in your Google Sheets spreadsheet for the book links collection system.

## Overview

The 暫貼區 (Staging Area) is a temporary workspace where:
1. You add book titles that need bookstore links
2. The CLI tool auto-generates links for review
3. You review and approve links before merging to the main book list

This tab acts as a safe sandbox that prevents accidental modifications to your main book database.

## Prerequisites

- A Google Sheets spreadsheet containing your book data
- The spreadsheet should already have a main books tab (成人書單)
- The main tab must include the same bookstore link columns

## Tab Structure

### Required Columns

The 暫貼區 tab must have exactly these columns in this order:

| Column | Name | Description |
|--------|------|-------------|
| A | 書名 | Book title (required, must match title in main tab) |
| B | 博客來 | Books.com.tw purchase link |
| C | 金石堂 | Kingstone purchase link |
| D | 誠品 | Eslite purchase link |
| E | momo | Momo purchase link |
| F | Kobo | Kobo purchase link |
| G | readmoo | Readmoo purchase link |
| H | tazze | Taaze (讀冊) purchase link |

### Column Order

**IMPORTANT:** The column order must match exactly as shown above. The CLI and AppScript tools rely on this structure to correctly identify and process bookstore links.

## Setup Instructions

### Option 1: Manual Creation

1. **Open your Google Sheets spreadsheet**

2. **Create a new tab:**
   - Right-click on any existing tab
   - Select "Insert new sheet"
   - Name it exactly: `暫貼區` (no spaces, exact characters)

3. **Add column headers:**
   - In row 1, add the following headers in order:
   - A1: `書名`
   - B1: `博客來`
   - C1: `金石堂`
   - D1: `誠品`
   - E1: `momo`
   - F1: `Kobo`
   - G1: `readmoo`
   - H1: `tazze`

4. **Format the tab (optional but recommended):**
   - Select row 1 (header row)
   - Make it bold
   - Add background color (light gray)
   - Freeze the header row: View → Freeze → 1 row

5. **Set column widths (optional):**
   - Column A (書名): ~200-300 pixels
   - Columns B-H (links): ~150-200 pixels each

### Option 2: Copy Existing Structure

If you already have bookstore link columns in your main tab:

1. **Go to your main tab (成人書單)**

2. **Select the title and link columns:**
   - Select from the 書名 column through all bookstore columns
   - Include the header row

3. **Copy column structure:**
   - Right-click → Copy (or Ctrl+C / Cmd+C)

4. **Create new tab:**
   - Click the "+" button at the bottom to add a new sheet
   - Name it exactly: `暫貼區`

5. **Paste headers only:**
   - Click on cell A1
   - Right-click → Paste special → Values only
   - Delete all data rows, keep only the header row

## Validation

After setup, verify your tab meets these criteria:

- [ ] Tab name is exactly `暫貼區` (Chinese characters, no typos)
- [ ] Row 1 contains column headers
- [ ] Column A is `書名`
- [ ] Columns B-H are bookstore names in the correct order
- [ ] No extra columns before or between the required columns
- [ ] Tab is shared with your Google Sheets API service account (if using CLI)

## Usage Workflow

### Adding Books for Link Generation

1. **In the 暫貼區 tab, add book titles:**
   - Enter each book title in column A (書名)
   - Make sure the title exactly matches the title in your main tab
   - Leave the bookstore columns empty (CLI will fill them)

Example:
```
| 書名           | 博客來 | 金石堂 | 誠品 | momo | Kobo | readmoo | tazze |
|----------------|--------|--------|------|------|------|---------|-------|
| 民主台灣        |        |        |      |      |      |         |       |
| 轉型正義之路    |        |        |      |      |      |         |       |
```

2. **Run the CLI tool to generate links:**
   ```bash
   npm run review-links
   ```

3. **Review and approve:**
   - The tool will open browser tabs for each bookstore
   - Verify the links are correct
   - Type `Y` to approve or `N` to skip

4. **Check results:**
   - Approved links appear in both 暫貼區 and the main tab
   - Existing links in the main tab are never overwritten

### Alternative: AppScript Workflow

If you prefer working directly in the spreadsheet:

1. **Manually fill bookstore links:**
   - Search each bookstore and paste product page URLs
   - Or use the CLI's `find-links` command to auto-generate links

2. **Use the custom menu to approve:**
   - Select a cell or row
   - Click **Book Links** → **Approve Selected Cell** or **Approve Selected Row(s)**
   - The AppScript will merge links to the main tab

## Data Rules

### Critical Rules

1. **Book Must Exist in Main Tab**
   - Every book in 暫貼區 must already exist in 成人書單
   - Match must be by exact title (case-sensitive)
   - If book is not found, links cannot be approved

2. **Never Overwrite Existing Links**
   - When merging to main tab, existing links are preserved
   - Only empty cells or cells with "NOT_FOUND" are updated
   - This protects manually curated links

3. **Partial Updates Allowed**
   - You can approve individual bookstore links (cell-level)
   - You don't need all bookstore links to approve a book
   - Missing links remain empty (can be filled later)

### Link Value Rules

- **Valid URLs**: Must be full product page URLs
- **"NOT_FOUND"**: Indicates no product found at that bookstore
- **Empty cells**: Links not yet searched or generated
- **Invalid values**: Any other text is treated as a link (be careful!)

## Example Data

### Before Link Generation

```
| 書名                    | 博客來 | 金石堂 | 誠品 | momo | Kobo | readmoo | tazze |
|-------------------------|--------|--------|------|------|------|---------|-------|
| 無法送達的遺書          |        |        |      |      |      |         |       |
| 牽阮的手                |        |        |      |      |      |         |       |
```

### After Link Generation (via CLI)

```
| 書名                    | 博客來                                    | 金石堂                                  | 誠品   | momo | Kobo | readmoo | tazze |
|-------------------------|------------------------------------------|-----------------------------------------|--------|------|------|---------|-------|
| 無法送達的遺書          | https://www.books.com.tw/products/...    | https://www.kingstone.com.tw/basic/...  | ...    | ...  | ...  | ...     | ...   |
| 牽阮的手                | https://www.books.com.tw/products/...    | NOT_FOUND                               | ...    | ...  | ...  | ...     | ...   |
```

### After Approval and Merge

- Links are copied from 暫貼區 to the main tab (成人書單)
- You can clear the 暫貼區 rows to process new books
- Or keep them for reference (they won't be re-merged)

## Troubleshooting

### Error: "Book not found in main tab"

**Cause:** The book title in 暫貼區 doesn't match any title in 成人書單

**Solutions:**
- Check for typos in the title
- Ensure title is exactly the same (case-sensitive)
- Add the book to the main tab first, then approve links

### Error: "Wrong Tab"

**Cause:** Trying to approve links from the wrong tab

**Solution:** Make sure you're in the 暫貼區 tab, not the main tab

### Links Not Generating

**Cause:** CLI tool can't find the tab or column structure is wrong

**Solutions:**
- Verify tab name is exactly `暫貼區`
- Check column headers match required names
- Ensure no extra columns or incorrect order

### Service Account Access Issues

**Cause:** CLI tool can't read/write to the spreadsheet

**Solutions:**
- Share the spreadsheet with your service account email (found in `.credentials.json`)
- Grant "Editor" permissions
- Verify Google Sheets API is enabled in your Cloud project

## Maintenance

### Cleaning Up

Periodically clear processed books from 暫貼區:
1. Select rows with approved links
2. Right-click → Delete rows
3. Or clear content to reuse rows for new books

### Re-processing Books

If you need to update links for existing books:
1. Add the book title to 暫貼區 again
2. Run `npm run review-links`
3. Links will only fill empty cells in the main tab (existing links preserved)

## Advanced Configuration

If you need to use different tab or column names, update:

1. **CLI configuration:** `scripts/bookstores.config.json`
   ```json
   {
     "stagingTabName": "Your Custom Name",
     "mainTabName": "Your Main Tab Name"
   }
   ```

2. **AppScript configuration:** `appscript/approve-links.gs`
   ```javascript
   const CONFIG = {
     STAGING_TAB: 'Your Custom Name',
     MAIN_TAB: 'Your Main Tab Name',
     BOOKSTORES: ['博客來', '金石堂', '誠品', 'momo', 'Kobo', 'readmoo', 'tazze']
   };
   ```

**Important:** Keep tab names consistent between CLI config and AppScript config!

## Next Steps

After setting up the 暫貼區 tab:

1. **Configure the CLI:** See [scripts/README.md](/scripts/README.md) for Google Sheets API setup
2. **Deploy the AppScript:** See [appscript/README.md](/appscript/README.md) for deployment instructions
3. **Start adding books:** Add book titles to 暫貼區 and run `npm run review-links`
4. **Test the workflow:** See [docs/plans/2026-02-17-book-links-testing.md](/docs/plans/2026-02-17-book-links-testing.md) for testing checklist

## Support

For issues with:
- Tab setup: Verify column order and tab name
- CLI integration: Check [scripts/README.md](/scripts/README.md)
- AppScript: Check [appscript/README.md](/appscript/README.md)
- General questions: Refer to the main [README.md](/README.md)

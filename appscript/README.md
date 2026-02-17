# Google AppScript Deployment Guide

This guide explains how to deploy the Book Links approval AppScript to your Google Sheets spreadsheet.

## Overview

The AppScript provides a spreadsheet-native way to approve bookstore links from the staging area (暫貼區) to the main book list (成人書單). It adds a custom menu with two approval options:

1. **Approve Selected Cell** - Approve a single bookstore link (cell-level)
2. **Approve Selected Row(s)** - Approve all links for one or more books (row-level)

## Prerequisites

- A Google Sheets spreadsheet with two tabs:
  - `暫貼區` (Staging Area)
  - `成人書單` (Main Book List)
- Both tabs must have the following columns:
  - `書名` or `Title` (book title)
  - Bookstore columns: `博客來`, `金石堂`, `誠品`, `momo`, `Kobo`, `readmoo`, `tazze`

## Deployment Steps

### 1. Open the Apps Script Editor

1. Open your Google Sheets spreadsheet
2. Click **Extensions** → **Apps Script** in the menu
3. This opens the Apps Script editor in a new tab

### 2. Copy the Script Code

1. In the Apps Script editor, you'll see a file called `Code.gs`
2. Delete any existing code in that file
3. Copy the entire contents of `approve-links.gs` from this repository
4. Paste it into the `Code.gs` file in the editor

### 3. Save the Script

1. Click the **Save** icon (💾) or press `Ctrl+S` (Windows/Linux) or `Cmd+S` (Mac)
2. You may be prompted to name your project - give it a meaningful name like "Book Links Approval"

### 4. Authorize the Script

1. The script needs permission to read and write to your spreadsheet
2. Click the **Run** button (▶️) in the toolbar
3. Select `onOpen` from the function dropdown if not already selected
4. Click **Run**
5. You'll see a dialog asking for authorization:
   - Click **Review Permissions**
   - Choose your Google account
   - Click **Advanced** → **Go to [Your Project Name] (unsafe)**
   - Click **Allow**

### 5. Verify Installation

1. Go back to your Google Sheets spreadsheet
2. Refresh the page (press `F5` or reload the browser tab)
3. You should now see a new menu item called **Book Links** in the menu bar
4. Click it to see the two approval options:
   - Approve Selected Cell
   - Approve Selected Row(s)

## Usage

### Approve a Single Link (Cell-Level)

Use this when you want to approve just one bookstore link for a book:

1. Go to the `暫貼區` (staging) tab
2. Click on a single cell containing a bookstore link you want to approve
3. Click **Book Links** → **Approve Selected Cell**
4. The link will be copied to the same bookstore column in the `成人書單` tab
5. You'll see a success message confirming the approval

**Important Rules:**
- Only cells in bookstore columns can be approved (not the title column)
- The selected cell must contain a value (not be empty)
- The book must already exist in the `成人書單` tab
- The script will only update cells that are empty or contain "NOT_FOUND"
- Existing links are never overwritten

### Approve All Links (Row-Level)

Use this when you've verified all links for one or more books and want to approve them in bulk:

1. Go to the `暫貼區` (staging) tab
2. Select one or more complete rows by clicking on the row numbers
   - Example: Click row "2" to select row 2
   - Example: Click row "2" and drag to row "5" to select rows 2-5
3. Click **Book Links** → **Approve Selected Row(s)**
4. All bookstore links in the selected rows will be copied to the `成人書單` tab
5. You'll see a summary showing how many books were approved and any errors

**Important Rules:**
- Don't select the header row (row 1)
- Each row must have a book title in the `書名` column
- Each book must already exist in the `成人書單` tab
- The script will only update cells that are empty or contain "NOT_FOUND"
- Existing links are never overwritten

## Validation Rules

The AppScript enforces the same validation rules as the CLI tool:

### Rule 1: Never Overwrite Existing Links

When merging links from staging to main:
- ✅ **Empty cells** → Filled with new link
- ✅ **"NOT_FOUND" cells** → Replaced with new link
- ❌ **Cells with existing links** → Left unchanged (not overwritten)

### Rule 2: Validate Book Exists

Before any merge operation:
- The script searches for the book in the `成人書單` tab by exact title match
- If the book is not found, an error is shown and no merge occurs
- Books must be added to the main tab before their links can be approved

## Error Messages

### "Error: Wrong Tab"
You're not in the `暫貼區` tab. Switch to the staging tab before approving links.

### "Error: Invalid Selection"
For cell approval: You must select exactly one cell.
For row approval: You must select complete rows (not partial selections).

### "Error: Not a Bookstore Column"
You selected a cell that isn't in one of the bookstore columns. Make sure you're selecting from: 博客來, 金石堂, 誠品, momo, Kobo, readmoo, or tazze.

### "Error: Missing Title"
The row doesn't have a book title. Every row must have a value in the `書名` column.

### "Book not found in main tab"
The book doesn't exist in the `成人書單` tab. Add the book to the main tab first, then approve its links.

## Updating the Script

If the script code is updated in the repository:

1. Open **Extensions** → **Apps Script**
2. Select all the code in `Code.gs` and delete it
3. Copy the new code from `approve-links.gs`
4. Paste it into `Code.gs`
5. Click **Save**
6. Refresh your spreadsheet

Changes will take effect immediately.

## Troubleshooting

### Menu Doesn't Appear

- Refresh the spreadsheet page
- Make sure you ran the `onOpen` function at least once
- Check that the script was saved properly

### "Authorization Required" Message

- Follow the authorization steps in section 4 above
- You may need to authorize again if you make changes to the script

### Script Runs But Nothing Happens

- Check that your tab names match exactly: `暫貼區` and `成人書單`
- Verify that column headers match: `書名` (or `Title`) and bookstore names
- Check the Execution log in Apps Script for error messages:
  - Open **Extensions** → **Apps Script**
  - Click **Executions** in the left sidebar

### Permission Errors

If you see "Permission denied" errors:
- The script should only need access to the current spreadsheet
- If prompted for additional permissions, review carefully before granting

## Advanced Configuration

If your spreadsheet uses different tab names or column names, you can edit the `CONFIG` object at the top of the script:

```javascript
const CONFIG = {
  STAGING_TAB: '暫貼區',      // Change to your staging tab name
  MAIN_TAB: '成人書單',       // Change to your main tab name
  BOOKSTORES: ['博客來', '金石堂', '誠品', 'momo', 'Kobo', 'readmoo', 'tazze']
};
```

After making changes, click **Save** and refresh your spreadsheet.

## Support

For issues or questions:
1. Check that your spreadsheet structure matches the requirements
2. Review the error message carefully - it usually indicates what's wrong
3. Check the execution logs in Apps Script for detailed error information
4. Refer to the main project documentation for context on the book links system

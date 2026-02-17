# Book Links Tool Testing Checklist

**Date:** 2026-02-17
**Status:** Testing Phase
**Related:** [Book Links Design Doc](2026-02-16-book-links-tool-design.md)

## Overview

This document provides a comprehensive testing checklist for the book links collection and review system. The system consists of two main components:

1. **CLI Tool** (`npm run review-links`, `npm run find-links`)
2. **AppScript** (spreadsheet menu buttons)

Both components must be tested to ensure they work correctly and safely handle edge cases.

## Pre-Testing Setup

### Environment Checklist

- [ ] Google Sheets spreadsheet exists with proper structure
- [ ] Spreadsheet has both tabs: `暫貼區` and `成人書單`
- [ ] Both tabs have matching column structure (書名 + 7 bookstore columns)
- [ ] Google Sheets API credentials configured (`.credentials.json`)
- [ ] Service account has Editor access to the spreadsheet
- [ ] Node.js dependencies installed (`npm install`)
- [ ] AppScript deployed to the spreadsheet
- [ ] Test data prepared (see Test Data section below)

### Test Data Preparation

Create test books in your main tab (成人書單) with these characteristics:

1. **Book with no links:** Title only, all bookstore columns empty
2. **Book with partial links:** Has 2-3 bookstore links, rest empty
3. **Book with all links:** Has valid URLs in all bookstore columns
4. **Book with NOT_FOUND:** Has "NOT_FOUND" in 2-3 bookstore columns
5. **Book with special characters:** Title includes punctuation (e.g., "書名：副標題")
6. **Book with long title:** 30+ character title
7. **Book with English title:** For testing non-Chinese characters

## Testing Sections

## Part 1: CLI Tool Testing

### 1.1 Initial Setup

**Test: Configuration Loading**
- [ ] Config file exists: `scripts/bookstores.config.json`
- [ ] Config has correct sheetId
- [ ] Config has correct tab names
- [ ] All 7 bookstores defined in config
- [ ] Each bookstore has required fields (id, name, columnName, domain)

**Test: Authentication**
- [ ] `.credentials.json` file exists
- [ ] Credentials file is valid JSON
- [ ] Service account can access the spreadsheet
- [ ] No "Permission denied" errors

**Expected Results:**
- Config loads without errors
- Sheet API initializes successfully
- Can read from both tabs

---

### 1.2 Link Generation (`npm run find-links`)

**Test: Generate Links for Empty Book**
1. Add book with no links to 暫貼區
2. Run `npm run find-links`
3. Check results

**Expected Results:**
- [ ] Links generated for all bookstores
- [ ] Valid URLs (start with https://)
- [ ] URLs go to correct bookstore domains
- [ ] "NOT_FOUND" appears if no product found
- [ ] Links saved to 暫貼區 tab
- [ ] Main tab NOT modified (generation only writes to staging)

**Test: Generate Links for Partial Book**
1. Add book to 暫貼區 with 2 bookstores already filled
2. Run `npm run find-links`

**Expected Results:**
- [ ] Only empty bookstore columns are filled
- [ ] Existing links preserved (not regenerated)
- [ ] New links generated for missing bookstores

**Test: Search Engine Switching**
1. Set `searchEngine: "google"` in config
2. Run `npm run find-links` on a test book
3. Change to `searchEngine: "duckduckgo"`
4. Run again on another test book

**Expected Results:**
- [ ] Both search engines work
- [ ] Links are generated successfully
- [ ] No errors switching between engines

**Test: Link Generation Edge Cases**
1. Test with book title containing special characters (：、，。「」)
2. Test with very long title (50+ characters)
3. Test with English title
4. Test with title containing numbers

**Expected Results:**
- [ ] All titles handled correctly
- [ ] URLs are properly encoded
- [ ] Search finds correct products (or NOT_FOUND)

---

### 1.3 Interactive Review (`npm run review-links`)

**Test: Basic Review Flow**
1. Add 3 books to 暫貼區 (no links)
2. Run `npm run review-links`
3. For each book:
   - Verify links display in console
   - Verify browser tabs open (7 tabs per book)
   - Type `Y` to approve first book
   - Type `N` to skip second book
   - Type `Y` to approve third book

**Expected Results:**
- [ ] Book titles displayed correctly
- [ ] All 7 bookstore links shown
- [ ] ✓ symbol shown for valid URLs
- [ ] ○ symbol shown for NOT_FOUND
- [ ] Browser tabs open for valid URLs (NOT_FOUND not opened)
- [ ] Y/N prompts work correctly
- [ ] Summary shows: "2 approved, 1 skipped"

**Test: Review with Approved Links**
- [ ] Approved book links written to 暫貼區
- [ ] Approved book links merged to main tab (成人書單)
- [ ] Skipped book stays in 暫貼區 (can review later)
- [ ] Skipped book NOT merged to main tab

**Test: Ctrl+C Interrupt**
1. Run `npm run review-links`
2. Press Ctrl+C during review

**Expected Results:**
- [ ] Process exits gracefully
- [ ] No data corruption
- [ ] Partial progress saved (if any approvals before interrupt)

**Test: Review Single Book**
1. Run `npm run review-links --title="特定書名"`

**Expected Results:**
- [ ] Only specified book processed
- [ ] Other books in staging ignored
- [ ] Normal review flow applies

---

### 1.4 Merge Rules Validation

**Test: Never Overwrite Existing Links**

Setup:
- Main tab has book with these links:
  - 博客來: `https://books.com.tw/existing-link`
  - 金石堂: (empty)
  - 誠品: `https://eslite.com/existing-link`
- 暫貼區 has same book with:
  - 博客來: `https://books.com.tw/new-link` (different!)
  - 金石堂: `https://kingstone.com.tw/new-link`
  - 誠品: `https://eslite.com/new-link` (different!)

Action: Approve the book via CLI

**Expected Results:**
- [ ] 博客來: UNCHANGED (kept `existing-link`)
- [ ] 金石堂: FILLED with `new-link`
- [ ] 誠品: UNCHANGED (kept `existing-link`)
- [ ] **Rule verified:** Existing links never overwritten

**Test: Update NOT_FOUND**

Setup:
- Main tab has book with:
  - momo: `NOT_FOUND`
  - Kobo: `NOT_FOUND`
- 暫貼區 has same book with:
  - momo: `https://momoshop.com.tw/product-link`
  - Kobo: `NOT_FOUND` (still not found)

Action: Approve the book via CLI

**Expected Results:**
- [ ] momo: UPDATED to new link (replaced NOT_FOUND)
- [ ] Kobo: Remains `NOT_FOUND`
- [ ] **Rule verified:** NOT_FOUND is replaceable

**Test: Book Not Found in Main Tab**

Setup:
- 暫貼區 has book "測試新書" with generated links
- "測試新書" does NOT exist in 成人書單

Action: Approve via CLI (type Y)

**Expected Results:**
- [ ] Error message shown: "Book '測試新書' not found in main tab"
- [ ] Links stay in 暫貼區 (work preserved)
- [ ] Nothing written to main tab
- [ ] CLI continues to next book (doesn't crash)

---

### 1.5 Error Handling

**Test: Missing Tab**
1. Temporarily rename 暫貼區 tab
2. Run `npm run review-links`

**Expected Results:**
- [ ] Clear error message indicating tab not found
- [ ] Suggests correct tab name
- [ ] Doesn't crash

**Test: Invalid Column Structure**
1. Remove a bookstore column header
2. Run `npm run review-links`

**Expected Results:**
- [ ] Error message about missing column
- [ ] Lists expected columns
- [ ] Doesn't proceed with invalid structure

**Test: Network Timeout**
1. Disable internet connection
2. Run `npm run find-links`

**Expected Results:**
- [ ] Graceful timeout handling
- [ ] Retry mechanism attempts 3 times
- [ ] Clear error message after retries exhausted

**Test: API Rate Limiting**
1. Process many books in quick succession (10+ books)

**Expected Results:**
- [ ] Rate limiting delays between requests (500ms)
- [ ] All books processed without hitting Google API limits
- [ ] No quota exceeded errors

---

## Part 2: AppScript Testing

### 2.1 Deployment Verification

**Test: Menu Installation**
1. Open Google Sheets spreadsheet
2. Refresh the page

**Expected Results:**
- [ ] "Book Links" menu appears in menu bar
- [ ] Menu has 2 items: "Approve Selected Cell" and "Approve Selected Row(s)"
- [ ] Menu items are clickable

**Test: Authorization**
1. Click any menu item for first time

**Expected Results:**
- [ ] Authorization dialog appears
- [ ] Can grant permissions successfully
- [ ] After auth, menu items work

---

### 2.2 Approve Selected Cell

**Test: Single Cell Approval**
1. Go to 暫貼區 tab
2. Click on a bookstore cell with a URL (e.g., 博客來 column)
3. Click **Book Links** → **Approve Selected Cell**

**Expected Results:**
- [ ] Success message displayed
- [ ] Link copied to same bookstore column in main tab
- [ ] Only that one cell updated in main tab
- [ ] Other bookstore columns unchanged

**Test: Cell Validation - Wrong Tab**
1. Go to 成人書單 tab (not staging)
2. Select a cell
3. Click **Approve Selected Cell**

**Expected Results:**
- [ ] Error: "Wrong Tab"
- [ ] Message indicates must be in 暫貼區
- [ ] No data modified

**Test: Cell Validation - Not a Bookstore Column**
1. Go to 暫貼區
2. Select a cell in the 書名 column
3. Click **Approve Selected Cell**

**Expected Results:**
- [ ] Error: "Not a Bookstore Column"
- [ ] Lists valid bookstore columns
- [ ] No data modified

**Test: Cell Validation - Empty Cell**
1. Select an empty bookstore cell
2. Click **Approve Selected Cell**

**Expected Results:**
- [ ] Error: "Empty Cell" or similar
- [ ] Explains cell must contain a value
- [ ] No data modified

**Test: Cell Validation - Multiple Cells**
1. Select a range of 2+ cells
2. Click **Approve Selected Cell**

**Expected Results:**
- [ ] Error: "Invalid Selection"
- [ ] Explains must select exactly one cell
- [ ] No data modified

**Test: Cell Approval - Book Not Found**
1. Add book to 暫貼區 that's NOT in main tab
2. Fill a bookstore link
3. Try to approve that cell

**Expected Results:**
- [ ] Error: "Book not found in main tab"
- [ ] Includes book title in error message
- [ ] No data modified

---

### 2.3 Approve Selected Row(s)

**Test: Single Row Approval**
1. Go to 暫貼區
2. Add book with multiple bookstore links filled
3. Click on the row number to select entire row
4. Click **Book Links** → **Approve Selected Row(s)**

**Expected Results:**
- [ ] Success message with book title
- [ ] All bookstore links copied to main tab
- [ ] Empty cells in staging → left empty in main
- [ ] Links with "NOT_FOUND" copied as-is

**Test: Multiple Row Approval**
1. Select rows 2-5 (4 books)
2. Click **Approve Selected Row(s)**

**Expected Results:**
- [ ] Summary message: "Approved 4 books"
- [ ] All 4 books' links merged to main tab
- [ ] Each book processed independently

**Test: Row Validation - Wrong Tab**
1. Go to main tab
2. Select rows
3. Click **Approve Selected Row(s)**

**Expected Results:**
- [ ] Error: "Wrong Tab"
- [ ] No data modified

**Test: Row Validation - Partial Selection**
1. Select a range of cells (not full rows)
2. Click **Approve Selected Row(s)**

**Expected Results:**
- [ ] Error: "Invalid Selection"
- [ ] Explains must select complete rows
- [ ] No data modified

**Test: Row Validation - Include Header Row**
1. Select rows 1-3 (including header)
2. Click **Approve Selected Row(s)**

**Expected Results:**
- [ ] Header row skipped automatically
- [ ] Only rows 2-3 processed
- [ ] Or error preventing header row selection

**Test: Mixed Success/Failure**
1. Select 3 rows:
   - Row 2: Valid book (exists in main)
   - Row 3: Invalid book (doesn't exist in main)
   - Row 4: Valid book (exists in main)
2. Click **Approve Selected Row(s)**

**Expected Results:**
- [ ] Summary shows: "2 approved, 1 failed"
- [ ] Lists which books succeeded/failed
- [ ] Valid books merged correctly
- [ ] Invalid book skipped

---

### 2.4 Merge Rules (AppScript)

**Test: Never Overwrite (AppScript)**

Same setup as CLI test 1.4 above.

**Expected Results:**
- [ ] Existing links preserved
- [ ] Empty cells filled
- [ ] Same rules as CLI apply

**Test: Update NOT_FOUND (AppScript)**

Same setup as CLI test 1.4 above.

**Expected Results:**
- [ ] NOT_FOUND replaced with new links
- [ ] Same rules as CLI apply

**Test: Consistency with CLI**
1. Approve a book via CLI
2. Try to re-approve same book via AppScript
3. Verify same merge behavior

**Expected Results:**
- [ ] Both tools follow identical merge rules
- [ ] No conflicts between CLI and AppScript
- [ ] Data integrity maintained

---

## Part 3: Edge Cases & Integration

### 3.1 Special Characters

**Test: Book Titles with Special Characters**

Test these titles:
- "書名：副標題"
- "書名（作者）"
- "書名 - 下集"
- "書名？！"
- "書名 1/2"

**Expected Results:**
- [ ] Titles handled correctly by both CLI and AppScript
- [ ] Search links properly URL-encoded
- [ ] Title matching works for finding books in main tab

### 3.2 Concurrent Edits

**Test: CLI and Manual Edits**
1. Start `npm run review-links`
2. While waiting for Y/N prompt, manually edit main tab
3. Type Y to approve

**Expected Results:**
- [ ] CLI detects or handles concurrent modification
- [ ] No data corruption
- [ ] Warning if conflicts detected

**Test: Multiple Users**
1. Two users run AppScript approval simultaneously

**Expected Results:**
- [ ] Google Sheets handles locking
- [ ] No race conditions
- [ ] Both approvals succeed (or one waits)

### 3.3 Large Datasets

**Test: Many Books**
1. Add 20+ books to 暫貼區
2. Run `npm run find-links`

**Expected Results:**
- [ ] All books processed
- [ ] Progress visible in console
- [ ] Completion within reasonable time (<5 min)
- [ ] No timeouts or quota errors

**Test: AppScript Batch Approval**
1. Select 30+ rows
2. Click **Approve Selected Row(s)**

**Expected Results:**
- [ ] All rows processed
- [ ] No 6-minute AppScript timeout
- [ ] Or clear error if too many rows

### 3.4 Data Integrity

**Test: Partial Approval Rollback**
1. Start approval process
2. Simulate error mid-process (disconnect, etc.)

**Expected Results:**
- [ ] Data remains in consistent state
- [ ] Partial writes don't corrupt data
- [ ] Can retry without issues

**Test: Empty Values**
- [ ] Empty strings handled correctly
- [ ] Null values don't cause errors
- [ ] Whitespace-only cells ignored

**Test: URL Validation**
- [ ] Invalid URLs still accepted (no validation by design)
- [ ] Copy as-is to main tab
- [ ] Human review is validation step

---

## Part 4: Workflow Integration

### 4.1 End-to-End: CLI Workflow

**Complete workflow test:**

1. **Setup**
   - [ ] Add 5 new book titles to 暫貼區
   - [ ] Ensure all exist in main tab
   - [ ] All bookstore columns empty initially

2. **Generate**
   - [ ] Run `npm run find-links`
   - [ ] Verify links generated in 暫貼區
   - [ ] Check main tab unchanged

3. **Review**
   - [ ] Run `npm run review-links`
   - [ ] Browser opens for all valid links
   - [ ] Manually verify 2-3 links are correct
   - [ ] Approve 3 books, skip 2 books

4. **Verify**
   - [ ] 3 approved books merged to main tab
   - [ ] 2 skipped books remain in staging only
   - [ ] No overwrites of existing links

5. **Sync**
   - [ ] Run `npm run sync` (existing sync script)
   - [ ] Verify new links appear in `books_data.ts`
   - [ ] Website displays new bookstore links

### 4.2 End-to-End: AppScript Workflow

**Complete workflow test:**

1. **Setup**
   - [ ] Add 5 books to 暫貼區
   - [ ] Manually search and paste links for 2 bookstores per book
   - [ ] Or run `npm run find-links` first

2. **Cell-Level Review**
   - [ ] Review each link manually in spreadsheet
   - [ ] For 2 books: approve individual cells one by one
   - [ ] Verify each cell approval works

3. **Bulk Review**
   - [ ] For remaining 3 books: select all rows
   - [ ] Click **Approve Selected Row(s)**
   - [ ] Verify bulk approval works

4. **Verify**
   - [ ] All 5 books merged to main tab
   - [ ] Links correctly placed in right columns
   - [ ] Existing links untouched

5. **Sync**
   - [ ] Run `npm run sync`
   - [ ] Verify data reaches codebase

### 4.3 Mixed Workflow

**Test mixing CLI and AppScript:**

1. Use CLI to generate links
2. Use AppScript to approve some
3. Use CLI to approve others
4. Verify no conflicts

**Expected Results:**
- [ ] Both tools work together seamlessly
- [ ] No data corruption from switching tools
- [ ] Same merge rules applied consistently

---

## Part 5: Documentation Validation

### 5.1 Setup Documentation

**Test: Follow CLI Setup Guide**
1. New user follows `scripts/README.md`
2. Complete all setup steps

**Expected Results:**
- [ ] Clear instructions
- [ ] All steps work
- [ ] No missing information
- [ ] Successfully run CLI tools

**Test: Follow AppScript Deployment**
1. New user follows `appscript/README.md`
2. Deploy AppScript

**Expected Results:**
- [ ] Clear copy-paste instructions
- [ ] Authorization guide works
- [ ] Menu appears after deployment

**Test: Follow Staging Tab Setup**
1. New user follows `docs/staging-tab-setup.md`
2. Create 暫貼區 tab

**Expected Results:**
- [ ] Clear column order
- [ ] Tab created correctly
- [ ] Validation checklist helps verify

### 5.2 Error Message Clarity

**Test: Common Errors Have Good Messages**
- [ ] Missing credentials → Suggests checking setup guide
- [ ] Wrong tab name → Shows expected vs actual
- [ ] Book not found → Explains book must exist first
- [ ] Permission denied → Explains service account sharing

---

## Success Criteria

The book links system is ready for production when:

### Core Functionality
- [x] CLI can generate links for all 7 bookstores
- [x] CLI interactive review works smoothly
- [x] AppScript menu appears and buttons work
- [x] Both cell and row approval work
- [ ] All merge rules enforced correctly
- [ ] No data loss or corruption in any scenario

### Merge Rules (Critical)
- [ ] ✅ Existing links NEVER overwritten
- [ ] ✅ NOT_FOUND replaced with new links
- [ ] ✅ Empty cells filled
- [ ] ✅ Error if book not in main tab

### Edge Cases
- [ ] Special characters in titles handled
- [ ] Large batches (20+ books) work
- [ ] Concurrent edits don't corrupt data
- [ ] Ctrl+C exits gracefully

### Documentation
- [ ] Setup guides are complete and accurate
- [ ] Error messages are helpful
- [ ] Examples cover common scenarios
- [ ] Testing checklist comprehensive

### User Experience
- [ ] CLI output is clear and formatted well
- [ ] Browser automation works smoothly
- [ ] AppScript buttons give clear feedback
- [ ] Workflow is intuitive

---

## Test Results Log

### Test Run #1: [Date]

| Test Section | Status | Notes |
|--------------|--------|-------|
| 1.1 Initial Setup | ⬜ Pass / ⬜ Fail | |
| 1.2 Link Generation | ⬜ Pass / ⬜ Fail | |
| 1.3 Interactive Review | ⬜ Pass / ⬜ Fail | |
| 1.4 Merge Rules | ⬜ Pass / ⬜ Fail | |
| 1.5 Error Handling | ⬜ Pass / ⬜ Fail | |
| 2.1 Deployment | ⬜ Pass / ⬜ Fail | |
| 2.2 Cell Approval | ⬜ Pass / ⬜ Fail | |
| 2.3 Row Approval | ⬜ Pass / ⬜ Fail | |
| 2.4 Merge Rules (AS) | ⬜ Pass / ⬜ Fail | |
| 3.1 Special Characters | ⬜ Pass / ⬜ Fail | |
| 3.2 Concurrent Edits | ⬜ Pass / ⬜ Fail | |
| 3.3 Large Datasets | ⬜ Pass / ⬜ Fail | |
| 3.4 Data Integrity | ⬜ Pass / ⬜ Fail | |
| 4.1 CLI Workflow | ⬜ Pass / ⬜ Fail | |
| 4.2 AppScript Workflow | ⬜ Pass / ⬜ Fail | |
| 4.3 Mixed Workflow | ⬜ Pass / ⬜ Fail | |
| 5.1 Documentation | ⬜ Pass / ⬜ Fail | |
| 5.2 Error Messages | ⬜ Pass / ⬜ Fail | |

**Overall Status:** ⬜ Ready for Production / ⬜ Needs Fixes

**Critical Issues Found:**
- (List any critical issues that block production readiness)

**Minor Issues Found:**
- (List any minor issues or improvements needed)

---

## Next Steps After Testing

Once all tests pass:

1. [ ] Mark all checkboxes as complete
2. [ ] Document any known limitations
3. [ ] Update README with final usage instructions
4. [ ] Create video walkthrough (optional)
5. [ ] Announce tool availability to team
6. [ ] Monitor first production uses
7. [ ] Gather feedback for improvements

---

## Appendix: Test Data Templates

### Sample Book Titles for Testing

Copy these to 暫貼區 for testing (make sure they exist in main tab first):

```
無法送達的遺書
牽阮的手
被出賣的台灣
台灣人四百年史
民主台灣：後威權時代的社會運動與文化政治
```

### Expected Bookstore Domains

Verify generated links go to these domains:

- 博客來: `books.com.tw`
- 金石堂: `kingstone.com.tw`
- 誠品: `eslite.com`
- momo: `momoshop.com.tw`
- Kobo: `kobo.com`
- Readmoo: `readmoo.com`
- tazze: `taaze.tw`

### Common Error Messages Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| "Book not found in main tab" | Title doesn't exist in 成人書單 | Add book to main tab first |
| "Wrong Tab" | Not in 暫貼區 | Switch to staging tab |
| "Invalid Selection" | Wrong selection type | Select full rows or single cell |
| "Permission denied" | API access issue | Check service account sharing |
| "Not a Bookstore Column" | Selected title column | Select a bookstore column |

---

**Document Version:** 1.0
**Last Updated:** 2026-02-17
**Next Review:** After first complete test run

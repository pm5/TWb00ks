#!/usr/bin/env node

/**
 * Interactive Book Links CLI
 * Two modes:
 * - review: Interactive review session with browser opening
 * - generate: Batch generation without review
 */

import open from 'open';
import readline from 'readline';
import {
  generateMissingLinks,
  loadConfig,
  mergeLinksToMain,
  readMainTabLinks,
  readStagingArea,
  writeStagingLinks,
} from './lib/book-links-core.js';

// ANSI color codes for better UX
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Helper to create a readline interface
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Ask which links to accept: Y=all, N=none, or space/comma-separated numbers
function askLinkSelection(rl, bookstores) {
  return new Promise((resolve) => {
    rl.question(
      `${colors.bright}Accept which links? (Y=all, N=none, or numbers e.g. "1 3"): ${colors.reset}`,
      (answer) => {
        const normalized = answer.trim().toLowerCase();
        if (normalized === 'y' || normalized === 'yes') {
          resolve(new Set(bookstores.map((b) => b.id)));
        } else if (normalized === 'n' || normalized === 'no') {
          resolve(new Set());
        } else {
          const nums = normalized
            .split(/[\s,]+/)
            .map((n) => parseInt(n, 10))
            .filter((n) => !isNaN(n) && n >= 1 && n <= bookstores.length);
          resolve(new Set(nums.map((n) => bookstores[n - 1].id)));
        }
      },
    );
  });
}

// Display formatted book title and links with numbered entries
function displayBookLinks(title, links, bookstores) {
  console.log(`\n${colors.bright}${colors.blue}📚 書名: ${title}${colors.reset}`);
  console.log(`${colors.gray}═══════════════════════════${colors.reset}`);

  bookstores.forEach((bookstore, i) => {
    const link = links[bookstore.id] || '';
    const num = `${colors.bright}${i + 1}.${colors.reset}`;

    if (!link || link.trim() === '') {
      // Empty/missing link
      console.log(`${num} ${colors.gray}${bookstore.name}: (empty)${colors.reset}`);
    } else if (link === 'NOT_FOUND') {
      // Not found
      console.log(`${num} ${colors.yellow}${bookstore.name}: NOT_FOUND${colors.reset}`);
    } else {
      // Valid URL
      console.log(`${num} ${colors.green}✓ ${bookstore.name}: ${colors.cyan}${link}${colors.reset}`);
    }
  });
  console.log('');
}

// Open valid links in browser tabs
async function openLinksInBrowser(links) {
  const validLinks = Object.values(links).filter(
    (link) => link && link.trim() !== '' && link !== 'NOT_FOUND' && link.startsWith('http'),
  );

  if (validLinks.length === 0) {
    console.log(`${colors.yellow}⚠ No valid links to open${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}🌐 Opening ${validLinks.length} link(s) in browser...${colors.reset}`);

  // Open all links simultaneously
  const openPromises = validLinks.map((link) =>
    open(link).catch((err) => {
      console.error(`${colors.red}Error opening ${link}: ${err.message}${colors.reset}`);
    }),
  );

  await Promise.all(openPromises);

  // Wait for tabs to load
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

// Check if a book has missing links (considering both staging and main tab)
function hasMissingLinks(book, bookstores, mainTabLinks = {}) {
  const mainLinks = mainTabLinks[book.title] || {};
  for (const bookstore of bookstores) {
    const stagingLink = (book.links[bookstore.id] || '').trim();
    const mainLink = (mainLinks[bookstore.id] || '').trim();
    const stagingMissing = !stagingLink || stagingLink === 'NOT_FOUND';
    const mainMissing = !mainLink || mainLink === 'NOT_FOUND';
    if (stagingMissing && mainMissing) {
      return true;
    }
  }
  return false;
}

// Interactive review session
async function reviewSession() {
  console.log(`${colors.bright}${colors.blue}📚 Book Links Interactive Review Session${colors.reset}\n`);

  try {
    const config = loadConfig();
    const [allBooks, mainTabLinks] = await Promise.all([readStagingArea(), readMainTabLinks()]);

    // Filter books with missing links (checking both staging and main tab)
    const booksWithMissingLinks = allBooks.filter((book) => hasMissingLinks(book, config.bookstores, mainTabLinks));

    if (booksWithMissingLinks.length === 0) {
      console.log(`${colors.green}✓ No books with missing links found in staging area!${colors.reset}`);
      return;
    }

    console.log(`${colors.cyan}Found ${booksWithMissingLinks.length} book(s) with missing links${colors.reset}\n`);

    const rl = createReadlineInterface();
    let approved = 0;
    let skipped = 0;
    let errors = 0;
    const errorMessages = [];

    // Handle Ctrl+C gracefully
    rl.on('SIGINT', () => {
      console.log(`\n\n${colors.yellow}⚠ Review interrupted by user${colors.reset}`);
      console.log(`${colors.bright}Summary:${colors.reset} ${approved} approved, ${skipped} skipped, ${errors} errors`);
      rl.close();
      process.exit(0);
    });

    try {
      for (let i = 0; i < booksWithMissingLinks.length; i++) {
        const book = booksWithMissingLinks[i];

        console.log(`${colors.dim}[${i + 1}/${booksWithMissingLinks.length}]${colors.reset}`);

        // Generate missing links
        let updatedLinks;
        try {
          updatedLinks = await generateMissingLinks(book, mainTabLinks);
        } catch (error) {
          errors++;
          const errorMsg = `Failed to generate links for "${book.title}": ${error.message}`;
          errorMessages.push(errorMsg);
          console.error(`${colors.red}✗ ${errorMsg}${colors.reset}`);
          console.log(`${colors.yellow}Skipping to next book...${colors.reset}\n`);
          continue;
        }

        // Display formatted output
        displayBookLinks(book.title, updatedLinks, config.bookstores);

        // Skip prompt if no valid links were found
        const hasValidLinks = Object.values(updatedLinks).some(
          (link) => link && link.trim() !== '' && link !== 'NOT_FOUND',
        );
        if (!hasValidLinks) {
          console.log(`${colors.gray}○ No valid links found, skipping${colors.reset}\n`);
          skipped++;
          continue;
        }

        // Open browser tabs
        await openLinksInBrowser(updatedLinks);

        // Prompt for selection
        const acceptedIds = await askLinkSelection(rl, config.bookstores);

        if (acceptedIds.size === 0) {
          console.log(`${colors.yellow}⊘ Skipped${colors.reset}`);
          skipped++;
        } else {
          // Build links to save: accepted ones use new values, others keep original staging values
          const linksToSave = {};
          for (const bookstore of config.bookstores) {
            linksToSave[bookstore.id] = acceptedIds.has(bookstore.id)
              ? updatedLinks[bookstore.id]
              : book.links[bookstore.id];
          }

          // Write to staging
          try {
            await writeStagingLinks(book.rowIndex, linksToSave);
            console.log(`${colors.green}✓ Saved to staging area${colors.reset}`);
          } catch (error) {
            errors++;
            const errorMsg = `Failed to write to staging for "${book.title}": ${error.message}`;
            errorMessages.push(errorMsg);
            console.error(`${colors.red}✗ ${errorMsg}${colors.reset}`);
            continue;
          }

          // Merge to main
          try {
            const mergeResult = await mergeLinksToMain(book.title, linksToSave);
            if (mergeResult.success) {
              if (mergeResult.updatedCells > 0) {
                console.log(`${colors.green}✓ Merged ${mergeResult.updatedCells} link(s) to main tab${colors.reset}`);
              } else {
                console.log(
                  `${colors.gray}○ No updates needed in main tab (all fields already populated)${colors.reset}`,
                );
              }
            } else {
              // Book not found in main tab - this is expected sometimes
              console.log(`${colors.yellow}⚠ ${mergeResult.error}${colors.reset}`);
              console.log(`${colors.gray}  Links saved to staging area only${colors.reset}`);
            }
          } catch (error) {
            errors++;
            const errorMsg = `Failed to merge to main for "${book.title}": ${error.message}`;
            errorMessages.push(errorMsg);
            console.error(`${colors.red}✗ ${errorMsg}${colors.reset}`);
          }

          approved++;
        }

        console.log('');
      }
    } finally {
      rl.close();
    }

    // Show summary
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════${colors.reset}`);
    console.log(`${colors.bright}Review Session Complete${colors.reset}`);
    console.log(`${colors.bright}═══════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Approved: ${approved}${colors.reset}`);
    console.log(`${colors.yellow}⊘ Skipped: ${skipped}${colors.reset}`);
    console.log(`${colors.red}✗ Errors: ${errors}${colors.reset}`);

    if (errorMessages.length > 0) {
      console.log(`\n${colors.bright}${colors.red}Error Summary:${colors.reset}`);
      errorMessages.forEach((msg, idx) => {
        console.log(`  ${idx + 1}. ${msg}`);
      });
    }
  } catch (error) {
    console.error(`${colors.red}✗ Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Batch generate links without review
async function generateLinks() {
  console.log(`${colors.bright}${colors.blue}📚 Batch Link Generation${colors.reset}\n`);

  try {
    const config = loadConfig();
    const [allBooks, mainTabLinks] = await Promise.all([readStagingArea(), readMainTabLinks()]);

    // Filter books with missing links (checking both staging and main tab)
    const booksWithMissingLinks = allBooks.filter((book) => hasMissingLinks(book, config.bookstores, mainTabLinks));

    if (booksWithMissingLinks.length === 0) {
      console.log(`${colors.green}✓ No books with missing links found in staging area!${colors.reset}`);
      return;
    }

    console.log(`${colors.cyan}Found ${booksWithMissingLinks.length} book(s) with missing links${colors.reset}\n`);

    let generated = 0;
    let errors = 0;
    const errorMessages = [];

    for (let i = 0; i < booksWithMissingLinks.length; i++) {
      const book = booksWithMissingLinks[i];

      console.log(`${colors.dim}[${i + 1}/${booksWithMissingLinks.length}]${colors.reset} ${book.title}`);

      // Generate missing links
      let updatedLinks;
      try {
        updatedLinks = await generateMissingLinks(book, mainTabLinks);
      } catch (error) {
        errors++;
        const errorMsg = `Failed to generate links for "${book.title}": ${error.message}`;
        errorMessages.push(errorMsg);
        console.error(`${colors.red}  ✗ ${error.message}${colors.reset}`);
        continue;
      }

      // Write to staging
      try {
        await writeStagingLinks(book.rowIndex, updatedLinks);
        console.log(`${colors.green}  ✓ Generated and saved to staging${colors.reset}`);
        generated++;
      } catch (error) {
        errors++;
        const errorMsg = `Failed to write to staging for "${book.title}": ${error.message}`;
        errorMessages.push(errorMsg);
        console.error(`${colors.red}  ✗ ${error.message}${colors.reset}`);
      }
    }

    // Show summary
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════${colors.reset}`);
    console.log(`${colors.bright}Generation Complete${colors.reset}`);
    console.log(`${colors.bright}═══════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Generated: ${generated}${colors.reset}`);
    console.log(`${colors.red}✗ Errors: ${errors}${colors.reset}`);

    if (errorMessages.length > 0) {
      console.log(`\n${colors.bright}${colors.red}Error Summary:${colors.reset}`);
      errorMessages.forEach((msg, idx) => {
        console.log(`  ${idx + 1}. ${msg}`);
      });
    }
  } catch (error) {
    console.error(`${colors.red}✗ Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Show usage instructions
function showUsage() {
  console.log(`${colors.bright}Book Links CLI${colors.reset}`);
  console.log('');
  console.log('Usage:');
  console.log(`  ${colors.cyan}npm run review-links${colors.reset}  - Interactive review session`);
  console.log(`  ${colors.cyan}npm run find-links${colors.reset}   - Batch generate without review`);
  console.log('');
  console.log('Commands:');
  console.log(`  ${colors.cyan}node scripts/book-links.js review${colors.reset}    - Interactive review`);
  console.log(`  ${colors.cyan}node scripts/book-links.js generate${colors.reset}  - Batch generation`);
  console.log('');
}

// Main entry point
async function main() {
  const command = process.argv[2];

  if (command === 'review') {
    await reviewSession();
  } else if (command === 'generate') {
    await generateLinks();
  } else {
    showUsage();
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error(`${colors.red}✗ Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});

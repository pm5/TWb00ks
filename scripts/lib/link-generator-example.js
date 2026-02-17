/**
 * Link Generator Usage Example
 * Demonstrates how to use the link generator module
 */

import { readFile } from 'fs/promises';
import { generateBookstoreLink, generateAllLinks } from './link-generator.js';

// Load configuration
async function loadConfig() {
  const configPath = new URL('../bookstores.config.json', import.meta.url);
  const configData = await readFile(configPath, 'utf8');
  return JSON.parse(configData);
}

// Example 1: Generate a single bookstore link
async function exampleSingleLink() {
  console.log('Example 1: Generate a single bookstore link\n');

  const bookstore = {
    id: 'books',
    name: '博客來',
    domain: 'books.com.tw',
    searchUrl: 'https://search.books.com.tw/search/query/key/{title}'
  };

  const title = '原子習慣';
  const searchEngine = 'google';

  console.log(`Searching for: "${title}"`);
  console.log(`Bookstore: ${bookstore.name}`);
  console.log(`Search engine: ${searchEngine}\n`);

  const url = await generateBookstoreLink(title, bookstore, searchEngine);

  console.log('Result:', url);
  console.log('---\n');
}

// Example 2: Generate links for all configured bookstores
async function exampleAllLinks() {
  console.log('Example 2: Generate links for all configured bookstores\n');

  const config = await loadConfig();
  const title = '原子習慣';

  console.log(`Searching for: "${title}"`);
  console.log(`Search engine: ${config.searchEngine}`);
  console.log(`Number of bookstores: ${config.bookstores.length}\n`);

  console.log('Generating links (this may take several seconds due to rate limiting)...\n');

  const results = await generateAllLinks(title, config.bookstores, config.searchEngine);

  console.log('Results:');
  console.log('---');
  for (const bookstore of config.bookstores) {
    const url = results[bookstore.id];
    const status = url === 'NOT_FOUND' ? '❌ Not found' :
                   url.includes(bookstore.domain) ? '✓ Found' :
                   '? Unknown';
    console.log(`${bookstore.name}: ${status}`);
    console.log(`  ${url}`);
  }
  console.log('---\n');
}

// Example 3: Handle a book that might not be found
async function exampleNotFound() {
  console.log('Example 3: Handle a book that might not be found\n');

  const bookstore = {
    id: 'kobo',
    name: 'Kobo',
    domain: 'kobo.com',
    searchUrl: null // No searchUrl fallback
  };

  const title = 'Very Rare Book Title That Does Not Exist';
  const searchEngine = 'google';

  console.log(`Searching for: "${title}"`);
  console.log(`Bookstore: ${bookstore.name}`);
  console.log(`Search engine: ${searchEngine}\n`);

  const url = await generateBookstoreLink(title, bookstore, searchEngine);

  if (url === 'NOT_FOUND') {
    console.log('Result: Book not found (no searchUrl fallback available)');
  } else {
    console.log('Result:', url);
  }
  console.log('---\n');
}

// Run examples
async function main() {
  console.log('='.repeat(60));
  console.log('Link Generator Examples');
  console.log('='.repeat(60));
  console.log('');

  try {
    await exampleSingleLink();
    await exampleAllLinks();
    await exampleNotFound();

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

main();

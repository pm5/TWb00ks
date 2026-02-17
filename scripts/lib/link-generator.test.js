/**
 * Link Generator Tests
 * Tests for the link generation module
 */

import {
  generateBookstoreLink,
  generateAllLinks,
  isSearchEngineUrl,
  containsExpectedDomain,
  generateLuckyUrl,
  generateSearchUrl
} from './link-generator.js';

// Helper function to create a mock bookstore
function createMockBookstore(id, name, domain, searchUrl = null) {
  return { id, name, domain, searchUrl };
}

// Test helper functions
console.log('Testing helper functions...\n');

// Test isSearchEngineUrl
console.log('Testing isSearchEngineUrl:');
console.log('  google.com:', isSearchEngineUrl('https://www.google.com/search?q=test')); // true
console.log('  duckduckgo.com:', isSearchEngineUrl('https://duckduckgo.com/?q=test')); // true
console.log('  books.com.tw:', isSearchEngineUrl('https://www.books.com.tw/products/123')); // false
console.log('');

// Test containsExpectedDomain
console.log('Testing containsExpectedDomain:');
console.log('  books.com.tw in books.com.tw URL:', containsExpectedDomain('https://www.books.com.tw/products/123', 'books.com.tw')); // true
console.log('  books.com.tw in google.com URL:', containsExpectedDomain('https://www.google.com/search', 'books.com.tw')); // false
console.log('');

// Test generateLuckyUrl
console.log('Testing generateLuckyUrl:');
const googleLuckyUrl = generateLuckyUrl('google', '原子習慣', 'books.com.tw');
console.log('  Google Lucky URL:', googleLuckyUrl);
console.log('  Contains btnI=1:', googleLuckyUrl.includes('btnI=1')); // true
console.log('  Contains site:books.com.tw:', googleLuckyUrl.includes('site%3Abooks.com.tw')); // true

const duckduckgoLuckyUrl = generateLuckyUrl('duckduckgo', '原子習慣', 'books.com.tw');
console.log('  DuckDuckGo Lucky URL:', duckduckgoLuckyUrl);
console.log('  Contains !ducky:', duckduckgoLuckyUrl.includes('!ducky')); // true
console.log('');

// Test generateSearchUrl
console.log('Testing generateSearchUrl:');
const searchUrl1 = generateSearchUrl('https://search.books.com.tw/search/query/key/{title}', '原子習慣');
console.log('  Books.com.tw search URL:', searchUrl1);
console.log('  Contains encoded title:', searchUrl1.includes('%E5%8E%9F%E5%AD%90%E7%BF%92%E6%85%A3')); // true

const searchUrl2 = generateSearchUrl(null, '原子習慣');
console.log('  Null searchUrl template:', searchUrl2); // null
console.log('');

// Test actual link generation (integration tests)
async function runIntegrationTests() {
  console.log('Running integration tests...\n');

  // Test with a bookstore that has searchUrl
  console.log('Test 1: Bookstore with searchUrl (博客來)');
  const bookstore1 = createMockBookstore(
    'books',
    '博客來',
    'books.com.tw',
    'https://search.books.com.tw/search/query/key/{title}'
  );

  try {
    const result1 = await generateBookstoreLink('原子習慣', bookstore1, 'google');
    console.log('  Result:', result1);
    console.log('  Result type:',
      result1 === 'NOT_FOUND' ? 'NOT_FOUND' :
      result1.includes('books.com.tw') ? 'Valid URL' :
      'Unknown'
    );
  } catch (error) {
    console.log('  Error:', error.message);
  }
  console.log('');

  // Test with a bookstore without searchUrl
  console.log('Test 2: Bookstore without searchUrl (Kobo)');
  const bookstore2 = createMockBookstore(
    'kobo',
    'Kobo',
    'kobo.com',
    null
  );

  try {
    const result2 = await generateBookstoreLink('Atomic Habits', bookstore2, 'google');
    console.log('  Result:', result2);
    console.log('  Result type:',
      result2 === 'NOT_FOUND' ? 'NOT_FOUND' :
      result2.includes('kobo.com') ? 'Valid URL' :
      'Unknown'
    );
  } catch (error) {
    console.log('  Error:', error.message);
  }
  console.log('');

  // Test generateAllLinks with multiple bookstores
  console.log('Test 3: Generate all links for multiple bookstores');
  const bookstores = [
    createMockBookstore('books', '博客來', 'books.com.tw', 'https://search.books.com.tw/search/query/key/{title}'),
    createMockBookstore('kingstone', '金石堂', 'kingstone.com.tw', 'https://www.kingstone.com.tw/search/search?q={title}'),
    createMockBookstore('kobo', 'Kobo', 'kobo.com', null)
  ];

  console.log('  Generating links for 3 bookstores (this will take ~1-2 seconds due to rate limiting)...');
  const startTime = Date.now();

  try {
    const results = await generateAllLinks('原子習慣', bookstores, 'google');
    const duration = Date.now() - startTime;

    console.log('  Results:', JSON.stringify(results, null, 2));
    console.log(`  Duration: ${duration}ms (should be ~1000ms due to 500ms delays between 3 requests)`);
    console.log('  All bookstore IDs present:',
      bookstores.every(b => b.id in results) ? 'Yes' : 'No'
    );
  } catch (error) {
    console.log('  Error:', error.message);
  }
  console.log('');

  // Test with DuckDuckGo
  console.log('Test 4: Using DuckDuckGo as search engine');
  const bookstore3 = createMockBookstore(
    'eslite',
    '誠品',
    'eslite.com',
    'https://www.eslite.com/Search?q={title}'
  );

  try {
    const result3 = await generateBookstoreLink('原子習慣', bookstore3, 'duckduckgo');
    console.log('  Result:', result3);
    console.log('  Result type:',
      result3 === 'NOT_FOUND' ? 'NOT_FOUND' :
      result3.includes('eslite.com') ? 'Valid URL' :
      'Unknown'
    );
  } catch (error) {
    console.log('  Error:', error.message);
  }
  console.log('');

  console.log('All tests completed!');
}

// Run integration tests
runIntegrationTests().catch(console.error);

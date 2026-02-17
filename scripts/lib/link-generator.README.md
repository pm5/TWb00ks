# Link Generator Module

This module provides functionality to generate bookstore links using search engines with intelligent fallback strategies.

## Features

- **Multiple Search Engines**: Supports Google and DuckDuckGo "I'm Feeling Lucky" searches
- **Fallback Strategy**: Automatically falls back to bookstore search URLs when direct link generation fails
- **Rate Limiting**: Built-in 500ms delay between consecutive requests to avoid being blocked
- **Error Handling**: Comprehensive error handling with logging for debugging
- **Redirect Following**: Automatically follows HTTP redirects (301, 302, 307, 308)
- **Domain Validation**: Verifies that final URLs match expected bookstore domains

## API

### `generateBookstoreLink(title, bookstore, searchEngine)`

Generates a single bookstore link for a given book title.

**Parameters:**
- `title` (string): Book title to search for
- `bookstore` (object): Bookstore configuration object
  - `id` (string): Bookstore identifier
  - `name` (string): Bookstore display name
  - `domain` (string): Bookstore domain
  - `searchUrl` (string|null): Optional search URL template with `{title}` placeholder
- `searchEngine` (string): Search engine to use ('google' or 'duckduckgo')

**Returns:** Promise<string>
- Final bookstore URL if found via "I'm Feeling Lucky"
- Bookstore searchUrl if "I'm Feeling Lucky" fails and searchUrl is available
- `"NOT_FOUND"` if both strategies fail or no searchUrl is available

**Example:**
```javascript
const bookstore = {
  id: 'books',
  name: '博客來',
  domain: 'books.com.tw',
  searchUrl: 'https://search.books.com.tw/search/query/key/{title}'
};

const url = await generateBookstoreLink('原子習慣', bookstore, 'google');
console.log(url); // https://search.books.com.tw/search/query/key/%E5%8E%9F%E5%AD%90%E7%BF%92%E6%85%A3
```

### `generateAllLinks(title, bookstores, searchEngine)`

Generates bookstore links for all configured bookstores.

**Parameters:**
- `title` (string): Book title to search for
- `bookstores` (Array<object>): Array of bookstore configuration objects
- `searchEngine` (string): Search engine to use ('google' or 'duckduckgo')

**Returns:** Promise<Object>
- Object mapping bookstore IDs to URLs
- Each value is either a valid URL or `"NOT_FOUND"`

**Example:**
```javascript
const bookstores = [
  { id: 'books', name: '博客來', domain: 'books.com.tw', searchUrl: '...' },
  { id: 'kingstone', name: '金石堂', domain: 'kingstone.com.tw', searchUrl: '...' }
];

const results = await generateAllLinks('原子習慣', bookstores, 'google');
console.log(results);
// {
//   "books": "https://search.books.com.tw/...",
//   "kingstone": "https://www.kingstone.com.tw/..."
// }
```

## Search Strategy

The module uses a three-tier fallback strategy:

### 1. "I'm Feeling Lucky" Search (Primary)

First attempts to use the search engine's "I'm Feeling Lucky" feature:
- **Google**: `https://www.google.com/search?q=site:DOMAIN+TITLE&btnI=1`
- **DuckDuckGo**: `https://duckduckgo.com/?q=!ducky+site:DOMAIN+TITLE`

The module follows redirects and validates that:
- Final URL is not a search engine URL
- Final URL contains the expected bookstore domain

### 2. Bookstore Search URL (Fallback)

If "I'm Feeling Lucky" fails, falls back to the bookstore's search URL:
- Uses the `searchUrl` template from bookstore configuration
- Replaces `{title}` placeholder with URL-encoded book title
- Returns the search URL directly (reliable fallback)

### 3. NOT_FOUND (Last Resort)

If both strategies fail or no `searchUrl` is available:
- Returns `"NOT_FOUND"` string
- Indicates the book link cannot be generated

## Rate Limiting

To avoid being blocked by search engines and bookstores:
- 500ms delay **after each request completes**
- Applied between consecutive bookstore requests in `generateAllLinks`
- No delay after the last request

**Example timing for 3 bookstores:**
1. Request bookstore 1 → Complete → Wait 500ms
2. Request bookstore 2 → Complete → Wait 500ms
3. Request bookstore 3 → Complete → Done (no wait)

Total time: ~3-6 seconds (depending on network latency)

## Error Handling

The module handles various error scenarios:

- **Network timeout** (10 seconds): Tries fallback, logs error
- **HTTP errors**: Tries fallback, logs error
- **Too many redirects**: Tries fallback, logs error
- **Invalid URLs**: Catches and logs errors

All errors are logged to console in format:
```
Error for [bookstore name]: [error message]
```

## Configuration

### Bookstore Object Structure

```javascript
{
  "id": "books",              // Unique identifier
  "name": "博客來",           // Display name
  "domain": "books.com.tw",   // Domain for validation
  "searchUrl": "https://..."  // Optional search URL template
}
```

### Search Engine Options

- `"google"`: Uses Google's "I'm Feeling Lucky" feature
- `"duckduckgo"`: Uses DuckDuckGo's "!ducky" feature

## Technical Details

### HTTP Request Configuration

- **Timeout**: 10 seconds per request
- **User-Agent**: Mozilla/5.0 (prevents blocking by some sites)
- **Redirects**: Automatically follows up to 10 redirects
- **Protocol**: HTTPS only (uses Node.js built-in `https` module)

### URL Encoding

- **"I'm Feeling Lucky"**: Full query encoded including `site:` operator
- **Search URLs**: Only title is encoded, preserving URL structure

### Domain Validation

The module validates that final URLs contain the expected bookstore domain:
- Case-insensitive comparison
- Hostname extraction using Node.js URL API
- Filters out search engine URLs (google.com, duckduckgo.com)

## Testing

Run the test suite:
```bash
node scripts/lib/link-generator.test.js
```

Run the example script:
```bash
node scripts/lib/link-generator-example.js
```

## Integration Example

```javascript
import { readFile } from 'fs/promises';
import { generateAllLinks } from './link-generator.js';

// Load configuration
const config = JSON.parse(
  await readFile('./bookstores.config.json', 'utf8')
);

// Generate links for a book
const bookTitle = '原子習慣';
const links = await generateAllLinks(
  bookTitle,
  config.bookstores,
  config.searchEngine
);

// Process results
for (const [bookstoreId, url] of Object.entries(links)) {
  if (url === 'NOT_FOUND') {
    console.log(`${bookstoreId}: No link found`);
  } else {
    console.log(`${bookstoreId}: ${url}`);
  }
}
```

## Troubleshooting

### "I'm Feeling Lucky" always returns search URLs

This is expected behavior when:
- The book is not available at the bookstore
- The search query is too generic
- The bookstore's site structure prevents direct linking

The module automatically falls back to `searchUrl` in these cases.

### Rate limiting still causes blocks

If you're still getting blocked:
- Increase the delay in `generateAllLinks` (currently 500ms)
- Add delays before the first request
- Use a VPN or proxy to rotate IP addresses

### Links are incorrect or go to wrong pages

Check that:
- Bookstore domains in configuration are correct
- Search URL templates have correct `{title}` placeholder
- Bookstore sites haven't changed their URL structure

## Future Enhancements

Potential improvements for future versions:
- Support for more search engines (Bing, Yahoo, etc.)
- Configurable timeout and rate limiting
- Retry logic with exponential backoff
- Link validation to verify book actually exists
- Caching to avoid repeated searches for same books
- Proxy support for distributed rate limiting

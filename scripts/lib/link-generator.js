/**
 * Link Generation Module
 * Generates bookstore links using search engines with fallback strategies
 */

import https from 'https';

/**
 * Makes an HTTPS request following redirects
 * @param {string} url - The URL to fetch
 * @param {number} maxRedirects - Maximum number of redirects to follow
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<string>} - Final URL after redirects
 */
function fetchWithRedirects(url, maxRedirects = 10, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let redirectCount = 0;

    const makeRequest = (currentUrl) => {
      const urlObj = new URL(currentUrl);

      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: timeout
      };

      const req = https.request(options, (res) => {
        // Handle redirects
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          redirectCount++;

          if (redirectCount > maxRedirects) {
            reject(new Error('Too many redirects'));
            return;
          }

          // Handle relative redirects
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, currentUrl).toString();
          }

          // Continue following redirects
          makeRequest(nextUrl);
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          // Success - return final URL
          resolve(currentUrl);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    };

    makeRequest(url);
  });
}

/**
 * Checks if URL is a search engine result page (not a bookstore)
 * @param {string} url - URL to check
 * @returns {boolean} - True if URL is a search engine
 */
function isSearchEngineUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('google.com') || hostname.includes('duckduckgo.com');
  } catch {
    return false;
  }
}

/**
 * Checks if final URL contains the expected bookstore domain
 * @param {string} url - Final URL after redirects
 * @param {string} expectedDomain - Expected bookstore domain
 * @returns {boolean} - True if URL contains expected domain
 */
function containsExpectedDomain(url, expectedDomain) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase().includes(expectedDomain.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Generates "I'm Feeling Lucky" URL for a search engine
 * @param {string} searchEngine - Search engine name ('google' or 'duckduckgo')
 * @param {string} title - Book title
 * @param {string} domain - Bookstore domain
 * @returns {string} - "I'm Feeling Lucky" URL
 */
function generateLuckyUrl(searchEngine, title, domain) {
  const query = `site:${domain} ${title}`;
  const encodedQuery = encodeURIComponent(query);

  if (searchEngine === 'google') {
    return `https://www.google.com/search?q=${encodedQuery}&btnI=1`;
  } else if (searchEngine === 'duckduckgo') {
    return `https://duckduckgo.com/?q=!ducky+${encodedQuery}`;
  }

  throw new Error(`Unsupported search engine: ${searchEngine}`);
}

/**
 * Generates a direct search URL for a bookstore
 * @param {string} searchUrl - Search URL template with {title} placeholder
 * @param {string} title - Book title
 * @returns {string|null} - Search URL or null if searchUrl not provided
 */
function generateSearchUrl(searchUrl, title) {
  if (!searchUrl) {
    return null;
  }
  return searchUrl.replace('{title}', encodeURIComponent(title));
}

/**
 * Generates a bookstore link for a given title
 * @param {string} title - Book title to search for
 * @param {Object} bookstore - Bookstore configuration object
 * @param {string} bookstore.id - Bookstore identifier
 * @param {string} bookstore.name - Bookstore display name
 * @param {string} bookstore.domain - Bookstore domain
 * @param {string|null} bookstore.searchUrl - Optional search URL template
 * @param {string} searchEngine - Search engine to use ('google' or 'duckduckgo')
 * @returns {Promise<string>} - Generated link URL, searchUrl, or "NOT_FOUND"
 */
async function generateBookstoreLink(title, bookstore, searchEngine) {
  // Strategy 1: Try "I'm Feeling Lucky" search
  try {
    const luckyUrl = generateLuckyUrl(searchEngine, title, bookstore.domain);
    const finalUrl = await fetchWithRedirects(luckyUrl);

    // Check if we got redirected to the actual bookstore
    if (!isSearchEngineUrl(finalUrl) && containsExpectedDomain(finalUrl, bookstore.domain)) {
      return finalUrl;
    }

    // If we're still on search engine or wrong domain, try fallback
    console.log(`"I'm Feeling Lucky" for ${bookstore.name} returned search engine URL or wrong domain`);
  } catch (error) {
    console.log(`Error for ${bookstore.name}: ${error.message}`);
  }

  // Strategy 2: Try searchUrl fallback if available
  const searchUrl = generateSearchUrl(bookstore.searchUrl, title);
  if (searchUrl) {
    try {
      const finalUrl = await fetchWithRedirects(searchUrl);

      // Verify the search URL resolves properly
      if (!isSearchEngineUrl(finalUrl)) {
        return searchUrl; // Return the search URL, not the final URL after redirect
      }

      console.log(`Search URL for ${bookstore.name} returned search engine URL`);
    } catch (error) {
      console.log(`Error for ${bookstore.name}: ${error.message}`);
    }

    // Even if fetch failed, return searchUrl as it's a valid fallback
    return searchUrl;
  }

  // Strategy 3: No results found
  return 'NOT_FOUND';
}

/**
 * Generates bookstore links for all configured bookstores
 * @param {string} title - Book title to search for
 * @param {Array<Object>} bookstores - Array of bookstore configuration objects
 * @param {string} searchEngine - Search engine to use ('google' or 'duckduckgo')
 * @returns {Promise<Object>} - Object mapping bookstore IDs to URLs
 */
async function generateAllLinks(title, bookstores, searchEngine) {
  const results = {};

  for (let i = 0; i < bookstores.length; i++) {
    const bookstore = bookstores[i];

    // Generate link for this bookstore
    const url = await generateBookstoreLink(title, bookstore, searchEngine);
    results[bookstore.id] = url;

    // Wait 500ms between requests (after each completes), except after the last one
    if (i < bookstores.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

export {
  generateBookstoreLink,
  generateAllLinks,
  // Export helper functions for testing
  fetchWithRedirects,
  isSearchEngineUrl,
  containsExpectedDomain,
  generateLuckyUrl,
  generateSearchUrl
};

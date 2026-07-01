/**
 * Tweet Splitter utility
 *
 * Splits a long text into an ordered array of tweet strings,
 * each no longer than 280 characters.
 *
 * Split priority:
 *   1. Double line break (\n\n)  — paragraph boundary (highest priority)
 *   2. Single line break (\n)    — line boundary
 *   3. Last space before 280     — word boundary (mid-sentence split)
 *   4. Hard cut at 280           — last resort (no spaces found)
 */

const MAX_TWEET_LENGTH = 280;

/**
 * Splits a segment that exceeds 280 characters into multiple tweet strings.
 * Tries word-boundary split first, falls back to hard cut.
 */
function splitLongSegment(segment: string): string[] {
  const tweets: string[] = [];
  let remaining = segment;

  while (remaining.length > MAX_TWEET_LENGTH) {
    // Find the last space within the 280-character window
    const window = remaining.slice(0, MAX_TWEET_LENGTH);
    const lastSpace = window.lastIndexOf(' ');

    if (lastSpace > 0) {
      // Word-boundary split
      tweets.push(remaining.slice(0, lastSpace));
      remaining = remaining.slice(lastSpace + 1);
    } else {
      // Hard cut at 280 — no spaces found
      tweets.push(remaining.slice(0, MAX_TWEET_LENGTH));
      remaining = remaining.slice(MAX_TWEET_LENGTH);
    }
  }

  if (remaining.length > 0) {
    tweets.push(remaining);
  }

  return tweets;
}

/**
 * Splits a string input into an ordered array of tweet strings,
 * each no longer than 280 characters.
 *
 * - Returns `[]` for empty or whitespace-only input.
 * - Returns `[input.trim()]` for inputs whose trimmed length is ≤ 280.
 * - Otherwise splits at paragraph boundaries (\n\n), then line boundaries (\n),
 *   then word boundaries (last space before 280), then hard-cuts at 280.
 */
export function tweetSplitter(input: string): string[] {
  const trimmed = input.trim();

  // P12: empty / whitespace-only → []
  if (trimmed.length === 0) {
    return [];
  }

  // P11: short input identity
  if (trimmed.length <= MAX_TWEET_LENGTH) {
    return [trimmed];
  }

  const tweets: string[] = [];

  // Step 3: split by paragraph boundaries (\n\n)
  const paragraphs = trimmed.split('\n\n');

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (trimmedParagraph.length === 0) {
      continue;
    }

    if (trimmedParagraph.length <= MAX_TWEET_LENGTH) {
      // Paragraph fits in one tweet
      tweets.push(trimmedParagraph);
    } else {
      // Step 4: split paragraph by single line breaks (\n)
      const lines = trimmedParagraph.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) {
          continue;
        }

        if (trimmedLine.length <= MAX_TWEET_LENGTH) {
          // Line fits in one tweet
          tweets.push(trimmedLine);
        } else {
          // Step 4 (continued): word-boundary or hard-cut split
          const splitTweets = splitLongSegment(trimmedLine);
          tweets.push(...splitTweets);
        }
      }
    }
  }

  return tweets;
}

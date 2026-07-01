// Feature: social-media-posting, Property 9: Tweet Splitter — all tweets within character limit

import * as fc from 'fast-check';
import { tweetSplitter } from '../tweetSplitter';

/**
 * Validates: Requirements 6.2, 5.1
 *
 * Property 9: Tweet Splitter — all tweets within character limit
 * For any non-empty input string, every element in the array returned by
 * tweetSplitter has a length of 280 characters or fewer.
 */

// Arbitrary that generates non-empty strings (at least 1 non-whitespace character)
const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 2000 })
  .filter((s) => s.trim().length > 0);

describe('Property 9: Tweet Splitter — all tweets within character limit', () => {
  it('every tweet in the output is at most 280 characters for any non-empty input', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (input) => {
        const tweets = tweetSplitter(input);

        // The result must be a non-empty array (since input is non-empty)
        expect(tweets.length).toBeGreaterThan(0);

        // Every tweet must be within the 280-character limit
        for (const tweet of tweets) {
          expect(tweet.length).toBeLessThanOrEqual(280);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: social-media-posting, Property 10: content preservation

/**
 * Validates: Requirements 6.3
 *
 * Property 10: Tweet Splitter — content preservation
 * For any non-empty input string, the concatenation of all elements returned by
 * tweetSplitter (after normalising whitespace) preserves all substantive content
 * from the input — no words are dropped or added.
 */

describe('Property 10: Tweet Splitter — content preservation', () => {
  it('concatenation of all tweets preserves all words from the input', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (input) => {
        const tweets = tweetSplitter(input);

        // Extract words from the original input (whitespace-normalised)
        const inputWords = input.trim().split(/\s+/).filter((w) => w.length > 0);

        // Extract words from the concatenated output
        const outputWords = tweets
          .join(' ')
          .split(/\s+/)
          .filter((w) => w.length > 0);

        // The word lists must be identical (same words, same order)
        expect(outputWords).toEqual(inputWords);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: social-media-posting, Property 11: Tweet Splitter — short input identity

/**
 * Validates: Requirements 6.4
 *
 * Property 11: Tweet Splitter — short input identity
 * For any input string whose trimmed length is 280 characters or fewer,
 * tweetSplitter returns an array containing exactly one element equal to
 * the trimmed input.
 */

// Arbitrary that generates strings whose trimmed length is between 1 and 280 characters
const shortNonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 280 })
  .filter((s) => s.trim().length > 0 && s.trim().length <= 280);

describe('Property 11: Tweet Splitter — short input identity', () => {
  it('returns a single-element array equal to the trimmed input for strings of 280 chars or fewer', () => {
    fc.assert(
      fc.property(shortNonEmptyStringArb, (input) => {
        const trimmed = input.trim();
        const tweets = tweetSplitter(input);

        // Must return exactly one tweet
        expect(tweets).toHaveLength(1);

        // That tweet must equal the trimmed input
        expect(tweets[0]).toBe(trimmed);
      }),
      { numRuns: 100 }
    );
  });

  it('handles inputs with leading/trailing whitespace correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 270 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 0, maxLength: 5 }).filter((s) => s.trim().length === 0),
        fc.string({ minLength: 0, maxLength: 5 }).filter((s) => s.trim().length === 0),
        (core, leading, trailing) => {
          const input = leading + core + trailing;
          // Only test if the trimmed result is still within 280 chars
          if (input.trim().length === 0 || input.trim().length > 280) return;

          const tweets = tweetSplitter(input);

          expect(tweets).toHaveLength(1);
          expect(tweets[0]).toBe(input.trim());
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: social-media-posting, Property 12: Tweet Splitter — empty/whitespace input returns empty array

/**
 * Validates: Requirements 6.5
 *
 * Property 12: Tweet Splitter — empty/whitespace input returns empty array
 * For any string composed entirely of whitespace characters (including the
 * empty string), tweetSplitter returns an empty array [].
 */

// Arbitrary that generates strings composed entirely of whitespace characters
// (spaces, tabs, newlines, carriage returns, form feeds, vertical tabs)
const whitespaceOnlyStringArb = fc.stringOf(
  fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'),
  { minLength: 0, maxLength: 100 }
);

describe('Property 12: Tweet Splitter — empty/whitespace input returns empty array', () => {
  it('returns [] for the empty string', () => {
    expect(tweetSplitter('')).toEqual([]);
  });

  it('returns [] for any whitespace-only string', () => {
    fc.assert(
      fc.property(whitespaceOnlyStringArb, (input) => {
        const result = tweetSplitter(input);
        expect(result).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });
});

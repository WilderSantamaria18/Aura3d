/**
 * lyricsParser.test.ts — Unit tests for Enhanced LRC parser
 *
 * Validates:
 * 1. Standard LRC parsing [mm:ss.xx]
 * 2. Enhanced LRC parsing with word-level tags <mm:ss.xx>
 * 3. Word start/end time calculations
 * 4. Fallback when no word-level tags exist
 * 5. Edge cases: empty lines, malformed tags, plain text
 */

import { LyricsService } from '../lyricsService';

function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Standard LRC (no word tags)
  const standardLrc = `
    [00:12.30] Primera linea de prueba
    [00:15.80] Segunda linea de prueba
  `;
  const res1 = LyricsService.parseEnhancedLRC(standardLrc);
  assert(res1.synced === true, 'Standard LRC: synced should be true');
  assert(res1.isWordSynced === false, 'Standard LRC: isWordSynced should be false');
  assert(res1.lines.length === 2, 'Standard LRC: should have 2 lines');
  assert(res1.lines[0].text === 'Primera linea de prueba', 'Standard LRC: first line text matches');
  assert(Math.abs(res1.lines[0].time - 12.3) < 0.01, 'Standard LRC: first line time matches');

  // Test 2: Enhanced LRC with word-level timestamps
  const enhancedLrc = `
    [01:05.20] <01:05.20> Auralis <01:05.80> Liquid <01:06.40> Glass
    [01:10.00] <01:10.00> Spatial <01:10.50> Audio
  `;
  const res2 = LyricsService.parseEnhancedLRC(enhancedLrc);
  assert(res2.synced === true, 'Enhanced LRC: synced should be true');
  assert(res2.isWordSynced === true, 'Enhanced LRC: isWordSynced should be true');
  assert(res2.lines.length === 2, 'Enhanced LRC: should have 2 lines');
  assert(res2.lines[0].words !== undefined, 'Enhanced LRC: line 0 has words');
  assert(res2.lines[0].words?.length === 3, 'Enhanced LRC: line 0 has 3 words');

  // Check word timestamps and text
  const words = res2.lines[0].words!;
  assert(words[0].text === 'Auralis', 'Enhanced LRC: word 0 text matches');
  assert(Math.abs(words[0].startTime - 65.2) < 0.01, 'Enhanced LRC: word 0 startTime matches');
  assert(Math.abs(words[0].endTime - 65.8) < 0.01, 'Enhanced LRC: word 0 endTime matches word 1 startTime');
  assert(words[1].text === 'Liquid', 'Enhanced LRC: word 1 text matches');
  assert(Math.abs(words[1].startTime - 65.8) < 0.01, 'Enhanced LRC: word 1 startTime matches');
  assert(Math.abs(words[1].endTime - 66.4) < 0.01, 'Enhanced LRC: word 1 endTime matches word 2 startTime');
  assert(words[2].text === 'Glass', 'Enhanced LRC: word 2 text matches');
  assert(words[2].endTime > words[2].startTime, 'Enhanced LRC: last word endTime > startTime');

  // Test 3: Empty string / invalid input
  const res3 = LyricsService.parseEnhancedLRC('');
  assert(res3.synced === false && res3.lines.length === 0, 'Empty string: handled safely');

  // Test 4: Plain text fallback
  const plainText = `
    Line one without timestamps
    Line two without timestamps
  `;
  const res4 = LyricsService.parseEnhancedLRC(plainText);
  assert(res4.synced === false, 'Plain text: synced should be false');
  assert(res4.lines.length === 2, 'Plain text: returns 2 lines');
  assert(res4.isWordSynced === false, 'Plain text: isWordSynced is false');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) throw new Error(`${failed} tests failed`);
}

runTests();

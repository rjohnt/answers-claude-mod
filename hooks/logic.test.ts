import { expect, test } from 'claude-code/testing'
import { askOf, headlineOf, isNoisePrompt } from './logic'

test('headline skips fences and strips markdown', () => {
  expect(headlineOf('```\ncode\n```\n**Merged** to `main`: [PR #8](http://x)')).toBe('code')
  expect(headlineOf('## Badging doc ready\nmore')).toBe('Badging doc ready')
})

test('ask is the last question sentence of the last paragraph', () => {
  expect(askOf('Done.\n\nWant me to deploy it? It needs your yes.')).toBe('Want me to deploy it?')
  expect(askOf('All merged.\n\nNothing waiting on you.')).toBe(null)
})

test('watcher digests and notices are not questions', () => {
  expect(isNoisePrompt('[hd watcher] 2 update(s) for master')).toBe(true)
  expect(isNoisePrompt('what is the prod url')).toBe(false)
})

import { bodyAfterHeadline } from './logic'
test('expanded body drops the headline line', () => {
  expect(bodyAfterHeadline('Headline here.\n\n- one\n- two')).toBe('- one\n- two')
})

import { summaryOf } from './logic'
test('summary keeps underscores and joins the first paragraph', () => {
  expect(summaryOf('Added `some__tool_name` to the list.\nIt stops prompting.\n\nMore.')).toBe('Added some__tool_name to the list. It stops prompting.')
})

import { clockTime } from './logic'
test('clock time is h:mm am/pm for a given zone', () => {
  expect(clockTime(Date.UTC(2026, 9, 6, 17, 10), 'America/Chicago')).toBe('12:10pm')
  expect(clockTime(Date.UTC(2026, 9, 6, 16, 34), 'America/Chicago')).toBe('11:34am')
})

import { stripPasteTags } from './logic'
test('paste wrappers are stripped so a pasted watcher digest is still noise', () => {
  const t = stripPasteTags('<pasted_content id="x">\n[hd watcher] 3 update(s)\n</pasted_content id="x">')
  expect(isNoisePrompt(t)).toBe(true)
  expect(stripPasteTags('how many words: "<pasted_content id="y">Hello there</pasted_content id="y">"')).toBe('how many words: "Hello there"')
})

import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Entry } from '../types'
import { askOf, bodyAfterHeadline, headlineOf, isNoisePrompt, shorten, summaryOf, clockTime, stripPasteTags } from './logic'

const PANE = 'answers'
const entries = atom({ plugin: 'answers', key: 'entries' } as const, [])
const pending = atom({ plugin: 'answers', key: 'pending' } as const, null)
const mainTurns = atom({ plugin: 'answers', key: 'mainTurns' } as const, [])
const expanded = atom({ plugin: 'answers', key: 'expanded' } as const, [])
const isBandHidden = atom({ plugin: 'answers', key: 'isBandHidden' } as const, false)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'answers', description: 'Show only my questions and the replies to them' })
    return next(e)
  })

  on('command.run', { command: 'answers' }, async $ => {
    await update($, isBandHidden, () => false)
    await $.ui.open({ id: PANE, title: 'Answers' })
    return { text: 'Answers pane opened.' }
  })

  // A prompt the user typed opens a new entry; its replies fill it. It also answers any open ask.
  on('prompt.submit', async ($, e, next) => {
    const text = stripPasteTags(e.text)
    if (!isNoisePrompt(text)) {
      try {
        const id = await $.clock.now()
        const entry: Entry = { id, at: id, question: shorten(text, 200), headline: '', answer: '', ask: null, isAskOpen: false }
        await update($, entries, list => [...list.map(x => (x.isAskOpen ? { ...x, isAskOpen: false } : x)), entry].slice(-150))
        await update($, pending, () => id)
      } catch {
        // Never block a prompt over bookkeeping.
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Only the main loop raises turn.start; subagent runs (their hand-back reports) don't.
  on('turn.start', async ($, e, next) => {
    await update($, mainTurns, list => [...(Array.isArray(list) ? list : []), e.turnId].slice(-50))
    return next(e)
  })

  // The main loop's reply to the user's latest prompt; a later reply to the same prompt replaces it.
  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    const turns: unknown = await read($, mainTurns)
    const isMain = e.loop === undefined && Array.isArray(turns) && turns.includes(e.turnId)
    const id = await read($, pending)
    if (isMain && id !== null && e.reason === 'answer' && e.answer.trim()) {
      const ask = askOf(e.answer)
      await update($, entries, list =>
        list.map(x => (x.id === id ? { ...x, headline: headlineOf(e.answer), answer: e.answer, ask, isAskOpen: ask !== null } : x)),
      )
    }
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = (await read($, entries)).filter(x => x.answer)
    const last = list[list.length - 1]
    if (e.props.hasSurvey || !last || (await read($, isBandHidden))) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const open = list.filter(x => x.isAskOpen)
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="cyan" bold>↳ </Text>
          <Text wrap="truncate-end">{last.headline}</Text>
        </Box>
        {open.length > 0 && (
          <Box>
            <Text wrap="wrap">
              <Text color="magenta" bold>Needs you: </Text>
              <Text bold>{open[open.length - 1].ask}</Text>
              {open.length > 1 && <Text dimColor> (+{open.length - 1} more)</Text>}
            </Text>
          </Box>
        )}
        <Box>
          <Button key="open" label="Answers" onPress={() => $.ui.open({ id: PANE, title: 'Answers' })} />
          <Text> </Text>
          <Button key="hide" label="Hide" onPress={() => update($, isBandHidden, () => true)} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const all = await read($, entries)
    const list = [...all].reverse().filter(x => !x.question.startsWith('(no prompt'))
    const rawOpen: unknown = await read($, expanded)
    const open = Array.isArray(rawOpen) ? (rawOpen as number[]) : []
    if (list.length === 0) return <Text dimColor>No answers yet. Your prompts and the replies to them collect here.</Text>
    return (
      <Box flexDirection="column">
        {list.map(x => {
          const isOpen = open.includes(x.id)
          return (
            <Box key={String(x.id)} flexDirection="column" marginBottom={1}>
              <Text dimColor>{clockTime(x.at)}</Text>
              <Text color="cyan" bold wrap="wrap">{x.question}</Text>
              <Box flexDirection="column">
                {x.answer ? (
                  <Box>
                    <Text wrap="wrap">
                      {x.isAskOpen && <Text color="magenta" bold>Needs you: </Text>}
                      {isOpen ? x.headline : summaryOf(x.answer)}
                    </Text>
                  </Box>
                ) : (
                  <Text dimColor>working on it…</Text>
                )}
                {isOpen && x.answer && <Text dimColor={false}>{bodyAfterHeadline(x.answer)}</Text>}
                {x.answer && (
                  <Button
                    key={`t${x.id}`}
                    label={isOpen ? 'Collapse' : 'Expand'}
                    onPress={() => update($, expanded, prev => { const ids = Array.isArray(prev) ? prev : []; return ids.includes(x.id) ? ids.filter(y => y !== x.id) : [...ids, x.id] })}
                  />
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  })
}

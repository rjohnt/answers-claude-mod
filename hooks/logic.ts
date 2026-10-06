// Pure helpers, kept apart so tests can run them without the engine.

/** Prompts the user didn't type as a question: watcher digests, task/agent notices. */
export function isNoisePrompt(text: string): boolean {
  const t = text.trimStart()
  return /^\[hd (watcher|MESSAGE|ANNOUNCEMENT)/.test(t) || /^<(task-notification|agent-message|system-reminder)/.test(t)
}

function clean(line: string): string {
  return line
    .replace(/^\s*(#{1,6}\s+|[-*•◦]\s+|>\s*)/, '')
    .replace(/\*\*|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

/** First meaningful line of a reply, markdown stripped, capped. */
export function headlineOf(answer: string, max = 160): string {
  for (const raw of answer.split('\n')) {
    if (/^\s*```/.test(raw)) continue
    const line = clean(raw)
    if (line) return line.length > max ? line.slice(0, max - 1) + '…' : line
  }
  return ''
}

/** The question the reply ends on, if its last paragraph asks the user something. */
export function askOf(answer: string, max = 200): string | null {
  const paras = answer.trim().split(/\n\s*\n/).filter(p => !/^\s*```/.test(p))
  const last = paras[paras.length - 1] ?? ''
  if (!last.includes('?')) return null
  const sentences = clean(last.replace(/\n/g, ' ')).split(/(?<=[.?!])\s+/)
  const q = [...sentences].reverse().find(s => s.trim().endsWith('?'))
  if (!q) return null
  const s = q.trim()
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export function shorten(text: string, max = 120): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? one.slice(0, max - 1) + '…' : one
}

/** The reply without its first meaningful line, so an expanded entry doesn't repeat its headline. */
export function bodyAfterHeadline(answer: string): string {
  const lines = answer.split('\n')
  const i = lines.findIndex(l => l.trim() && !/^\s*```/.test(l))
  return i < 0 ? answer : lines.slice(i + 1).join('\n').replace(/^\s*\n/, '')
}

/** The reply's opening paragraph (markdown stripped, joined, capped) for the collapsed view. */
export function summaryOf(answer: string, max = 420): string {
  const paras = answer.trim().split(/\n\s*\n/)
  for (const p of paras) {
    if (/^\s*```/.test(p)) continue
    const text = p.split('\n').map(clean).filter(Boolean).join(' ')
    if (text) return text.length > max ? text.slice(0, max - 1) + '…' : text
  }
  return ''
}

/** "12:10pm" in the given IANA time zone, or the system's local zone when omitted. */
export function clockTime(ms: number, timeZone?: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
    if (timeZone) opts.timeZone = timeZone
    return new Intl.DateTimeFormat('en-US', opts).format(new Date(ms)).replace(/\s/g, '').toLowerCase()
  } catch {
    const d = new Date(ms)
    const h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h % 12 || 12}:${m}${h < 12 ? 'am' : 'pm'}`
  }
}

/** Drop the <pasted_content …> wrapper tags the harness puts around pastes. */
export function stripPasteTags(text: string): string {
  return text.replace(/<\/?pasted_content[^>]*>/g, '').trim()
}

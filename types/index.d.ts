export type Entry = {
  id: number
  at: number
  question: string
  headline: string
  answer: string
  ask: string | null
  isAskOpen: boolean
}

declare module 'claude-code' {
  interface PluginState {
    answers: {
      entries: Entry[]
      pending: number | null
      mainTurns: string[]
      expanded: number[]
      isBandHidden: boolean
    }
  }
}

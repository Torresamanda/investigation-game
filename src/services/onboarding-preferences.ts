const INTRODUCTION_SEEN_KEY = 'arquivos-limiar:introduction-seen'
const TABLE_TOUR_SEEN_KEY = 'arquivos-limiar:table-tour-seen'

function readPreference(key: string): boolean {
  return typeof window !== 'undefined' && window.localStorage.getItem(key) === 'true'
}

function savePreference(key: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, 'true')
}

export function hasSeenIntroduction(): boolean {
  return readPreference(INTRODUCTION_SEEN_KEY)
}

export function markIntroductionSeen(): void {
  savePreference(INTRODUCTION_SEEN_KEY)
}

export function hasSeenTableTour(): boolean {
  return readPreference(TABLE_TOUR_SEEN_KEY)
}

export function markTableTourSeen(): void {
  savePreference(TABLE_TOUR_SEEN_KEY)
}

export function getTodaysCT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())
}

export function getTomorrowCT(): string {
  const [y, m, d] = getTodaysCT().split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split('T')[0]
}

export function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export function getYesterdayCT(): string {
  return dayBefore(getTodaysCT())
}

export function nDaysBefore(n: number, dateStr: string): string {
  let d = dateStr
  for (let i = 0; i < n; i++) d = dayBefore(d)
  return d
}

export function dayAfter(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function nDaysAfter(n: number, dateStr: string): string {
  let d = dateStr
  for (let i = 0; i < n; i++) d = dayAfter(d)
  return d
}

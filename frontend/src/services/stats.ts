import { fetchJSON } from './api'

export function clientsActiveCount() {
  return fetchJSON('/api/stats/clients-active') as Promise<{count:number}>
}

export function activitiesPerWeek(weeks = 12) {
  return fetchJSON(`/api/stats/activities-per-week?weeks=${weeks}`) as Promise<Array<{weekStart:string;count:number}>>
}

export function upcomingActivities(limit = 10) {
  return fetchJSON(`/api/stats/upcoming?limit=${limit}`) as Promise<any[]>
}

export function clientsNoRecent(days = 30) {
  return fetchJSON(`/api/stats/clients-no-recent?days=${days}`) as Promise<any[]>
}

export function clientsOverTime(days = 30) {
  return fetchJSON(`/api/stats/clients-over-time?days=${days}`) as Promise<Array<{date:string;total:number}>>
}

export function activitiesByType(days = 30) {
  return fetchJSON(`/api/stats/activities-by-type?days=${days}`) as Promise<Array<{type:string;count:number}>>
}

export function mostFrequentActivities(days = 30, limit = 10) {
  return fetchJSON(`/api/stats/most-frequent-activities?days=${days}&limit=${limit}`) as Promise<Array<{type:string;count:number}>>
}

export function activityFrequency(days = 7) {
  return fetchJSON(`/api/stats/activity-frequency?days=${days}`) as Promise<Array<{date:string;count:number}>>
}

export function clientsMostAtRisk(limit = 10) {
  return fetchJSON(`/api/stats/clients-most-at-risk?limit=${limit}`) as Promise<Array<{client:any;health:any}>>
}

export function avgTimeBetweenContacts(days = 365) {
  return fetchJSON(`/api/stats/avg-time-between-contacts?days=${days}`) as Promise<{ overallAvgDays: number | null; perClient: Array<{clientId:string;name:string;avgDays:number|null;samples:number}> }>
}

export function churnedPerMonth(months = 12) {
  return fetchJSON(`/api/stats/churned-per-month?months=${months}`) as Promise<Array<{month:string;count:number}>>
}
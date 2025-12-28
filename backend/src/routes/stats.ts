import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { clientsActiveCount, activitiesPerWeek, upcomingActivities, clientsNoRecent, clientsOverTime, activitiesByType, activityFrequency, mostFrequentActivities, clientsMostAtRisk, avgTimeBetweenContacts, churnedPerMonth } from '../controllers/statsController'

const router = Router()
router.use(requireAuth)

router.get('/clients-active', clientsActiveCount)
router.get('/activities-per-week', activitiesPerWeek)
router.get('/upcoming', upcomingActivities)
router.get('/clients-no-recent', clientsNoRecent)

// analytics new
router.get('/clients-over-time', clientsOverTime)
router.get('/activities-by-type', activitiesByType)
router.get('/most-frequent-activities', mostFrequentActivities)
router.get('/activity-frequency', activityFrequency)
router.get('/clients-most-at-risk', clientsMostAtRisk)
router.get('/avg-time-between-contacts', avgTimeBetweenContacts)
router.get('/churned-per-month', churnedPerMonth)

export default router

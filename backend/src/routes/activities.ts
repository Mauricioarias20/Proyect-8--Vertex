import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { createActivity, listActivities, updateActivity, deleteActivity, recentActivities } from '../controllers/activitiesController'

const router = Router()

router.use(requireAuth)

router.get('/', listActivities)
router.get('/recent', recentActivities)
router.post('/', createActivity)
router.put('/:id', updateActivity)
router.delete('/:id', deleteActivity)

export default router

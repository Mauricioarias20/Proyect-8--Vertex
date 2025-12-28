import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { listTeam, updateMember } from '../controllers/authController'

const router = Router()

router.get('/', requireAuth, listTeam)
router.put('/:email', requireAuth, updateMember)

export default router

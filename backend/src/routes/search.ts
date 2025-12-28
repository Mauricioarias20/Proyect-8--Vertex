import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { globalSearch } from '../controllers/searchController'

const router = Router()
router.use(requireAuth)
router.get('/', globalSearch)

export default router

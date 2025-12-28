import { Router } from 'express'
import { requireAuth, requireRoles, requireOwner } from '../middleware/auth'
import { createClient, listClients, updateClient, deleteClient, getAtRiskClients, getClientHealth, getClientTimeline, getNextAction, archiveClient, unarchiveClient } from '../controllers/clientsController'

const router = Router()

// Allow owners, managers and staff to create clients (dev: permissive)
router.post('/', requireAuth, requireRoles('owner','manager','staff'), createClient)
router.get('/at-risk', requireAuth, getAtRiskClients)
router.get('/', requireAuth, listClients)
router.get('/:id/health', requireAuth, getClientHealth)
router.get('/:id/timeline', requireAuth, getClientTimeline)
router.get('/:id/next-action', requireAuth, getNextAction)
router.post('/:id/archive', requireAuth, requireRoles('owner','manager','staff'), archiveClient)
router.post('/:id/unarchive', requireAuth, requireRoles('owner','manager','staff'), unarchiveClient)
router.put('/:id', requireAuth, requireOwner, updateClient)
router.delete('/:id', requireAuth, requireOwner, deleteClient)

export default router

import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { createNote, listNotes, deleteNote } from '../controllers/notesController'

const router = Router()

router.use(requireAuth)

router.post('/', createNote)
router.get('/', listNotes)
router.delete('/:id', deleteNote)

export default router

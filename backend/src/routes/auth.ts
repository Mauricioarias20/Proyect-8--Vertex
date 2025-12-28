import { Router } from 'express'
import { register, login } from '../controllers/authController'

const router = Router()

// Register: username, email, password
router.post('/register', register)
// Login: email, password
router.post('/login', login)

export default router

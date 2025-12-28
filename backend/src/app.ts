import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import clientsRoutes from './routes/clients'
import activitiesRoutes from './routes/activities'
import statsRoutes from './routes/stats'
import notesRoutes from './routes/notes'
import searchRoutes from './routes/search'
import teamRoutes from './routes/team'
import debugRoutes from './routes/debug'

const app = express()

// Force CORS headers for all responses and handle OPTIONS preflight early.
// This ensures the Access-Control-Allow-* headers are present even if a
// proxy or other layer interferes.
app.use((req, res, next) => {
	const allowedOrigin = 'https://proyect-8-vertex.vercel.app'
	res.header('Access-Control-Allow-Origin', allowedOrigin)
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
	res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
	res.header('Access-Control-Allow-Credentials', 'true')
	if (req.method === 'OPTIONS') return res.sendStatus(204)
	next()
})

// Keep express.json after CORS handling
app.use(express.json())

app.get('/health', (req, res) => res.json({status: 'ok'}))
// Root route to make the deployment URL respond with a friendly message
app.get('/', (req, res) => res.send('API running — proyect-8-vertex'))
app.use('/api/auth', authRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/activities', activitiesRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/debug', debugRoutes)

export default app

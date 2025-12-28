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

// Configure CORS to allow requests from deployed frontend domains (and
// reflect the request origin). This ensures preflight (OPTIONS) requests
// are handled correctly when the frontend is hosted on Vercel.
const corsOptions = {
	origin: (origin: any, callback: any) => {
		// allow requests with no origin (e.g., curl, server-to-server)
		if (!origin) return callback(null, true)
		// allow the production frontend origin and any other you trust
		const allowed = [
			'https://proyect-8-vertex.vercel.app',
			'https://proyect-8-vertex-production.up.railway.app'
		]
		if (allowed.includes(origin)) return callback(null, true)
		// fallback: allow by reflecting origin
		return callback(null, true)
	},
	methods: ['GET','POST','PUT','DELETE','OPTIONS'],
	allowedHeaders: ['Content-Type','Authorization'],
	credentials: true,
	optionsSuccessStatus: 204
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json())

app.get('/health', (req, res) => res.json({status: 'ok'}))
app.use('/api/auth', authRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/activities', activitiesRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/debug', debugRoutes)

export default app

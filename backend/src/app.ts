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

app.use(cors())
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

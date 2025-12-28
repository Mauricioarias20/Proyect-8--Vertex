import app from './app'
import seedAllOrgs from './store/seed'

const PORT = parseInt(process.env.PORT || '4000', 10) || 4000
const HOST = process.env.HOST || '0.0.0.0'

// Ensure demo seeds are applied on startup
const seedRes = seedAllOrgs()
console.log('Seed summary:', seedRes)

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`)
})

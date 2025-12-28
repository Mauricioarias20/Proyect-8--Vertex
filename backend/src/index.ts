import app from './app'
import seedAllOrgs from './store/seed'

// Railway runs apps on port 8080 by default; prefer env PORT but fall back
// to 8080 to match the platform if PORT is not provided.
const PORT = parseInt(process.env.PORT || '8080', 10) || 8080
const HOST = process.env.HOST || '0.0.0.0'

// Ensure demo seeds are applied on startup (guard against errors so the
// server doesn't crash during boot).
try {
  const seedRes = seedAllOrgs()
  console.log('Seed summary:', seedRes)
} catch (err) {
  console.error('Seed failed:', err)
}

// global error handlers to improve visibility in platform logs
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err)
  // allow platform to restart the process
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason)
})

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`)
})

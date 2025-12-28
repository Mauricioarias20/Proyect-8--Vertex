import app from './app'
import seedAllOrgs from './store/seed'

const PORT = process.env.PORT || 4000

// Ensure demo seeds are applied on startup
const seedRes = seedAllOrgs()
console.log('Seed summary:', seedRes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

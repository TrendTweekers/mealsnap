// Simple script to get emails from Vercel KV
// Run with: node scripts/get-emails.js

const { kv } = require('@vercel/kv')

async function getEmails() {
  try {
    // Get all email keys
    const emailKeys = await kv.keys('email:*')
    
    console.log(`Found ${emailKeys.length} email keys`)
    
    // Fetch all email data
    const emails = await Promise.all(
      emailKeys.map(async (key) => {
        const data = await kv.get(key)
        return data
      })
    )

    // Filter out nulls and sort by date
    const validEmails = emails
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    console.log('\n📧 Email Addresses:')
    console.log('='.repeat(50))
    validEmails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.email}`)
      console.log(`   Source: ${email.source || 'unknown'}`)
      console.log(`   Date: ${new Date(email.createdAt || 0).toLocaleString()}`)
      console.log('')
    })
    
    console.log(`\nTotal: ${validEmails.length} emails`)
    
    // Also get waitlist set
    const waitlistSet = await kv.smembers('waitlist:emails')
    console.log(`\nWaitlist set size: ${waitlistSet.length}`)
    if (waitlistSet.length > 0) {
      console.log('Waitlist emails:', waitlistSet)
    }
    
  } catch (err) {
    console.error('Error fetching emails:', err)
    console.log('\n💡 Alternative: Use the admin API endpoint:')
    console.log('   curl https://mealsnap-chi.vercel.app/api/admin/waitlist')
  }
}

getEmails()


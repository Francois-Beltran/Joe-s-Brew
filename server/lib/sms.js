// SMS Gateway: sms-gate.app (Android app running on the shop's Android device)
// Required env vars: SMS_GATEWAY_URL, SMS_API_KEY, ADMIN_PHONE_NUMBERS,
//                    BRANCH_PHONE_COGTONG, BRANCH_PHONE_CANDIJAY
// SMS_API_KEY format: "username:password"

function getAdminPhones() {
  return (process.env.ADMIN_PHONE_NUMBERS || '')
    .split(',').map(p => p.trim()).filter(Boolean)
}

function getBranchPhone(branchId) {
  const map = {
    cogtong:  process.env.BRANCH_PHONE_COGTONG,
    candijay: process.env.BRANCH_PHONE_CANDIJAY,
  }
  return map[branchId] || null
}

// Returns: [branchPhone (if mapped), ...adminPhones]
// Branch phone is ONLY added when branchId matches — never cross-branch.
export function buildNotifyList(branchId) {
  const phones = getAdminPhones()
  const branchPhone = getBranchPhone(branchId)
  if (branchPhone && !phones.includes(branchPhone)) phones.unshift(branchPhone)
  return phones
}

// sms-gate.app requires E.164 international format (+639XXXXXXXXX).
// Convert Philippine local format (09XXXXXXXXX) automatically.
function toE164(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('09') && digits.length === 11) return '+63' + digits.slice(1)
  if (digits.startsWith('639') && digits.length === 12) return '+' + digits
  return phone // already +63... or unknown — pass through as-is
}

// Send SMS to a single phone number via sms-gate.app.
export async function sendSMS(phoneNumber, message) {
  const url = process.env.SMS_GATEWAY_URL
  const basicAuth = Buffer.from(process.env.SMS_API_KEY).toString('base64')
  const e164 = toE164(phoneNumber)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ phoneNumbers: [e164], message }),
  })

  const rawText = await res.text()
  if (!res.ok) throw new Error(`SMS Gateway error (${e164}): ${rawText}`)
  return rawText ? JSON.parse(rawText) : { status: res.status }
}

// Send the same message to every recipient on the notify list in parallel.
// Each number gets its own request — sms-gate.app handles them concurrently,
// so total time ≈ one request (~850ms) instead of N × 850ms sequentially.
export async function sendSMSToNotifyList(branchId, message) {
  const phones = buildNotifyList(branchId)
  console.log(`[SMS] Dispatching to ${phones.length} recipient(s) (branch: ${branchId}):`, phones)
  await Promise.allSettled(phones.map(async phone => {
    try {
      await sendSMS(phone, message)
      console.log(`[SMS] ✓ Delivered to ${toE164(phone)}`)
    } catch (err) {
      console.error(`[SMS] ✗ Failed for ${toE164(phone)}:`, err.message)
    }
  }))
}

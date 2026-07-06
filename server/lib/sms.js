// SMS Gateway: sms-gate.app (Android app running on the shop's Android device)
// SMS_GATEWAY_URL and SMS_API_KEY must be set in server/.env (and Render env vars).
// SMS_API_KEY format: "username:password"
//
// IMPORTANT: sms-gate.app only reliably delivers to ONE phoneNumber per request.
// sendSMSToNotifyList sends one sequential request per recipient to guarantee delivery.

const CO_ADMIN_PHONES = ['09653280300', '09275165980', '09173011678']

const BRANCH_PHONES = {
  cogtong:  '09936040934',
  candijay: '09928125498',
}

export function buildNotifyList(branchId) {
  const phones = [...CO_ADMIN_PHONES]
  const branchPhone = BRANCH_PHONES[branchId]
  if (branchPhone && !phones.includes(branchPhone)) phones.unshift(branchPhone)
  return phones
}

// Send SMS to a single phone number.
export async function sendSMS(phoneNumber, message) {
  const url = process.env.SMS_GATEWAY_URL
  const basicAuth = Buffer.from(process.env.SMS_API_KEY).toString('base64')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ phoneNumbers: [phoneNumber], message }),
  })

  const rawText = await res.text()
  if (!res.ok) throw new Error(`SMS Gateway error (${phoneNumber}): ${rawText}`)
  return rawText ? JSON.parse(rawText) : { status: res.status }
}

// Send the same message to every recipient on the notify list.
// Fires one sequential request per number — sms-gate.app only processes
// one phoneNumber reliably per API call.
export async function sendSMSToNotifyList(branchId, message) {
  const phones = buildNotifyList(branchId)
  const results = []
  for (const phone of phones) {
    try {
      const result = await sendSMS(phone, message)
      results.push({ phone, ok: true, result })
    } catch (err) {
      console.error(`SMS failed for ${phone}:`, err.message)
      results.push({ phone, ok: false, error: err.message })
    }
  }
  return results
}

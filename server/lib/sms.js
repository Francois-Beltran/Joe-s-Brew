// SMS Gateway: sms-gate.app (Android app running on the shop's Android device)
// SMS_GATEWAY_URL and SMS_API_KEY must be set in server/.env (or Render env vars).
// SMS_API_KEY format: "username:password"

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

// phoneNumbers: a single '09XXXXXXXXX' string OR an array of strings.
// Sends ONE API request — sms-gate.app accepts an array in `phoneNumbers`.
export async function sendSMS(phoneNumbers, message) {
  const url = process.env.SMS_GATEWAY_URL
  const numbers = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers]
  const basicAuth = Buffer.from(process.env.SMS_API_KEY).toString('base64')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ phoneNumbers: numbers, message }),
  })

  const rawText = await res.text()
  if (!res.ok) throw new Error(`SMS Gateway error: ${rawText}`)
  return rawText ? JSON.parse(rawText) : { status: res.status }
}

// Sends one SMS to every recipient on the notify list in a single API call.
export async function sendSMSToNotifyList(branchId, message) {
  return sendSMS(buildNotifyList(branchId), message)
}

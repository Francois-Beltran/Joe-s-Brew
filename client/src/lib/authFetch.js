// Returns a fetch wrapper that:
// 1. Injects the correct session token header automatically
// 2. On 401: clears the stale token and reloads (forces re-login via Guard)
export function createAuthFetch(tokenKey) {
  return async function authFetch(url, options = {}) {
    const token = sessionStorage.getItem(tokenKey)
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'X-Session-Token': token || '',
      },
    })
    if (res.status === 401) {
      sessionStorage.removeItem(tokenKey)
      window.location.reload() // Guard re-checks sessionStorage → shows login form
      return null
    }
    return res
  }
}

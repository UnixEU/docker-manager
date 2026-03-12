import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensures the httpOnly session cookie is sent on every same-origin request.
  // No Authorization header needed — the cookie is handled automatically by the browser.
  withCredentials: true,
})

// Response interceptor: redirect to login on 401 (session expired / not authenticated)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loop if already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

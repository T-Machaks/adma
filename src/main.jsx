import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { seedIfEmpty } from '@/lib/seedData.js'

seedIfEmpty()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Register stub service worker for PWA installability.
// Replace sw.js with a caching strategy before go-live.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failed — app still works as a normal web app.
    })
  })
}

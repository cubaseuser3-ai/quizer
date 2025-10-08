import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './utils/consoleLogger' // Initialisiere Console Logger
import { startVersionCheck } from './utils/versionCheck' // Version Check

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Starte automatischen Version Check
startVersionCheck()

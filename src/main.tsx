import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Easter egg: Console ASCII art
console.log(`
%c⚡ Energy Data Explorer ⚡
%c
    \\\\|//
     |||
   .-|||-.
   | ||| |      Welcome, curious developer!
   '-|||-'
     |||        You found the console easter egg.
     |||
    /|||\\       Try these other secrets:
   / ||| \\      • Click the logo for lightning
  /  |||  \\     • TX only, click 2021... brrrr
 /   |||   \\
/    |||    \\
=====|||=====
     |||        Built with ⚡ by Bottlenecks Labs
    =====
`,
  'color: #e9c46a; font-size: 16px; font-weight: bold;',
  'color: #2a9d8f; font-family: monospace;'
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- SUPPRESS EXTERNAL SDK NOISE ---
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

const shouldSuppress = (args) => {
  const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || a?.toString() || ''))).join(' ');
  return /lumberjack|sentry|blocked|unsafe header|ERR_BLOCKED_BY_CLIENT|404|x-rtb-fingerprint-id/.test(msg);
};

console.error = (...args) => {
  if (shouldSuppress(args)) return;
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  if (shouldSuppress(args)) return;
  originalWarn.call(console, ...args);
};
// -----------------------------------

createRoot(document.getElementById('root')).render(

  <App />

)

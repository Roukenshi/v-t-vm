import { Buffer } from 'node:buffer';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

(globalThis as any).Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <App />
);


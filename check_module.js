import { readFileSync } from 'fs';
try {
  await import('file:///F:/EXCELABu/excelabu/js/src/public.js');
  console.log('OK');
} catch(e) {
  console.log('Error:', e.message);
  console.log('Stack:', e.stack);
}
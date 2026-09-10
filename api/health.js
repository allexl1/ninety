import { ALLOW } from './_allow.js';

export default function handler(req, res) {
  if (!ALLOW.has('health')) {
    res.status(404).json({ ok: false, error: 'NOT_FOUND', retryable: true });
    return;
  }
  res.status(200).json({ ok: true, env: 'prod', game: 'NINETY' });
}

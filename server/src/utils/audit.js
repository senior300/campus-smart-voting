import { query } from '../config/db.js';

export async function audit(userId, action, details = {}) {
  await query(
    'INSERT INTO audit_logs (user_id, action, details) VALUES (:userId, :action, :details)',
    { userId, action, details: JSON.stringify(details) }
  );
}

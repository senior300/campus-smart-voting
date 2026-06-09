import express from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

const electionSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(['draft', 'active', 'closed']).default('draft')
});

const positionSchema = z.object({
  title: z.string().min(3).max(120),
  displayOrder: z.number().int().optional()
});

const candidateSchema = z.object({
  fullName: z.string().min(3).max(120),
  studentNo: z.string().max(40).optional(),
  department: z.string().max(120).optional(),
  manifesto: z.string().optional(),
  photoUrl: z.string().url().optional()
});

router.get('/overview', async (_req, res, next) => {
  try {
    const [stats] = await query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
        (SELECT COUNT(*) FROM elections) AS elections,
        (SELECT COUNT(*) FROM candidates) AS candidates,
        (SELECT COUNT(*) FROM ballots) AS ballots`
    );
    const logs = await query(
      `SELECT l.id, l.action, l.details, l.created_at, u.full_name
       FROM audit_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT 12`
    );
    res.json({ stats, logs });
  } catch (error) {
    next(error);
  }
});

router.post('/elections', async (req, res, next) => {
  try {
    const payload = electionSchema.parse(req.body);
    const result = await query(
      `INSERT INTO elections (title, description, starts_at, ends_at, status)
       VALUES (:title, :description, :startsAt, :endsAt, :status)`,
      { ...payload, description: payload.description || null }
    );
    await audit(req.user.id, 'election_created', { electionId: result.insertId });
    res.status(201).json({ id: result.insertId, message: 'Election created.' });
  } catch (error) {
    next(error);
  }
});

router.post('/elections/:electionId/positions', async (req, res, next) => {
  try {
    const payload = positionSchema.parse(req.body);
    const result = await query(
      `INSERT INTO positions (election_id, title, display_order)
       VALUES (:electionId, :title, :displayOrder)`,
      {
        electionId: req.params.electionId,
        title: payload.title,
        displayOrder: payload.displayOrder || 0
      }
    );
    await audit(req.user.id, 'position_created', { positionId: result.insertId });
    res.status(201).json({ id: result.insertId, message: 'Position created.' });
  } catch (error) {
    next(error);
  }
});

router.post('/positions/:positionId/candidates', async (req, res, next) => {
  try {
    const payload = candidateSchema.parse(req.body);
    const result = await query(
      `INSERT INTO candidates (position_id, full_name, student_no, department, manifesto, photo_url)
       VALUES (:positionId, :fullName, :studentNo, :department, :manifesto, :photoUrl)`,
      {
        positionId: req.params.positionId,
        fullName: payload.fullName,
        studentNo: payload.studentNo || null,
        department: payload.department || null,
        manifesto: payload.manifesto || null,
        photoUrl: payload.photoUrl || null
      }
    );
    await audit(req.user.id, 'candidate_created', { candidateId: result.insertId });
    res.status(201).json({ id: result.insertId, message: 'Candidate created.' });
  } catch (error) {
    next(error);
  }
});

export default router;

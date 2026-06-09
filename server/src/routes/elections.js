import express from 'express';
import { customAlphabet } from 'nanoid';
import { pool, query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const receiptCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const elections = await query(
      `SELECT e.*,
        EXISTS(SELECT 1 FROM ballots b WHERE b.election_id = e.id AND b.voter_id = :userId) AS has_voted
       FROM elections e
       ORDER BY e.starts_at DESC`,
      { userId: req.user.id }
    );
    res.json({ elections });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const elections = await query('SELECT * FROM elections WHERE id = :id', { id: req.params.id });
    const election = elections[0];

    if (!election) {
      return res.status(404).json({ message: 'Election not found.' });
    }

    const positions = await query(
      `SELECT p.id, p.title, p.display_order,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', c.id,
            'fullName', c.full_name,
            'studentNo', c.student_no,
            'department', c.department,
            'manifesto', c.manifesto,
            'photoUrl', c.photo_url
          )
        ) AS candidates
       FROM positions p
       LEFT JOIN candidates c ON c.position_id = p.id
       WHERE p.election_id = :id
       GROUP BY p.id
       ORDER BY p.display_order, p.id`,
      { id: req.params.id }
    );

    const ballot = await query(
      'SELECT receipt_code, submitted_at FROM ballots WHERE election_id = :id AND voter_id = :userId LIMIT 1',
      { id: req.params.id, userId: req.user.id }
    );

    const normalizedPositions = positions.map((position) => {
      const candidates = typeof position.candidates === 'string'
        ? JSON.parse(position.candidates)
        : position.candidates;

      return {
        ...position,
        candidates: (candidates || []).filter((candidate) => candidate?.id)
      };
    });

    res.json({ election, positions: normalizedPositions, ballot: ballot[0] || null });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/vote', requireAuth, async (req, res, next) => {
  const electionId = Number(req.params.id);
  const selections = req.body.selections || {};
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [electionRows] = await connection.execute(
      `SELECT * FROM elections
       WHERE id = ? AND status = 'active' AND NOW() BETWEEN starts_at AND ends_at
       FOR UPDATE`,
      [electionId]
    );

    if (!electionRows[0]) {
      await connection.rollback();
      return res.status(400).json({ message: 'This election is not open for voting.' });
    }

    const [existing] = await connection.execute(
      'SELECT id FROM ballots WHERE election_id = ? AND voter_id = ? LIMIT 1',
      [electionId, req.user.id]
    );

    if (existing[0]) {
      await connection.rollback();
      return res.status(409).json({ message: 'You have already voted in this election.' });
    }

    const [positions] = await connection.execute('SELECT id FROM positions WHERE election_id = ?', [electionId]);
    const positionIds = positions.map((position) => String(position.id));
    const selectedPositionIds = Object.keys(selections);

    if (positionIds.length === 0 || selectedPositionIds.length !== positionIds.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Please vote for every position.' });
    }

    for (const positionId of positionIds) {
      const candidateId = Number(selections[positionId]);
      const [candidate] = await connection.execute(
        `SELECT c.id FROM candidates c
         INNER JOIN positions p ON p.id = c.position_id
         WHERE c.id = ? AND p.id = ? AND p.election_id = ?
         LIMIT 1`,
        [candidateId, Number(positionId), electionId]
      );

      if (!candidate[0]) {
        await connection.rollback();
        return res.status(400).json({ message: 'Invalid candidate selection.' });
      }
    }

    const code = receiptCode();
    const [ballotResult] = await connection.execute(
      'INSERT INTO ballots (election_id, voter_id, receipt_code) VALUES (?, ?, ?)',
      [electionId, req.user.id, code]
    );

    for (const positionId of positionIds) {
      await connection.execute(
        'INSERT INTO votes (ballot_id, position_id, candidate_id) VALUES (?, ?, ?)',
        [ballotResult.insertId, Number(positionId), Number(selections[positionId])]
      );
    }

    await connection.execute(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'ballot_submitted', JSON.stringify({ electionId, receiptCode: code })]
    );

    await connection.commit();
    res.status(201).json({ message: 'Vote submitted successfully.', receiptCode: code });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.get('/:id/results', requireAuth, async (req, res, next) => {
  try {
    const results = await query(
      `SELECT p.id AS position_id, p.title AS position_title, c.id AS candidate_id,
        c.full_name, c.department, COUNT(v.id) AS vote_count
       FROM positions p
       INNER JOIN candidates c ON c.position_id = p.id
       LEFT JOIN votes v ON v.candidate_id = c.id
       WHERE p.election_id = :id
       GROUP BY p.id, c.id
       ORDER BY p.display_order, vote_count DESC, c.full_name`,
      { id: req.params.id }
    );

    const turnout = await query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS eligible_voters,
        (SELECT COUNT(*) FROM ballots WHERE election_id = :id) AS ballots_cast`,
      { id: req.params.id }
    );

    res.json({ results, turnout: turnout[0] });
  } catch (error) {
    next(error);
  }
});

export default router;

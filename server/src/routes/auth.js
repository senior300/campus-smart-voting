import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = express.Router();

const registerSchema = z.object({
  studentNo: z
    .string()
    .trim()
    .min(4, 'Registration number is required.')
    .max(40)
    .regex(/^[A-Za-z0-9/-]+$/, 'Registration number can only contain letters, numbers, slashes, or dashes.'),
  fullName: z.string().min(3).max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(160)
    .refine((email) => email.endsWith('.ttu.ac.ke'), {
      message: 'Use your official school email ending with .ttu.ac.ke.'
    }),
  password: z.string().min(6),
  department: z.string().max(120).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function signUser(user) {
  return jwt.sign(
    { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    await query(
      `INSERT INTO users (student_no, full_name, email, password_hash, department)
       VALUES (:studentNo, :fullName, :email, :passwordHash, :department)`,
      { ...payload, passwordHash, department: payload.department || null }
    );

    await audit(null, 'student_registered', { email: payload.email, studentNo: payload.studentNo });
    res.status(201).json({ message: 'Student account created.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Student number or email already exists.' });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const users = await query('SELECT * FROM users WHERE email = :email LIMIT 1', { email: payload.email });
    const user = users[0];

    if (!user || !(await bcrypt.compare(payload.password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signUser(user);
    await audit(user.id, 'user_logged_in');
    res.json({
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;

# Campus Online Voting System

A full-stack student election project built with React, Node.js/Express, and MySQL. It reduces paper ballots by letting verified students vote online while protecting one-student-one-vote rules and keeping an audit trail for election officials.

## Features

- Student registration and login
- JWT-based sessions
- Admin and student roles
- Election, position, and candidate database model
- One vote per student per election
- Ballot receipt code after successful submission
- Results and voter turnout dashboard
- Admin overview with audit logs
- MySQL schema with sample election data

## Project Structure

```text
campus-voting-system/
  client/        React + Vite frontend
  server/        Express API
    database/    MySQL schema and seed data
```

## Setup

1. Create the database:

```bash
mysql -u root -p < server/database/schema.sql
```

2. Configure the API:

```bash
cd server
copy .env.example .env
```

Edit `.env` if your MySQL username, password, or port is different.

3. Install and run the backend:

```bash
cd server
npm install
npm run dev
```

4. Install and run the frontend in another terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo Accounts

Admin:

```text
Email: demo@ttu.ac.ke
Password: ExamplePassword123
```

Students can register from the login screen using their registration number and an official school email ending with `.ttu.ac.ke`.

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/elections`
- `GET /api/elections/:id`
- `POST /api/elections/:id/vote`
- `GET /api/elections/:id/results`
- `GET /api/admin/overview`
- `POST /api/admin/elections`
- `POST /api/admin/elections/:electionId/positions`
- `POST /api/admin/positions/:positionId/candidates`

## Security Notes

This is a strong academic project foundation. For a real campus deployment, add school email OTP verification, HTTPS, stricter admin workflows, database backups, rate limiting, and independent election auditing.

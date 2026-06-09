CREATE DATABASE IF NOT EXISTS campus_voting;
USE campus_voting;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_no VARCHAR(40) UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  department VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE elections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

CREATE TABLE candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_id INT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  student_no VARCHAR(40),
  department VARCHAR(120),
  manifesto TEXT,
  photo_url VARCHAR(500),
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
);

CREATE TABLE ballots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  voter_id INT NOT NULL,
  receipt_code VARCHAR(32) NOT NULL UNIQUE,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_voter_election (election_id, voter_id),
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ballot_id INT NOT NULL,
  position_id INT NOT NULL,
  candidate_id INT NOT NULL,
  FOREIGN KEY (ballot_id) REFERENCES ballots(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(120) NOT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO users (student_no, full_name, email, password_hash, role, department)
VALUES (
  'ADMIN001',
  'Election Administrator',
  'ogelobilly12@gmail.com',
  '$2a$10$touW6ic0uLxoPoQnRy.gLe4OPbY5dJFagmbXnba50D112n3s40feC',
  'admin',
  'ICT'
);

INSERT INTO elections (title, description, starts_at, ends_at, status)
VALUES (
  'Student Council Election 2026',
  'Main campus election for student leaders.',
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  DATE_ADD(NOW(), INTERVAL 7 DAY),
  'active'
);

INSERT INTO positions (election_id, title, display_order)
VALUES
  (1, 'President', 1),
  (1, 'Secretary General', 2),
  (1, 'Treasurer', 3);

INSERT INTO candidates (position_id, full_name, student_no, department, manifesto, photo_url)
VALUES
  (1, 'Amina Otieno', 'SCT101', 'Computer Science', 'Transparent leadership, better Wi-Fi, and faster student services.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'),
  (1, 'Brian Mwangi', 'SCT102', 'Business', 'Accountable budgeting and stronger clubs support.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'),
  (2, 'Grace Wanjiru', 'SCT201', 'Education', 'Clear communication between students and administration.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80'),
  (2, 'Daniel Kiptoo', 'SCT202', 'Engineering', 'Digital notices, timely minutes, and accessible records.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80'),
  (3, 'Faith Njeri', 'SCT301', 'Finance', 'Open financial reports and responsible project funding.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'),
  (3, 'Samuel Ouma', 'SCT302', 'Economics', 'Track every shilling and fund student innovation.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80');

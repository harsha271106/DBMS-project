const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// OWNER AUTHENTICATION GATEWAY
// ==========================================
const OWNER_SECRET = 'Harsha@2026';

app.post('/api/verify-owner', (req, res) => {
  const { key } = req.body;
  if (key === OWNER_SECRET) {
    return res.json({ success: true, message: 'Owner authenticated' });
  }
  return res.status(401).json({ error: 'Invalid owner passphrase' });
});

const requireOwner = (req, res, next) => {
  const incomingKey = req.headers['x-owner-key'];
  if (incomingKey && incomingKey === OWNER_SECRET) {
    return next();
  }
  return res.status(403).json({ error: 'Access Denied: Owner authorization required for database modifications.' });
};

// ==========================================
// 1. STUDENTS API
// ==========================================
app.get('/api/students', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Student ORDER BY student_id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', requireOwner, async (req, res) => {
  const { student_id, name, email, program, semester, cgpa } = req.body;
  try {
    await db.query(
      'INSERT INTO Student (student_id, name, email, program, semester, cgpa) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id, name, email, program, semester, cgpa]
    );
    res.status(201).json({ message: 'Student registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/students/:id', requireOwner, async (req, res) => {
  try {
    await db.query('DELETE FROM Student WHERE student_id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 2. PROGRESS REPORTS API
// ==========================================
app.get('/api/reports', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Progress_Report ORDER BY record_id ASC, week_num ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', requireOwner, async (req, res) => {
  const { record_id, week_num, description, mentor_feedback } = req.body;
  try {
    await db.query(
      'INSERT INTO Progress_Report (record_id, week_num, description, mentor_feedback) VALUES (?, ?, ?, ?)',
      [record_id, week_num, description, mentor_feedback || null]
    );
    res.status(201).json({ message: 'Progress report logged' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/reports/:record_id/:week_num', requireOwner, async (req, res) => {
  const { record_id, week_num } = req.params;
  try {
    await db.query('DELETE FROM Progress_Report WHERE record_id = ? AND week_num = ?', [record_id, week_num]);
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 3. COMPANIES API (Uses 'contact' column)
// ==========================================
app.get('/api/companies', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Company ORDER BY company_id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/companies', requireOwner, async (req, res) => {
  const { company_id, name, industry, location, contact } = req.body;
  try {
    await db.query(
      'INSERT INTO Company (company_id, name, industry, location, contact) VALUES (?, ?, ?, ?, ?)',
      [company_id, name, industry, location, contact]
    );
    res.status(201).json({ message: 'Company created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/companies/:id', requireOwner, async (req, res) => {
  try {
    await db.query('DELETE FROM Company WHERE company_id = ?', [req.params.id]);
    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. POSTINGS API (Uses 'duration' column)
// ==========================================
app.get('/api/postings', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.posting_id,
        p.company_id,
        p.title,
        p.description,
        p.duration,
        p.stipend,
        COALESCE(c.name, p.company_id, 'Partner') AS company_name
      FROM Internship_Posting p
      LEFT JOIN Company c ON p.company_id = c.company_id
      ORDER BY p.posting_id ASC
    `);
    res.json(rows);
  } catch (err) {
    try {
      const [rawRows] = await db.query('SELECT * FROM Internship_Posting ORDER BY posting_id ASC');
      res.json(rawRows);
    } catch (innerErr) {
      res.status(500).json({ error: innerErr.message });
    }
  }
});

app.post('/api/postings', requireOwner, async (req, res) => {
  const { posting_id, company_id, title, description, duration, stipend } = req.body;
  try {
    await db.query(
      'INSERT INTO Internship_Posting (posting_id, company_id, title, description, duration, stipend) VALUES (?, ?, ?, ?, ?, ?)',
      [posting_id, company_id, title, description, duration, stipend]
    );
    res.status(201).json({ message: 'Posting created successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/postings/:id', requireOwner, async (req, res) => {
  try {
    await db.query('DELETE FROM Internship_Posting WHERE posting_id = ?', [req.params.id]);
    res.json({ message: 'Posting deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. APPLICATIONS API
// ==========================================
app.get('/api/applications', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.*, 
        COALESCE(s.name, a.student_id) AS student_name,
        COALESCE(p.title, a.posting_id) AS role_applied
      FROM Application a
      LEFT JOIN Student s ON a.student_id = s.student_id
      LEFT JOIN Internship_Posting p ON a.posting_id = p.posting_id
      ORDER BY a.application_id ASC
    `);
    res.json(rows);
  } catch (err) {
    try {
      const [rawRows] = await db.query('SELECT * FROM Application ORDER BY application_id ASC');
      res.json(rawRows);
    } catch (innerErr) {
      res.status(500).json({ error: innerErr.message });
    }
  }
});

app.post('/api/applications', requireOwner, async (req, res) => {
  const { application_id, student_id, posting_id, status } = req.body;
  const applied_date = new Date().toISOString().split('T')[0];
  try {
    await db.query(
      'INSERT INTO Application (application_id, student_id, posting_id, status, applied_date) VALUES (?, ?, ?, ?, ?)',
      [application_id, student_id, posting_id, status || 'Applied', applied_date]
    );
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/applications/:id', requireOwner, async (req, res) => {
  try {
    await db.query('DELETE FROM Application WHERE application_id = ?', [req.params.id]);
    res.json({ message: 'Application deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. FACULTY MENTORS API
// ==========================================
app.get('/api/mentors', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Faculty_Mentor ORDER BY faculty_id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mentors', requireOwner, async (req, res) => {
  const { faculty_id, name, department, email } = req.body;
  try {
    await db.query(
      'INSERT INTO Faculty_Mentor (faculty_id, name, department, email) VALUES (?, ?, ?, ?)',
      [faculty_id, name, department, email]
    );
    res.status(201).json({ message: 'Mentor registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/mentors/:id', requireOwner, async (req, res) => {
  try {
    await db.query('DELETE FROM Faculty_Mentor WHERE faculty_id = ?', [req.params.id]);
    res.json({ message: 'Mentor deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 7. INTERNSHIP RECORDS API
// ==========================================
app.get('/api/records', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        r.*,
        COALESCE(s.name, r.application_id, 'Enrolled Student') AS student_name,
        COALESCE(s.program, 'Engineering') AS program,
        COALESCE(fm.name, r.faculty_id, 'Faculty Guide') AS mentor_name
      FROM Internship_Record r
      LEFT JOIN Application a ON r.application_id = a.application_id
      LEFT JOIN Student s ON a.student_id = s.student_id
      LEFT JOIN Faculty_Mentor fm ON r.faculty_id = fm.faculty_id
      ORDER BY r.record_id ASC
    `);
    res.json(rows);
  } catch (err) {
    try {
      const [rawRows] = await db.query('SELECT * FROM Internship_Record ORDER BY record_id ASC');
      res.json(rawRows);
    } catch (innerErr) {
      res.status(500).json({ error: innerErr.message });
    }
  }
});

app.post('/api/records', requireOwner, async (req, res) => {
  const { record_id, application_id, faculty_id, start_date, end_date, final_status } = req.body;
  try {
    await db.query(
      'INSERT INTO Internship_Record (record_id, application_id, faculty_id, start_date, end_date, final_status) VALUES (?, ?, ?, ?, ?, ?)',
      [record_id, application_id, faculty_id, start_date, end_date || null, final_status || 'Ongoing']
    );
    res.status(201).json({ message: 'Internship record created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/records/:id', requireOwner, async (req, res) => {
  try {
    await db.query('DELETE FROM Internship_Record WHERE record_id = ?', [req.params.id]);
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
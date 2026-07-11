require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MySQL connection pool — reads from .env (see .env.example)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'report_card_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './public/uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ============ HELPER: CALCULATE GRADE ============
// Adjust the divisor if you change the number of subjects
function calculateGrade(total, subjectCount) {
    if (total === null || total === undefined || subjectCount === 0) return 'N/A';
    const average = total / subjectCount;
    if (average >= 90) return 'A+';
    if (average >= 80) return 'A';
    if (average >= 70) return 'B';
    if (average >= 60) return 'C';
    if (average >= 50) return 'D';
    return 'F';
}

// ============ API Routes ============

// 1. Get all students (with subjects + computed total/grade)
app.get('/api/students', async (req, res) => {
    try {
        const [students] = await pool.query(`
            SELECT
                s.*,
                sch.name AS school_name,
                sch.logo_url AS school_logo
            FROM students s
            LEFT JOIN schools sch ON s.school_id = sch.id
            ORDER BY s.id DESC
        `);

        for (let student of students) {
            const [subjects] = await pool.query(
                'SELECT id, subject_name, marks FROM subjects WHERE student_id = ?',
                [student.id]
            );
            student.subjects = subjects;

            const total = subjects.reduce((sum, sub) => sum + sub.marks, 0);
            student.total_marks = subjects.length > 0 ? total : null;
            student.grade = calculateGrade(student.total_marks, subjects.length);
        }

        res.json({ success: true, data: students });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Get single student by ID
app.get('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [students] = await pool.query(`
            SELECT s.*, sch.name AS school_name, sch.logo_url AS school_logo
            FROM students s
            LEFT JOIN schools sch ON s.school_id = sch.id
            WHERE s.id = ?
        `, [id]);

        if (students.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const [subjects] = await pool.query(
            'SELECT subject_name, marks FROM subjects WHERE student_id = ?',
            [id]
        );

        res.json({
            success: true,
            data: {
                ...students[0],
                subjects
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Create new student report card
app.post('/api/students', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            school_id, name, class_name, roll_number, photo_url,
            teacher_remark, head_teacher_remark, next_term_date, subjects
        } = req.body;

        const [result] = await connection.query(
            `INSERT INTO students
            (school_id, name, class_name, roll_number, photo_url, teacher_remark, head_teacher_remark, next_term_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [school_id || 1, name, class_name, roll_number, photo_url || null, teacher_remark, head_teacher_remark, next_term_date || null]
        );

        const studentId = result.insertId;

        if (subjects && subjects.length > 0) {
            const subjectValues = subjects.map(sub => [studentId, sub.name, sub.marks]);
            await connection.query(
                'INSERT INTO subjects (student_id, subject_name, marks) VALUES ?',
                [subjectValues]
            );
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Student created successfully',
            studentId
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// 4. Update student
app.put('/api/students/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            name, class_name, roll_number, photo_url,
            teacher_remark, head_teacher_remark, next_term_date, subjects
        } = req.body;

        if (photo_url) {
            await connection.query(
                `UPDATE students SET
                name = ?, class_name = ?, roll_number = ?, photo_url = ?,
                teacher_remark = ?, head_teacher_remark = ?, next_term_date = ?
                WHERE id = ?`,
                [name, class_name, roll_number, photo_url, teacher_remark, head_teacher_remark, next_term_date || null, id]
            );
        } else {
            await connection.query(
                `UPDATE students SET
                name = ?, class_name = ?, roll_number = ?,
                teacher_remark = ?, head_teacher_remark = ?, next_term_date = ?
                WHERE id = ?`,
                [name, class_name, roll_number, teacher_remark, head_teacher_remark, next_term_date || null, id]
            );
        }

        await connection.query('DELETE FROM subjects WHERE student_id = ?', [id]);

        if (subjects && subjects.length > 0) {
            const subjectValues = subjects.map(sub => [id, sub.name, sub.marks]);
            await connection.query(
                'INSERT INTO subjects (student_id, subject_name, marks) VALUES ?',
                [subjectValues]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Student updated successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// 5. Delete student
app.delete('/api/students/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. Get class ranking (computed on the fly, no stored procedure needed)
app.get('/api/class-ranking/:class', async (req, res) => {
    try {
        const [students] = await pool.query(
            'SELECT id, name FROM students WHERE class_name = ?',
            [req.params.class]
        );

        const ranked = [];
        for (let student of students) {
            const [subjects] = await pool.query(
                'SELECT marks FROM subjects WHERE student_id = ?',
                [student.id]
            );
            const total = subjects.reduce((sum, sub) => sum + sub.marks, 0);
            ranked.push({
                id: student.id,
                name: student.name,
                total_marks: total,
                grade: calculateGrade(total, subjects.length)
            });
        }

        ranked.sort((a, b) => b.total_marks - a.total_marks);
        ranked.forEach((s, index) => s.position = index + 1);

        res.json({ success: true, data: ranked });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. Upload photo/logo
app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const photoUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, photo_url: photoUrl });
});

// 8. Get schools
app.get('/api/schools', async (req, res) => {
    try {
        const [schools] = await pool.query('SELECT * FROM schools');
        res.json({ success: true, data: schools });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
-- Create database
CREATE DATABASE IF NOT EXISTS report_card_system;
USE report_card_system;

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT,
    name VARCHAR(255) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    roll_number VARCHAR(50) NOT NULL,
    photo_url VARCHAR(500),
    teacher_remark TEXT,
    head_teacher_remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    subject_name VARCHAR(100) NOT NULL,
    marks INT CHECK (marks >= 0 AND marks <= 100),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Performance table (for caching calculated results)
CREATE TABLE IF NOT EXISTS performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    total_marks INT,
    average DECIMAL(5,2),
    grade VARCHAR(2),
    position INT,
    academic_year VARCHAR(20),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_year (student_id, academic_year)
);

-- Insert sample data
INSERT INTO schools (name, logo_url) VALUES 
('Greenwood High School', 'uploads/school-logo.png');

INSERT INTO students (school_id, name, class_name, roll_number, teacher_remark, head_teacher_remark) VALUES 
(1, 'Aarav Sharma', '10-A', '24', 'Shows consistent effort and improvement.', 'A diligent student with good conduct.'),
(1, 'Priya Patel', '10-A', '12', 'Excellent problem-solving skills.', 'Very focused and determined.'),
(1, 'Rahul Singh', '10-A', '08', 'Needs to improve in Mathematics.', 'Shows potential with guidance.');

INSERT INTO subjects (student_id, subject_name, marks) VALUES 
(1, 'Mathematics', 92), (1, 'English', 88), (1, 'Science', 95), (1, 'Social Studies', 79), (1, 'Computer', 96),
(2, 'Mathematics', 85), (2, 'English', 92), (2, 'Science', 89), (2, 'Social Studies', 90), (2, 'Computer', 94),
(3, 'Mathematics', 45), (3, 'English', 65), (3, 'Science', 55), (3, 'Social Studies', 70), (3, 'Computer', 80);
// ============ GLOBAL STATE ============
let subjects = [
    { name: 'Mathematics', marks: 92 },
    { name: 'English', marks: 88 },
    { name: 'Science', marks: 95 },
    { name: 'Social Studies', marks: 79 },
    { name: 'Computer', marks: 96 }
];
let studentPhoto = '';
let schoolLogo = '';
let currentStudentId = null;

// Points to your Node/Express server, not api.php
const API_URL = 'http://localhost:3000/api';

// ============ DOM REFS ============
const subjectContainer = document.getElementById('subjectContainer');
const reportContainer = document.getElementById('reportCardContainer');
const reportContent = document.getElementById('reportContent');
const studentList = document.getElementById('studentList');

// ============ SUBJECT MANAGEMENT ============
function renderSubjects() {
    subjectContainer.innerHTML = '';
    subjects.forEach((sub, index) => {
        const row = document.createElement('div');
        row.className = 'subject-row';
        row.innerHTML = `
            <input type="text" class="sub-name" value="${sub.name}" placeholder="Subject" />
            <input type="number" class="sub-marks" value="${sub.marks}" min="0" max="100" placeholder="Marks" />
            <button class="btn btn-danger" onclick="removeSubject(${index})" style="padding:4px 12px; font-size:12px;">✕</button>
        `;
        subjectContainer.appendChild(row);
    });

    document.querySelectorAll('.subject-row').forEach((row, idx) => {
        const nameInput = row.querySelector('.sub-name');
        const marksInput = row.querySelector('.sub-marks');

        nameInput.addEventListener('change', () => {
            if (subjects[idx]) subjects[idx].name = nameInput.value;
        });
        marksInput.addEventListener('change', () => {
            if (subjects[idx]) {
                subjects[idx].marks = Math.min(100, Math.max(0, parseInt(marksInput.value) || 0));
            }
        });
    });
}

function addSubject() {
    subjects.push({ name: 'New Subject', marks: 0 });
    renderSubjects();
}

function removeSubject(index) {
    if (subjects.length <= 1) {
        alert('Need at least one subject.');
        return;
    }
    subjects.splice(index, 1);
    renderSubjects();
}

// ============ PHOTO UPLOAD ============
function handlePhotoUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const preview = document.getElementById('photoPreview');
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Student photo" />`;
    };
    reader.readAsDataURL(file);

    uploadFile(file, 'photo');
}

function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const preview = document.getElementById('logoPreview');
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="School logo" />`;
    };
    reader.readAsDataURL(file);

    uploadFile(file, 'logo');
}

function uploadFile(file, type) {
    const formData = new FormData();
    formData.append('photo', file);

    fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (type === 'photo') {
                studentPhoto = data.photo_url;
            } else {
                schoolLogo = data.photo_url;
            }
        } else {
            alert('Upload failed: ' + data.error);
        }
    })
    .catch(err => {
        console.error('Upload error:', err);
        alert('Failed to upload file. Check server connection.');
    });
}

// ============ STUDENT CRUD ============
function loadStudents() {
    fetch(`${API_URL}/students`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayStudents(data.data);
            } else {
                studentList.innerHTML = '<p>❌ Failed to load students</p>';
            }
        })
        .catch(err => {
            console.error('Error:', err);
            studentList.innerHTML = '<p>❌ Error connecting to server</p>';
        });
}

function displayStudents(students) {
    if (!students || students.length === 0) {
        studentList.innerHTML = '<p>No students found. Create your first report card!</p>';
        return;
    }

    let html = '';
    students.forEach(s => {
        const total = s.total_marks ?? 'N/A';
        const grade = s.grade || 'N/A';
        html += `
            <div class="student-item">
                <div>
                    <strong>${s.name}</strong>
                    (${s.class_name}) - Roll: ${s.roll_number}
                    <span style="margin-left:10px;font-size:13px;color:#666;">
                        Total: ${total} | Grade: ${grade}
                    </span>
                </div>
                <div>
                    <button class="btn btn-outline" onclick="loadStudentForEdit(${s.id})" style="padding:4px 12px; font-size:12px;">✏️ Edit</button>
                    <button class="btn btn-danger" onclick="deleteStudent(${s.id})" style="padding:4px 12px; font-size:12px;">🗑️</button>
                </div>
            </div>
        `;
    });
    studentList.innerHTML = html;
}

function loadStudentForEdit(id) {
    fetch(`${API_URL}/students/${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const student = data.data;
                currentStudentId = id;
                document.getElementById('editStudentId').value = id;

                document.getElementById('studentName').value = student.name;
                document.getElementById('studentClass').value = student.class_name;
                document.getElementById('rollNumber').value = student.roll_number;
                document.getElementById('teacherRemark').value = student.teacher_remark || '';
                document.getElementById('headTeacherRemark').value = student.head_teacher_remark || '';
                document.getElementById('nextTermDate').value = student.next_term_date || '';

                subjects = student.subjects.map(s => ({
                    name: s.subject_name,
                    marks: parseInt(s.marks)
                }));
                renderSubjects();

                if (student.photo_url) {
                    studentPhoto = student.photo_url;
                    document.getElementById('photoPreview').innerHTML =
                        `<img src="${student.photo_url}" alt="Student" />`;
                }

                alert('✅ Student loaded for editing!');
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Failed to load student data');
        });
}

// Gathers everything from the form into one object ready to send to the server
function getFormData() {
    return {
        school_id: 1, // uses the default school (Greenwood/Royalty High School) for now
        name: document.getElementById('studentName').value,
        class_name: document.getElementById('studentClass').value,
        roll_number: document.getElementById('rollNumber').value,
        photo_url: studentPhoto || '',
        teacher_remark: document.getElementById('teacherRemark').value,
        head_teacher_remark: document.getElementById('headTeacherRemark').value,
        next_term_date: document.getElementById('nextTermDate').value,
        subjects: subjects
    };
}

function saveStudent() {
    const data = getFormData();

    if (!data.name || !data.class_name || !data.roll_number) {
        alert('Please fill in Student Name, Class, and Roll Number.');
        return;
    }

    const method = currentStudentId ? 'PUT' : 'POST';
    const url = currentStudentId
        ? `${API_URL}/students/${currentStudentId}`
        : `${API_URL}/students`;

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            alert('✅ Student saved successfully!');
            resetForm();
            loadStudents();
        } else {
            alert('Failed to save: ' + result.error);
        }
    })
    .catch(err => {
        console.error('Save error:', err);
        alert('Failed to save student. Check server connection.');
    });
}

function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    fetch(`${API_URL}/students/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                loadStudents();
            } else {
                alert('Failed to delete: ' + result.error);
            }
        })
        .catch(err => {
            console.error('Delete error:', err);
            alert('Failed to delete student.');
        });
}

// ============ REPORT CARD PREVIEW ============
function calculateGrade(average) {
    average = parseFloat(average);
    if (average >= 90) return 'A+';
    if (average >= 80) return 'A';
    if (average >= 70) return 'B';
    if (average >= 60) return 'C';
    if (average >= 50) return 'D';
    return 'F';
}

function generateReport() {
    const schoolName = document.getElementById('schoolName').value;
    const studentName = document.getElementById('studentName').value;
    const studentClass = document.getElementById('studentClass').value;
    const rollNumber = document.getElementById('rollNumber').value;
    const teacherRemark = document.getElementById('teacherRemark').value;
    const headTeacherRemark = document.getElementById('headTeacherRemark').value;
    const nextTermDate = document.getElementById('nextTermDate').value;

    const total = subjects.reduce((sum, s) => sum + s.marks, 0);
    const average = subjects.length > 0 ? (total / subjects.length).toFixed(1) : 0;
    const grade = calculateGrade(average);

    const subjectRows = subjects.map(s => `
        <tr>
            <td>${s.name}</td>
            <td>${s.marks}</td>
        </tr>
    `).join('');

    reportContent.innerHTML = `
        <div class="report-header">
            <div class="school-info">
                <div class="logo-preview">${document.getElementById('logoPreview').innerHTML}</div>
                <h2>${schoolName}</h2>
            </div>
            <div class="student-badge">
                <div class="photo-preview">${document.getElementById('photoPreview').innerHTML}</div>
                <div>
                    <strong>${studentName}</strong><br>
                    Class: ${studentClass} | Roll: ${rollNumber}
                </div>
            </div>
        </div>
        <table class="marks-table">
            <thead><tr><th>Subject</th><th>Marks</th></tr></thead>
            <tbody>${subjectRows}</tbody>
            <tr class="totals-row"><td>Total</td><td>${total}</td></tr>
            <tr class="totals-row"><td>Average</td><td>${average}</td></tr>
        </table>
        <div style="margin:12px 0;"><span class="grade-badge">Grade: ${grade}</span></div>
        <div class="remarks-section">
            <div class="remark-box"><strong>👩‍🏫 Teacher's Remark:</strong> ${teacherRemark}</div>
            <div class="remark-box"><strong>👨‍🏫 Head Teacher's Remark:</strong> ${headTeacherRemark}</div>
        </div>
        ${nextTermDate ? `
        <div class="remark-box" style="margin-top:15px; text-align:center;">
            <strong>📅 Next Term Begins:</strong> ${nextTermDate}
        </div>` : ''}
    `;

    reportContainer.classList.remove('hidden');
    reportContainer.scrollIntoView({ behavior: 'smooth' });
}

function hideReport() {
    reportContainer.classList.add('hidden');
}

function resetForm() {
    currentStudentId = null;
    document.getElementById('editStudentId').value = '';
    document.getElementById('studentName').value = '';
    document.getElementById('studentClass').value = '';
    document.getElementById('rollNumber').value = '';
    document.getElementById('teacherRemark').value = '';
    document.getElementById('headTeacherRemark').value = '';
    document.getElementById('nextTermDate').value = '';
    document.getElementById('photoPreview').innerHTML = '🧑‍🎓';
    document.getElementById('logoPreview').innerHTML = '🏛️';
    studentPhoto = '';

    subjects = [
        { name: 'Mathematics', marks: 0 },
        { name: 'English', marks: 0 },
        { name: 'Science', marks: 0 },
        { name: 'Social Studies', marks: 0 },
        { name: 'Computer', marks: 0 }
    ];
    renderSubjects();
    hideReport();
}

// ============ RUN ON PAGE LOAD ============
// This is the fix for the stuck "Loading students..." message
document.addEventListener('DOMContentLoaded', () => {
    renderSubjects();
    loadStudents();
});
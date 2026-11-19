# Student Attendance & Academic Records Management System

## Introduction

CampusCore is a local university administration application for student registration, lecturer and course management, attendance tracking, and academic grades. The browser interface is built with HTML, CSS, and vanilla JavaScript; all persistent records are stored in MongoDB through a Node.js/Express API.

## Problem statement and objectives

Academic information kept in separate spreadsheets is difficult to keep current, search, and relate reliably. This project provides a central, validated database-backed application to:

- Maintain student, lecturer, and course records.
- Record attendance once per student, course, and calendar day.
- Store marks and calculate totals and letter grades consistently.
- Search/filter records and view a summary dashboard.

## Technologies and architecture

- Frontend: HTML5, CSS3, vanilla JavaScript (no client-side database or localStorage).
- Backend: Node.js, Express.js, Mongoose.
- Database: MongoDB Community Server.
- The frontend makes HTTP requests to `/api/...` endpoints served by Express. Express validates request data, uses Mongoose models to read/write MongoDB, and returns JSON. Mongoose references connect related documents; the browser never connects directly to MongoDB or receives database credentials.

## Database collections

| Collection | Key data and relationships |
| --- | --- |
| `students` | Unique student ID, name, gender, email, phone, programme, year, registration date |
| `lecturers` | Unique lecturer ID, name, email, phone, department, specialization |
| `courses` | Unique course code, name, description, credit units, optional lecturer ObjectId |
| `attendances` | Student and course ObjectIds, UTC calendar date, status, remarks; unique compound index on student/course/date |
| `grades` | Student and course ObjectIds, coursework/exam marks, computed total and grade; unique student/course index |

MongoDB creates the five collections when their first documents are saved. The unique indexes are declared in the Mongoose schemas. References are populated for API reads. A student or course with linked attendance/grades cannot be deleted until the related records are removed; deleting a lecturer unassigns that lecturer from courses.

## CRUD/API overview

Each resource supports `GET /api/{students|lecturers|courses|attendance|grades}`, `GET /api/{resource}/:id`, `POST`, `PUT /:id`, and `DELETE /:id`. The dashboard summary is `GET /api/dashboard`; `GET /api/health` reports whether the running app reached startup with MongoDB connected.

The UI supports create, edit, view/list, and confirmed delete actions for every resource. Lists are loaded from the API, with search and relevant filters. Attendance supports status and date filters; academic records support course filtering.

## Grading scale

The total is the arithmetic mean of coursework and examination marks, rounded to two decimal places. The default inclusive lower-bound scale is:

| Total marks | Grade |
| --- | --- |
| 80–100 | A |
| 70–<80 | B |
| 60–<70 | C |
| 50–<60 | D |
| 0–<50 | F |

Edit `backend/config/gradingScale.js` to configure the institutional thresholds. The server calculates the total and grade; client-submitted totals/grades are not used.

## Installation and running (Windows)

Prerequisites: Node.js/npm and MongoDB Community Server installed locally.

1. Start the MongoDB Windows service. In PowerShell, inspect its exact service name with `Get-Service *mongo*`; start the service shown by the installation, for example `Start-Service MongoDB` (run PowerShell as Administrator if needed). Alternatively start `mongod` using the data directory configured by your MongoDB installation.
2. Verify MongoDB is listening at `127.0.0.1:27017`.
3. In the project folder run:

   ```powershell
   npm install
   npm start
   ```

4. Open `http://localhost:3000`. To change the database or port, edit the local `.env` file:

   ```dotenv
   MONGODB_URI=mongodb://127.0.0.1:27017/student_attendance_db
   PORT=3000
   ```

The checked-in `.env` is ignored by Git; `.env` contains only the local development URI and port in this starter project. Do not put credentials in frontend files. If the connection fails, the server prints the MongoDB error and exits instead of reporting a false successful start.

## Testing and verification

- Start MongoDB, launch the server, and confirm the startup message says MongoDB connected.
- Create sample students, lecturers, and courses in the UI; then record attendance and grades. Reload the page or restart the server to confirm records persist.
- Edit and delete records in each section. Try duplicate IDs/course codes, duplicate attendance for the same student/course/date, a duplicate grade for a student/course, invalid marks, and deleting a student/course that still has linked records; the API should return a clear validation/conflict response.
- Use the `GET` endpoints above or `/api/dashboard` to verify the data read from MongoDB. Collections appear in MongoDB after the first successful inserts.
- With MongoDB stopped, the application reports connection failure at startup. When started with an established connection but MongoDB later becomes unavailable, API requests return a database-unavailable response.

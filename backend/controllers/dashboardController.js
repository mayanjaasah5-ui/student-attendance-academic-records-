const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');

async function dashboard(req, res, next) {
  try {
    const [students, lecturers, courses, attendanceRecords, recentStudents, attendanceOverview] = await Promise.all([
      Student.countDocuments(), Lecturer.countDocuments(), Course.countDocuments(), Attendance.countDocuments(),
      Student.find().sort({ createdAt: -1 }).limit(5).select('studentId fullName programme createdAt').lean(),
      Attendance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    res.json({
      success: true,
      data: { students, lecturers, courses, attendanceRecords, recentStudents, attendanceOverview }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = dashboard;

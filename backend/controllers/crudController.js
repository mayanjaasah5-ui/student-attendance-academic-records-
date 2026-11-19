const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Course = require('../models/Course');

const configs = {
  students: { model: require('../models/Student'), populate: [] },
  lecturers: { model: require('../models/Lecturer'), populate: [] },
  courses: { model: Course, populate: [{ path: 'lecturer', select: 'lecturerId fullName department' }] },
  attendance: { model: Attendance, populate: [
    { path: 'student', select: 'studentId fullName' }, { path: 'course', select: 'courseCode courseName' }
  ] },
  grades: { model: Grade, populate: [
    { path: 'student', select: 'studentId fullName' }, { path: 'course', select: 'courseCode courseName' }
  ] }
};

const allowedFilters = {
  students: ['studentId', 'programme', 'yearOfStudy'],
  lecturers: ['lecturerId', 'department'],
  courses: ['courseCode', 'lecturer'],
  attendance: ['student', 'course', 'status'],
  grades: ['student', 'course']
};
const textFields = {
  students: ['studentId', 'fullName', 'email', 'programme'],
  lecturers: ['lecturerId', 'fullName', 'email', 'department', 'specialization'],
  courses: ['courseCode', 'courseName'],
  attendance: [],
  grades: []
};

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function buildFilter(resource, query) {
  const filter = {};
  for (const field of allowedFilters[resource]) {
    if (query[field]) filter[field] = query[field];
  }
  if (resource === 'attendance' && query.date) {
    const start = new Date(`${query.date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      const error = new Error('Date must be a valid YYYY-MM-DD value.');
      error.name = 'ValidationError';
      error.errors = { date: { message: error.message } };
      throw error;
    }
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.attendanceDate = { $gte: start, $lt: end };
  }
  if (query.search && textFields[resource].length) {
    const safeSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = textFields[resource].map((field) => ({ [field]: { $regex: safeSearch, $options: 'i' } }));
  }
  return filter;
}

function ensureObjectId(value, field) {
  if (!mongoose.isValidObjectId(value)) {
    const error = new Error(`${field} must be a valid record ID.`);
    error.name = 'ValidationError';
    error.errors = { [field]: { message: error.message } };
    throw error;
  }
}

async function validateReferences(resource, body) {
  if (resource === 'courses' && body.lecturer) {
    ensureObjectId(body.lecturer, 'lecturer');
    if (!(await configs.lecturers.model.exists({ _id: body.lecturer }))) {
      const error = new Error('Selected lecturer does not exist.');
      error.name = 'ValidationError';
      error.errors = { lecturer: { message: error.message } };
      throw error;
    }
  }
  if (resource === 'attendance' || resource === 'grades') {
    ensureObjectId(body.student, 'student');
    ensureObjectId(body.course, 'course');
    const [student, course] = await Promise.all([
      configs.students.model.exists({ _id: body.student }),
      Course.exists({ _id: body.course })
    ]);
    const missing = !student ? 'Student' : !course ? 'Course' : null;
    if (missing) {
      const error = new Error(`${missing} does not exist.`);
      error.name = 'ValidationError';
      error.errors = { reference: { message: error.message } };
      throw error;
    }
  }
}

function createController(resource) {
  const { model, populate } = configs[resource];
  return {
    list: asyncHandler(async (req, res) => {
      const records = await model.find(buildFilter(resource, req.query))
        .populate(populate).sort({ createdAt: -1 }).limit(500).lean();
      res.json({ success: true, data: records });
    }),
    get: asyncHandler(async (req, res) => {
      const record = await model.findById(req.params.id).populate(populate).lean();
      if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
      res.json({ success: true, data: record });
    }),
    create: asyncHandler(async (req, res) => {
      await validateReferences(resource, req.body);
      const record = await model.create(req.body);
      const populated = await model.findById(record._id).populate(populate).lean();
      res.status(201).json({ success: true, message: 'Record created.', data: populated });
    }),
    update: asyncHandler(async (req, res) => {
      await validateReferences(resource, req.body);
      const record = await model.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
      Object.assign(record, req.body);
      await record.save();
      const populated = await model.findById(record._id).populate(populate).lean();
      res.json({ success: true, message: 'Record updated.', data: populated });
    }),
    remove: asyncHandler(async (req, res) => {
      const record = await model.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
      if (resource === 'students') {
        const linked = await Promise.all([Attendance.exists({ student: record._id }), Grade.exists({ student: record._id })]);
        if (linked.some(Boolean)) return res.status(409).json({ success: false, message: 'Delete this student’s attendance and grades first.' });
      }
      if (resource === 'courses') {
        const linked = await Promise.all([Attendance.exists({ course: record._id }), Grade.exists({ course: record._id })]);
        if (linked.some(Boolean)) return res.status(409).json({ success: false, message: 'Delete this course’s attendance and grades first.' });
      }
      if (resource === 'lecturers') await Course.updateMany({ lecturer: record._id }, { $set: { lecturer: null } });
      await record.deleteOne();
      res.json({ success: true, message: 'Record deleted.' });
    })
  };
}

module.exports = { createController, asyncHandler };

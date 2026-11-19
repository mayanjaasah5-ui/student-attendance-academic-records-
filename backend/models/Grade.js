const mongoose = require('mongoose');
const { gradeFor } = require('../config/gradingScale');

const gradeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseworkMarks: { type: Number, required: true, min: 0, max: 100 },
  examinationMarks: { type: Number, required: true, min: 0, max: 100 },
  totalMarks: { type: Number, required: true, min: 0, max: 100 },
  grade: { type: String, required: true },
  remarks: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

gradeSchema.index({ student: 1, course: 1 }, { unique: true });
gradeSchema.pre('validate', function calculateGrade() {
  this.totalMarks = Math.round(((this.courseworkMarks + this.examinationMarks) / 2) * 100) / 100;
  this.grade = gradeFor(this.totalMarks);
});

module.exports = mongoose.model('Grade', gradeSchema);

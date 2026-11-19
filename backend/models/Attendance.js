const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  attendanceDate: {
    type: Date,
    required: true,
    set(value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
  },
  status: { type: String, required: true, enum: ['Present', 'Absent', 'Late', 'Excused'] },
  remarks: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

attendanceSchema.index({ student: 1, course: 1, attendanceDate: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, trim: true, uppercase: true, unique: true },
  courseName: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  creditUnits: { type: Number, required: true, min: 1, max: 20 },
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);

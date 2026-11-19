const mongoose = require('mongoose');

const lecturerSchema = new mongoose.Schema({
  lecturerId: { type: String, required: true, trim: true, uppercase: true, unique: true },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  department: { type: String, required: true, trim: true, maxlength: 120 },
  specialization: { type: String, required: true, trim: true, maxlength: 120 }
}, { timestamps: true });

module.exports = mongoose.model('Lecturer', lecturerSchema);

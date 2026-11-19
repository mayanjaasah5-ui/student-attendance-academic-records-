const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, trim: true, uppercase: true, unique: true },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  gender: { type: String, required: true, enum: ['Female', 'Male', 'Other'] },
  email: { type: String, required: true, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  programme: { type: String, required: true, trim: true, maxlength: 120 },
  yearOfStudy: { type: Number, required: true, min: 1, max: 10 },
  registrationDate: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);

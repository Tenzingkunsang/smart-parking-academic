const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  student: { type: String, required: true },
  group: { type: String, required: true },
  supervisor: { type: String, required: true },
  academicYear: { type: String, required: true },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  address: { type: String, default: '' },
  gstin: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  lastBilledAt: { type: Date, default: Date.now },
  totalBilledAmount: { type: Number, default: 0 },
  billCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Client', clientSchema);

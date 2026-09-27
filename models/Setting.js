const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  companyName: { type: String, default: 'BP CONSULTANT' },
  brandTitle: { type: String, default: 'BP CONSULTANT' },
  tagline: { type: String, default: 'HR and Compliance' },
  pan: { type: String, default: 'AEYPR8669A' },
  contact: { type: String, default: '91 988736872' },
  email: { type: String, default: 'bpc1164@gmail.com' },
  website: { type: String, default: 'www.bpcconsultancy.in' },
  nextSrNo: { type: Number, default: 1 },
  
  bankDetails: {
    accountName: { type: String, default: 'BP CONSULTANT' },
    bankName: { type: String, default: 'INDIAN BANK' },
    branch: { type: String, default: 'DINDAYAL NAGAR MORADABAD' },
    accountNumber: { type: String, default: '50322428417' },
    ifsc: { type: String, default: 'IDIB000D554' }
  },
  
  declarations: {
    type: [String],
    default: [
      'Payment 50% Advance',
      'Described and that all particulars are true and correct.',
      'Disputes are subject to MORADABAD jurisdiction only.'
    ]
  },
  
  signatureTitle: { type: String, default: 'For BP CONSULTANT' },
  signatorySubtitle: { type: String, default: 'Auth. Signatory' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);

const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  srNo: { type: Number, default: 1 },
  description: { type: String, required: true },
  days: { type: String, default: '' },
  expense: { type: Number, default: 0 },
  consultancyCost: { type: Number, default: 0 },
  amount: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
  srNo: { type: Number, required: true, unique: true, index: true },
  date: { type: String, required: true },
  invoiceDate: { type: Date, default: Date.now, index: true },
  
  // Client Info
  companyName: { type: String, required: true, trim: true, index: true },
  companyAddress: { type: String, default: '' },
  partyGstin: { type: String, default: '' },
  
  // Line items
  items: [invoiceItemSchema],
  
  // Financials
  totalAmount: { type: Number, required: true },
  otherCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  amountInWords: { type: String, default: '' },
  
  // Service Provider & Bank Details
  providerName: { type: String, default: 'BP CONSULTANT' },
  tagline: { type: String, default: 'HR and Compliance' },
  pan: { type: String, default: 'AEYPR8669A' },
  contact: { type: String, default: '91 988736872' },
  email: { type: String, default: 'bpc1164@gmail.com' },
  
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
  
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Partially Paid', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  notes: { type: String, default: '' },
  pdfFileName: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);

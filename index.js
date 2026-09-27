require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const invoicesRoute = require('./routes/invoices');
const clientsRoute = require('./routes/clients');
const settingsRoute = require('./routes/settings');

const Setting = require('./models/Setting');
const { storageDir } = require('./utils/pdfGenerator');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/billbook';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage directory for generated PDFs
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}
app.use('/storage/pdfs', express.static(storageDir));

// API routes
app.use('/api/invoices', invoicesRoute);
app.use('/api/clients', clientsRoute);
app.use('/api/settings', settingsRoute);

// Root health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Seed or update initial settings starting from Invoice #1
async function seedInitialData() {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        companyName: 'BP CONSULTANT',
        brandTitle: 'BP CONSULTANT',
        tagline: 'HR and Compliance',
        pan: 'AEYPR8669A',
        contact: '91 988736872',
        email: 'bpc1164@gmail.com',
        website: 'www.bpcconsultancy.in',
        nextSrNo: 1,
        bankDetails: {
          accountName: 'BP CONSULTANT',
          bankName: 'INDIAN BANK',
          branch: 'DINDAYAL NAGAR MORADABAD',
          accountNumber: '50322428417',
          ifsc: 'IDIB000D554'
        },
        declarations: [
          'Payment 50% Advance',
          'Described and that all particulars are true and correct.',
          'Disputes are subject to MORADABAD jurisdiction only.'
        ],
        signatureTitle: 'For BP CONSULTANT',
        signatorySubtitle: 'Auth. Signatory'
      });
      console.log('Seeded initial business settings for BP CONSULTANT (Starting at Sr. No #1).');
    } else {
      // Ensure companyName is BP CONSULTANT
      await Setting.findByIdAndUpdate(settings._id, {
        $set: {
          companyName: 'BP CONSULTANT',
          brandTitle: 'BP CONSULTANT',
          signatureTitle: 'For BP CONSULTANT',
          'bankDetails.accountName': 'BP CONSULTANT'
        }
      });
    }
  } catch (err) {
    console.error('Error during data seeding:', err);
  }
}

// Connect to MongoDB and start server
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB at', MONGO_URI);
    await seedInitialData();
    app.listen(PORT, () => {
      console.log(`BP Consultant Bill Book Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

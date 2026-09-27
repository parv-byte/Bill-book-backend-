const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Setting = require('../models/Setting');
const { numberToWords } = require('../utils/numberToWords');
const { generateInvoicePdf, storageDir } = require('../utils/pdfGenerator');

// Helper to get or create settings
async function getSettings() {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({});
  }
  return settings;
}

// GET all invoices with filter & search
router.get('/', async (req, res) => {
  try {
    const { search, year, month, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { srNo: isNaN(search) ? undefined : Number(search) },
        { 'items.description': { $regex: search, $options: 'i' } }
      ].filter(condition => {
        const key = Object.keys(condition)[0];
        return condition[key] !== undefined;
      });
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      query.invoiceDate = { $gte: startOfYear, $lte: endOfYear };
    }

    if (month && year) {
      const monthNum = parseInt(month, 10);
      const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1));
      const endOfMonth = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));
      query.invoiceDate = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const invoices = await Invoice.find(query).sort({ srNo: -1 });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET stats summary for dashboard & 3-year record overview
router.get('/stats/summary', async (req, res) => {
  try {
    const totalInvoices = await Invoice.countDocuments();
    const paidInvoices = await Invoice.countDocuments({ status: 'Paid' });
    const pendingInvoices = await Invoice.countDocuments({ status: 'Pending' });

    const revenueResult = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Monthly breakdown for last 12 months
    const monthlyStats = await Invoice.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$grandTotal' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    const settings = await getSettings();

    res.json({
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalRevenue,
      monthlyStats,
      nextSrNo: settings.nextSrNo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export all bills to CSV for accountant/CA records
router.get('/export/csv', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ srNo: 1 });
    let csv = 'Sr No,Date,Company Name,GSTIN,Description,Total Amount,Other Charges,Grand Total,Status\n';
    
    invoices.forEach(inv => {
      const desc = inv.items.map(i => i.description).join('; ').replace(/"/g, '""');
      const comp = inv.companyName.replace(/"/g, '""');
      csv += `${inv.srNo},"${inv.date}","${comp}","${inv.partyGstin || ''}","${desc}",${inv.totalAmount},${inv.otherCharges},${inv.grandTotal},${inv.status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bpc_billbook_records_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET PDF stream
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice_${invoice.srNo}_${invoice.companyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
    );

    // If PDF file exists in disk storage, stream directly; otherwise generate live
    const pdfPath = invoice.pdfFileName ? path.join(storageDir, invoice.pdfFileName) : null;
    if (pdfPath && fs.existsSync(pdfPath)) {
      return fs.createReadStream(pdfPath).pipe(res);
    }

    await generateInvoicePdf(invoice, res);
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST Create new invoice (with 1-click simplicity: companyName, amount, description)
router.post('/', async (req, res) => {
  try {
    const settings = await getSettings();
    const data = req.body;

    // Determine Sr No
    let srNo = data.srNo ? Number(data.srNo) : settings.nextSrNo;

    // Check if srNo already exists
    const existing = await Invoice.findOne({ srNo });
    if (existing) {
      const maxSr = await Invoice.findOne().sort({ srNo: -1 });
      srNo = (maxSr ? maxSr.srNo : settings.nextSrNo) + 1;
    }

    // Process line items
    let items = data.items;
    if (!items || items.length === 0) {
      const amt = Number(data.amount || 0);
      items = [{
        srNo: 1,
        description: data.description || 'Consultancy fee',
        days: data.days || '',
        expense: Number(data.expense || 0),
        consultancyCost: Number(data.consultancyCost || amt),
        amount: amt
      }];
    }

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const otherCharges = Number(data.otherCharges || 0);
    const grandTotal = totalAmount + otherCharges;
    const amountInWords = data.amountInWords || numberToWords(grandTotal);

    // Date handling
    const dateStr = data.date || new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

    const invoiceData = {
      srNo,
      date: dateStr,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      companyName: data.companyName,
      companyAddress: data.companyAddress || '',
      partyGstin: data.partyGstin || '',
      items,
      totalAmount,
      otherCharges,
      grandTotal,
      amountInWords,
      providerName: settings.companyName,
      pan: settings.pan,
      contact: settings.contact,
      email: settings.email,
      bankDetails: settings.bankDetails,
      declarations: settings.declarations,
      status: data.status || 'Pending',
      notes: data.notes || ''
    };

    // Save PDF to persistent disk storage
    const fileName = `Invoice_${srNo}_${Date.now()}.pdf`;
    const targetPdfPath = path.join(storageDir, fileName);
    await generateInvoicePdf(invoiceData, targetPdfPath);
    invoiceData.pdfFileName = fileName;

    const newInvoice = await Invoice.create(invoiceData);

    // Update or create client in directory for autocomplete
    if (data.companyName) {
      await Client.findOneAndUpdate(
        { name: data.companyName.trim() },
        {
          $set: {
            address: data.companyAddress || '',
            gstin: data.partyGstin || '',
            lastBilledAt: new Date()
          },
          $inc: {
            totalBilledAmount: grandTotal,
            billCount: 1
          }
        },
        { upsert: true, new: true }
      );
    }

    // Increment next serial number in settings
    await Setting.findByIdAndUpdate(settings._id, {
      $set: { nextSrNo: srNo + 1 }
    });

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH update invoice status directly (instant, reliable toggle)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Paid', 'Pending', 'Partially Paid', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Invoice not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT Update invoice
router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    let items = data.items || invoice.items;
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const otherCharges = Number(data.otherCharges !== undefined ? data.otherCharges : invoice.otherCharges);
    const grandTotal = totalAmount + otherCharges;
    const amountInWords = numberToWords(grandTotal);

    const updateFields = {
      ...data,
      totalAmount,
      otherCharges,
      grandTotal,
      amountInWords
    };

    // Regenerate archived PDF
    const fileName = invoice.pdfFileName || `Invoice_${invoice.srNo}_${Date.now()}.pdf`;
    const targetPdfPath = path.join(storageDir, fileName);
    await generateInvoicePdf({ ...invoice.toObject(), ...updateFields }, targetPdfPath);
    updateFields.pdfFileName = fileName;

    const updated = await Invoice.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (invoice.pdfFileName) {
      const pdfPath = path.join(storageDir, invoice.pdfFileName);
      if (fs.existsSync(pdfPath)) {
        try { fs.unlinkSync(pdfPath); } catch (e) { /* ignore */ }
      }
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

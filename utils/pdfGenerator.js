const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, '..', 'storage', 'pdfs');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

function generateInvoicePdf(invoice, streamOrPath) {
  return new Promise((resolve, reject) => {
    // Standard A4: 595.28 x 841.89 points
    const doc = new PDFDocument({
      size: 'A4',
      margin: 30,
      bufferPages: true
    });

    let stream;
    let filePath = null;

    if (typeof streamOrPath === 'string') {
      filePath = streamOrPath;
      stream = fs.createWriteStream(streamOrPath);
      doc.pipe(stream);
    } else {
      stream = streamOrPath;
      doc.pipe(stream);
    }

    const left = 30;
    const top = 30;
    const width = 535;
    const bottom = 810;

    // 100% PURE BLACK & WHITE ONLY
    const BLACK = '#000000';
    const WHITE = '#ffffff';

    // Outer boundary border
    doc.lineWidth(1.2).strokeColor(BLACK).rect(left, top, width, bottom - top).stroke();

    // 1. Header Box
    const headerHeight = 84;
    doc.rect(left, top, width, headerHeight).stroke();

    // PAN top right
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
       .text(`PAN-${invoice.pan || 'AEYPR8669A'}`, left + width - 130, top + 8, { width: 120, align: 'right' });

    // Center header text
    doc.fontSize(15).font('Helvetica-Bold').fillColor(BLACK)
       .text('INVOICE', left, top + 8, { width, align: 'center' });

    doc.fontSize(15).font('Helvetica-Bold').fillColor(BLACK)
       .text(invoice.providerName || 'BP CONSULTANT', left, top + 26, { width, align: 'center' });

    // HR and Compliance directly below BP CONSULTANT
    doc.fontSize(10).font('Helvetica-Bold').fillColor(BLACK)
       .text(invoice.tagline || 'HR and Compliance', left, top + 45, { width, align: 'center' });

    doc.fontSize(8.5).font('Helvetica').fillColor(BLACK)
       .text(`Contact : ${invoice.contact || '91 988736872'}, E-mail : ${invoice.email || 'bpc1164@gmail.com'}`, left, top + 63, { width, align: 'center' });

    // 2. Client Details (Left) and Date/SrNo (Right)
    const clientBoxTop = top + headerHeight;
    const clientBoxHeight = 96;
    const rightBoxWidth = 160;
    const leftBoxWidth = width - rightBoxWidth;

    // Divider between left and right boxes
    doc.moveTo(left + leftBoxWidth, clientBoxTop).lineTo(left + leftBoxWidth, clientBoxTop + clientBoxHeight).stroke();
    // Bottom line of client box
    doc.moveTo(left, clientBoxTop + clientBoxHeight).lineTo(left + width, clientBoxTop + clientBoxHeight).stroke();

    // Right Box (Date and Sr. No.)
    const rightBoxLeft = left + leftBoxWidth;
    const dateRowHeight = 42;
    // Horizontal divider in right box
    doc.moveTo(rightBoxLeft, clientBoxTop + dateRowHeight).lineTo(left + width, clientBoxTop + dateRowHeight).stroke();

    doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
       .text('Date :', rightBoxLeft + 10, clientBoxTop + 14);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(BLACK)
       .text(invoice.date || new Date().toLocaleDateString('en-GB'), rightBoxLeft + 45, clientBoxTop + 14);

    const formattedSrNo = String(invoice.srNo || 1).padStart(3, '0');
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK)
       .text('Sr. No.', rightBoxLeft + 10, clientBoxTop + dateRowHeight + 15);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(BLACK)
       .text(formattedSrNo, rightBoxLeft + 60, clientBoxTop + dateRowHeight + 13);

    // Left Box (To: Client details)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
       .text('To :', left + 10, clientBoxTop + 10);
    
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK)
       .text(invoice.companyName || '', left + 35, clientBoxTop + 10, { width: leftBoxWidth - 45 });

    doc.font('Helvetica').fontSize(9.5).fillColor(BLACK)
       .text(invoice.companyAddress || '', left + 35, clientBoxTop + 26, { width: leftBoxWidth - 45 });

    // Party GSTIN
    const gstinTop = clientBoxTop + clientBoxHeight - 20;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BLACK)
       .text('Party GSTIN :', left + 10, gstinTop);
    doc.font('Helvetica').fontSize(9.5).fillColor(BLACK)
       .text(invoice.partyGstin || 'N/A', left + 85, gstinTop);

    // 3. Table Headers
    const tableTop = clientBoxTop + clientBoxHeight;
    const tableHeaderHeight = 32;
    const tableHeight = 320;

    // Header outline (white background, black border)
    doc.rect(left, tableTop, width, tableHeaderHeight).strokeColor(BLACK).stroke();

    // Column positions and widths
    const cols = [
      { name: 'Sr.\nNo.', x: left, w: 32, align: 'center' },
      { name: 'Service Description', x: left + 32, w: 200, align: 'left' },
      { name: 'No of Days /\nNo of Bills', x: left + 232, w: 75, align: 'center' },
      { name: 'Cost of\nExpence', x: left + 307, w: 70, align: 'right' },
      { name: 'Cost of\nConsultancy', x: left + 377, w: 78, align: 'right' },
      { name: 'Total\nAmount', x: left + 455, w: 80, align: 'right' }
    ];

    // Draw header labels
    cols.forEach(col => {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
         .text(col.name, col.x + 2, tableTop + 5, { width: col.w - 4, align: col.align });
    });

    // Vertical grid lines across table
    const tableBottom = tableTop + tableHeight;
    cols.forEach((col, idx) => {
      if (idx > 0) {
        doc.moveTo(col.x, tableTop).lineTo(col.x, tableBottom).stroke();
      }
    });

    // Draw items
    let currentY = tableTop + tableHeaderHeight + 8;
    const items = invoice.items && invoice.items.length > 0 ? invoice.items : [{
      srNo: 1,
      description: 'Consultancy fee',
      days: '',
      expense: 0,
      consultancyCost: invoice.totalAmount,
      amount: invoice.totalAmount
    }];

    items.forEach((item, index) => {
      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
         .text(String(index + 1), cols[0].x, currentY, { width: cols[0].w, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BLACK)
         .text(item.description, cols[1].x + 6, currentY, { width: cols[1].w - 12 });

      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
         .text(item.days ? String(item.days) : '—', cols[2].x, currentY, { width: cols[2].w, align: 'center' });

      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
         .text(item.expense > 0 ? Number(item.expense).toFixed(2) : '—', cols[3].x, currentY, { width: cols[3].w - 6, align: 'right' });

      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
         .text(item.consultancyCost > 0 ? Number(item.consultancyCost).toFixed(2) : '—', cols[4].x, currentY, { width: cols[4].w - 6, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BLACK)
         .text(Number(item.amount).toFixed(2), cols[5].x, currentY, { width: cols[5].w - 6, align: 'right' });

      currentY += 28;
    });

    // Bottom border of table
    doc.moveTo(left, tableBottom).lineTo(left + width, tableBottom).stroke();

    // 4. Totals and Bank Details
    const totalsTop = tableBottom;
    const totalsHeight = 84;
    const totalsLeft = cols[4].x;
    const totalsWidth = width - (totalsLeft - left);

    // Divider between bank details and totals box
    doc.moveTo(totalsLeft, totalsTop).lineTo(totalsLeft, totalsTop + totalsHeight).stroke();
    // Bottom of totals box
    doc.moveTo(left, totalsTop + totalsHeight).lineTo(left + width, totalsTop + totalsHeight).stroke();

    // Bank Details (Left side)
    const bank = invoice.bankDetails || {};
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BLACK)
       .text('Bank Details :', left + 10, totalsTop + 6);

    const bLeft = left + 15;
    const bRowHeight = 13;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text('A/c Name', bLeft, totalsTop + 22);
    doc.font('Helvetica').fontSize(8).fillColor(BLACK).text(`: ${bank.accountName || invoice.providerName || 'BP CONSULTANT'}`, bLeft + 50, totalsTop + 22);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text('Bank', bLeft, totalsTop + 22 + bRowHeight);
    doc.font('Helvetica').fontSize(8).fillColor(BLACK).text(`: ${bank.bankName || 'INDIAN BANK'}`, bLeft + 50, totalsTop + 22 + bRowHeight);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text('Branch', bLeft, totalsTop + 22 + bRowHeight * 2);
    doc.font('Helvetica').fontSize(8).fillColor(BLACK).text(`: ${bank.branch || 'DINDAYAL NAGAR MORADABAD'}`, bLeft + 50, totalsTop + 22 + bRowHeight * 2);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text('A/C', bLeft, totalsTop + 22 + bRowHeight * 3);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK).text(`: ${bank.accountNumber || '50322428417'}`, bLeft + 50, totalsTop + 22 + bRowHeight * 3);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text('IFSC', bLeft + 150, totalsTop + 22 + bRowHeight * 3);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK).text(`: ${bank.ifsc || 'IDIB000D554'}`, bLeft + 180, totalsTop + 22 + bRowHeight * 3);

    // Totals Rows (Right side)
    const rowH = 28;
    const tRow1Y = totalsTop;
    const tRow2Y = totalsTop + rowH;
    const tRow3Y = totalsTop + (rowH * 2);

    doc.moveTo(totalsLeft, tRow2Y).lineTo(left + width, tRow2Y).stroke();
    doc.moveTo(totalsLeft, tRow3Y).lineTo(left + width, tRow3Y).stroke();

    // Inner column divider between label and amount
    const tSplitX = cols[5].x;
    doc.moveTo(tSplitX, totalsTop).lineTo(tSplitX, totalsTop + totalsHeight).stroke();

    // Row 1: Total Amount
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
       .text('Total Amount', totalsLeft + 6, tRow1Y + 9);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BLACK)
       .text(Number(invoice.totalAmount).toFixed(2), tSplitX + 5, tRow1Y + 9, { width: cols[5].w - 10, align: 'right' });

    // Row 2: Other Charges
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
       .text('Other Charges', totalsLeft + 6, tRow2Y + 9);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
       .text(invoice.otherCharges > 0 ? Number(invoice.otherCharges).toFixed(2) : '—', tSplitX + 5, tRow2Y + 9, { width: cols[5].w - 10, align: 'right' });

    // Row 3: Grand Total
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK)
       .text('Grand Total', totalsLeft + 6, tRow3Y + 9);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK)
       .text(`${Number(invoice.grandTotal).toFixed(2)}`, tSplitX + 5, tRow3Y + 8, { width: cols[5].w - 10, align: 'right' });

    // 5. Amount in Words Row
    const wordsTop = totalsTop + totalsHeight;
    const wordsHeight = 24;
    doc.rect(left, wordsTop, width, wordsHeight).strokeColor(BLACK).stroke();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
       .text('Amount in Words : ', left + 10, wordsTop + 7, { continued: true })
       .font('Helvetica-Bold').fillColor(BLACK)
       .text(invoice.amountInWords || 'Rupees Only');

    // 6. Declarations (Bottom Left) and Signature (Bottom Right)
    const footerTop = wordsTop + wordsHeight;
    const declWidth = width - 170;

    // Divider between declaration and signature
    doc.moveTo(left + declWidth, footerTop).lineTo(left + declWidth, bottom).stroke();

    // Declarations
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
       .text('Declaration', left + 10, footerTop + 8);

    const decls = invoice.declarations && invoice.declarations.length > 0
      ? invoice.declarations
      : [
          'Payment 50% Advance',
          'Described and that all particulars are true and correct.',
          'Disputes are subject to MORADABAD jurisdiction only.'
        ];

    let declY = footerTop + 24;
    decls.forEach(d => {
      doc.font('Helvetica').fontSize(7.5).fillColor(BLACK)
         .text(`* ${d}`, left + 10, declY, { width: declWidth - 20 });
      declY += 13;
    });

    // Signature (Bottom Right)
    const sigLeft = left + declWidth + 10;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
       .text(`For ${invoice.providerName || 'BP CONSULTANT'}`, sigLeft, footerTop + 8, { width: 150, align: 'center' });

    const sigImgPath = path.join(__dirname, '..', 'storage', 'signature.png');
    if (fs.existsSync(sigImgPath)) {
      try {
        doc.image(sigImgPath, sigLeft + 15, footerTop + 20, { width: 120, height: 42, fit: [120, 42], align: 'center' });
      } catch (imgErr) {
        console.error('Error embedding signature image:', imgErr);
      }
    }

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
       .text('Auth. Signatory', sigLeft, bottom - 16, { width: 150, align: 'center' });

    // Finalize
    doc.end();

    if (filePath) {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } else {
      resolve();
    }
  });
}

module.exports = { generateInvoicePdf, storageDir };

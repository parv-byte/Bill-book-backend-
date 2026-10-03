// Utility to convert numbers to Indian Rupee Words
// E.g. 25000 -> "Rupees Twenty Five Thousand Only"
// E.g. 15250.50 -> "Rupees Fifteen Thousand Two Hundred and Fifty and Fifty Paise Only"

const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(n) {
  let str = '';
  if (n >= 100) {
    str += single[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n > 0) str += ' and ';
  }
  if (n > 0) {
    if (n < 10) {
      str += single[n];
    } else if (n < 20) {
      str += double[n - 10];
    } else {
      const t = Math.floor(n / 10);
      const u = n % 10;
      str += tens[t] + (u !== 0 ? ' ' + single[u] : '');
    }
  }
  return str;
}

function numberToWords(amount) {
  const num = Number(amount);
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const absNum = Math.abs(num);
  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  let n = rupees;
  const parts = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;

  const lakh = Math.floor(n / 100000);
  n %= 100000;

  const thousand = Math.floor(n / 1000);
  n %= 1000;

  const remaining = n;

  if (crore > 0) parts.push(convertBelowThousand(crore) + ' Crore');
  if (lakh > 0) parts.push(convertBelowThousand(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertBelowThousand(thousand) + ' Thousand');
  if (remaining > 0) parts.push(convertBelowThousand(remaining));

  let result = 'Rupees ' + parts.join(' ');
  if (paise > 0) {
    result += ' and ' + convertBelowThousand(paise) + ' Paise';
  }
  return result + ' Only';
}

module.exports = { numberToWords };

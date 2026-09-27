// Utility to convert numbers to Indian Rupee Words
// E.g. 25000 -> "Rupees Twenty Five Thousand Only"

const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertTwoDigit(n) {
  if (n < 10) return single[n];
  if (n >= 10 && n < 20) return double[n - 10];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return tens[t] + (u !== 0 ? ' ' + single[u] : '');
}

function convertThreeDigit(n) {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  let str = '';
  if (h > 0) {
    str += single[h] + ' Hundred';
    if (rem > 0) str += ' and ';
  }
  if (rem > 0) {
    str += convertTwoDigit(rem);
  }
  return str;
}

function numberToWords(amount) {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';
  
  const num = Math.round(Number(amount));
  let n = Math.abs(num);
  
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  
  const hundreds = n;
  
  const parts = [];
  if (crore > 0) parts.push(convertTwoDigit(crore) + ' Crore');
  if (lakh > 0) parts.push(convertTwoDigit(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertTwoDigit(thousand) + ' Thousand');
  if (hundreds > 0) parts.push(convertThreeDigit(hundreds));
  
  return 'Rupees ' + parts.join(' ') + ' Only';
}

module.exports = { numberToWords };

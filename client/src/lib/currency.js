/**
 * Formats an integer amount in paise into an Indian Rupee currency string.
 * @param {number} paise
 * @returns {string} e.g. '₹250.00'
 */
export function formatPaise(paise = 0) {
  if (typeof paise !== 'number' || isNaN(paise)) return '₹0.00';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export const formatINR = formatPaise;


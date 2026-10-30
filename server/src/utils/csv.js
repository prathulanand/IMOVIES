/**
 * Converts an array of objects into a standard CSV string.
 * @param {Array<Object>} data
 * @param {Array<{ label: string, key: string }>} fields
 * @returns {string}
 */
export function generateCSV(data, fields) {
  if (!data || data.length === 0) {
    return fields.map((f) => `"${f.label}"`).join(',') + '\n';
  }

  const header = fields.map((f) => `"${f.label.replace(/"/g, '""')}"`).join(',');

  const rows = data.map((item) => {
    return fields
      .map((field) => {
        let val = item[field.key];
        if (val === undefined || val === null) {
          return '""';
        }
        if (typeof val === 'number') {
          return val;
        }
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

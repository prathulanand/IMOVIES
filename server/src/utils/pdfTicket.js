import PDFDocument from 'pdfkit';

/**
 * Generates an in-memory PDF ticket buffer for email attachments
 * @returns {Promise<Buffer>}
 */
export function generateTicketPDFBuffer({
  bookingCode,
  movieTitle,
  theatreName,
  showDate,
  showTime,
  seats,
  totalFormatted,
  name,
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        layout: 'portrait',
        margin: 24,
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Dark background card
      doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20).fill('#0f1016');

      // Top Emerald Green Banner
      doc.rect(10, 10, doc.page.width - 20, 50).fill('#10b981');
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('IMOVIES', 24, 24);
      doc.fontSize(10).font('Helvetica').text('OFFICIAL E-TICKET & ENTRY PASS', 24, 46);

      // Booking Reference Box
      doc.rect(24, 75, doc.page.width - 48, 55).fill('#171926');
      doc.fillColor('#a0aec0').fontSize(9).font('Helvetica').text('BOOKING REFERENCE CODE', 36, 85);
      doc.fillColor('#ecc94b').fontSize(18).font('Helvetica-Bold').text(bookingCode || 'BK-CONFIRMED', 36, 100);

      // Movie Details Section
      let y = 145;
      doc.fillColor('#10b981').fontSize(10).font('Helvetica-Bold').text('MOVIE INFORMATION', 24, y);
      y += 18;
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(movieTitle || 'Movie Title', 24, y);

      y += 24;
      doc.rect(24, y, doc.page.width - 48, 1).fill('#242c44'); // Divider
      y += 12;

      // Table format details
      const renderRow = (label, value, isHighlight = false) => {
        doc.fillColor('#718096').fontSize(10).font('Helvetica').text(label, 24, y);
        doc
          .fillColor(isHighlight ? '#48bb78' : '#ffffff')
          .fontSize(11)
          .font(isHighlight ? 'Helvetica-Bold' : 'Helvetica')
          .text(value, doc.page.width - 240, y, { align: 'right', width: 216 });
        y += 20;
      };

      renderRow('Cinema Hall:', theatreName || 'IMovies Multiplex');
      renderRow('Date & Showtime:', `${showDate || 'Confirmed'} • ${showTime || ''}`);
      renderRow('Booked Seats:', (seats || []).join(', '));
      renderRow('Total Amount Paid:', totalFormatted || 'Paid', true);
      renderRow('Ticket Holder:', name || 'Guest User');

      y += 10;
      doc.rect(24, y, doc.page.width - 48, 1).fill('#242c44'); // Divider
      y += 14;

      // Entry guidelines
      doc.fillColor('#ecc94b').fontSize(9).font('Helvetica-Bold').text('ENTRY INSTRUCTIONS & TERMS:', 24, y);
      y += 14;
      doc.fillColor('#a0aec0').fontSize(8).font('Helvetica');
      doc.text('1. Please present this digital PDF or printed pass at the cinema ticket validator gate.', 24, y);
      y += 12;
      doc.text('2. Please arrive at least 15 minutes prior to the scheduled showtime.', 24, y);
      y += 12;
      doc.text('3. Outside food and beverages are strictly not permitted inside cinema auditoriums.', 24, y);

      // Footer
      doc
        .fillColor('#4a5568')
        .fontSize(8)
        .font('Helvetica')
        .text('Generated securely by IMovies Ticketing Platform • www.imovies.com', 24, doc.page.height - 35, {
          align: 'center',
          width: doc.page.width - 48,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

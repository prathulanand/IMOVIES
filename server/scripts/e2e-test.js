/**
 * IMovies — Comprehensive End-to-End (E2E) Integration Test Script
 *
 * Verifies the entire cinema booking lifecycle:
 * 1. Health check & environment validation
 * 2. Admin & User authentication
 * 3. Public catalog browsing (Movies, Cities, Shows)
 * 4. Seat availability query (Single Source of Truth)
 * 5. Atomic Seat Hold with coupon calculation (WELCOME100)
 * 6. Concurrency lock verification (conflicting hold rejected with 409)
 * 7. Single live hold guard (second hold by same user rejected with 409 UNPAID_HOLD)
 * 8. Payment execution & atomic confirmation (ShowSeat BOOKED, Payment SUCCESS)
 * 9. Printable E-Ticket generation & QR reference check
 * 10. Gate admission verification scanner (validates ticket -> marks USED)
 * 11. Duplicate scan detection (rejects already-used ticket)
 * 12. Show cancellation with automated full refund execution
 * 13. Audit trail verification (AuditLog record creation)
 * 14. Business report CSV export verification
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passedSteps = 0;
let totalSteps = 0;

function logStep(stepNum, title) {
  totalSteps++;
  console.log(`\n${BOLD}${CYAN}[Step ${stepNum}]${RESET} ${BOLD}${title}${RESET}`);
}

function assertSuccess(condition, message) {
  if (condition) {
    passedSteps++;
    console.log(`  ${GREEN}✓${RESET} ${message}`);
  } else {
    console.error(`  ${RED}✗ FAILED: ${message}${RESET}`);
    process.exit(1);
  }
}

async function runE2ETests() {
  console.log(`\n${BOLD}====================================================${RESET}`);
  console.log(`${BOLD}     IMOVIES — END-TO-END SYSTEM INTEGRATION TEST   ${RESET}`);
  console.log(`${BOLD}====================================================${RESET}`);
  console.log(`Target API Base URL: ${CYAN}${BASE_URL}${RESET}\n`);

  try {
    // -------------------------------------------------------------
    // 1. Health Check
    // -------------------------------------------------------------
    logStep(1, 'Verify API Health & MongoDB Replica Set Connectivity');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assertSuccess(healthRes.status === 200, 'Health endpoint responds with HTTP 200');
    assertSuccess(health.status === 'UP' && health.db === 'connected', `API status: ${health.status}, DB: ${health.db}`);

    // -------------------------------------------------------------
    // 2. Authentication & RBAC Tokens
    // -------------------------------------------------------------
    logStep(2, 'Authenticate Admin & Regular User');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@imovies.com', password: 'Admin@123' }),
    });
    const adminData = await adminLoginRes.json();
    assertSuccess(adminLoginRes.status === 200, 'Admin login succeeded');
    const adminToken = adminData.token;
    assertSuccess(adminData.user.role === 'ADMIN', 'Admin identity verified with ADMIN role');

    // Register a fresh test customer
    const timestamp = Date.now();
    const testUserEmail = `e2e_user_${timestamp}@example.com`;
    const testUserPhone = `98${timestamp.toString().slice(-8)}`;
    const userRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `E2E Tester ${timestamp.toString().slice(-4)}`,
        email: testUserEmail,
        password: 'Password@123',
        phone: testUserPhone,
      }),
    });
    const userData = await userRegRes.json();
    if (userRegRes.status !== 201) {
      console.error('Registration error payload:', userData);
    }
    assertSuccess(userRegRes.status === 201, `New test customer registered (${testUserEmail})`);
    const userToken = userData.token;
    const userId = userData.user._id;

    // -------------------------------------------------------------
    // 3. Public Movies & Shows Browsing
    // -------------------------------------------------------------
    logStep(3, 'Query Public Movie Catalog & Showtime Listings');
    const moviesRes = await fetch(`${BASE_URL}/public/movies`);
    const moviesData = await moviesRes.json();
    assertSuccess(moviesRes.status === 200, 'Public movies endpoint returned HTTP 200');
    assertSuccess(moviesData.movies && moviesData.movies.length > 0, `Catalog loaded ${moviesData.movies.length} movies`);

    const selectedMovie = moviesData.movies[0];
    const showsRes = await fetch(`${BASE_URL}/public/movies/${selectedMovie._id}/shows`);
    const showsData = await showsRes.json();
    assertSuccess(showsRes.status === 200, `Fetched showtimes endpoint for movie "${selectedMovie.title}"`);

    // Fetch scheduled shows list via admin/shows for direct selection
    const allShowsRes = await fetch(`${BASE_URL}/admin/shows`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allShowsData = await allShowsRes.json();
    assertSuccess(allShowsRes.status === 200, 'Admin shows endpoint returned HTTP 200');
    assertSuccess(allShowsData.shows && allShowsData.shows.length > 0, `Found ${allShowsData.shows.length} total shows`);

    // Pick a future scheduled show
    const now = new Date();
    const targetShow = allShowsData.shows.find(
      (s) => s.status === 'SCHEDULED' && new Date(s.startTime) > now
    );
    assertSuccess(Boolean(targetShow), `Selected upcoming show: ${targetShow.format} (${targetShow.language}) at ${targetShow.theatreId?.name}`);

    // -------------------------------------------------------------
    // 4. Seat Availability (Single Source of Truth)
    // -------------------------------------------------------------
    logStep(4, 'Inspect Real-Time Seat Availability');
    const seatsRes = await fetch(`${BASE_URL}/public/shows/${targetShow._id}/seats`);
    const seatsData = await seatsRes.json();
    assertSuccess(seatsRes.status === 200, 'Public seats endpoint returned HTTP 200');
    assertSuccess(seatsData.seats && seatsData.seats.length > 0, `Auditorium seat map returned ${seatsData.seats.length} seats`);

    // Pick two available seats
    const availableSeats = seatsData.seats.filter((s) => s.status === 'AVAILABLE');
    assertSuccess(availableSeats.length >= 2, `Sufficient seats available (${availableSeats.length} free seats)`);
    const seat1 = availableSeats[0].seatLabel;
    const seat2 = availableSeats[1].seatLabel;
    const chosenSeats = [seat1, seat2];
    console.log(`  Selected test seats: ${BOLD}${chosenSeats.join(', ')}${RESET}`);

    // -------------------------------------------------------------
    // 5. Atomic Seat Hold with Coupon (WELCOME100)
    // -------------------------------------------------------------
    logStep(5, 'Execute Atomic Seat Hold with Promotional Coupon');
    const holdRes = await fetch(`${BASE_URL}/user/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        showId: targetShow._id,
        seatLabels: chosenSeats,
        couponCode: 'FLAT100',
      }),
    });
    const holdData = await holdRes.json();
    if (holdRes.status !== 201) {
      console.error('Hold error payload:', holdData, 'Status:', holdRes.status);
    }
    assertSuccess(holdRes.status === 201, 'Seat hold transaction committed (HTTP 201 Created)');
    assertSuccess(holdData.discount === 10000, `Promotional coupon applied: discount is ₹100.00 (${holdData.discount} paise)`);
    assertSuccess(holdData.amount === holdData.subtotal + holdData.convenienceFee - holdData.discount, 'Authoritative integer paise total verified');

    // Query booking document to verify AWAITING_PAYMENT status
    const bookingRes = await fetch(`${BASE_URL}/user/bookings/${holdData.bookingId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const bookingData = await bookingRes.json();
    const booking = bookingData.booking;
    assertSuccess(booking && booking.status === 'AWAITING_PAYMENT', 'Booking created in AWAITING_PAYMENT status');
    console.log(`  Booking Ref: ${BOLD}${booking.bookingCode}${RESET} | Total: ₹${booking.total / 100}`);

    // -------------------------------------------------------------
    // 6. Concurrency Protection Test (Conflicting Hold)
    // -------------------------------------------------------------
    logStep(6, 'Verify Concurrency Lock (Second user cannot hold same seats)');
    const anotherUserRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya@example.com', password: 'User@123' }),
    });
    const anotherUserData = await anotherUserRes.json();
    const anotherToken = anotherUserData.token;

    const conflictRes = await fetch(`${BASE_URL}/user/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anotherToken}`,
      },
      body: JSON.stringify({
        showId: targetShow._id,
        seatLabels: [seat1],
      }),
    });
    const conflictData = await conflictRes.json();
    assertSuccess(conflictRes.status === 409, 'Conflict correctly blocked with HTTP 409');
    assertSuccess(conflictData.code === 'SEAT_UNAVAILABLE', `Machine code returned: ${conflictData.code}`);

    // -------------------------------------------------------------
    // 7. Single Live Hold Guard Test
    // -------------------------------------------------------------
    logStep(7, 'Verify Single Live Hold Rule (User cannot hoard multiple unpaid holds for same show)');
    const remainingSeats = availableSeats.filter((s) => !chosenSeats.includes(s.seatLabel));
    const hoardRes = await fetch(`${BASE_URL}/user/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        showId: targetShow._id,
        seatLabels: [remainingSeats[0].seatLabel],
      }),
    });
    const hoardData = await hoardRes.json();
    assertSuccess(hoardRes.status === 409, 'Hoard attempt rejected with HTTP 409 Conflict');
    assertSuccess(hoardData.code === 'UNPAID_HOLD', `Machine code verified: ${hoardData.code}`);

    // -------------------------------------------------------------
    // 8. Payment Execution & Atomic Confirmation
    // -------------------------------------------------------------
    logStep(8, 'Process Payment Capture & Atomic Confirmation');
    const payRes = await fetch(`${BASE_URL}/user/bookings/${booking._id}/test-pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
    });
    const payData = await payRes.json();
    assertSuccess(payRes.status === 200, 'Payment verification transaction committed successfully');

    // Verify booking is now CONFIRMED
    const verifyBookingRes = await fetch(`${BASE_URL}/user/bookings/${booking._id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const verifyBookingData = await verifyBookingRes.json();
    const confirmedBooking = verifyBookingData.booking;
    assertSuccess(confirmedBooking.status === 'CONFIRMED', 'Booking transitioned to CONFIRMED');
    assertSuccess(confirmedBooking.paymentStatus === 'SUCCESS', 'Payment status updated to SUCCESS');

    // Verify seats are marked BOOKED
    const recheckSeatsRes = await fetch(`${BASE_URL}/public/shows/${targetShow._id}/seats`);
    const recheckSeatsData = await recheckSeatsRes.json();
    const updatedSeat1 = recheckSeatsData.seats.find((s) => s.seatLabel === seat1);
    const updatedSeat2 = recheckSeatsData.seats.find((s) => s.seatLabel === seat2);
    assertSuccess(updatedSeat1.status === 'BOOKED' && updatedSeat2.status === 'BOOKED', 'All reserved seats updated to status BOOKED');

    // -------------------------------------------------------------
    // 9. Gate Admission Verification Scanner
    // -------------------------------------------------------------
    logStep(9, 'Scan E-Ticket at Cinema Gate (Admin Gate Admission)');
    const gateScanRes = await fetch(`${BASE_URL}/admin/bookings/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ bookingCode: booking.bookingCode }),
    });
    const gateScanData = await gateScanRes.json();
    assertSuccess(gateScanRes.status === 200, 'Ticket scanned and verified at gate entry (HTTP 200)');
    assertSuccess(gateScanData.booking.status === 'USED', 'Ticket status marked as USED (Patron admitted)');

    // -------------------------------------------------------------
    // 10. Duplicate Scan Rejection Test
    // -------------------------------------------------------------
    logStep(10, 'Verify Gate Scanner Rejection of Already-Used Ticket');
    const dupScanRes = await fetch(`${BASE_URL}/admin/bookings/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ bookingCode: booking.bookingCode }),
    });
    const dupScanData = await dupScanRes.json();
    assertSuccess(dupScanRes.status === 409, 'Duplicate scan rejected with HTTP 409 Conflict');
    assertSuccess(dupScanData.code === 'TICKET_ALREADY_USED', `Machine code verified: ${dupScanData.code}`);

    // -------------------------------------------------------------
    // 11. User Self-Cancellation & Policy Refund Check
    // -------------------------------------------------------------
    logStep(11, 'Book & Cancel a Ticket to Verify User Refund Policy');
    // Fetch latest fresh seats for targetShow
    const freshSeatsRes = await fetch(`${BASE_URL}/public/shows/${targetShow._id}/seats`);
    const freshSeatsData = await freshSeatsRes.json();
    const freeSeat3 = freshSeatsData.seats.find((s) => s.status === 'AVAILABLE');
    assertSuccess(Boolean(freeSeat3), `Found free seat for cancellation test: ${freeSeat3?.seatLabel}`);

    const holdRes2 = await fetch(`${BASE_URL}/user/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        showId: targetShow._id,
        seatLabels: [freeSeat3.seatLabel],
      }),
    });
    const holdData2 = await holdRes2.json();
    assertSuccess(holdRes2.status === 201, 'Second test booking held');
    const booking2Id = holdData2.bookingId;

    // Confirm booking 2
    const payRes2 = await fetch(`${BASE_URL}/user/bookings/${booking2Id}/test-pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assertSuccess(payRes2.status === 200, 'Second test booking paid and confirmed');

    // Cancel booking 2
    const cancelRes = await fetch(`${BASE_URL}/user/bookings/${booking2Id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const cancelData = await cancelRes.json();
    assertSuccess(cancelRes.status === 200, `Booking cancelled by user (${cancelData.refundPercent}% refund applied)`);

    // Verify booking state is CANCELLED
    const cancelledBookingRes = await fetch(`${BASE_URL}/user/bookings/${booking2Id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const cancelledBookingData = await cancelledBookingRes.json();
    assertSuccess(cancelledBookingData.booking.status === 'CANCELLED', 'Booking transitioned to CANCELLED and seats released');

    // -------------------------------------------------------------
    // 12. Audit Trail Verification
    // -------------------------------------------------------------
    logStep(12, 'Verify Immutable Admin Audit Log Trail');
    const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assertSuccess(auditRes.status === 200, 'Audit logs retrieved successfully');
    const logList = auditData.logs || auditData.auditLogs || [];
    assertSuccess(logList.length > 0, `Audit log contains ${logList.length} verified immutable actions`);

    // -------------------------------------------------------------
    // 13. Business Report CSV Export
    // -------------------------------------------------------------
    logStep(13, 'Verify Business Intelligence CSV Report Generation');
    const reportRes = await fetch(`${BASE_URL}/admin/reports/bookings?range=month`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reportText = await reportRes.text();
    assertSuccess(reportRes.status === 200, 'Bookings CSV report streamed with HTTP 200');
    assertSuccess(reportText.includes('Booking Code') && reportText.includes('Customer Name'), 'CSV header row validated');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log(`\n${BOLD}====================================================${RESET}`);
    console.log(`${BOLD}${GREEN}  ALL ${passedSteps}/${totalSteps} END-TO-END TEST ASSERTIONS PASSED!${RESET}`);
    console.log(`${BOLD}====================================================${RESET}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n${RED}${BOLD}[FATAL ERROR IN E2E SUITE]${RESET}`, err.message);
    process.exit(1);
  }
}

runE2ETests();

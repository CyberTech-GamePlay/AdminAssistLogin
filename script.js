/* =========================================================
   Admin Dashboard Script
   ========================================================= */

// REPLACE WITH YOUR SUPABASE CREDENTIALS (Same as script.js)
const SUPABASE_URL      = 'https://bnwqksbiunkxwmhxyphz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pbFrpxwZKnNDCgB39eZp2g_Aa-5wffn';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const bookingsGrid = document.getElementById('bookingsGrid');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');

let allBookings = [];
let currentFilter = 'all';

/* ---------------------------------------------------------
   1. AUTHENTICATION
   --------------------------------------------------------- */
// Check if user is already logged in
db.auth.onAuthStateChange((event, session) => {
  if (session) {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    fetchBookings();
  } else {
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
    bookingsGrid.innerHTML = '';
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');

  btn.disabled = true;
  btn.textContent = 'Logging in...';
  loginError.classList.add('hidden');

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Log In';
  } else {
    loginForm.reset();
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await db.auth.signOut();
});

/* ---------------------------------------------------------
   2. FETCH BOOKINGS
   --------------------------------------------------------- */
async function fetchBookings() {
  bookingsGrid.innerHTML = '<p>Loading bookings...</p>';
  
  // Fetch bookings ordered by date (newest first)
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .order('booking_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    bookingsGrid.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
    return;
  }

  allBookings = data;
  renderBookings();
}

/* ---------------------------------------------------------
   3. RENDER BOOKINGS
   --------------------------------------------------------- */
function renderBookings() {
  bookingsGrid.innerHTML = '';

  const filtered = allBookings.filter(b => {
    if (currentFilter === 'all') return true;
    return b.status === currentFilter;
  });

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  filtered.forEach(booking => {
    // Format Date
    const dateObj = new Date(booking.booking_date);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Status formatting
    const statusClass = 
      booking.status === 'done' ? 'status-done' : 
      booking.status === 'follow-up' ? 'status-follow-up' : 'status-pending';
    const statusText = booking.status === 'done' ? 'Done' : booking.status === 'follow-up' ? 'Follow Up' : 'Pending';

    // Build links
    const fbLink = booking.facebook_link 
      ? `<a href="${booking.facebook_link}" target="_blank">View Profile</a>` 
      : '—';
      
    const screenshotLink = booking.screenshot_url 
      ? `<a href="${booking.screenshot_url}" target="_blank">View Photo</a>` 
      : '—';

    const warranty = (booking.warranty_slip_no || booking.warranty_slip_name)
      ? `${booking.warranty_slip_no || '—'} / ${booking.warranty_slip_name || '—'}`
      : '—';

    const card = document.createElement('div');
    card.className = 'booking-card';
    card.innerHTML = `
      <div class="booking-header">
        <div class="booking-date">${dateStr}</div>
        <div class="booking-status ${statusClass}">${statusText}</div>
      </div>
      
      <div class="booking-details">
        <div><strong>Name:</strong> <span>${booking.name}</span></div>
        <div><strong>Contact:</strong> <span>${booking.contact_no}</span></div>
        <div><strong>Address:</strong> <span>${booking.address}</span></div>
        <div><strong>FB Link:</strong> ${fbLink}</div>
        <div><strong>Warranty:</strong> <span>${warranty}</span></div>
        <div><strong>Proof:</strong> ${screenshotLink}</div>
      </div>

      <div class="booking-problem">
        <strong>Problem:</strong><br>
        ${booking.problem_description}
      </div>

      <div class="booking-actions">
        <button class="btn btn-followup" onclick="updateStatus('${booking.id}', 'follow-up')" ${booking.status === 'follow-up' ? 'disabled' : ''}>
          For Follow Up
        </button>
        <button class="btn btn-done" onclick="updateStatus('${booking.id}', 'done')" ${booking.status === 'done' ? 'disabled' : ''}>
          Mark as Done
        </button>
      </div>
    `;
    bookingsGrid.appendChild(card);
  });
}

/* ---------------------------------------------------------
   4. UPDATE STATUS (Mark as Done / Follow up)
   --------------------------------------------------------- */
window.updateStatus = async function(id, newStatus) {
  // Optimistic UI update (optional, but makes it feel fast)
  const btn = event.target;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Updating...';

  const { error } = await db
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    alert('Failed to update status: ' + error.message);
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  // Update local array and re-render
  const index = allBookings.findIndex(b => b.id === id);
  if (index !== -1) {
    allBookings[index].status = newStatus;
  }
  renderBookings();
};

/* ---------------------------------------------------------
   5. FILTERS
   --------------------------------------------------------- */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active class
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update filter and re-render
    currentFilter = btn.dataset.filter;
    renderBookings();
  });
});

/* =========================
   BD BUS TICKETING DEMO (NO MERCHANT)
   - Manual payment: Txn/Ref required
   - Booking starts UNPAID
   - Admin can mark PAID/CANCELLED
   - Dark/Light mode via 2 buttons (btnDark, btnLight)
   ========================= */

(() => {
  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  // Required IDs (from your HTML)
  const viewSearch = $("viewSearch");
  const viewAdmin = $("viewAdmin");

  const searchForm = $("searchForm");
  const fromCityEl = $("fromCity");
  const toCityEl = $("toCity");
  const journeyDateEl = $("journeyDate");
  const resultsEl = $("results");

  const bookingPanel = $("bookingPanel");
  const boardingPointEl = $("boardingPoint");
  const droppingPointEl = $("droppingPoint");
  const passengerNameEl = $("passengerName");
  const passengerPhoneEl = $("passengerPhone");
  const passengerEmailEl = $("passengerEmail");
  const paymentMethodEl = $("paymentMethod");
  const paymentRefEl = $("paymentRef");
  const seatGridEl = $("seatGrid");
  const totalFareEl = $("totalFare");
  const submitPaymentBtn = $("submitPaymentBtn");

  const adminTableEl = $("adminTable");

  // Optional theme buttons
  const btnDark = $("btnDark");
  const btnLight = $("btnLight");

  // ---------- Storage ----------
  const STORAGE = "bd_bus_demo_bookings_v1";
  const THEME_KEY = "bd_bus_theme_v1";

  const loadBookings = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); }
    catch { return []; }
  };
  const saveBookings = (arr) => localStorage.setItem(STORAGE, JSON.stringify(arr));

  // ---------- Data ----------
  const CITIES = [
    "Dhaka", "Bogura", "Sirajganj", "Noakhali", "Feni", "Chattogram", "Sylhet",
    "Faridpur", "Rangpur", "Saidpur", "Nilphamari", "Domar", "Shibchar", "Pacchor"
  ];

  const POINTS = {
    Dhaka: ["Gabtoli", "Kallyanpur", "Mohakhali", "Sayedabad"],
    Bogura: ["Satmatha", "Nawabbari", "Bogura Terminal"],
    Sirajganj: ["Sirajganj Sadar", "Hatikumrul", "Jamuna Setu West"],
    Noakhali: ["Maijdee", "Chowmuhani", "Sonapur"],
    Feni: ["Feni Terminal", "Mohipal", "Trunk Road"],
    Chattogram: ["AK Khan", "Dampara", "Bohaddarhat", "Nimtola"],
    Sylhet: ["Kadamtoli", "Ambarkhana", "Subidbazar"],
    Faridpur: ["Faridpur Terminal", "Goalchamot", "Bhanga"],
    Rangpur: ["Rangpur Terminal", "Shapla Chottor", "Modern Mor"],
    Saidpur: ["Saidpur Terminal", "Airport Road", "Railgate"],
    Nilphamari: ["Nilphamari Terminal", "Notkhana", "Circuit House"],
    Domar: ["Domar Bus Stand", "Domar Rail Gate"],
    Shibchar: ["Shibchar Bus Stand", "Pachchar Mor"],
    Pacchor: ["Pacchor Bus Stand", "Padma Link Road"]
  };

  // Base fare (demo but realistic-ish)
  const BASE_FARE = {
    "Dhaka|Sirajganj": 350,
    "Dhaka|Bogura": 550,
    "Dhaka|Noakhali": 450,
    "Dhaka|Feni": 500,
    "Dhaka|Chattogram": 900,
    "Dhaka|Sylhet": 850,
    "Dhaka|Faridpur": 300,
    "Dhaka|Rangpur": 750,
    "Dhaka|Saidpur": 900,
    "Dhaka|Nilphamari": 950,
    "Dhaka|Domar": 1050,
    "Dhaka|Shibchar": 400,
    "Dhaka|Pacchor": 400,
    "Bogura|Sirajganj": 180,
    "Noakhali|Feni": 120,
    "Feni|Chattogram": 220
  };

  const OPERATORS = [
    "Nabil Paribahan",
    "Shyamoli Paribahan",
    "Doyel Express",
    "Salki Express",
    "Hanif Enterprise",
    "Shohagh Paribahan"
  ];

  const TIMES = ["07:00 AM", "09:00 AM", "12:00 PM", "03:00 PM", "06:00 PM", "09:00 PM", "11:30 PM"];

  // Payment numbers (edit yours)
  const PAY_TO = {
    bKash: "017XXXXXXXX",
    Nagad: "018XXXXXXXX",
    Rocket: "019XXXXXXXX"
  };

  // ---------- State ----------
  let currentTrip = null; // { operator, time, from, to, date, perSeatFare }
  let selectedSeats = new Set();

  // ---------- Helpers ----------
  const todayISO = () => new Date().toISOString().slice(0, 10);

  const routeKey = (a, b) => `${a}|${b}`;
  const getFare = (from, to) => BASE_FARE[routeKey(from, to)] ?? BASE_FARE[routeKey(to, from)] ?? 650;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const pnr = () => `BD-${Date.now().toString(36).toUpperCase().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  function setTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function applySavedTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    setTheme(saved);
  }

  function fillSelect(el, list, value) {
    el.innerHTML = list.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
    if (value) el.value = value;
  }

  function getPoints(city) {
    return POINTS[city] || ["Main Counter"];
  }

  // Seats locked by route+date+operator+time (not by boarding/drop)
  function tripSeatKey(trip) {
    return `${trip.from}|${trip.to}|${trip.date}|${trip.operator}|${trip.time}`;
  }

  function bookedSeatsForTrip(trip) {
    const key = tripSeatKey(trip);
    const list = loadBookings();
    const out = new Set();
    list
      .filter(b => b.tripKey === key && b.status !== "CANCELLED")
      .forEach(b => (b.seats || []).forEach(s => out.add(s)));
    return out;
  }

  // ---------- Router ----------
  function route() {
    const hash = location.hash || "#/search";
    const isAdmin = hash.startsWith("#/admin");

    viewSearch?.classList.toggle("d-none", isAdmin);
    viewAdmin?.classList.toggle("d-none", !isAdmin);

    if (isAdmin) renderAdmin();
  }

  // ---------- Results ----------
  function buildTrips(from, to, date) {
    const perSeat = getFare(from, to);
    // demo: show multiple operators with same fare but slight variations
    const trips = [];
    OPERATORS.forEach((op, i) => {
      TIMES.forEach((t, j) => {
        const price = perSeat + (i % 3) * 30 + (j % 2) * 20; // small variation
        trips.push({
          operator: op,
          time: t,
          from,
          to,
          date,
          perSeatFare: price
        });
      });
    });
    return trips;
  }

  function renderResults(trips) {
    if (!trips.length) {
      resultsEl.innerHTML = `<div class="alert alert-secondary rounded-4 mb-0">No trips found.</div>`;
      return;
    }

    resultsEl.innerHTML = trips.map((t, idx) => {
      return `
        <div class="card rounded-4 shadow-sm border-0 mb-3">
          <div class="card-body d-flex justify-content-between gap-3 flex-wrap">
            <div>
              <div class="fw-bold">${esc(t.operator)}</div>
              <div class="small text-secondary">${esc(t.from)} → ${esc(t.to)} • ${esc(t.date)} • ${esc(t.time)}</div>

              <div class="small mt-2 text-secondary">
                Boarding: ${getPoints(t.from).slice(0, 3).map(esc).join(", ")}...
                <br/>
                Dropping: ${getPoints(t.to).slice(0, 3).map(esc).join(", ")}...
              </div>
            </div>

            <div class="text-end">
              <div class="fw-bold">৳${esc(t.perSeatFare)}</div>
              <div class="small text-secondary">per seat</div>
              <button class="btn btn-primary btn-sm mt-2" data-book="${idx}">Book</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    resultsEl.querySelectorAll("[data-book]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.book);
        openBooking(trips[idx]);
      });
    });
  }

  // ---------- Booking ----------
  function openBooking(trip) {
    currentTrip = trip;
    selectedSeats = new Set();

    bookingPanel.classList.remove("d-none");

    // boarding/dropping
    fillSelect(boardingPointEl, getPoints(trip.from), getPoints(trip.from)[0]);
    fillSelect(droppingPointEl, getPoints(trip.to), getPoints(trip.to)[0]);

    // reset fields
    paymentRefEl.value = "";
    passengerNameEl.value = passengerNameEl.value || "";
    passengerPhoneEl.value = passengerPhoneEl.value || "";
    passengerEmailEl.value = passengerEmailEl.value || "";

    // render seats & fare
    renderSeatGrid();
    updateTotal();

    bookingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderSeatGrid() {
    if (!currentTrip) return;

    const booked = bookedSeatsForTrip(currentTrip);

    seatGridEl.innerHTML = "";
    const ROWS = 8;
    const LEFT = ["A", "B"];
    const RIGHT = ["C", "D"];

    const makeSeat = (code) => {
      const div = document.createElement("div");
      div.className = "seat";
      div.textContent = code;

      if (booked.has(code)) div.classList.add("booked");
      if (selectedSeats.has(code)) div.classList.add("selected");

      div.addEventListener("click", () => {
        if (booked.has(code)) return;
        if (selectedSeats.has(code)) selectedSeats.delete(code);
        else selectedSeats.add(code);
        renderSeatGrid();
        updateTotal();
      });

      return div;
    };

    for (let r = 1; r <= ROWS; r++) {
      LEFT.forEach(s => seatGridEl.appendChild(makeSeat(`${r}${s}`)));
      const aisle = document.createElement("div");
      aisle.className = "aisle";
      seatGridEl.appendChild(aisle);
      RIGHT.forEach(s => seatGridEl.appendChild(makeSeat(`${r}${s}`)));
    }
  }

  function updateTotal() {
    const count = selectedSeats.size;
    const perSeat = currentTrip?.perSeatFare || 0;
    totalFareEl.textContent = String(count * perSeat);
  }

  function validateBooking() {
    if (!currentTrip) return "Select a trip first.";
    if (selectedSeats.size === 0) return "Select at least 1 seat.";
    const name = passengerNameEl.value.trim();
    const phone = passengerPhoneEl.value.trim();
    const email = passengerEmailEl.value.trim();
    const ref = paymentRefEl.value.trim();

    if (!name) return "Passenger name required.";
    if (!/^01[3-9]\d{8}$/.test(phone)) return "Valid BD phone required (017XXXXXXXX).";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return "Email invalid.";
    if (!ref) return "Txn/Reference ID is required.";

    return null;
  }

  function submitBooking() {
    const err = validateBooking();
    if (err) { alert(err); return; }

    const method = paymentMethodEl.value;
    const payTo = PAY_TO[method] || "01XXXXXXXXX";

    const booking = {
      pnr: pnr(),
      status: "UNPAID",
      tripKey: tripSeatKey(currentTrip),

      operator: currentTrip.operator,
      time: currentTrip.time,
      from: currentTrip.from,
      to: currentTrip.to,
      date: currentTrip.date,
      perSeatFare: currentTrip.perSeatFare,

      boarding: boardingPointEl.value,
      dropping: droppingPointEl.value,

      seats: [...selectedSeats].sort(),
      total: Number(totalFareEl.textContent || 0),

      name: passengerNameEl.value.trim(),
      phone: passengerPhoneEl.value.trim(),
      email: passengerEmailEl.value.trim(),

      paymentMethod: method,
      payTo: payTo,
      paymentRef: paymentRefEl.value.trim(),

      createdAt: new Date().toISOString()
    };

    const list = loadBookings();
    list.push(booking);
    saveBookings(list);

    alert(`Submitted ✅\nPNR: ${booking.pnr}\nStatus: UNPAID (Admin will verify)\nPay To: ${method} ${payTo}`);

    // reset panel
    bookingPanel.classList.add("d-none");
    currentTrip = null;
    selectedSeats.clear();

    // refresh admin if on admin
    if ((location.hash || "").startsWith("#/admin")) renderAdmin();
  }

  // ---------- Admin ----------
  function renderAdmin() {
    const list = loadBookings().slice().reverse();

    if (!list.length) {
      adminTableEl.innerHTML = `<tr><td colspan="6" class="text-secondary">No bookings yet</td></tr>`;
      return;
    }

    adminTableEl.innerHTML = list.map((b, idx) => {
      const badge =
        b.status === "PAID" ? "success" :
        b.status === "CANCELLED" ? "danger" : "warning";

      return `
        <tr>
          <td class="text-nowrap">${esc(b.pnr)}</td>
          <td><span class="badge text-bg-${badge}">${esc(b.status)}</span></td>
          <td>${esc(b.from)} → ${esc(b.to)}<br><span class="small text-secondary">${esc(b.date)} • ${esc(b.time)}</span></td>
          <td class="small">${esc((b.seats || []).join(", "))}</td>
          <td class="text-nowrap">৳${esc(b.total)}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-success" data-paid="${idx}">Paid</button>
            <button class="btn btn-sm btn-danger" data-cancel="${idx}">Cancel</button>
          </td>
        </tr>
      `;
    }).join("");

    // NOTE: because we reversed list, we need mapping back to real index
    const real = loadBookings(); // original order
    const reversed = real.slice().reverse();

    adminTableEl.querySelectorAll("[data-paid]").forEach(btn => {
      btn.addEventListener("click", () => {
        const rIdx = Number(btn.dataset.paid);
        const pnr = reversed[rIdx].pnr;
        setStatusByPNR(pnr, "PAID");
      });
    });
    adminTableEl.querySelectorAll("[data-cancel]").forEach(btn => {
      btn.addEventListener("click", () => {
        const rIdx = Number(btn.dataset.cancel);
        const pnr = reversed[rIdx].pnr;
        setStatusByPNR(pnr, "CANCELLED");
      });
    });
  }

  function setStatusByPNR(pnrValue, status) {
    const list = loadBookings();
    const next = list.map(b => (b.pnr === pnrValue ? { ...b, status } : b));
    saveBookings(next);
    renderAdmin();
  }

  // ---------- Init ----------
  function init() {
    if (!fromCityEl || !toCityEl || !journeyDateEl) {
      console.error("Missing required HTML IDs. Check your index.html.");
      return;
    }

    applySavedTheme();

    // theme buttons (optional)
    if (btnDark) btnDark.addEventListener("click", () => setTheme("dark"));
    if (btnLight) btnLight.addEventListener("click", () => setTheme("light"));

    fillSelect(fromCityEl, CITIES, "Dhaka");
    fillSelect(toCityEl, CITIES, "Chattogram");
    journeyDateEl.value = todayISO();

    // Search submit
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const from = fromCityEl.value;
      const to = toCityEl.value;
      const date = journeyDateEl.value || todayISO();

      if (from === to) { alert("From and To can't be same."); return; }

      const trips = buildTrips(from, to, date);
      renderResults(trips);
    });

    // Booking submit
    submitPaymentBtn.addEventListener("click", submitBooking);

    // Route handling
    window.addEventListener("hashchange", route);
    route();

    // Initial results
    const trips = buildTrips(fromCityEl.value, toCityEl.value, journeyDateEl.value);
    renderResults(trips);

    // Initial admin
    renderAdmin();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
// =========================
// DATA
// =========================
const CITIES = [
  "Dhaka","Chattogram","Sylhet","Rajshahi","Khulna","Barishal","Rangpur","Cox's Bazar",
  "Saidpur","Nilphamari","Domar","Shibchar","Pacchor","Shibchar,Singapor Para",
  "Bogura","Sirajganj"
];

const ROUTE_FARES = {
  "Dhaka|Chattogram": 900,
  "Dhaka|Sylhet": 850,
  "Dhaka|Rajshahi": 800,
  "Dhaka|Khulna": 850,
  "Dhaka|Barishal": 550,
  "Dhaka|Rangpur": 750,
  "Dhaka|Cox's Bazar": 1200,
  "Chattogram|Cox's Bazar": 450,
  "Sylhet|Chattogram": 1100,
  "Dhaka|Saidpur": 900,
  "Dhaka|Nilphamari": 950,
  "Dhaka|Domar": 1050,
  "Dhaka|Shibchar": 400,
  "Dhaka|Pacchor": 400,
  "Dhaka|Shibchar,Singapor Para": 400,

  // Added examples
  "Dhaka|Bogura": 550,
  "Dhaka|Sirajganj": 350,
  "Bogura|Sirajganj": 180
};

const COACH_MULTIPLIER = { "Non-AC": 1.0, "AC": 1.25, "Sleeper": 1.6 };
const SERVICE_CHARGE_RATE = 0.03;
const ROWS = 10;
const LEFT_SEATS = ["A","B"];
const RIGHT_SEATS = ["C","D"];
const STORAGE_KEY = "bd_ticket_bookings_pay_v2";

// Operators requested + some common
const BUS_CATALOG = [
  { name:"Nabil Paribahan", routes:"*", coachTypes:["Non-AC","AC"], fareMultiplier:1.00, defaultTimes:["07:00 AM","09:00 AM","03:00 PM","06:00 PM","09:00 PM"] },
  { name:"Shyamoli Paribahan", routes:"*", coachTypes:["Non-AC","AC"], fareMultiplier:1.05, defaultTimes:["08:00 AM","01:00 PM","05:00 PM","10:00 PM"] },
  { name:"Doyel Express", routes:"*", coachTypes:["Non-AC","AC"], fareMultiplier:1.03, defaultTimes:["07:30 AM","12:30 PM","06:30 PM","09:30 PM"] },
  { name:"Salki Express", routes:"*", coachTypes:["Non-AC","AC"], fareMultiplier:1.02, defaultTimes:["06:30 AM","11:30 AM","04:30 PM","08:30 PM"] },

  { name:"Hanif Enterprise", routes:"*", coachTypes:["Non-AC","AC"], fareMultiplier:1.08, defaultTimes:["06:30 AM","09:00 AM","01:30 PM","07:00 PM","11:30 PM"] },
  { name:"Shohagh Paribahan", routes:"*", coachTypes:["Non-AC","AC"], fareMultiplier:1.10, defaultTimes:["07:00 AM","12:00 PM","06:00 PM","09:00 PM"] },
  { name:"Ena Transport", routes:"*", coachTypes:["Non-AC","AC"], fareMultiplier:1.06, defaultTimes:["07:30 AM","11:00 AM","04:00 PM","09:30 PM"] },
  { name:"Green Line Paribahan", routes:"*", coachTypes:["AC","Sleeper"], fareMultiplier:1.20, defaultTimes:["07:00 AM","10:00 AM","02:00 PM","09:00 PM"] },
  { name:"Royal Coach", routes:"*", coachTypes:["AC","Non-AC"], fareMultiplier:1.12, defaultTimes:["08:00 AM","01:00 PM","06:00 PM","10:00 PM"] },
];

// =========================
// Helpers
// =========================
const $ = (id) => document.getElementById(id);

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function getRouteKey(from,to){ return `${from}|${to}`; }

function baseFareFor(from,to){
  const key = getRouteKey(from,to);
  const rev = getRouteKey(to,from);
  return ROUTE_FARES[key] ?? ROUTE_FARES[rev] ?? 700;
}

function formatSeats(arr){ return arr.slice().sort().join(", "); }

function generatePNR(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const rand = Math.random().toString(36).slice(2,7).toUpperCase();
  return `BD-${yyyy}${mm}${dd}-${rand}`;
}

function loadBookings(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch{ return []; }
}
function saveBookings(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

function getBusByName(name){
  return BUS_CATALOG.find(b => b.name === name) || BUS_CATALOG[0];
}
function getBusesForRoute(){
  return BUS_CATALOG; // demo: all routes
}
function timesForBus(bus){
  return bus.defaultTimes || ["09:00 AM","06:00 PM"];
}

function calcFare(from,to,coach,busName,seatCount){
  const base = baseFareFor(from,to);
  const coachMult = COACH_MULTIPLIER[coach] ?? 1;
  const bus = getBusByName(busName);
  const busMult = Number(bus.fareMultiplier ?? 1);

  const perSeat = Math.round(base * coachMult * busMult);
  const subtotal = perSeat * seatCount;
  const service = Math.round(subtotal * SERVICE_CHARGE_RATE);
  const total = subtotal + service;
  return { perSeat, subtotal, service, total };
}

// =========================
// UI State
// =========================
const state = { selectedSeats: new Set() };

// =========================
// Trip key
// =========================
function currentTripKey(){
  const from = $("fromCity").value;
  const to = $("toCity").value;
  const date = $("journeyDate").value;
  const time = $("departureTime").value;
  const coach = $("coachType").value;
  const bus = $("busName").value;
  return `${from}|${to}|${date}|${time}|${coach}|${bus}`;
}

// =========================
// Renderers
// =========================
function fillSelect(el, options, defaultValue){
  el.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join("");
  if (defaultValue) el.value = defaultValue;
}

function renderBusSelectAndList(){
  const buses = getBusesForRoute();
  const busNames = buses.map(b => b.name);

  const prevSelected = $("busName")?.value;
  const selected = busNames.includes(prevSelected) ? prevSelected : busNames[0];
  fillSelect($("busName"), busNames, selected);

  const selectedBusName = $("busName").value;
  const coach = $("coachType").value;
  const base = baseFareFor($("fromCity").value, $("toCity").value);

  $("busList").innerHTML = buses.map(b => {
    const isActive = (b.name === selectedBusName);
    const coaches = (b.coachTypes || ["Non-AC","AC"])
      .map(ct => `<span class="badge bus-badge">${ct}</span>`).join(" ");

    const times = timesForBus(b).slice(0,6)
      .map(t => `<span class="badge bus-time-pill">${t}</span>`).join(" ");

    const coachToUse = (b.coachTypes || []).includes(coach) ? coach : (b.coachTypes || ["Non-AC"])[0];
    const est = calcFare($("fromCity").value, $("toCity").value, coachToUse, b.name, 1).perSeat;

    return `
      <button type="button" class="bus-card ${isActive ? "active" : ""}" data-bus="${b.name}">
        <div class="d-flex align-items-start justify-content-between gap-2">
          <div>
            <div class="fw-bold">${b.name}</div>
            <div class="small text-secondary mt-1">Coach: ${coaches}</div>
            <div class="small text-secondary mt-2">Times: ${times}</div>
            <div class="small mt-2">
              <span class="badge bus-fare-pill">Est. ৳${est}/seat</span>
              <span class="badge bus-base-pill">Base ৳${base}</span>
            </div>
          </div>
          <div class="bus-check ${isActive ? "show" : ""}">✓</div>
        </div>
      </button>
    `;
  }).join("");

  $("busList").querySelectorAll(".bus-card").forEach(btn => {
    btn.addEventListener("click", () => {
      $("busName").value = btn.dataset.bus;
      renderTimesAndCoachForSelectedBus(true);
      state.selectedSeats.clear();
      renderSeatGrid();
      renderFare();
      renderPreview();
      renderBusSelectAndList();
    });
  });

  renderTimesAndCoachForSelectedBus(false);
}

function renderTimesAndCoachForSelectedBus(resetTime){
  const bus = getBusByName($("busName").value);

  const currentCoach = $("coachType").value;
  const coachOptions = bus.coachTypes?.length ? bus.coachTypes : ["Non-AC","AC"];
  fillSelect($("coachType"), coachOptions, coachOptions.includes(currentCoach) ? currentCoach : coachOptions[0]);

  const times = timesForBus(bus);
  const currentTime = $("departureTime").value;
  const defaultTime = resetTime ? times[0] : (times.includes(currentTime) ? currentTime : times[0]);
  fillSelect($("departureTime"), times, defaultTime);
}

function bookedSeatsForTrip(tripKey){
  const bookings = loadBookings();
  const seats = new Set();
  bookings
    .filter(b => b.tripKey === tripKey && b.status !== "CANCELLED")
    .forEach(b => (b.seats || []).forEach(s => seats.add(s)));
  return seats;
}

function renderSeatGrid(){
  const grid = $("seatGrid");
  grid.innerHTML = "";

  const tripKey = currentTripKey();
  const booked = bookedSeatsForTrip(tripKey);

  const makeSeat = (code) => {
    const div = document.createElement("div");
    div.className = "seat";
    div.textContent = code;

    if (booked.has(code)) div.classList.add("booked");
    if (state.selectedSeats.has(code)) div.classList.add("selected");

    div.addEventListener("click", () => {
      if (booked.has(code)) return;
      state.selectedSeats.has(code) ? state.selectedSeats.delete(code) : state.selectedSeats.add(code);
      renderSeatGrid();
      renderFare();
      renderPreview();
    });

    return div;
  };

  for (let r=1; r<=ROWS; r++){
    for (const s of LEFT_SEATS) grid.appendChild(makeSeat(`${r}${s}`));
    const aisle = document.createElement("div");
    aisle.className = "aisle";
    grid.appendChild(aisle);
    for (const s of RIGHT_SEATS) grid.appendChild(makeSeat(`${r}${s}`));
  }

  $("selectedCount").textContent = String(state.selectedSeats.size);
}

function renderFare(){
  const from = $("fromCity").value;
  const to = $("toCity").value;
  const coach = $("coachType").value;
  const bus = $("busName").value;
  const seatCount = state.selectedSeats.size;

  const { perSeat, subtotal, service, total } = calcFare(from,to,coach,bus,seatCount);

  $("perSeatFare").textContent = String(perSeat);
  $("subtotal").textContent = String(subtotal);
  $("serviceCharge").textContent = String(service);
  $("totalFare").textContent = String(total);

  $("pvTotal").textContent = String(total);
}

function renderPreview(){
  const from = $("fromCity").value;
  const to = $("toCity").value;

  $("pvName").textContent = $("passengerName").value || "-";
  $("pvPhone").textContent = $("passengerPhone").value || "-";
  // email optional: if element exists in HTML preview
  if ($("pvEmail")) $("pvEmail").textContent = ($("passengerEmail")?.value || "-");

  $("pvBus").textContent = $("busName").value || "-";
  $("pvBusHeader").textContent = $("busName").value || "—";
  $("pvRoute").textContent = `${from} → ${to}`;
  $("pvDate").textContent = $("journeyDate").value || "-";
  $("pvTime").textContent = $("departureTime").value || "-";
  $("pvCoach").textContent = $("coachType").value || "-";
  $("pvSeats").textContent = state.selectedSeats.size ? formatSeats([...state.selectedSeats]) : "-";
}

function renderMyBookings(){
  const list = $("myBookingsList");
  const bookings = loadBookings().slice().reverse();

  if (!bookings.length){
    list.innerHTML = `<div class="alert alert-secondary rounded-4 mb-0">No bookings yet.</div>`;
    return;
  }

  list.innerHTML = bookings.map(b => `
    <div class="card border-0 shadow-sm rounded-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-bold">${b.bus} • ${b.from} → ${b.to}</div>
            <div class="small text-secondary">${b.date} • ${b.time} • ${b.coach}</div>
            <div class="small mt-2">
              <span class="badge text-bg-dark mono">${b.pnr}</span>
              <span class="badge text-bg-primary mono ms-1">৳${b.total}</span>
              <span class="badge text-bg-${b.status==="PAID"?"success":(b.status==="CANCELLED"?"danger":"warning")} ms-1">${b.status}</span>
            </div>
            <div class="small mt-2">Seats: <span class="mono fw-semibold">${formatSeats(b.seats)}</span></div>
            <div class="small text-secondary">Passenger: ${b.name} (${b.phone})</div>
          </div>
          <div class="d-flex flex-column gap-2">
            <button class="btn btn-sm btn-outline-dark" onclick="printTicketByPNR('${b.pnr}')">Print</button>
            <button class="btn btn-sm btn-outline-danger" onclick="adminCancel('${b.pnr}')">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderAdminTable(){
  const body = $("adminTableBody");
  const bookings = loadBookings();

  if (!bookings.length){
    body.innerHTML = `<tr><td colspan="9" class="text-secondary">No data</td></tr>`;
    return;
  }

  body.innerHTML = bookings.map(b => `
    <tr>
      <td class="mono">${b.pnr}</td>
      <td><span class="badge text-bg-${b.status==="PAID"?"success":(b.status==="CANCELLED"?"danger":"warning")}">${b.status}</span></td>
      <td>${b.bus}</td>
      <td>${b.from} → ${b.to}</td>
      <td>${b.date}</td>
      <td>${b.time}</td>
      <td class="mono">${formatSeats(b.seats)}</td>
      <td class="mono fw-semibold">৳${b.total}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-success" onclick="adminMarkPaid('${b.pnr}')">Paid</button>
          <button class="btn btn-outline-warning" onclick="adminMarkUnpaid('${b.pnr}')">Unpaid</button>
          <button class="btn btn-outline-dark" onclick="printTicketByPNR('${b.pnr}')">Print</button>
          <button class="btn btn-outline-danger" onclick="adminCancel('${b.pnr}')">Cancel</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// =========================
// Admin actions
// =========================
window.adminMarkPaid = function(pnr){
  const bookings = loadBookings().map(b => b.pnr===pnr ? {...b, status:"PAID"} : b);
  saveBookings(bookings); refreshAll();
};
window.adminMarkUnpaid = function(pnr){
  const bookings = loadBookings().map(b => b.pnr===pnr ? {...b, status:"UNPAID"} : b);
  saveBookings(bookings); refreshAll();
};
window.adminCancel = function(pnr){
  const bookings = loadBookings().map(b => b.pnr===pnr ? {...b, status:"CANCELLED"} : b);
  saveBookings(bookings); refreshAll();
};

// =========================
// Payment + Ticket
// =========================
function validateBeforePay(){
  const from = $("fromCity").value;
  const to = $("toCity").value;
  const date = $("journeyDate").value;
  const time = $("departureTime").value;
  const coach = $("coachType").value;
  const bus = $("busName").value;

  const name = $("passengerName").value.trim();
  const phone = $("passengerPhone").value.trim();
  const email = $("passengerEmail")?.value?.trim() || ""; // ✅ optional
  const seats = [...state.selectedSeats];

  if (from === to) return "From এবং To এক হতে পারবে না।";
  if (!date || !time || !coach || !bus) return "Route/Time/Coach/Bus select করুন।";
  if (!name) return "Passenger name দিন।";
  if (!/^01[3-9]\d{8}$/.test(phone)) return "Valid BD mobile দিন (017XXXXXXXX).";
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return "Email দিলে valid email দিন।";
  if (!seats.length) return "কমপক্ষে ১টা seat select করুন।";

  const tripKey = currentTripKey();
  const booked = bookedSeatsForTrip(tripKey);
  const conflict = seats.find(s => booked.has(s));
  if (conflict) return `Seat ${conflict} already booked. আবার select করুন।`;

  return null;
}

function buildTicketText(booking){
  return [
    `BD Ticket Booking`,
    `PNR: ${booking.pnr}`,
    `Bus: ${booking.bus}`,
    `Route: ${booking.from} -> ${booking.to}`,
    `Date: ${booking.date}`,
    `Time: ${booking.time}`,
    `Coach: ${booking.coach}`,
    `Seats: ${booking.seats.join(", ")}`,
    `Total: ৳${booking.total}`,
    `Status: ${booking.status}`,
    `Payment: ${booking.paymentMethod} (${booking.paymentRef || "N/A"})`,
  ].join("\n");
}

function buildMailtoLink(toEmail, subject, body){
  return `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function buildSmsLink(phone, body){
  return `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(body)}`;
}

function openPaymentModal(){
  const err = validateBeforePay();
  if (err){ alert(err); return; }

  $("payTotal").textContent = $("totalFare").textContent || "0";

  // ✅ FIX: use $("paymentModal") not $("#paymentModal")
  bootstrap.Modal.getOrCreateInstance($("paymentModal")).show();
}

function confirmPaymentAndCreateBooking(){
  const err = validateBeforePay();
  if (err){ alert(err); return; }

  const from = $("fromCity").value;
  const to = $("toCity").value;
  const date = $("journeyDate").value;
  const time = $("departureTime").value;
  const coach = $("coachType").value;
  const bus = $("busName").value;

  const name = $("passengerName").value.trim();
  const phone = $("passengerPhone").value.trim();
  const email = $("passengerEmail")?.value?.trim() || ""; // ✅ optional
  const seats = [...state.selectedSeats];

  const fare = calcFare(from,to,coach,bus,seats.length);
  const pnr = generatePNR();

  const paymentMethod = $("paymentMethod").value;
  const paymentRef = $("paymentRef").value.trim();

  const booking = {
    pnr,
    tripKey: currentTripKey(),
    from,to,date,time,coach,bus,
    name, phone, email,
    seats,
    total: fare.total,
    status: "PAID",
    paymentMethod,
    paymentRef,
    createdAt: new Date().toISOString()
  };

  const bookings = loadBookings();
  bookings.push(booking);
  saveBookings(bookings);

  // ✅ close payment modal
  bootstrap.Modal.getOrCreateInstance($("paymentModal")).hide();

  // success modal prepare
  $("successPnr").textContent = booking.pnr;

  const ticketText = buildTicketText(booking);

  // Email button: only show if email given
  const emailBtn = $("btnEmailTicket");
  if (emailBtn){
    if (booking.email){
      emailBtn.style.display = "";
      emailBtn.href = buildMailtoLink(
        booking.email,
        `Your Bus Ticket (PNR: ${booking.pnr})`,
        ticketText
      );
    } else {
      emailBtn.style.display = "none";
      emailBtn.href = "#";
    }
  }

  // SMS always
  const smsBtn = $("btnSmsTicket");
  if (smsBtn){
    smsBtn.href = buildSmsLink(booking.phone, ticketText);
  }

  // Print
  $("btnPrintTicket").onclick = () => printTicket(booking);

  $("pnrPreview").textContent = `PNR: ${pnr}`;

  state.selectedSeats.clear();
  renderSeatGrid();
  renderFare();
  renderPreview();

  refreshAll();

  // ✅ show success modal
  bootstrap.Modal.getOrCreateInstance($("successModal")).show();
}

function printTicketByPNR(pnr){
  const booking = loadBookings().find(b => b.pnr === pnr);
  if (!booking){ alert("Ticket not found"); return; }
  printTicket(booking);
}
window.printTicketByPNR = printTicketByPNR;

function printTicket(booking){
  const w = window.open("", "_blank");
  if (!w){ alert("Popup blocked. Allow popups to print."); return; }

  const seats = booking.seats.join(", ");
  const statusColor = booking.status==="PAID" ? "#198754" : (booking.status==="CANCELLED" ? "#dc3545" : "#ffc107");

  w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket ${booking.pnr}</title>
  <style>
    body{ font-family: Arial, sans-serif; padding: 24px; background:#f6f7fb; }
    .wrap{ max-width: 520px; margin: 0 auto; }
    .ticket{
      background:#fff; border-radius:18px; padding:20px;
      box-shadow: 0 10px 30px rgba(0,0,0,.08);
      border: 1px solid rgba(0,0,0,.08);
    }
    .top{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .brand{ font-size:18px; font-weight:800; }
    .pnr{ font-family: ui-monospace, Menlo, Consolas, monospace; font-weight:800; }
    .status{ display:inline-block; padding:6px 10px; border-radius:999px; color:#fff; font-weight:800; background:${statusColor}; font-size:12px; }
    .hr{ height:1px; background:rgba(0,0,0,.08); margin:14px 0; }
    .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:13px; }
    .k{ color:#6c757d; font-weight:700; }
    .v{ font-weight:800; }
    .mono{ font-family: ui-monospace, Menlo, Consolas, monospace; }
    .price{ font-size:18px; font-weight:900; }
    .footer{ margin-top:14px; font-size:12px; color:#6c757d; }
    @media print { body{ background:#fff; } .wrap{ max-width:none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="ticket">
      <div class="top">
        <div>
          <div class="brand">BD Ticket Booking</div>
          <div class="mono pnr">PNR: ${booking.pnr}</div>
        </div>
        <div class="status">${booking.status}</div>
      </div>

      <div class="hr"></div>

      <div class="grid">
        <div><div class="k">Bus</div><div class="v">${booking.bus}</div></div>
        <div><div class="k">Coach</div><div class="v">${booking.coach}</div></div>

        <div><div class="k">From</div><div class="v">${booking.from}</div></div>
        <div><div class="k">To</div><div class="v">${booking.to}</div></div>

        <div><div class="k">Date</div><div class="v">${booking.date}</div></div>
        <div><div class="k">Time</div><div class="v">${booking.time}</div></div>

        <div><div class="k">Passenger</div><div class="v">${booking.name}</div></div>
        <div><div class="k">Phone</div><div class="v mono">${booking.phone}</div></div>

        <div><div class="k">Seats</div><div class="v mono">${seats}</div></div>
        <div><div class="k">Total</div><div class="v price mono">৳${booking.total}</div></div>

        <div><div class="k">Payment</div><div class="v">${booking.paymentMethod}</div></div>
        <div><div class="k">Txn/Ref</div><div class="v mono">${booking.paymentRef || "N/A"}</div></div>
      </div>

      <div class="footer">Please arrive 30 minutes early. Demo ticket (client-side).</div>
    </div>

    <script> window.onload = () => window.print(); </script>
  </div>
</body>
</html>
  `);
  w.document.close();
}

function refreshAll(){
  renderMyBookings();
  renderAdminTable();
}

// =========================
// Theme
// =========================
function applySavedTheme(){
  const saved = localStorage.getItem("bd_theme") || "light";
  document.documentElement.setAttribute("data-bs-theme", saved);
}
function toggleTheme(){
  const html = document.documentElement;
  const next = html.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-bs-theme", next);
  localStorage.setItem("bd_theme", next);
}

// =========================
// Init
// =========================
function init(){
  applySavedTheme();

  fillSelect($("fromCity"), CITIES, "Dhaka");
  fillSelect($("toCity"), CITIES, "Chattogram");

  $("journeyDate").min = todayISO();
  $("journeyDate").value = todayISO();

  renderBusSelectAndList();

  ["fromCity","toCity","journeyDate"].forEach(id => {
    $(id).addEventListener("change", () => {
      if ($("fromCity").value === $("toCity").value){
        const fallback = CITIES.find(c => c !== $("fromCity").value) || "Chattogram";
        $("toCity").value = fallback;
      }
      state.selectedSeats.clear();
      renderBusSelectAndList();
      renderSeatGrid();
      renderFare();
      renderPreview();
    });
  });

  ["busName","coachType","departureTime"].forEach(id => {
    $(id).addEventListener("change", () => {
      if (id === "busName") renderTimesAndCoachForSelectedBus(true);
      state.selectedSeats.clear();
      renderSeatGrid();
      renderFare();
      renderPreview();
      renderBusSelectAndList();
    });
  });

  ["passengerName","passengerPhone","passengerEmail"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", renderPreview);
  });

  $("resetBtn").addEventListener("click", () => {
    $("passengerName").value = "";
    $("passengerPhone").value = "";
    if ($("passengerEmail")) $("passengerEmail").value = "";
    state.selectedSeats.clear();
    $("pnrPreview").textContent = "PNR: -";
    renderSeatGrid(); renderFare(); renderPreview();
  });

  $("seedBtn").addEventListener("click", () => {
    const tripKey = currentTripKey();
    const from = $("fromCity").value;
    const to = $("toCity").value;
    const date = $("journeyDate").value;
    const time = $("departureTime").value;
    const coach = $("coachType").value;
    const bus = $("busName").value;

    const seats = ["1A","1B"];
    const fare = calcFare(from,to,coach,bus,seats.length);

    const bookings = loadBookings();
    bookings.push({
      pnr: generatePNR(), tripKey, from,to,date,time,coach,bus,
      name:"Demo Passenger", phone:"01700000000", email:"",
      seats, total: fare.total, status:"PAID",
      paymentMethod:"bKash", paymentRef:"TXN-DEMO",
      createdAt:new Date().toISOString()
    });
    saveBookings(bookings);
    renderSeatGrid(); refreshAll();
  });

  $("clearAllBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderSeatGrid(); renderFare(); renderPreview();
    refreshAll();
  });

  $("themeBtn").addEventListener("click", toggleTheme);

  // ✅ Pay flow
  $("payBtn").addEventListener("click", openPaymentModal);
  $("confirmPayBtn").addEventListener("click", confirmPaymentAndCreateBooking);

  renderSeatGrid();
  renderFare();
  renderPreview();
  refreshAll();
}

init();

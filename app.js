// =========================
// Demo limitation notice:
// - Email/SMS auto-send is NOT possible without backend.
// - We implement "compose" links (mailto:, sms:).
// =========================

// -------------------------
// Data
// -------------------------
const CITIES = [
  "Dhaka","Sirajganj","Bogura","Noakhali","Feni","Chattogram","Sylhet","Faridpur",
  "Rangpur","Saidpur","Nilphamari","Domar","Shibchar","Pacchor"
];

const CITY_POINTS = {
  Dhaka: { boarding:["Gabtoli","Kallyanpur","Mohakhali","Sayedabad"], dropping:["Gabtoli","Kallyanpur","Mohakhali","Sayedabad"] },
  Sirajganj: { boarding:["Sirajganj Sadar","Hatikumrul","Jamuna Setu West"], dropping:["Sirajganj Sadar","Hatikumrul","Jamuna Setu West"] },
  Bogura: { boarding:["Satmatha","Nawabbari","Bogura Bus Terminal"], dropping:["Satmatha","Nawabbari","Bogura Bus Terminal"] },
  Noakhali: { boarding:["Maijdee Court","Chowmuhani","Sonapur"], dropping:["Maijdee Court","Chowmuhani","Sonapur"] },
  Feni: { boarding:["Feni Bus Terminal","Mohipal","Trunk Road"], dropping:["Feni Bus Terminal","Mohipal","Trunk Road"] },
  Chattogram: { boarding:["AK Khan","Dampara","Bohaddarhat","Nimtola"], dropping:["AK Khan","Dampara","Bohaddarhat","Bohaddarhat","Nimtola"] },
  Sylhet: { boarding:["Kadamtoli","Ambarkhana","Subidbazar"], dropping:["Kadamtoli","Ambarkhana","Subidbazar"] },
  Faridpur: { boarding:["Faridpur Bus Terminal","Goalchamot","Bhanga"], dropping:["Faridpur Bus Terminal","Goalchamot","Bhanga"] },
  Rangpur: { boarding:["Rangpur Bus Terminal","Shapla Chottor","Modern Mor"], dropping:["Rangpur Bus Terminal","Shapla Chottor","Modern Mor"] },
  Saidpur: { boarding:["Saidpur Bus Terminal","Airport Road","Railgate"], dropping:["Saidpur Bus Terminal","Airport Road","Railgate"] },
  Nilphamari: { boarding:["Nilphamari Bus Terminal","Notkhana","Circuit House"], dropping:["Nilphamari Bus Terminal","Notkhana","Circuit House"] },
  Domar: { boarding:["Domar Bus Stand","Domar Rail Gate"], dropping:["Domar Bus Stand","Domar Rail Gate"] },
  Shibchar: { boarding:["Shibchar Bus Stand","Pachchar Mor"], dropping:["Shibchar Bus Stand","Pachchar Mor"] },
  Pacchor: { boarding:["Pacchor Bus Stand","Padma Bridge Link Road"], dropping:["Pacchor Bus Stand","Padma Bridge Link Road"] }
};

const ROUTE_FARES = {
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

const COACH_MULTIPLIER = { "Non-AC": 1.0, "AC": 1.25, "Sleeper": 1.6 };
const SERVICE_CHARGE_RATE = 0.03;

const BUS_CATALOG = [
  { name:"Nabil Paribahan", coachTypes:["Non-AC","AC"], fareMultiplier:1.00, times:["07:00 AM","09:00 AM","03:00 PM","06:00 PM","09:00 PM"] },
  { name:"Shyamoli Paribahan", coachTypes:["Non-AC","AC"], fareMultiplier:1.05, times:["08:00 AM","01:00 PM","05:00 PM","10:00 PM"] },
  { name:"Doyel Express", coachTypes:["Non-AC","AC"], fareMultiplier:1.03, times:["07:30 AM","12:30 PM","06:30 PM","09:30 PM"] },
  { name:"Salki Express", coachTypes:["Non-AC","AC"], fareMultiplier:1.02, times:["06:30 AM","11:30 AM","04:30 PM","08:30 PM"] },
  { name:"Hanif Enterprise", coachTypes:["Non-AC","AC","Sleeper"], fareMultiplier:1.08, times:["06:30 AM","09:00 AM","01:30 PM","07:00 PM","11:30 PM"] },
  { name:"Shohagh Paribahan", coachTypes:["Non-AC","AC"], fareMultiplier:1.10, times:["07:00 AM","12:00 PM","06:00 PM","09:00 PM"] },
];

// seat layout
const ROWS = 10;
const LEFT_SEATS = ["A","B"];
const RIGHT_SEATS = ["C","D"];

// storage
const STORAGE_KEY = "bd_bus_bookings_v2";
const THEME_KEY = "bd_theme";

// -------------------------
// DOM
// -------------------------
const $ = (id) => document.getElementById(id);
const uniq = (arr) => [...new Set(arr)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

// -------------------------
// Utils
// -------------------------
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
function toMin(t){
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  let hh = parseInt(m[1],10);
  const mm = parseInt(m[2],10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;
  return hh*60 + mm;
}
function bucketTime(mins){
  if (mins >= 300 && mins < 720) return "MORNING";
  if (mins >= 720 && mins < 1020) return "AFTERNOON";
  if (mins >= 1020 && mins < 1260) return "EVENING";
  return "NIGHT";
}
function minsToHHMM(mins){
  const h = Math.floor(mins/60);
  const m = mins%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function generatePNR(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const rand = Math.random().toString(36).slice(2,7).toUpperCase();
  return `BD-${yyyy}${mm}${dd}-${rand}`;
}
function loadBookings(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveBookings(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

function pointsForCity(city){
  return CITY_POINTS[city] || { boarding:["Main Counter"], dropping:["Main Counter"] };
}

function guessDurationMin(from,to){
  const key = getRouteKey(from,to);
  const map = {
    "Dhaka|Chattogram": 390,
    "Dhaka|Sylhet": 360,
    "Dhaka|Bogura": 300,
    "Dhaka|Sirajganj": 210,
    "Dhaka|Faridpur": 150,
    "Dhaka|Noakhali": 240,
    "Dhaka|Feni": 270,
    "Dhaka|Rangpur": 480,
    "Dhaka|Saidpur": 510,
    "Dhaka|Nilphamari": 540,
    "Dhaka|Domar": 560,
    "Dhaka|Shibchar": 120,
    "Dhaka|Pacchor": 120
  };
  return map[key] || map[getRouteKey(to,from)] || 360;
}

function calcFare(from,to,coach,busName,seatCount,discount=0){
  const base = baseFareFor(from,to);
  const coachMult = COACH_MULTIPLIER[coach] ?? 1;
  const bus = BUS_CATALOG.find(b => b.name === busName) || BUS_CATALOG[0];
  const busMult = Number(bus.fareMultiplier ?? 1);

  const perSeat = Math.round(base * coachMult * busMult);
  const subtotal = perSeat * seatCount;
  const service = Math.round(subtotal * SERVICE_CHARGE_RATE);
  const gross = subtotal + service;
  const net = Math.max(0, gross - (Number(discount)||0));
  return { perSeat, subtotal, service, gross, discount: Number(discount)||0, total: net };
}

function buildTicketText(b){
  return [
    `BD Bus Ticket`,
    `PNR: ${b.pnr}`,
    `Status: ${b.status}`,
    `Bus: ${b.bus}`,
    `Route: ${b.from} -> ${b.to}`,
    `Date: ${b.date}`,
    `Time: ${b.time}`,
    `Coach: ${b.coach}`,
    `Boarding: ${b.boarding}`,
    `Dropping: ${b.dropping}`,
    `Seats: ${(b.seats||[]).join(", ")}`,
    `Discount: ৳${b.discount||0}`,
    `Total: ৳${b.total}`,
  ].join("\n");
}
function mailtoLink(email, subject, body){
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function smsLink(phone, body){
  return `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(body)}`;
}

// -------------------------
// Router (#/search, #/admin)
// -------------------------
function showRoute(){
  const hash = location.hash || "#/search";
  const isAdmin = hash.startsWith("#/admin");
  $("viewSearch").classList.toggle("d-none", isAdmin);
  $("viewAdmin").classList.toggle("d-none", !isAdmin);

  if (isAdmin) renderAdmin();
  else renderSearch();
}
window.addEventListener("hashchange", showRoute);

// -------------------------
// Search UI State
// -------------------------
const ui = {
  from: "Dhaka",
  to: "Chattogram",
  date: todayISO(),
  selectedOperators: new Set(),
  coach: "ALL",
  timeBucket: "ALL",
  maxPrice: 2500,
  sortBy: "EARLIEST",
  trips: [],
};

// Booking State
const booking = {
  trip: null,
  selectedSeats: new Set(),
  discount: 0,
};

// -------------------------
// Trips builder (expanded: all boarding + all dropping)
// -------------------------
function buildTrips(from,to,date){
  const dur = guessDurationMin(from,to);
  const boardAll = pointsForCity(from).boarding;
  const dropAll = pointsForCity(to).dropping;

  const trips = [];
  for (const bus of BUS_CATALOG){
    for (const time of bus.times){
      const depMin = toMin(time);
      const arrMin = (depMin + dur) % (24*60);

      for (const coach of bus.coachTypes){
        const price = calcFare(from,to,coach,bus.name,1,0).perSeat;

        trips.push({
          id: `${bus.name}|${coach}|${time}`,
          bus: bus.name,
          coach,
          date,
          from,
          to,
          depTime: time,
          depMin,
          arrMin,
          duration: dur,
          boardingAll: boardAll,
          droppingAll: dropAll,
          price,
          seatsLeft: Math.max(3, 36 - ((bus.name.length + depMin) % 20)),
          amenities: coach === "Sleeper"
            ? ["Sleeper","WiFi","Charging"]
            : (coach === "AC" ? ["AC","Charging","Water"] : ["Fan","Charging","Water"]),
          policy: {
            cancelBeforeHours: 6,
            rescheduleAllowed: true,
            noShowRule: "After departure, ticket may be invalid (demo)."
          }
        });
      }
    }
  }
  return trips;
}

// -------------------------
// Filters + sort
// -------------------------
function applyFilters(trips){
  let out = trips.slice();

  if (ui.selectedOperators.size) out = out.filter(t => ui.selectedOperators.has(t.bus));
  if (ui.coach !== "ALL") out = out.filter(t => t.coach === ui.coach);
  if (ui.timeBucket !== "ALL") out = out.filter(t => bucketTime(t.depMin) === ui.timeBucket);
  out = out.filter(t => t.price <= ui.maxPrice);

  if (ui.sortBy === "EARLIEST") out.sort((a,b)=> a.depMin - b.depMin || a.price - b.price);
  if (ui.sortBy === "LATEST") out.sort((a,b)=> b.depMin - a.depMin || a.price - b.price);
  if (ui.sortBy === "CHEAPEST") out.sort((a,b)=> a.price - b.price || a.depMin - b.depMin);

  return out;
}

// -------------------------
// Render Search
// -------------------------
function fillSelect(el, options, value){
  el.innerHTML = options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
  if (value) el.value = value;
}
function setPillActive(group, btn){
  group.querySelectorAll(".filter-pill").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function renderOperatorFilters(trips){
  const wrap = $("filterOperators");
  const ops = uniq(trips.map(t=>t.bus)).sort();

  wrap.innerHTML = ops.map(op=>{
    const checked = ui.selectedOperators.has(op) ? "checked" : "";
    return `
      <label class="d-flex align-items-center gap-2 small mb-2">
        <input type="checkbox" class="form-check-input m-0" data-op="${esc(op)}" ${checked}/>
        <span>${esc(op)}</span>
      </label>
    `;
  }).join("");

  wrap.querySelectorAll("input[type=checkbox]").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const op = cb.dataset.op;
      cb.checked ? ui.selectedOperators.add(op) : ui.selectedOperators.delete(op);
      renderAllResults();
    });
  });
}

function renderAllResults(){
  const filtered = applyFilters(ui.trips);
  $("routeBadge").textContent = `${ui.from} → ${ui.to}`;
  $("dateBadge").textContent = ui.date;

  $("resultCountTop").textContent = `${filtered.length} results`;
  $("resultCountBottom").textContent = `${filtered.length} results`;

  const list = $("resultList");
  if (!filtered.length){
    list.innerHTML = `<div class="alert alert-secondary rounded-4 mb-0">No trips found for your filters.</div>`;
    return;
  }

  list.innerHTML = filtered.map(t=>{
    const durH = Math.floor(t.duration/60);
    const durM = t.duration%60;

    const policyId = `pol_${btoa(t.id).replace(/=/g,"")}`;
    const fullId = `full_${btoa(t.id).replace(/=/g,"")}`;

    return `
      <div class="result-card mb-3">
        <div class="d-flex justify-content-between gap-3 flex-wrap">
          <div class="flex-grow-1">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div>
                <div class="fw-bold">${esc(t.bus)}</div>
                <div class="small text-secondary">${esc(t.coach)} • ${t.seatsLeft} seats left</div>
              </div>
              <div class="text-end">
                <div class="price-tag mono">৳${t.price}</div>
                <div class="small text-secondary">per seat</div>
              </div>
            </div>

            <div class="mt-2 d-flex align-items-center gap-3 flex-wrap">
              <div>
                <div class="fw-bold mono">${esc(t.depTime)}</div>
                <div class="small text-secondary">From: ${esc(ui.from)}</div>
              </div>

              <div class="text-secondary small">—</div>

              <div>
                <div class="fw-bold mono">${minsToHHMM(t.arrMin)}</div>
                <div class="small text-secondary">To: ${esc(ui.to)}</div>
              </div>

              <div class="ms-auto small text-secondary">
                Duration: <span class="mono fw-semibold">${durH}h ${durM}m</span>
              </div>
            </div>

            <div class="mt-2 d-flex gap-2 flex-wrap">
              ${t.amenities.map(a=>`<span class="amenity">${esc(a)}</span>`).join("")}
            </div>

            <div class="mt-3 d-flex gap-2 flex-wrap">
              <button class="btn btn-outline-secondary btn-sm" data-toggle="${fullId}" type="button">Departure & Drop Points</button>
              <button class="btn btn-outline-secondary btn-sm" data-toggle="${policyId}" type="button">Policy</button>
            </div>

            <div id="${fullId}" class="mt-3 d-none">
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="p-3 rounded-4 border bg-body">
                    <div class="fw-semibold mb-2">All Departure (Boarding) Points</div>
                    <div class="small text-secondary mb-2">From: ${esc(ui.from)}</div>
                    <ul class="small mb-0">
                      ${t.boardingAll.map(p=>`<li>${esc(p)} <span class="text-secondary">(available time: ${esc(t.depTime)})</span></li>`).join("")}
                    </ul>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="p-3 rounded-4 border bg-body">
                    <div class="fw-semibold mb-2">All Dropping Points</div>
                    <div class="small text-secondary mb-2">To: ${esc(ui.to)}</div>
                    <ul class="small mb-0">
                      ${t.droppingAll.map(p=>`<li>${esc(p)}</li>`).join("")}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div id="${policyId}" class="mt-3 d-none">
              <div class="p-3 rounded-4 border bg-body small">
                <div class="fw-semibold mb-2">Policy (Demo)</div>
                <ul class="mb-0">
                  <li>Cancel up to <b>${t.policy.cancelBeforeHours} hours</b> before departure.</li>
                  <li>Reschedule: <b>${t.policy.rescheduleAllowed ? "Allowed (once)" : "Not allowed"}</b> (demo).</li>
                  <li>${esc(t.policy.noShowRule)}</li>
                </ul>
              </div>
            </div>

          </div>

          <div class="d-flex flex-column gap-2">
            <button class="btn btn-outline-primary btn-sm" data-book="${encodeURIComponent(t.id)}">View Seats</button>
            <button class="btn btn-primary btn-sm" data-book="${encodeURIComponent(t.id)}">Book</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // toggles
  list.querySelectorAll("[data-toggle]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.toggle;
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("d-none");
    });
  });

  // booking buttons
  list.querySelectorAll("[data-book]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = decodeURIComponent(btn.dataset.book);
      const trip = filtered.find(x=>x.id===id);
      if (!trip) return;
      openBooking(trip);
    });
  });
}

function renderSearch(){
  // Search form init
  fillSelect($("srchFrom"), CITIES, ui.from);
  fillSelect($("srchTo"), CITIES, ui.to);

  $("srchDate").value = ui.date;
  $("srchDate").min = todayISO();

  // build trips
  ui.trips = buildTrips(ui.from, ui.to, ui.date);
  renderOperatorFilters(ui.trips);
  renderAllResults();
}

// -------------------------
// Booking + Seats
// -------------------------
function bookingKey(trip, boarding, dropping){
  return `${trip.from}|${trip.to}|${trip.date}|${trip.depTime}|${trip.coach}|${trip.bus}|${boarding}|${dropping}`;
}
function bookedSeatsFor(key){
  const all = loadBookings();
  const seats = new Set();
  all.filter(b => b.tripKey === key && b.status !== "CANCELLED")
    .forEach(b => (b.seats||[]).forEach(s => seats.add(s)));
  return seats;
}

function openBooking(trip){
  booking.trip = trip;
  booking.selectedSeats.clear();
  booking.discount = 0;

  $("bookingPanel").classList.remove("d-none");
  $("bkSub").textContent = `${ui.from} → ${ui.to} • ${ui.date} • ${trip.depTime} • ${trip.bus} • ${trip.coach}`;

  fillSelect($("boardingPoint"), trip.boardingAll, trip.boardingAll[0]);
  fillSelect($("droppingPoint"), trip.droppingAll, trip.droppingAll[0]);

  // preview header
  $("pvBus").textContent = trip.bus;
  $("pvPNR").textContent = "PNR: -";
  $("pvRoute").textContent = `${ui.from} → ${ui.to}`;
  $("pvDate").textContent = ui.date;
  $("pvTime").textContent = trip.depTime;
  $("pvCoach").textContent = trip.coach;

  // reset passenger
  $("passengerName").value = $("passengerName").value || "";
  $("passengerPhone").value = $("passengerPhone").value || "";
  $("passengerEmail").value = $("passengerEmail").value || "";

  renderSeatGrid();
  renderFarePreview();

  $("bookingPanel").scrollIntoView({behavior:"smooth", block:"start"});
}

function renderSeatGrid(){
  const trip = booking.trip;
  if (!trip) return;

  const board = $("boardingPoint").value;
  const drop = $("droppingPoint").value;
  const key = bookingKey(trip, board, drop);
  const booked = bookedSeatsFor(key);

  const grid = $("seatGrid");
  grid.innerHTML = "";

  const makeSeat = (code)=>{
    const div = document.createElement("div");
    div.className = "seat";
    div.textContent = code;

    if (booked.has(code)) div.classList.add("booked");
    if (booking.selectedSeats.has(code)) div.classList.add("selected");

    div.addEventListener("click", ()=>{
      if (booked.has(code)) return;
      booking.selectedSeats.has(code) ? booking.selectedSeats.delete(code) : booking.selectedSeats.add(code);
      renderSeatGrid();
      renderFarePreview();
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
}

function renderFarePreview(){
  const trip = booking.trip;
  if (!trip) return;

  const seats = [...booking.selectedSeats].sort();
  const fare = calcFare(ui.from, ui.to, trip.coach, trip.bus, seats.length, booking.discount);

  $("perSeatFare").textContent = String(fare.perSeat);
  $("totalFare").textContent = String(fare.total);

  $("pvBoard").textContent = $("boardingPoint").value || "-";
  $("pvDrop").textContent = $("droppingPoint").value || "-";
  $("pvSeats").textContent = seats.length ? seats.join(", ") : "-";
  $("selectedSeatsText").textContent = seats.length ? seats.join(", ") : "-";

  $("pvName").textContent = $("passengerName").value.trim() || "-";
  $("pvPhone").textContent = $("passengerPhone").value.trim() || "-";

  $("pvDiscount").textContent = String(fare.discount || 0);
  $("pvTotal").textContent = String(fare.total);

  // compose links
  const phone = $("passengerPhone").value.trim();
  const email = $("passengerEmail").value.trim();
  const tempTicket = {
    pnr: "PENDING",
    status: "UNPAID",
    bus: trip.bus,
    from: ui.from, to: ui.to,
    date: ui.date,
    time: trip.depTime,
    coach: trip.coach,
    boarding: $("boardingPoint").value,
    dropping: $("droppingPoint").value,
    seats,
    discount: fare.discount || 0,
    total: fare.total
  };

  const body = buildTicketText(tempTicket);

  $("btnSms").href = smsLink(phone || "", body);

  const emailBtn = $("btnEmail");
  if (email){
    emailBtn.classList.remove("d-none");
    emailBtn.href = mailtoLink(email, `Bus Ticket (PNR: ${tempTicket.pnr})`, body);
  } else {
    emailBtn.classList.add("d-none");
    emailBtn.href = "#";
  }
}

function validateBooking(){
  if (!booking.trip) return "Select a trip first.";
  if (booking.selectedSeats.size === 0) return "Select at least 1 seat.";
  const name = $("passengerName").value.trim();
  const phone = $("passengerPhone").value.trim();
  const email = $("passengerEmail").value.trim();
  if (!name) return "Passenger name is required.";
  if (!/^01[3-9]\d{8}$/.test(phone)) return "Valid BD phone required (017XXXXXXXX).";
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return "Email provided is invalid.";
  return null;
}

function printTicketHTML(bookingObj){
  const w = window.open("", "_blank");
  if (!w){ alert("Popup blocked. Allow popups to print."); return; }

  const html = `
<!doctype html><html><head><meta charset="utf-8" />
<title>Ticket ${esc(bookingObj.pnr)}</title>
<style>
  body{ font-family: Arial, sans-serif; padding: 24px; background:#fff; }
  .ticket{ max-width: 560px; margin: 0 auto; border:2px dashed #0d6efd; border-radius:18px; padding:18px; }
  .mono{ font-family: ui-monospace, Menlo, Consolas, monospace; }
  .row{ display:flex; justify-content:space-between; margin:8px 0; gap:12px; }
  .k{ color:#6c757d; font-weight:700; }
  .v{ font-weight:800; text-align:right; }
  .price{ font-size:18px; font-weight:900; }
</style></head><body>
<div class="ticket">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
    <div>
      <div style="font-weight:900;font-size:18px;">BD Bus Ticket</div>
      <div class="mono">PNR: ${esc(bookingObj.pnr)}</div>
    </div>
    <div style="font-weight:900;color:${bookingObj.status==="PAID"?"#198754":(bookingObj.status==="CANCELLED"?"#dc3545":"#fd7e14")}">${esc(bookingObj.status)}</div>
  </div>
  <hr />
  <div class="row"><div class="k">Bus</div><div class="v">${esc(bookingObj.bus)}</div></div>
  <div class="row"><div class="k">Route</div><div class="v">${esc(bookingObj.from)} → ${esc(bookingObj.to)}</div></div>
  <div class="row"><div class="k">Date</div><div class="v">${esc(bookingObj.date)}</div></div>
  <div class="row"><div class="k">Time</div><div class="v mono">${esc(bookingObj.time)}</div></div>
  <div class="row"><div class="k">Coach</div><div class="v">${esc(bookingObj.coach)}</div></div>
  <div class="row"><div class="k">Boarding</div><div class="v">${esc(bookingObj.boarding)}</div></div>
  <div class="row"><div class="k">Dropping</div><div class="v">${esc(bookingObj.dropping)}</div></div>
  <div class="row"><div class="k">Seats</div><div class="v mono">${esc((bookingObj.seats||[]).join(", "))}</div></div>
  <div class="row"><div class="k">Passenger</div><div class="v">${esc(bookingObj.name)}</div></div>
  <div class="row"><div class="k">Mobile</div><div class="v mono">${esc(bookingObj.phone)}</div></div>
  <hr />
  <div class="row"><div class="k">Discount</div><div class="v mono">৳${esc(bookingObj.discount||0)}</div></div>
  <div class="row"><div class="k">Total</div><div class="v price mono">৳${esc(bookingObj.total)}</div></div>
  <div style="color:#6c757d;font-size:12px;margin-top:10px;">Demo ticket (frontend only).</div>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>
  `;
  w.document.write(html);
  w.document.close();
}

// -------------------------
// Payment flow
// -------------------------
function openPaymentModal(){
  const err = validateBooking();
  if (err){ alert(err); return; }
  $("payTotal").textContent = $("totalFare").textContent || "0";
  bootstrap.Modal.getOrCreateInstance($("paymentModal")).show();
}

function confirmPayment(){
  const err = validateBooking();
  if (err){ alert(err); return; }

  const trip = booking.trip;
  const seats = [...booking.selectedSeats].sort();
  const fare = calcFare(ui.from, ui.to, trip.coach, trip.bus, seats.length, booking.discount);

  const bookingObj = {
    pnr: generatePNR(),
    status: "PAID",
    tripKey: bookingKey(trip, $("boardingPoint").value, $("droppingPoint").value),
    from: ui.from, to: ui.to,
    date: ui.date,
    time: trip.depTime,
    coach: trip.coach,
    bus: trip.bus,
    boarding: $("boardingPoint").value,
    dropping: $("droppingPoint").value,
    seats,
    name: $("passengerName").value.trim(),
    phone: $("passengerPhone").value.trim(),
    email: $("passengerEmail").value.trim(),
    paymentMethod: $("paymentMethod").value,
    paymentRef: $("paymentRef").value.trim(),
    discount: fare.discount,
    total: fare.total,
    createdAt: new Date().toISOString(),
    adminNote: ""
  };

  const list = loadBookings();
  list.push(bookingObj);
  saveBookings(list);

  // close payment modal
  bootstrap.Modal.getOrCreateInstance($("paymentModal")).hide();

  // update preview pnr + links for final ticket
  $("pvPNR").textContent = `PNR: ${bookingObj.pnr}`;

  const body = buildTicketText(bookingObj);
  $("btnSms").href = smsLink(bookingObj.phone, body);

  if (bookingObj.email){
    $("btnEmail").classList.remove("d-none");
    $("btnEmail").href = mailtoLink(bookingObj.email, `Bus Ticket (PNR: ${bookingObj.pnr})`, body);
  } else {
    $("btnEmail").classList.add("d-none");
    $("btnEmail").href = "#";
  }

  // after-payment modal links
  $("afterPNR").textContent = bookingObj.pnr;
  $("afterPrintBtn").onclick = () => printTicketHTML(bookingObj);
  $("afterSmsBtn").href = smsLink(bookingObj.phone, body);

  const afterEmailBtn = $("afterEmailBtn");
  if (bookingObj.email){
    afterEmailBtn.classList.remove("d-none");
    afterEmailBtn.href = mailtoLink(bookingObj.email, `Bus Ticket (PNR: ${bookingObj.pnr})`, body);
  } else {
    afterEmailBtn.classList.add("d-none");
    afterEmailBtn.href = "#";
  }

  bootstrap.Modal.getOrCreateInstance($("afterPayModal")).show();

  // refresh lists
  refreshMyBookings();
  if ((location.hash||"").startsWith("#/admin")) renderAdmin();
}

// -------------------------
// My bookings offcanvas
// -------------------------
function refreshMyBookings(){
  const list = $("myBookingsList");
  const bookings = loadBookings().slice().reverse();
  if (!bookings.length){
    list.innerHTML = `<div class="alert alert-secondary rounded-4 mb-0">No bookings yet.</div>`;
    return;
  }

  list.innerHTML = bookings.map(b=>{
    const badge = b.status==="PAID" ? "success" : (b.status==="CANCELLED" ? "danger" : "warning");
    return `
      <div class="card border-0 shadow-sm rounded-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div class="fw-bold">${esc(b.bus)} • ${esc(b.from)} → ${esc(b.to)}</div>
              <div class="small text-secondary">${esc(b.date)} • ${esc(b.time)} • ${esc(b.coach)}</div>
              <div class="small mt-2">
                <span class="badge text-bg-dark mono">${esc(b.pnr)}</span>
                <span class="badge text-bg-${badge} ms-1">${esc(b.status)}</span>
                <span class="badge text-bg-primary mono ms-1">৳${esc(b.total)}</span>
              </div>
              <div class="small mt-2">Seats: <span class="mono fw-semibold">${esc((b.seats||[]).join(", "))}</span></div>
            </div>
            <div class="d-flex flex-column gap-2">
              <button class="btn btn-sm btn-outline-dark" type="button" data-print="${esc(b.pnr)}">Print</button>
              <button class="btn btn-sm btn-outline-success" type="button" data-sms="${esc(b.pnr)}">SMS</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-print]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const pnr = btn.dataset.print;
      const b = loadBookings().find(x=>x.pnr===pnr);
      if (b) printTicketHTML(b);
    });
  });

  list.querySelectorAll("[data-sms]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const pnr = btn.dataset.sms;
      const b = loadBookings().find(x=>x.pnr===pnr);
      if (!b) return;
      const body = buildTicketText(b);
      window.open(smsLink(b.phone, body), "_blank");
    });
  });
}

// -------------------------
// Admin Panel
// -------------------------
function renderAdmin(){
  const tbody = $("adminTableBody");
  const q = ($("adminSearch")?.value || "").trim().toLowerCase();
  const status = $("adminStatus")?.value || "ALL";

  let bookings = loadBookings();

  if (q){
    bookings = bookings.filter(b =>
      (b.pnr||"").toLowerCase().includes(q) ||
      (b.phone||"").toLowerCase().includes(q) ||
      (b.name||"").toLowerCase().includes(q) ||
      (b.bus||"").toLowerCase().includes(q)
    );
  }
  if (status !== "ALL"){
    bookings = bookings.filter(b => b.status === status);
  }

  if (!bookings.length){
    tbody.innerHTML = `<tr><td colspan="11" class="text-secondary">No data</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b=>{
    const badge = b.status==="PAID" ? "success" : (b.status==="CANCELLED" ? "danger" : "warning");
    return `
      <tr>
        <td><input type="checkbox" class="form-check-input adminPick" data-pnr="${esc(b.pnr)}"/></td>
        <td class="mono">${esc(b.pnr)}</td>
        <td><span class="badge text-bg-${badge}">${esc(b.status)}</span></td>
        <td>${esc(b.bus)}</td>
        <td>${esc(b.from)} → ${esc(b.to)}</td>
        <td>${esc(b.date)}</td>
        <td class="mono">${esc(b.time)}</td>
        <td>${esc(b.boarding)} → ${esc(b.dropping)}</td>
        <td class="mono">${esc((b.seats||[]).join(", "))}</td>
        <td class="mono fw-semibold">৳${esc(b.total)}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" data-paid="${esc(b.pnr)}">Paid</button>
            <button class="btn btn-outline-warning" data-unpaid="${esc(b.pnr)}">Unpaid</button>
            <button class="btn btn-outline-danger" data-cancel="${esc(b.pnr)}">Cancel</button>
            <button class="btn btn-outline-primary" data-edit="${esc(b.pnr)}">Edit</button>
            <button class="btn btn-outline-dark" data-print="${esc(b.pnr)}">Print</button>
            <button class="btn btn-outline-success" data-sms="${esc(b.pnr)}">SMS</button>
            <button class="btn btn-outline-primary" data-email="${esc(b.pnr)}">Email</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // actions
  tbody.querySelectorAll("[data-paid]").forEach(btn=>btn.addEventListener("click", ()=>adminSetStatus(btn.dataset.paid,"PAID")));
  tbody.querySelectorAll("[data-unpaid]").forEach(btn=>btn.addEventListener("click", ()=>adminSetStatus(btn.dataset.unpaid,"UNPAID")));
  tbody.querySelectorAll("[data-cancel]").forEach(btn=>btn.addEventListener("click", ()=>adminSetStatus(btn.dataset.cancel,"CANCELLED")));
  tbody.querySelectorAll("[data-print]").forEach(btn=>btn.addEventListener("click", ()=>adminPrint(btn.dataset.print)));
  tbody.querySelectorAll("[data-sms]").forEach(btn=>btn.addEventListener("click", ()=>adminSMS(btn.dataset.sms)));
  tbody.querySelectorAll("[data-email]").forEach(btn=>btn.addEventListener("click", ()=>adminEmail(btn.dataset.email)));
  tbody.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click", ()=>adminOpenEdit(btn.dataset.edit)));
}

function adminSetStatus(pnr, status){
  const list = loadBookings().map(b => b.pnr===pnr ? {...b, status} : b);
  saveBookings(list);
  renderAdmin();
  refreshMyBookings();
}
function adminPrint(pnr){
  const b = loadBookings().find(x=>x.pnr===pnr);
  if (b) printTicketHTML(b);
}
function adminSMS(pnr){
  const b = loadBookings().find(x=>x.pnr===pnr);
  if (!b) return;
  window.open(smsLink(b.phone, buildTicketText(b)), "_blank");
}
function adminEmail(pnr){
  const b = loadBookings().find(x=>x.pnr===pnr);
  if (!b) return;
  if (!b.email){
    alert("This booking has no email (optional field).");
    return;
  }
  window.open(mailtoLink(b.email, `Bus Ticket (PNR: ${b.pnr})`, buildTicketText(b)), "_blank");
}

function adminOpenEdit(pnr){
  const b = loadBookings().find(x=>x.pnr===pnr);
  if (!b) return;

  $("adminEditPNR").value = b.pnr;
  $("adminEditDate").value = b.date;
  $("adminEditTime").value = b.time;
  $("adminEditStatus").value = b.status;
  $("adminEditDiscount").value = String(b.discount || 0);
  $("adminEditNote").value = b.adminNote || "";

  bootstrap.Modal.getOrCreateInstance($("adminEditModal")).show();
}

function adminSaveEdit(){
  const pnr = $("adminEditPNR").value;
  const date = $("adminEditDate").value;
  const time = $("adminEditTime").value.trim();
  const status = $("adminEditStatus").value;
  const discount = Number($("adminEditDiscount").value || 0);
  const note = $("adminEditNote").value.trim();

  if (!date){ alert("Date required"); return; }
  if (!time){ alert("Time required"); return; }

  const list = loadBookings().map(b=>{
    if (b.pnr !== pnr) return b;

    // recompute total with new discount (using original seats count, route, coach, bus)
    const seatCount = (b.seats||[]).length;
    const fare = calcFare(b.from, b.to, b.coach, b.bus, seatCount, discount);

    return {
      ...b,
      date,
      time,
      status,
      discount,
      total: fare.total,
      adminNote: note
    };
  });

  saveBookings(list);
  bootstrap.Modal.getOrCreateInstance($("adminEditModal")).hide();
  renderAdmin();
  refreshMyBookings();
}

// bulk discount
function adminApplyDiscountToSelected(){
  const amount = Number($("adminQuickDiscount").value || 0);
  if (amount < 0) return;

  const picks = [...document.querySelectorAll(".adminPick:checked")].map(x=>x.dataset.pnr);
  if (!picks.length){ alert("Select at least 1 booking"); return; }

  const list = loadBookings().map(b=>{
    if (!picks.includes(b.pnr)) return b;
    const seatCount = (b.seats||[]).length;
    const fare = calcFare(b.from, b.to, b.coach, b.bus, seatCount, amount);
    return { ...b, discount: amount, total: fare.total, adminNote: (b.adminNote||"") + (b.adminNote?" | ":"") + `discount ৳${amount}` };
  });

  saveBookings(list);
  renderAdmin();
  refreshMyBookings();
}

// export
function exportJSON(){
  const data = loadBookings();
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bookings.json";
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------
// Theme
// -------------------------
function applySavedTheme(){
  const saved = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-bs-theme", saved);
}
function toggleTheme(){
  const html = document.documentElement;
  const next = html.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-bs-theme", next);
  localStorage.setItem(THEME_KEY, next);
}

// -------------------------
// Wire events
// -------------------------
function wireSearchEvents(){
  $("srchForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    ui.from = $("srchFrom").value;
    ui.to = $("srchTo").value;
    ui.date = $("srchDate").value || todayISO();

    if (ui.from === ui.to){
      alert("From and To can't be same.");
      return;
    }

    ui.trips = buildTrips(ui.from, ui.to, ui.date);
    ui.selectedOperators.clear();
    ui.coach = "ALL";
    ui.timeBucket = "ALL";
    ui.maxPrice = 2500;
    ui.sortBy = "EARLIEST";

    $("sortBy").value = "EARLIEST";
    $("filterMaxPrice").value = "2500";
    $("maxPriceLabel").textContent = "2500";

    setPillActive($("filterCoach"), $("filterCoach").querySelector('[data-coach="ALL"]'));
    setPillActive($("filterTime"), $("filterTime").querySelector('[data-time="ALL"]'));

    renderOperatorFilters(ui.trips);
    renderAllResults();
  });

  $("filterCoach").querySelectorAll(".filter-pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setPillActive($("filterCoach"), btn);
      ui.coach = btn.dataset.coach;
      renderAllResults();
    });
  });

  $("filterTime").querySelectorAll(".filter-pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setPillActive($("filterTime"), btn);
      ui.timeBucket = btn.dataset.time;
      renderAllResults();
    });
  });

  $("filterMaxPrice").addEventListener("input", ()=>{
    ui.maxPrice = Number($("filterMaxPrice").value);
    $("maxPriceLabel").textContent = String(ui.maxPrice);
    renderAllResults();
  });

  $("sortBy").addEventListener("change", ()=>{
    ui.sortBy = $("sortBy").value;
    renderAllResults();
  });

  $("resetFiltersBtn").addEventListener("click", ()=>{
    ui.selectedOperators.clear();
    ui.coach = "ALL";
    ui.timeBucket = "ALL";
    ui.maxPrice = 2500;
    ui.sortBy = "EARLIEST";

    $("sortBy").value = "EARLIEST";
    $("filterMaxPrice").value = "2500";
    $("maxPriceLabel").textContent = "2500";
    setPillActive($("filterCoach"), $("filterCoach").querySelector('[data-coach="ALL"]'));
    setPillActive($("filterTime"), $("filterTime").querySelector('[data-time="ALL"]'));

    renderOperatorFilters(ui.trips);
    renderAllResults();
  });
}

function wireBookingEvents(){
  $("boardingPoint").addEventListener("change", ()=>{
    renderSeatGrid();
    renderFarePreview();
  });
  $("droppingPoint").addEventListener("change", ()=>{
    renderSeatGrid();
    renderFarePreview();
  });
  ["passengerName","passengerPhone","passengerEmail"].forEach(id=>{
    $(id).addEventListener("input", renderFarePreview);
  });

  $("payConfirmBtn").addEventListener("click", openPaymentModal);
  $("confirmPayBtn").addEventListener("click", confirmPayment);

  $("resetSeatsBtn").addEventListener("click", ()=>{
    booking.selectedSeats.clear();
    renderSeatGrid();
    renderFarePreview();
  });

  $("bkCloseBtn").addEventListener("click", ()=>{
    $("bookingPanel").classList.add("d-none");
    booking.trip = null;
    booking.selectedSeats.clear();
  });

  $("bkPrintBtn").addEventListener("click", ()=>{
    // print latest confirmed if exists? We'll print preview if not confirmed.
    window.print();
  });

  $("bkPrintPreviewBtn").addEventListener("click", ()=>window.print());

  $("btnTicketPrint").addEventListener("click", ()=>{
    const trip = booking.trip;
    if (!trip) return;
    const temp = {
      pnr: "PREVIEW",
      status: "UNPAID",
      bus: trip.bus,
      from: ui.from, to: ui.to,
      date: ui.date,
      time: trip.depTime,
      coach: trip.coach,
      boarding: $("boardingPoint").value,
      dropping: $("droppingPoint").value,
      seats: [...booking.selectedSeats].sort(),
      name: $("passengerName").value.trim() || "-",
      phone: $("passengerPhone").value.trim() || "-",
      email: $("passengerEmail").value.trim(),
      discount: 0,
      total: $("totalFare").textContent || 0
    };
    printTicketHTML(temp);
  });
}

function wireAdminEvents(){
  $("adminSearch").addEventListener("input", renderAdmin);
  $("adminStatus").addEventListener("change", renderAdmin);

  $("clearAllBtn").addEventListener("click", ()=>{
    if (!confirm("Clear all demo bookings?")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderAdmin();
    refreshMyBookings();
  });

  $("exportBtn").addEventListener("click", exportJSON);

  $("adminSaveBtn").addEventListener("click", adminSaveEdit);

  $("adminApplyDiscountBtn").addEventListener("click", adminApplyDiscountToSelected);

  $("selectAllBtn").addEventListener("click", ()=>{
    document.querySelectorAll(".adminPick").forEach(cb=>cb.checked=true);
  });
  $("selectNoneBtn").addEventListener("click", ()=>{
    document.querySelectorAll(".adminPick").forEach(cb=>cb.checked=false);
  });
}

// -------------------------
// Init
// -------------------------
function init(){
  applySavedTheme();
  $("themeBtn").addEventListener("click", toggleTheme);

  // seed search defaults
  ui.from = "Dhaka";
  ui.to = "Chattogram";
  ui.date = todayISO();

  fillSelect($("srchFrom"), CITIES, ui.from);
  fillSelect($("srchTo"), CITIES, ui.to);
  $("srchDate").min = todayISO();
  $("srchDate").value = ui.date;

  // initial trips
  ui.trips = buildTrips(ui.from, ui.to, ui.date);
  renderOperatorFilters(ui.trips);
  renderAllResults();

  // wire events
  wireSearchEvents();
  wireBookingEvents();
  wireAdminEvents();

  refreshMyBookings();
  showRoute(); // routing + admin render if needed
}
init();

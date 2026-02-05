
// cities and time 
    const CITIES = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Barishal", "Rangpur", "Cox's Bazar","Saidpur,","Nilphamari","Domar","Shibchar","Pacchor","Shibchar,Singapor Para"];
    const TIMES = ["07:00 AM", "09:00 AM", "12:00 PM", "03:00 PM", "06:00 PM", "09:00 PM", "11:30 PM"];

//    Routes 
    const ROUTE_FARES = {
      "Dhaka|Chattogram": 900,
      "Dhaka|Sylhet": 850,
      "Dhaka|Rajshahi": 800,
      "Dhaka|Khulna": 850,
      "Dhaka|Barishal": 550,
      "Dhaka|Rangpur": 750,
      "Dhaka|Saidpur": 900,
      "Dhaka|Nilphamari": 950,
      "Dhaka|Domar": 1050,
      "Dhaka|Shibchar":400,
      "Dhaka|Pacchor":400,
      "Dhaka|Shibchar,Singapor Para":400,
      "Dhaka|Sirajganj": 350,
      "Dhaka|Cox's Bazar": 1200,
      "Chattogram|Cox's Bazar": 450,
      "Sylhet|Chattogram": 1100
    };

    const COACH_MULTIPLIER = {
      "Non-AC": 1.0,
      "AC": 1.25,
      "Sleeper": 1.6
    };
       const SERVICE_CHARGE_RATE = 0.03; // 3% demo

    // Seats: 10 rows x (2 + aisle + 2) => 40 seats
    const ROWS = 10;
    const LEFT_SEATS = ["A", "B"];
    const RIGHT_SEATS = ["C", "D"];
    const STORAGE_KEY = "bd_ticket_bookings_v1";

  
    const $ = (id) => document.getElementById(id);

    function todayISO(){
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,"0");
      const day = String(d.getDate()).padStart(2,"0");
      return `${y}-${m}-${day}`;
    }

    function safeNumber(n){
      const x = Number(n);
      return Number.isFinite(x) ? x : 0;
    }

    function getRouteKey(from, to){
      return `${from}|${to}`;
    }

    function baseFareFor(from, to){
      const key = getRouteKey(from, to);
      const rev = getRouteKey(to, from);
      return ROUTE_FARES[key] ?? ROUTE_FARES[rev] ?? 700; // fallback
    }

    function formatSeats(arr){
      return arr.slice().sort().join(", ");
    }

    function generatePNR(){
      // PNR like: BD-20260205-8K3P2
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,"0");
      const dd = String(d.getDate()).padStart(2,"0");
      const rand = Math.random().toString(36).slice(2,7).toUpperCase();
      return `BD-${yyyy}${mm}${dd}-${rand}`;
    }

    function loadBookings(){
      try{
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      }catch{
        return [];
      }
    }

    function saveBookings(list){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function bookedSeatsForTrip(tripKey){
      // tripKey includes from-to-date-time-coach
      const bookings = loadBookings();
      const seats = new Set();
      bookings
        .filter(b => b.tripKey === tripKey)
        .forEach(b => (b.seats || []).forEach(s => seats.add(s)));
      return seats;
    }

    function calcFare(from, to, coach, seatCount){
      const base = baseFareFor(from, to);
      const mult = COACH_MULTIPLIER[coach] ?? 1;
      const subtotal = Math.round(base * mult * seatCount);
      const service = Math.round(subtotal * SERVICE_CHARGE_RATE);
      const total = subtotal + service;
      return { base, mult, subtotal, service, total };
    }

    // -----------------------------
    // UI State
    // -----------------------------
    const state = {
      selectedSeats: new Set()
    };

    function currentTripKey(){
      const from = $("fromCity").value;
      const to = $("toCity").value;
      const date = $("journeyDate").value;
      const time = $("departureTime").value;
      const coach = $("coachType").value;
      return `${from}|${to}|${date}|${time}|${coach}`;
    }

    // -----------------------------
    // Renderers
    // -----------------------------
    function fillSelect(el, options, defaultValue){
      el.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join("");
      if (defaultValue) el.value = defaultValue;
    }

    function renderSeatGrid(){
      const grid = $("seatGrid");
      grid.innerHTML = "";

      // compute booked seats for this trip
      const tripKey = currentTripKey();
      const booked = bookedSeatsForTrip(tripKey);

      const makeSeat = (code) => {
        const div = document.createElement("div");
        div.className = "seat";
        div.textContent = code;

        if (booked.has(code)){
          div.classList.add("booked");
        }
        if (state.selectedSeats.has(code)){
          div.classList.add("selected");
        }

        div.addEventListener("click", () => {
          if (booked.has(code)) return;

          if (state.selectedSeats.has(code)){
            state.selectedSeats.delete(code);
          } else {
            state.selectedSeats.add(code);
          }
          renderSeatGrid();
          renderFare();
          renderPreview();
        });

        return div;
      };

      for (let r=1; r<=ROWS; r++){
        // Left 2 seats
        for (const s of LEFT_SEATS){
          grid.appendChild(makeSeat(`${r}${s}`));
        }
        // Aisle
        const aisle = document.createElement("div");
        aisle.className = "aisle";
        grid.appendChild(aisle);

        // Right 2 seats
        for (const s of RIGHT_SEATS){
          grid.appendChild(makeSeat(`${r}${s}`));
        }
      }

      $("selectedCount").textContent = String(state.selectedSeats.size);
    }

    function renderFare(){
      const from = $("fromCity").value;
      const to = $("toCity").value;
      const coach = $("coachType").value;
      const seatCount = state.selectedSeats.size;

      const { subtotal, service, total } = calcFare(from, to, coach, seatCount);

      $("subtotal").textContent = String(subtotal);
      $("serviceCharge").textContent = String(service);
      $("totalFare").textContent = String(total);

      $("pvTotal").textContent = String(total);
    }

    function renderPreview(){
      const from = $("fromCity").value;
      const to = $("toCity").value;
      const date = $("journeyDate").value;
      const time = $("departureTime").value;
      const coach = $("coachType").value;

      $("pvName").textContent = $("passengerName").value || "-";
      $("pvPhone").textContent = $("passengerPhone").value || "-";
      $("pvRoute").textContent = `${from} → ${to}`;
      $("pvDate").textContent = date || "-";
      $("pvTime").textContent = time || "-";
      $("pvCoach").textContent = coach || "-";
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
                <div class="fw-bold">${b.from} → ${b.to}</div>
                <div class="small text-secondary">
                  ${b.date} • ${b.time} • ${b.coach}
                </div>
                <div class="small mt-2">
                  <span class="badge text-bg-dark mono">${b.pnr}</span>
                  <span class="badge text-bg-primary mono ms-1">৳${b.total}</span>
                </div>
                <div class="small mt-2">Seats: <span class="mono fw-semibold">${formatSeats(b.seats)}</span></div>
                <div class="small text-secondary">Passenger: ${b.name} (${b.phone})</div>
              </div>
              <button class="btn btn-sm btn-outline-danger" onclick="cancelBooking('${b.pnr}')">Cancel</button>
            </div>
          </div>
        </div>
      `).join("");
    }

    function renderAdminTable(){
      const body = $("adminTableBody");
      const bookings = loadBookings();

      if (!bookings.length){
        body.innerHTML = `<tr><td colspan="6" class="text-secondary">No data</td></tr>`;
        return;
      }

      body.innerHTML = bookings.map(b => `
        <tr>
          <td class="mono">${b.pnr}</td>
          <td>${b.from} → ${b.to}</td>
          <td>${b.date}</td>
          <td>${b.time}</td>
          <td class="mono">${formatSeats(b.seats)}</td>
          <td class="mono fw-semibold">৳${b.total}</td>
        </tr>
      `).join("");
    }

    // -----------------------------
    // Actions
    // -----------------------------
    window.cancelBooking = function(pnr){
      const bookings = loadBookings().filter(b => b.pnr !== pnr);
      saveBookings(bookings);
      // update UI
      state.selectedSeats.clear();
      renderSeatGrid();
      renderFare();
      renderPreview();
      renderMyBookings();
      renderAdminTable();
    }

    function resetForm(){
      $("passengerName").value = "";
      $("passengerPhone").value = "";
      state.selectedSeats.clear();
      $("pnrPreview").textContent = "PNR: -";
      renderSeatGrid();
      renderFare();
      renderPreview();
    }

    function seedBookedSeats(){
      // creates 2 fake bookings for current trip, to demonstrate "booked" seats
      const tripKey = currentTripKey();
      const from = $("fromCity").value;
      const to = $("toCity").value;
      const date = $("journeyDate").value;
      const time = $("departureTime").value;
      const coach = $("coachType").value;

      const existingBooked = bookedSeatsForTrip(tripKey);
      const candidates = [];
      for (let r=1; r<=ROWS; r++){
        for (const s of [...LEFT_SEATS, ...RIGHT_SEATS]){
          const code = `${r}${s}`;
          if (!existingBooked.has(code)) candidates.push(code);
        }
      }

      if (candidates.length < 4) return;

      const pick = () => candidates.splice(Math.floor(Math.random()*candidates.length), 1)[0];
      const seats1 = [pick(), pick()];
      const seats2 = [pick(), pick()];

      const fare1 = calcFare(from, to, coach, seats1.length);
      const fare2 = calcFare(from, to, coach, seats2.length);

      const bookings = loadBookings();
      bookings.push({
        pnr: generatePNR(),
        tripKey,
        from, to, date, time, coach,
        name: "Demo Passenger",
        phone: "01XXXXXXXXX",
        seats: seats1,
        total: fare1.total,
        createdAt: new Date().toISOString()
      });
      bookings.push({
        pnr: generatePNR(),
        tripKey,
        from, to, date, time, coach,
        name: "Demo Passenger 2",
        phone: "01XXXXXXXXX",
        seats: seats2,
        total: fare2.total,
        createdAt: new Date().toISOString()
      });

      saveBookings(bookings);
      renderSeatGrid();
      renderMyBookings();
      renderAdminTable();
    }

    // -----------------------------
    // Init
    // -----------------------------
    function init(){
      // populate selects
      fillSelect($("fromCity"), CITIES, "Dhaka");
      fillSelect($("toCity"), CITIES, "Chattogram");
      fillSelect($("departureTime"), TIMES, "09:00 AM");

      // date min = today
      $("journeyDate").min = todayISO();
      $("journeyDate").value = todayISO();

      // on change: rerender seats & fare
      ["fromCity","toCity","journeyDate","departureTime","coachType"].forEach(id => {
        $(id).addEventListener("change", () => {
          // avoid same from/to
          if ($("fromCity").value === $("toCity").value){
            const fallback = CITIES.find(c => c !== $("fromCity").value) || "Chattogram";
            $("toCity").value = fallback;
          }
          state.selectedSeats.clear();
          renderSeatGrid();
          renderFare();
          renderPreview();
        });
      });

      ["passengerName","passengerPhone"].forEach(id => {
        $(id).addEventListener("input", renderPreview);
      });

      $("resetBtn").addEventListener("click", resetForm);
      $("seedBtn").addEventListener("click", seedBookedSeats);

      $("clearAllBtn").addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        resetForm();
        renderMyBookings();
        renderAdminTable();
      });

      $("themeBtn").addEventListener("click", () => {
        const html = document.documentElement;
        html.setAttribute("data-bs-theme", html.getAttribute("data-bs-theme") === "dark" ? "light" : "dark");
      });

      $("bookingForm").addEventListener("submit", (e) => {
        e.preventDefault();

        const from = $("fromCity").value;
        const to = $("toCity").value;
        const date = $("journeyDate").value;
        const time = $("departureTime").value;
        const coach = $("coachType").value;
        const name = $("passengerName").value.trim();
        const phone = $("passengerPhone").value.trim();
        const seats = [...state.selectedSeats];

        if (!seats.length){
          alert("Please select at least 1 seat.");
          return;
        }

        // seat conflict check (because another booking might exist already)
        const tripKey = currentTripKey();
        const booked = bookedSeatsForTrip(tripKey);
        const conflict = seats.find(s => booked.has(s));
        if (conflict){
          alert(`Seat ${conflict} is already booked. Please refresh your selection.`);
          renderSeatGrid();
          return;
        }

        const fare = calcFare(from, to, coach, seats.length);
        const pnr = generatePNR();

        const booking = {
          pnr,
          tripKey,
          from, to, date, time, coach,
          name, phone,
          seats,
          total: fare.total,
          createdAt: new Date().toISOString()
        };

        const bookings = loadBookings();
        bookings.push(booking);
        saveBookings(bookings);

        $("pnrPreview").textContent = `PNR: ${pnr}`;

        // reset seat selection but keep route info
        state.selectedSeats.clear();
        renderSeatGrid();
        renderFare();
        renderPreview();
        renderMyBookings();
        renderAdminTable();

        // nice UX
        alert(`Booking Confirmed!\nPNR: ${pnr}\nSeats: ${formatSeats(booking.seats)}\nTotal: ৳${booking.total}`);
      });

      // initial render
      renderSeatGrid();
      renderFare();
      renderPreview();
      renderMyBookings();
      renderAdminTable();
    }

    init();


 
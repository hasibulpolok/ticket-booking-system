const CITIES = ["Dhaka","Bogura","Sirajganj","Chattogram","Sylhet"];
const POINTS = {
  Dhaka:["Gabtoli","Kallyanpur"],
  Bogura:["Satmatha"],
  Sirajganj:["Hatikumrul"],
  Chattogram:["AK Khan"],
  Sylhet:["Kadamtoli"]
};

const BASE_FARE = {
  "Dhaka|Bogura":550,
  "Dhaka|Sirajganj":350,
  "Dhaka|Chattogram":900,
  "Dhaka|Sylhet":850
};

const STORAGE = "bus_demo_bookings";
const $ = id => document.getElementById(id);

let selectedTrip = null;
let selectedSeats = [];

function today(){
  return new Date().toISOString().slice(0,10);
}

function init(){
  CITIES.forEach(c=>{
    fromCity.innerHTML+=`<option>${c}</option>`;
    toCity.innerHTML+=`<option>${c}</option>`;
  });
  journeyDate.value = today();
  renderAdmin();
  route();
}
window.onhashchange = route;

function route(){
  const isAdmin = location.hash==="#/admin";
  viewSearch.classList.toggle("d-none",isAdmin);
  viewAdmin.classList.toggle("d-none",!isAdmin);
  if(isAdmin) renderAdmin();
}

searchForm.onsubmit = e=>{
  e.preventDefault();
  if(fromCity.value===toCity.value) return alert("Same city!");
  renderResults();
};

function renderResults(){
  results.innerHTML = "";
  const key = `${fromCity.value}|${toCity.value}`;
  const fare = BASE_FARE[key] || 600;

  results.innerHTML = `
    <div class="card rounded-4 shadow-sm border-0">
      <div class="card-body d-flex justify-content-between">
        <div>
          <b>Demo Bus</b><br>
          ${fromCity.value} → ${toCity.value}
        </div>
        <div>
          <b>৳${fare}</b><br>
          <button class="btn btn-sm btn-primary"
            onclick="openBooking(${fare})">Book</button>
        </div>
      </div>
    </div>
  `;
}

function openBooking(fare){
  bookingPanel.classList.remove("d-none");
  selectedTrip = fare;
  selectedSeats=[];
  fillPoints();
  renderSeats();
  updateTotal();
}

function fillPoints(){
  boardingPoint.innerHTML = POINTS[fromCity.value].map(p=>`<option>${p}</option>`).join("");
  droppingPoint.innerHTML = POINTS[toCity.value].map(p=>`<option>${p}</option>`).join("");
}

function renderSeats(){
  seatGrid.innerHTML="";
  for(let r=1;r<=8;r++){
    ["A","B"].forEach(s=>addSeat(`${r}${s}`));
    seatGrid.innerHTML+=`<div class="aisle"></div>`;
    ["C","D"].forEach(s=>addSeat(`${r}${s}`));
  }
}

function addSeat(code){
  const d=document.createElement("div");
  d.className="seat";
  d.textContent=code;
  d.onclick=()=>{
    if(selectedSeats.includes(code)){
      selectedSeats=selectedSeats.filter(x=>x!==code);
      d.classList.remove("selected");
    }else{
      selectedSeats.push(code);
      d.classList.add("selected");
    }
    updateTotal();
  };
  seatGrid.appendChild(d);
}

function updateTotal(){
  totalFare.textContent = selectedSeats.length * selectedTrip;
}

submitPaymentBtn.onclick=()=>{
  if(!passengerName.value || !passengerPhone.value) return alert("Name & phone required");
  if(!paymentRef.value) return alert("Txn ID required");
  if(!selectedSeats.length) return alert("Select seats");

  const booking={
    pnr:"PNR-"+Date.now(),
    status:"UNPAID",
    route:`${fromCity.value}→${toCity.value}`,
    seats:[...selectedSeats],
    total: totalFare.textContent,
    phone: passengerPhone.value,
    email: passengerEmail.value
  };

  const list=JSON.parse(localStorage.getItem(STORAGE)||"[]");
  list.push(booking);
  localStorage.setItem(STORAGE,JSON.stringify(list));

  alert("Submitted! Waiting for admin approval.");
  bookingPanel.classList.add("d-none");
  renderAdmin();
};

function renderAdmin(){
  adminTable.innerHTML="";
  const list=JSON.parse(localStorage.getItem(STORAGE)||"[]");
  list.forEach((b,i)=>{
    adminTable.innerHTML+=`
      <tr>
        <td>${b.pnr}</td>
        <td>${b.status}</td>
        <td>${b.route}</td>
        <td>${b.seats.join(",")}</td>
        <td>৳${b.total}</td>
        <td>
          <button class="btn btn-sm btn-success"
            onclick="markPaid(${i})">Paid</button>
          <button class="btn btn-sm btn-danger"
            onclick="markCancel(${i})">Cancel</button>
        </td>
      </tr>
    `;
  });
}

function markPaid(i){
  const list=JSON.parse(localStorage.getItem(STORAGE));
  list[i].status="PAID";
  localStorage.setItem(STORAGE,JSON.stringify(list));
  renderAdmin();
}
function markCancel(i){
  const list=JSON.parse(localStorage.getItem(STORAGE));
  list[i].status="CANCELLED";
  localStorage.setItem(STORAGE,JSON.stringify(list));
  renderAdmin();
}

init();
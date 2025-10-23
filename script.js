const form = document.getElementById("workLogForm");
const tableBody = document.querySelector("#logTable tbody");
const totalHoursEl = document.getElementById("totalHours");
const totalEarningsEl = document.getElementById("totalEarnings");
const shiftList = document.getElementById("shiftList");
const releaseShiftBtn = document.getElementById("releaseShiftBtn");

let logs = [];
let totalHours = 0;
let totalEarnings = 0;
let availableShifts = [];

form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("employeeName").value.trim();
    const wage = parseFloat(document.getElementById("hourlyWage").value);
    const start = document.getElementById("startTime").value;
    const end = document.getElementById("endTime").value;

    const hoursWorked = calculateHours(start, end);
    const pay = calculatePay(hoursWorked, start, end, wage);

    logs.push({ name, start, end, hoursWorked, pay });

    totalHours += hoursWorked;
    totalEarnings += pay;

    updateTable();
    updateSummary();

    form.reset();
});

function calculateHours(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diff = (eh + em / 60) - (sh + sm / 60);
    if (diff < 0) diff += 24; // handle overnight shifts
    return diff;
}

function calculatePay(hours, start, end, wage) {
    let multiplier = 1.0;
    const [startH] = start.split(":").map(Number);
    const [endH] = end.split(":").map(Number);

    if (startH < 8) multiplier = 1.2;
    if (endH > 17) multiplier = 1.2;
    if (hours > 9) multiplier = 1.2;

    return Math.round(hours * wage * multiplier);
}

function updateTable() {
    tableBody.innerHTML = "";
    logs.forEach((log) => {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${log.name}</td>
      <td>${log.start}</td>
      <td>${log.end}</td>
      <td>${log.hoursWorked.toFixed(2)}</td>
      <td>${log.pay}</td>
    `;
        tableBody.appendChild(row);
    });
}

function updateSummary() {
    totalHoursEl.textContent = `Total Hours: ${totalHours.toFixed(2)}`;
    totalEarningsEl.textContent = `Total Earnings: ${totalEarnings.toFixed(2)} DKK`;
}

// --- Shift Management ---
releaseShiftBtn.addEventListener("click", () => {
    const shiftTime = prompt("Enter shift time (e.g., 10:00-17:00):");
    if (shiftTime) {
        availableShifts.push(shiftTime);
        renderShifts();
    }
});

function renderShifts() {
    shiftList.innerHTML = "";
    availableShifts.forEach((shift, index) => {
        const div = document.createElement("div");
        div.classList.add("shift-item");
        div.innerHTML = `
      <span>${shift}</span>
      <button onclick="takeShift(${index})">Take Shift</button>
    `;
        shiftList.appendChild(div);
    });
}

function takeShift(index) {
    alert(`Shift "${availableShifts[index]}" taken!`);
    availableShifts.splice(index, 1);
    renderShifts();
}

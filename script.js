// === Data ===
let users = JSON.parse(localStorage.getItem("users")) || [];
let logs = JSON.parse(localStorage.getItem("logs")) || [];
let activeUser = null;

// === Gem data ===
function saveData() {
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("logs", JSON.stringify(logs));
}

// === Beregn timer ===
function calculateHours(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diff = (eh + em / 60) - (sh + sm / 60);
    if (diff < 0) diff += 24;
    return diff;
}

// === Beregn løn ===
function calculatePay(hours, start, end, date, wage) {
    let multiplier = 1.0;
    const [startH] = start.split(":").map(Number);
    const [endH] = end.split(":").map(Number);

    if (endH >= 18) multiplier += 0.2; // aftentillæg

    const holidays = ["01-01", "12-25", "12-26", "04-18", "04-19", "04-21", "05-09", "05-19"];
    const dateStr = date.slice(5);
    if (holidays.includes(dateStr)) multiplier += 0.5; // helligdage

    return Math.round(hours * wage * multiplier);
}

// === Håndter hvilken side vi er på ===
if (document.getElementById("workLogForm")) {
    // === MEDARBEJDER SIDE ===
    const activeUserSelect = document.getElementById("activeUserSelect");
    const form = document.getElementById("workLogForm");
    const tableBody = document.querySelector("#logTable tbody");
    const totalHoursEl = document.getElementById("totalHours");
    const totalEarningsEl = document.getElementById("totalEarnings");
    const exportBtn = document.getElementById("exportBtn");
    const toManager = document.getElementById("toManager");

    function renderUserSelect() {
        activeUserSelect.innerHTML = "";
        users.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.name;
            opt.textContent = `${u.name} (${u.role})`;
            activeUserSelect.appendChild(opt);
        });
    }

    function renderLogs() {
        tableBody.innerHTML = "";
        if (!activeUser) return;

        const userLogs = logs.filter(l => l.user === activeUser.name);
        let totalHours = 0, totalEarnings = 0;

        userLogs.forEach(log => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${log.date}</td>
                <td>${log.start}</td>
                <td>${log.end}</td>
                <td>${log.hoursWorked.toFixed(2)}</td>
                <td>${log.pay}</td>
            `;
            tableBody.appendChild(row);
            totalHours += log.hoursWorked;
            totalEarnings += log.pay;
        });

        totalHoursEl.textContent = `Samlede timer: ${totalHours.toFixed(2)}`;
        totalEarningsEl.textContent = `Samlet løn: ${totalEarnings.toFixed(2)} DKK`;
    }

    // === Login med 4-cifret kode ===
    activeUserSelect.addEventListener("change", () => {
        const selected = users.find(u => u.name === activeUserSelect.value);
        if (!selected) return;

        const enteredPin = prompt(`Indtast 4-cifret kode for ${selected.name}:`);
        if (enteredPin === selected.pin) {
            activeUser = selected;
            renderLogs();
            alert(`Velkommen ${activeUser.name}!`);
        } else {
            alert("Forkert kode! Adgang nægtet.");
            activeUserSelect.value = "";
            activeUser = null;
            tableBody.innerHTML = "";
            totalHoursEl.textContent = "Samlede timer: 0";
            totalEarningsEl.textContent = "Samlet løn: 0 DKK";
        }
    });

    form.addEventListener("submit", e => {
        e.preventDefault();
        if (!activeUser) return alert("Log ind først!");

        const date = document.getElementById("workDate").value;
        const start = document.getElementById("startTime").value;
        const end = document.getElementById("endTime").value;

        const hours = calculateHours(start, end);
        const pay = calculatePay(hours, start, end, date, activeUser.wage);

        logs.push({ user: activeUser.name, date, start, end, hoursWorked: hours, pay });
        saveData();
        renderLogs();
        form.reset();
    });

    exportBtn.addEventListener("click", () => {
        if (!activeUser) return;
        const userLogs = logs.filter(l => l.user === activeUser.name);
        let csv = "Dato,Start,Slut,Timer,Løn\n";
        userLogs.forEach(l => {
            csv += `${l.date},${l.start},${l.end},${l.hoursWorked.toFixed(2)},${l.pay}\n`;
        });
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeUser.name}_vagter.csv`;
        a.click();
    });

    toManager.addEventListener("click", () => {
        window.location.href = "manager.html";
    });

    renderUserSelect();

} else {
    // === MANAGER DASHBOARD ===
    const tableBody = document.querySelector("#managerTable tbody");
    const companyTotals = document.getElementById("companyTotals");
    const monthFilter = document.getElementById("monthFilter");
    const backToEmployee = document.getElementById("backToEmployee");

    backToEmployee.addEventListener("click", () => {
        window.location.href = "index.html";
    });

    // === Opret nye brugere (med PIN) ===
    const userForm = document.getElementById("userForm");
    if (userForm) {
        userForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("userName").value.trim();
            const role = document.getElementById("userRole").value;
            const wage = parseFloat(document.getElementById("userWage").value);
            const pin = document.getElementById("userPin").value.trim();

            if (!name || isNaN(wage) || !/^\d{4}$/.test(pin)) {
                alert("Udfyld alle felter korrekt og brug en 4-cifret kode.");
                return;
            }

            if (users.find(u => u.name === name)) {
                alert("Denne bruger findes allerede!");
                return;
            }

            const user = { name, role, wage, pin };
            users.push(user);
            saveData();
            alert(`Bruger "${name}" oprettet som ${role} med kode ${pin}.`);
            userForm.reset();
            renderManagerTable();
        });
    }

    function renderManagerTable() {
        const month = monthFilter.value;
        let totalCompanyHours = 0;
        let totalCompanyEarnings = 0;

        tableBody.innerHTML = "";
        users.filter(u => u.role === "employee").forEach(u => {
            let userLogs = logs.filter(l => l.user === u.name);
            if (month) {
                userLogs = userLogs.filter(l => l.date.startsWith(month));
            }

            const totalHours = userLogs.reduce((sum, l) => sum + l.hoursWorked, 0);
            const totalEarnings = userLogs.reduce((sum, l) => sum + l.pay, 0);
            const avgWage = totalHours ? (totalEarnings / totalHours).toFixed(2) : 0;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${u.name}</td>
                <td>${userLogs.length}</td>
                <td>${totalHours.toFixed(2)}</td>
                <td>${totalEarnings.toFixed(2)}</td>
                <td>${avgWage}</td>
            `;
            tableBody.appendChild(row);

            totalCompanyHours += totalHours;
            totalCompanyEarnings += totalEarnings;
        });

        companyTotals.textContent = `Total: ${totalCompanyHours.toFixed(2)} timer | ${totalCompanyEarnings.toFixed(2)} DKK`;

        // === Diagram ===
        const ctx = document.getElementById("earningsChart");
        if (!ctx) return;

        const chartData = users
            .filter(u => u.role === "employee")
            .map(u => {
                const total = logs.filter(l => l.user === u.name).reduce((sum, l) => sum + l.pay, 0);
                return { name: u.name, total };
            });

        if (window.chart) window.chart.destroy();
        window.chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: chartData.map(d => d.name),
                datasets: [{
                    label: "Samlet løn (DKK)",
                    data: chartData.map(d => d.total),
                    backgroundColor: "#007acc"
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }

    monthFilter.addEventListener("change", renderManagerTable);
    renderManagerTable();
}

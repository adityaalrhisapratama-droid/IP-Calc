const ipInput = document.getElementById("ipAddress");
const cidrInput = document.getElementById("cidr");

const calculateBtn = document.getElementById("calculateBtn");
const maskPreview = document.getElementById("maskPreview");

const errorMessage = document.getElementById("errorMessage");

const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");

const detailsSection = document.getElementById("detailsSection");

const themeToggle = document.getElementById("themeToggle");
const copyBtn = document.getElementById("copyBtn");

const subnetTableBody = document.getElementById("subnetTableBody");
const subnetCountSelect = document.getElementById("subnetCount");

const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");

const clearHistoryBtn = document.getElementById("clearHistory");

let currentCalculation = null;

let history = JSON.parse(
    localStorage.getItem("subnetXHistory")
) || [];


/* =========================
   INITIALIZATION
========================= */

window.addEventListener("DOMContentLoaded", () => {

    renderHistory();

    updateMaskPreview();

});


/* =========================
   CIDR MASK GENERATOR
========================= */

function cidrToMask(cidr) {

    let mask = [];

    for (let i = 0; i < 4; i++) {

        let bits = Math.min(
            Math.max(cidr - i * 8, 0),
            8
        );

        let value = bits === 0
            ? 0
            : (256 - Math.pow(2, 8 - bits));

        mask.push(value);
    }

    return mask;

}


/* =========================
   UPDATE MASK PREVIEW
========================= */

function updateMaskPreview() {

    let cidr = parseInt(cidrInput.value);

    if (
        isNaN(cidr) ||
        cidr < 0 ||
        cidr > 32
    ) {
        maskPreview.textContent = "Invalid";
        return;
    }

    maskPreview.textContent =
        cidrToMask(cidr).join(".");

}


cidrInput.addEventListener(
    "input",
    updateMaskPreview
);


/* =========================
   QUICK PREFIX BUTTONS
========================= */

document
    .querySelectorAll(".prefix-buttons button")
    .forEach(button => {

        button.addEventListener("click", () => {

            cidrInput.value =
                button.dataset.prefix;

            updateMaskPreview();

        });

    });


/* =========================
   IP VALIDATION
========================= */

function validateIP(ip) {

    const parts = ip.split(".");

    if (parts.length !== 4) {
        return false;
    }

    for (let part of parts) {

        if (
            part === "" ||
            isNaN(part)
        ) {
            return false;
        }

        const number = Number(part);

        if (
            number < 0 ||
            number > 255 ||
            !Number.isInteger(number)
        ) {
            return false;
        }

    }

    return true;

}


/* =========================
   IP CONVERSION
========================= */

function ipToNumber(ip) {

    return ip
        .split(".")
        .reduce(
            (acc, octet) =>
                ((acc << 8) >>> 0) +
                Number(octet),
            0
        );

}


function numberToIP(number) {

    return [
        (number >>> 24) & 255,
        (number >>> 16) & 255,
        (number >>> 8) & 255,
        number & 255
    ].join(".");

}


/* =========================
   IP TO BINARY
========================= */

function ipToBinary(ip) {

    return ip
        .split(".")
        .map(octet =>
            Number(octet)
                .toString(2)
                .padStart(8, "0")
        )
        .join(" . ");

}


/* =========================
   IP CLASS
========================= */

function getIPClass(ip) {

    const first = Number(
        ip.split(".")[0]
    );

    if (first >= 1 && first <= 126) {
        return "Class A";
    }

    if (first >= 128 && first <= 191) {
        return "Class B";
    }

    if (first >= 192 && first <= 223) {
        return "Class C";
    }

    if (first >= 224 && first <= 239) {
        return "Class D";
    }

    if (first >= 240 && first <= 255) {
        return "Class E";
    }

    return "Special Address";

}


/* =========================
   PRIVATE / PUBLIC
========================= */

function getAddressType(ip) {

    const parts =
        ip.split(".").map(Number);

    const [a, b] = parts;

    if (a === 10) {
        return "Private";
    }

    if (
        a === 172 &&
        b >= 16 &&
        b <= 31
    ) {
        return "Private";
    }

    if (
        a === 192 &&
        b === 168
    ) {
        return "Private";
    }

    if (
        a === 127
    ) {
        return "Loopback";
    }

    if (
        a >= 224 &&
        a <= 239
    ) {
        return "Multicast";
    }

    if (
        a >= 240
    ) {
        return "Reserved";
    }

    return "Public";

}


/* =========================
   WILDCARD MASK
========================= */

function getWildcard(mask) {

    return mask
        .map(value => 255 - value)
        .join(".");

}


/* =========================
   MAIN CALCULATION
========================= */

function calculateSubnet() {

    const ip =
        ipInput.value.trim();

    const cidr =
        parseInt(cidrInput.value);

    errorMessage.textContent = "";

    if (!validateIP(ip)) {

        showError(
            "Masukkan IPv4 Address yang valid."
        );

        return;
    }

    if (
        isNaN(cidr) ||
        cidr < 0 ||
        cidr > 32
    ) {

        showError(
            "CIDR harus berada antara /0 sampai /32."
        );

        return;
    }


    const ipNumber =
        ipToNumber(ip);

    const mask =
        cidrToMask(cidr);

    let maskNumber;

    if (cidr === 0) {

        maskNumber = 0;

    } else {

        maskNumber =
            (0xFFFFFFFF << (32 - cidr)) >>> 0;

    }


    const networkNumber =
        (ipNumber & maskNumber) >>> 0;

    const hostBits =
        32 - cidr;

    const totalAddresses =
        Math.pow(2, hostBits);

    const broadcastNumber =
        networkNumber +
        totalAddresses - 1;


    let firstHostNumber;
    let lastHostNumber;
    let usableHosts;


    if (cidr === 32) {

        firstHostNumber =
            networkNumber;

        lastHostNumber =
            networkNumber;

        usableHosts = 1;

    } else if (cidr === 31) {

        firstHostNumber =
            networkNumber;

        lastHostNumber =
            broadcastNumber;

        usableHosts = 2;

    } else {

        firstHostNumber =
            networkNumber + 1;

        lastHostNumber =
            broadcastNumber - 1;

        usableHosts =
            totalAddresses - 2;

    }


    currentCalculation = {

        ip,
        cidr,

        mask: mask.join("."),

        wildcard:
            getWildcard(mask),

        network:
            numberToIP(networkNumber),

        broadcast:
            numberToIP(broadcastNumber),

        firstHost:
            numberToIP(firstHostNumber),

        lastHost:
            numberToIP(lastHostNumber),

        totalAddresses,

        usableHosts,

        hostBits,

        ipClass:
            getIPClass(ip),

        addressType:
            getAddressType(ip),

        binaryIP:
            ipToBinary(ip),

        binaryMask:
            ipToBinary(mask.join(".")),

        networkNumber,

        broadcastNumber

    };


    displayResults();

    saveHistory();

}


/* =========================
   DISPLAY RESULTS
========================= */

function displayResults() {

    const data =
        currentCalculation;

    emptyState.classList.add("hidden");

    resultContent.classList.remove("hidden");

    detailsSection.classList.remove("hidden");


    document.getElementById(
        "networkAddress"
    ).textContent =
        data.network;


    document.getElementById(
        "networkClass"
    ).textContent =
        data.ipClass;


    document.getElementById(
        "broadcastAddress"
    ).textContent =
        data.broadcast;


    document.getElementById(
        "firstHost"
    ).textContent =
        data.firstHost;


    document.getElementById(
        "lastHost"
    ).textContent =
        data.lastHost;


    document.getElementById(
        "usableHosts"
    ).textContent =
        data.usableHosts.toLocaleString();


    document.getElementById(
        "addressType"
    ).textContent =
        data.addressType;


    document.getElementById(
        "privacyDot"
    ).style.background =
        getTypeColor(
            data.addressType
        );


    document.getElementById(
        "currentCidrBadge"
    ).textContent =
        "/" + data.cidr;


    document.getElementById(
        "subnetMask"
    ).textContent =
        data.mask;


    document.getElementById(
        "wildcardMask"
    ).textContent =
        data.wildcard;


    document.getElementById(
        "totalAddresses"
    ).textContent =
        data.totalAddresses.toLocaleString();


    document.getElementById(
        "hostBits"
    ).textContent =
        data.hostBits;


    document.getElementById(
        "binaryIP"
    ).textContent =
        data.binaryIP;


    document.getElementById(
        "binaryMask"
    ).textContent =
        data.binaryMask;


    generateSubnetTable();

}


/* =========================
   ADDRESS TYPE COLOR
========================= */

function getTypeColor(type) {

    const colors = {

        "Private": "#6c8972",
        "Public": "#6f8597",
        "Loopback": "#b68d6d",
        "Multicast": "#9a7aa0",
        "Reserved": "#b96b6b"

    };

    return colors[type] || "#9aa4b2";

}


/* =========================
   SUBNET TABLE
========================= */

function generateSubnetTable() {

    if (!currentCalculation) {
        return;
    }

    const data =
        currentCalculation;

    const count =
        parseInt(
            subnetCountSelect.value
        );

    subnetTableBody.innerHTML = "";

    const blockSize =
        Math.max(
            1,
            Math.floor(
                data.totalAddresses / count
            )
        );


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const subnetNetwork =
            data.networkNumber +
            i * blockSize;

        if (
            subnetNetwork >
            data.broadcastNumber
        ) {
            break;
        }

        let subnetBroadcast =
            subnetNetwork +
            blockSize - 1;

        if (
            subnetBroadcast >
            data.broadcastNumber
        ) {
            subnetBroadcast =
                data.broadcastNumber;
        }


        let firstHost;
        let lastHost;


        if (blockSize <= 2) {

            firstHost =
                subnetNetwork;

            lastHost =
                subnetBroadcast;

        } else {

            firstHost =
                subnetNetwork + 1;

            lastHost =
                subnetBroadcast - 1;

        }


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>${i + 1}</td>

            <td>
                ${numberToIP(subnetNetwork)}
            </td>

            <td>
                ${numberToIP(firstHost)}
            </td>

            <td>
                ${numberToIP(lastHost)}
            </td>

            <td>
                ${numberToIP(subnetBroadcast)}
            </td>

        `;


        subnetTableBody.appendChild(row);

    }

}


subnetCountSelect.addEventListener(
    "change",
    generateSubnetTable
);


/* =========================
   ERROR
========================= */

function showError(message) {

    errorMessage.textContent =
        message;

}


/* =========================
   HISTORY
========================= */

function saveHistory() {

    const entry = {

        id: Date.now(),

        ip:
            currentCalculation.ip,

        cidr:
            currentCalculation.cidr,

        network:
            currentCalculation.network,

        timestamp:
            new Date().toLocaleString(
                "id-ID"
            )

    };


    history = history.filter(item =>
        !(
            item.ip === entry.ip &&
            item.cidr === entry.cidr
        )
    );


    history.unshift(entry);


    history =
        history.slice(0, 10);


    localStorage.setItem(
        "subnetXHistory",
        JSON.stringify(history)
    );


    renderHistory();

}


function renderHistory() {

    historyList.innerHTML = "";

    historyCount.textContent =
        `${history.length} calculation${history.length !== 1 ? "s" : ""}`;


    if (history.length === 0) {

        historyList.innerHTML = `

            <div class="history-empty">

                <span>◌</span>

                <p>
                    Belum ada riwayat perhitungan.
                </p>

            </div>

        `;

        return;
    }


    history.forEach(item => {

        const historyItem =
            document.createElement("div");


        historyItem.className =
            "history-item";


        historyItem.innerHTML = `

            <div class="history-main">

                <div class="history-icon">
                    ◎
                </div>

                <div>

                    <strong>
                        ${item.ip}/${item.cidr}
                    </strong>

                    <span>
                        ${item.timestamp}
                    </span>

                </div>

            </div>

            <div class="history-network">
                ${item.network}
            </div>

        `;


        historyItem.addEventListener(
            "click",
            () => {

                ipInput.value =
                    item.ip;

                cidrInput.value =
                    item.cidr;

                updateMaskPreview();

                calculateSubnet();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );


        historyList.appendChild(
            historyItem
        );

    });

}


/* =========================
   CLEAR HISTORY
========================= */

clearHistoryBtn.addEventListener(
    "click",
    () => {

        history = [];

        localStorage.removeItem(
            "subnetXHistory"
        );

        renderHistory();

    }
);


/* =========================
   COPY RESULT
========================= */

copyBtn.addEventListener(
    "click",
    () => {

        if (!currentCalculation) {
            return;
        }

        const data =
            currentCalculation;


        const text =

`Subnet-X Calculation

IP Address: ${data.ip}/${data.cidr}

Network Address: ${data.network}
Broadcast Address: ${data.broadcast}

Subnet Mask: ${data.mask}
Wildcard Mask: ${data.wildcard}

First Host: ${data.firstHost}
Last Host: ${data.lastHost}

Usable Hosts: ${data.usableHosts}
Total Addresses: ${data.totalAddresses}

IP Class: ${data.ipClass}
Address Type: ${data.addressType}`;


        navigator.clipboard
            .writeText(text)
            .then(() => {

                copyBtn.textContent = "✓";

                setTimeout(() => {

                    copyBtn.textContent = "⧉";

                }, 1500);

            });

    }
);


/* =========================
   DARK MODE
========================= */

themeToggle.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark-mode"
        );


        const darkMode =
            document.body.classList.contains(
                "dark-mode"
            );


        themeToggle.textContent =
            darkMode
                ? "☀"
                : "☾";


        localStorage.setItem(
            "subnetXTheme",
            darkMode
                ? "dark"
                : "light"
        );

    }
);


const savedTheme =
    localStorage.getItem(
        "subnetXTheme"
    );


if (savedTheme === "dark") {

    document.body.classList.add(
        "dark-mode"
    );

    themeToggle.textContent = "☀";

}


/* =========================
   BUTTON EVENTS
========================= */

calculateBtn.addEventListener(
    "click",
    calculateSubnet
);


ipInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {
            calculateSubnet();
        }

    }
);


cidrInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {
            calculateSubnet();
        }

    }
);


/* =========================
   DEMO DEFAULT
========================= */

ipInput.value =
    "192.168.1.10";
console.log("Script is running");

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxQCzFQ9bXqE4xkmkezKYzBFOj6Z51sDZj6HGWDN4DKa0_aQX5_jQ0m8QqJJHAKJ-J4ng/exec';

const processes = [
    { name: "Plate/Nozzle Bevel", color: "#FF6B6B" },
    { name: "Plate Fit-Up", color: "#FFA07A" },
    { name: "Root Pass", color: "#FFDAB9" },
    { name: "External Welding", color: "#98FB98" },
    { name: "Press/Saw", color: "#87CEFA" },
    { name: "Drilling", color: "#DDA0DD" },
    { name: "Milling", color: "#40E0D0" },
    { name: "End Block Fit-Up", color: "#F0E68C" },
    { name: "End Block Weld", color: "#FF69B4" },
    { name: "Nozzle Fit-Up", color: "#87CEEB" },
    { name: "Nozzle to Header Weld", color: "#FFA500" },
    { name: "Initial Clean-Up", color: "#7FFF00" },
    { name: "PWHT Clean-Up", color: "#BA55D3" },
    { name: "Blasting", color: "#3CB371" },
    { name: "Painting", color: "#9370DB" }
];

let cachedData = null;
let currentFilter = '';
let currentSearch = '';

function showLoading() {
    const container = document.getElementById('container');
    container.innerHTML = '<div id="loading">Loading...</div>';
}

function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.remove();
    }
}

async function fetchProcessData() {
    if (cachedData) {
        console.log("Using cached data");
        return cachedData;
    }

    showLoading();
    try {
        console.log("Fetching data from:", SCRIPT_URL);
        const response = await fetch(SCRIPT_URL);
        console.log("Response status:", response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched data:", data);
        cachedData = data;
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    } finally {
        hideLoading();
    }
}

function createProcessBar(data) {
    console.log("Creating process bar with data:", data);
    const svg = document.getElementById('process-bar');
    if (!svg) {
        console.error("Process bar SVG element not found");
        return;
    }
    console.log("SVG element found:", svg);

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100');
    svg.setAttribute('viewBox', '0 0 1000 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    svg.innerHTML = '';
    const filteredData = filterData(data);
    const totalHeaders = filteredData.reduce((sum, process) => sum + process.headers.length, 0);
    console.log("Total headers:", totalHeaders);

    let accumulatedWidth = 0;

    const borderRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    borderRect.setAttribute("x", "0");
    borderRect.setAttribute("y", "0");
    borderRect.setAttribute("width", "1000");
    borderRect.setAttribute("height", "100");
    borderRect.setAttribute("fill", "none");
    borderRect.setAttribute("stroke", "black");
    borderRect.setAttribute("stroke-width", "2");
    svg.appendChild(borderRect);

    filteredData.forEach((process, index) => {
        const width = (process.headers.length / totalHeaders) * 1000;
        console.log(`Process: ${process.name}, Width: ${width}`);
        
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", accumulatedWidth);
        rect.setAttribute("y", "0");
        rect.setAttribute("width", width);
        rect.setAttribute("height", "100");
        rect.setAttribute("fill", processes[index].color);
        rect.setAttribute("class", "process-section");

        rect.addEventListener('click', () => showProcessInfo(process, totalHeaders));

        svg.appendChild(rect);
        accumulatedWidth += width;
    });

    console.log("Process bar created");
    createLegend(filteredData, totalHeaders);
}

function createLegend(data, totalHeaders) {
    console.log("Creating legend with data:", data);
    const legend = document.getElementById('legend');
    legend.innerHTML = '';
    data.forEach((process, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = processes[index].color;
        
        const text = document.createElement('span');
        const percentage = ((process.headers.length / totalHeaders) * 100).toFixed(1);
        text.textContent = `${process.name} (${percentage}%)`;
        
        item.appendChild(colorBox);
        item.appendChild(text);
        legend.appendChild(item);
    });
}

function showProcessInfo(process, totalHeaders) {
    const container = document.getElementById('container');
    const percentage = ((process.headers.length / totalHeaders) * 100).toFixed(1);
    
    container.innerHTML = `
        <h1 id="main-title">Header Floor Status - ${process.name}</h1>
        <div id="filter-search">
            <input type="text" id="job-filter" placeholder="Filter by Job#">
            <input type="text" id="header-search" placeholder="Search headers">
        </div>
        <div id="process-info">
            <p>Headers in process: ${process.headers.length}</p>
            <p>Percentage of total: ${percentage}%</p>
        </div>
        <table id="headers-table">
            <thead>
                <tr>
                    <th>Serial</th>
                    <th>Start Time</th>
                </tr>
            </thead>
            <tbody>
                ${process.headers.map(header => `
                    <tr class="header-row" data-serial="${header.serial}">
                        <td>${header.serial}</td>
                        <td>${header.startTime}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    document.getElementById('back-button').style.display = 'block'
    document.getElementById('back-button').addEventListener('click', () => {
        showMainView();
    });

    document.getElementById('job-filter').addEventListener('input', (e) => {
        filterHeaders(e.target.value, process);
    });

    document.getElementById('header-search').addEventListener('input', (e) => {
        searchHeaders(e.target.value, process);
    });

    document.querySelectorAll('.header-row').forEach(row => {
        row.addEventListener('click', () => {
            showHeaderHistory(row.dataset.serial);
        });
    });
}

function updateBackButtonVisibility() {
    const backButton = document.getElementById('back-button');
    const mainTitle = document.getElementById('main-title');
    if (mainTitle && mainTitle.textContent === "Header Floor Status") {
        backButton.style.display = 'none';
    } else {
        backButton.style.display = 'block';
    }
}

document.getElementById('back-button').addEventListener('click', () => {
    showMainView();
});

// Add this to the end of showMainView, showProcessInfo, and showHeaderHistory functions
updateBackButtonVisibility();

function filterHeaders(jobNumber, process) {
    const rows = document.querySelectorAll('.header-row');
    rows.forEach(row => {
        const serial = row.dataset.serial;
        const headerJobNumber = serial.split('-')[0];
        if (headerJobNumber.includes(jobNumber)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function searchHeaders(searchTerm, process) {
    const rows = document.querySelectorAll('.header-row');
    rows.forEach(row => {
        const serial = row.dataset.serial;
        if (serial.toLowerCase().includes(searchTerm.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function showHeaderHistory(serial) {
    showLoading();
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getHeaderHistory&serial=${serial}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const history = await response.json();
        
        const container = document.getElementById('container');
        container.innerHTML = `
        <h1 id="main-title">Header History - ${serial}</h1>
        <table id="history-table">
            <thead>
                <tr>
                    <th>Process</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                </tr>
            </thead>
            <tbody>
                ${history.map(entry => `
                    <tr>
                        <td>${entry.process}</td>
                        <td>${entry.startTime}</td>
                        <td>${entry.endTime}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    } catch (error) {
        console.error("Error fetching header history:", error);
        document.getElementById('container').innerHTML = '<p>Error loading header history. Please try again.</p>';
    } finally {
        hideLoading();
    }
}

function filterData(data) {
    if (!currentFilter && !currentSearch) return data;

    return data.map(process => ({
        ...process,
        headers: process.headers.filter(header => {
            const jobNumber = header.serial.split('-')[0];
            return (currentFilter === '' || jobNumber.includes(currentFilter)) &&
                   (currentSearch === '' || header.serial.toLowerCase().includes(currentSearch.toLowerCase()));
        })
    }));
}

function showMainView() {
    const container = document.getElementById('container');
    container.innerHTML = `
        <h1 id="main-title">Header Floor Status</h1>
        <div id="info-cards">
            <div class="info-card" id="total-wip">
                <h2>Total WIP</h2>
                <p id="wip-value">Calculating...</p>
            </div>
            <div class="info-card" id="total-backlog">
                <h2>Total Backlog</h2>
                <p id="backlog-value">Calculating...</p>
            </div>
            <div class="info-card" id="average-time">
                <h2>Average Total Time</h2>
                <p id="avg-time-value">Calculating...</p>
            </div>
        </div>
        <div id="filter-search">
            <input type="text" id="job-filter" placeholder="Filter by Job#">
            <input type="text" id="header-search" placeholder="Search headers">
        </div>
        <svg id="process-bar"></svg>
        <div id="legend"></div>
    `;

    document.getElementById('job-filter').addEventListener('input', (e) => {
        currentFilter = e.target.value;
        createProcessBar(cachedData);
    });

    document.getElementById('header-search').addEventListener('input', (e) => {
        currentSearch = e.target.value;
        createProcessBar(cachedData);
    });

    createProcessBar(cachedData);
    updateInfoCards(cachedData);
}

function updateInfoCards(data) {
    const uniqueHeaders = new Set();
    const backlog = new Set();
    let totalTime = 0;
    let completedHeaders = 0;

    data.forEach((process, processIndex) => {
        process.headers.forEach(header => {
            uniqueHeaders.add(header.serial);
            
            if (processIndex < data.length - 1 && !data[processIndex + 1].headers.some(h => h.serial === header.serial)) {
                backlog.add(header.serial);
            }

            if (processIndex === 0) {
                const startTime = new Date(header.startTime);
                const endTime = new Date(data[data.length - 1].headers.find(h => h.serial === header.serial)?.endTime);
                if (!isNaN(startTime) && !isNaN(endTime)) {
                    totalTime += endTime - startTime;
                    completedHeaders++;
                }
            }
        });
    });

    document.getElementById('wip-value').textContent = uniqueHeaders.size;
    document.getElementById('backlog-value').textContent = backlog.size;
    
    const averageTime = completedHeaders > 0 ? totalTime / completedHeaders : 0;
    const averageDays = Math.floor(averageTime / (1000 * 60 * 60 * 24));
    const averageHours = Math.floor((averageTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    document.getElementById('avg-time-value').textContent = `${averageDays} days, ${averageHours} hours`;
}

async function initializeApp() {
    console.log("Initializing app");
    const container = document.getElementById('container');
    if (!container) {
        console.error("Container element not found");
        return;
    }

    const data = await fetchProcessData();
    if (data && data.length > 0) {
        console.log("Data fetched successfully, creating process bar");
        showMainView();
    } else {
        console.error("Failed to fetch process data or data is empty");
        container.innerHTML = "<p>Failed to load data. Please try again later.</p>";
    }
}

document.getElementById('back-button').addEventListener('click', () => {
    showMainView();
});

document.addEventListener('DOMContentLoaded', initializeApp);
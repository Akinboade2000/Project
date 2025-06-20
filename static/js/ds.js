// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard
    initDashboard();
    
    // Set up navigation
    setupNavigation();
    
    // Initialize event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboardData();
});

// Menu categories and items
const MENU_ITEMS = {
    'MAIN_COURSES': ['Jollof Rice', 'Fried Rice', 'Pounded Yam & Egusi', 'Amala & Ewedu', 'Ofada Rice'],
    'PROTEINS': ['Grilled Chicken', 'Fried Fish', 'Beef Stew', 'Goat Meat', 'Suya'],
    'SIDES': ['Plantain', 'Moi Moi', 'Beans', 'Coleslaw', 'Yam Porridge'],
    'DRINKS': ['Chapman', 'Zobo', 'Palm Wine', 'Smoothies', 'Soft Drinks'],
    'DESSERTS': ['Puff Puff', 'Chin Chin', 'Fruit Salad', 'Ice Cream', 'Cake'],
    'SNACKS': ['Small Chops', 'Spring Rolls', 'Meat Pies', 'Sausage Rolls', 'Samosa']
};

// Initialize the dashboard
function initDashboard() {
    // Show dashboard section by default
    document.getElementById('dashboard-section').classList.remove('hidden');
    
    // Set current date in any date pickers
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.value = today;
    });
}

// Set up navigation between sections
function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(navLink => {
                navLink.parentElement.classList.remove('active');
            });
            
            // Add active class to clicked link
            this.parentElement.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.add('hidden');
            });
            
            // Show the selected section
            const sectionId = this.getAttribute('href').substring(1) + '-section';
            document.getElementById(sectionId).classList.remove('hidden');
            
            // Load data if needed
            if (sectionId === 'visualize-section') {
                loadVisualizationData();
            } else if (sectionId === 'anomalies-section') {
                loadAnomaliesData();
            }
        });
    });
}

// Set up event listeners
function setupEventListeners() {
    // File upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
        
        // Drag and drop for file upload
        const dropZone = document.getElementById('csv-drop-zone');
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });
            
            dropZone.addEventListener('drop', handleDrop, false);
        }
    }
    
    // Report generation buttons
    document.querySelectorAll('.generate-report').forEach(button => {
        button.addEventListener('click', generateReport);
    });
    
    // Print report button
    const printReportBtn = document.getElementById('print-report');
    if (printReportBtn) {
        printReportBtn.addEventListener('click', () => window.print());
    }
    
    // Refresh dashboard button
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
    }
    
    // Download dashboard button
    const downloadBtn = document.getElementById('download-dashboard');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadDashboardReport);
    }
    
    // Time period selector
    const timePeriodSelect = document.getElementById('time-period');
    if (timePeriodSelect) {
        timePeriodSelect.addEventListener('change', loadVisualizationData);
    }
}

// Prevent default drag and drop behaviors
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone
function highlight() {
    document.getElementById('csv-drop-zone').classList.add('highlight');
}

// Remove highlight from drop zone
function unhighlight() {
    document.getElementById('csv-drop-zone').classList.remove('highlight');
}

// Handle dropped files
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    const fileInput = document.getElementById('csv-upload');
    fileInput.files = files;
    
    // Trigger change event
    const event = new Event('change');
    fileInput.dispatchEvent(event);
}

// Handle file upload
async function handleFileUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('csv-upload');
    const statusDiv = document.getElementById('upload-status');
    
    if (!fileInput.files.length) {
        showMessage(statusDiv, 'Please select a file to upload', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        showMessage(statusDiv, 'Uploading file...', 'info');
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(statusDiv, 'File uploaded successfully! Processing data...', 'success');
            
            // Process the uploaded data
            await processUploadedData();
            
            // Refresh dashboard data
            loadDashboardData();
            
            // Switch to dashboard view
            document.querySelector('.sidebar-nav li.active').classList.remove('active');
            document.querySelector('.sidebar-nav li:first-child').classList.add('active');
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById('dashboard-section').classList.remove('hidden');
            
        } else {
            showMessage(statusDiv, data.error || 'Error uploading file', 'error');
        }
    } catch (error) {
        showMessage(statusDiv, 'Error uploading file: ' + error.message, 'error');
    }
}

// Process uploaded data
async function processUploadedData() {
    try {
        // Detect anomalies in the uploaded data
        const response = await fetch('/dashboard-data');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error processing data');
        }
        
        return data;
    } catch (error) {
        console.error('Error processing data:', error);
        throw error;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading('#dashboard-section .chart-container');
        
        const response = await fetch('/dashboard-data');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error loading dashboard data');
        }
        
        // Update stats
        document.getElementById('total-transactions').textContent = data.transaction_count;
        document.getElementById('total-amount').textContent = `₦${data.total_amount.toFixed(2)}`;
        document.getElementById('anomalies-count').textContent = data.anomaly_count;
        
        // Update chart
        const chartImg = document.querySelector('#dashboard-section .chart-image');
        if (chartImg) {
            chartImg.src = `data:image/png;base64,${data.plot_data}`;
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('#dashboard-section .chart-container', error.message);
    }
}

// Load visualization data
async function loadVisualizationData() {
    try {
        // Show loading indicators for all charts
        showLoading('#revenue-chart');
        showLoading('#top-items-chart');
        showLoading('#heatmap-chart');
        showLoading('#payment-chart');
        
        // Get selected time period
        const timePeriod = document.getElementById('time-period').value;
        
        // Load data for each chart
        await Promise.all([
            loadChart('revenue', 'line', timePeriod),
            loadChart('top-items', 'bar'),
            loadChart('heatmap', 'heatmap'),
            loadChart('payment-methods', 'pie')
        ]);
        
        // Update KPIs
        await updateKPIs();
        
        // Update menu performance table
        updateMenuPerformanceTable();
        
    } catch (error) {
        console.error('Error loading visualization data:', error);
        showError('#visualize-section', error.message);
    }
}

// Load a specific chart
async function loadChart(chartId, chartType, timePeriod = 'day') {
    try {
        const response = await fetch('/visualize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chart_type: chartType,
                time_period: timePeriod,
                chart_id: chartId,
                dashboard_view: true
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Error loading ${chartId} chart`);
        }
        
        // Update the chart image
        const chartImg = document.getElementById(`${chartId}-chart-img`);
        if (chartImg) {
            chartImg.src = `data:image/png;base64,${data.plot_data}`;
        }
        
    } catch (error) {
        console.error(`Error loading ${chartId} chart:`, error);
        showError(`#${chartId}-chart`, error.message);
    }
}

// Update KPIs
async function updateKPIs() {
    try {
        // In a real app, this would fetch data from the server
        // For now, we'll simulate with random data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate random data for demo purposes
        const totalRevenue = Math.random() * 1000000 + 500000;
        const avgDaily = totalRevenue / 30;
        const busiestTimes = ['Breakfast', 'Lunch', 'Dinner'];
        const topItems = Object.values(MENU_ITEMS).flat();
        
        // Update KPI elements
        document.getElementById('total-revenue').textContent = `₦${totalRevenue.toFixed(2)}`;
        document.getElementById('avg-daily').textContent = `₦${avgDaily.toFixed(2)}`;
        document.getElementById('busiest-time').textContent = busiestTimes[Math.floor(Math.random() * busiestTimes.length)];
        document.getElementById('top-item').textContent = topItems[Math.floor(Math.random() * topItems.length)];
        
    } catch (error) {
        console.error('Error updating KPIs:', error);
    }
}

// Update menu performance table
function updateMenuPerformanceTable() {
    const tableBody = document.getElementById('menu-performance-body');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Generate random data for demo purposes
    const categories = Object.keys(MENU_ITEMS);
    
    categories.forEach(category => {
        MENU_ITEMS[category].forEach(item => {
            const qtySold = Math.floor(Math.random() * 100) + 10;
            const price = Math.random() * 5000 + 500;
            const cost = price * 0.6; // Assume 40% profit margin
            const totalRevenue = qtySold * price;
            const profitMargin = ((price - cost) / price) * 100;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item}</td>
                <td>${category.replace('_', ' ')}</td>
                <td>${qtySold}</td>
                <td>₦${totalRevenue.toFixed(2)}</td>
                <td>${profitMargin.toFixed(1)}%</td>
            `;
            tableBody.appendChild(row);
        });
    });
}

// Load anomalies data
async function loadAnomaliesData() {
    try {
        // In a real app, this would fetch data from the server
        // For now, we'll use the data already loaded in the template
        
        // You could add additional processing here if needed
        console.log('Anomalies data loaded');
        
    } catch (error) {
        console.error('Error loading anomalies data:', error);
        showError('#anomalies-section', error.message);
    }
}

// Generate report
async function generateReport(e) {
    const reportType = e.target.dataset.type;
    const reportOutput = document.getElementById('report-output');
    const reportTitle = document.getElementById('report-title');
    const reportContent = document.getElementById('report-content');
    
    try {
        showLoading('#report-output');
        reportOutput.classList.remove('hidden');
        
        const response = await fetch('/report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `report_type=${reportType}`
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error generating report');
        }
        
        // Display the report
        reportTitle.textContent = data.type;
        
        if (reportType === 'summary') {
            reportContent.innerHTML = `
                <p><strong>Total Transactions:</strong> ${data.total_transactions}</p>
                <p><strong>Total Amount:</strong> ₦${data.total_amount.toFixed(2)}</p>
                <p><strong>Average Transaction Amount:</strong> ₦${data.average_amount.toFixed(2)}</p>
                <p><strong>Anomalies Detected:</strong> ${data.anomalies_count}</p>
                <h5>Spending by Category</h5>
                <ul>
                    ${Object.entries(data.categories).map(([category, amount]) => `
                        <li><strong>${category}:</strong> ₦${amount.toFixed(2)}</li>
                    `).join('')}
                </ul>
            `;
        } else if (reportType === 'anomalies') {
            reportContent.innerHTML = `
                <h5>Detected Anomalies (${data.anomalies.length})</h5>
                <table class="anomaly-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Recipient</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.anomalies.map(anomaly => `
                            <tr>
                                <td>${anomaly.date}</td>
                                <td>₦${anomaly.amount.toFixed(2)}</td>
                                <td>${anomaly.recipient}</td>
                                <td>${anomaly.reason}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            reportContent.innerHTML = `<p>${data.message}</p>`;
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        reportContent.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
    }
}

// Download dashboard report
async function downloadDashboardReport() {
    try {
        // In a real app, this would generate a PDF or Excel report
        // For now, we'll simulate it
        
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Restaurant Analytics Report\n\nGenerated on: ' + new Date().toLocaleString());
        link.download = 'restaurant_report_' + new Date().toISOString().split('T')[0] + '.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error('Error downloading report:', error);
        showMessage('#visualize-section', 'Error generating report: ' + error.message, 'error');
    }
}

// Show loading spinner
function showLoading(selector) {
    const container = document.querySelector(selector);
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading data...</p>
            </div>
        `;
    }
}

// Show error message
function showError(selector, message) {
    const container = document.querySelector(selector);
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle error-icon"></i>
                <span>${message}</span>
            </div>
        `;
    }
}

// Show message (info, success, error)
function showMessage(container, message, type = 'info') {
    if (!container) return;
    
    let icon, className;
    
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            className = 'success-message';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            className = 'error-message';
            break;
        default:
            icon = 'fa-info-circle';
            className = 'info-message';
    }
    
    container.innerHTML = `
        <div class="${className}">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
    `;
}
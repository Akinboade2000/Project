// Chart.js configuration
const CHART_CONFIG = {
    'revenue': {
        type: 'line',
        title: 'Revenue Trend',
        container: 'revenue-chart-container',
        canvasId: 'revenue-chart'
    },
    'top-items': {
        type: 'bar',
        title: 'Top Categories',
        container: 'top-items-chart-container',
        canvasId: 'top-items-chart'
    },
    'heatmap': {
        type: 'heatmap',
        title: 'Transaction Heatmap',
        container: 'heatmap-chart-container',
        canvasId: 'heatmap-chart'
    },
    'payment-methods': {
        type: 'doughnut',
        title: 'Payment Distribution',
        container: 'payment-methods-chart-container',
        canvasId: 'payment-methods-chart'
    }
};

// Chart instances storage
const chartInstances = {};

// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    setupNavigation();
    setupEventListeners();
    loadDashboardData();
    loadVisualizationData();
});

const MENU_ITEMS = {
    'MAIN_COURSES': ['Jollof Rice', 'Fried Rice', 'Pounded Yam & Egusi', 'Amala & Ewedu', 'Ofada Rice'],
    'PROTEINS': ['Grilled Chicken', 'Fried Fish', 'Beef Stew', 'Goat Meat', 'Suya'],
    'SIDES': ['Plantain', 'Moi Moi', 'Beans', 'Coleslaw', 'Yam Porridge'],
    'DRINKS': ['Chapman', 'Zobo', 'Palm Wine', 'Smoothies', 'Soft Drinks'],
    'DESSERTS': ['Puff Puff', 'Chin Chin', 'Fruit Salad', 'Ice Cream', 'Cake'],
    'SNACKS': ['Small Chops', 'Spring Rolls', 'Meat Pies', 'Sausage Rolls', 'Samosa']
};

// Improved loadChart function
async function loadChart(chartId, chartType, timePeriod = 'day') {
    try {
        const config = CHART_CONFIG[chartId];
        if (!config) {
            console.error(`No configuration found for chart: ${chartId}`);
            return;
        }

        const container = document.getElementById(config.container);
        if (!container) {
            console.error(`Container not found: ${config.container}`);
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading ${config.title}...</p>
            </div>
        `;

        // Fetch chart data from server
        const response = await fetch('/visualize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chart_type: chartType,
                chart_id: chartId,
                time_period: timePeriod
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Error loading ${chartId} chart`);
        }

        // Clear previous chart if it exists
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
        }

        // Create canvas for Chart.js
        container.innerHTML = `
            <div class="chart-header">
                <h4>${config.title}</h4>
            </div>
            <div class="chart-wrapper">
                <canvas id="${config.canvasId}"></canvas>
            </div>
        `;

        // Process data for Chart.js
        const ctx = document.getElementById(config.canvasId).getContext('2d');
        
        // For simplicity, we'll use the image from server for now
        // In a real app, you would process the raw data and create interactive charts
        container.innerHTML = `
            <div class="chart-header">
                <h4>${config.title}</h4>
            </div>
            <div class="chart-image-container">
                <img src="data:image/png;base64,${data.plot_data}" 
                    alt="${config.title}" 
                    class="chart-image">
            </div>
        `;

    } catch (error) {
        console.error(`Error loading ${chartId} chart:`, error);
        const container = document.getElementById(config.container);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle error-icon"></i>
                    <span>Error loading chart: ${error.message}</span>
                </div>
            `;
        }
    }
}

async function updateKPIs() {
    try {
        // Fetch data from server
        const response = await fetch('/dashboard-data');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error fetching dashboard data');
        }

        // Calculate additional metrics
        const transactions = data.transactions || [];
        const totalAmount = data.total_amount || 0;
        const transactionCount = data.transaction_count || 0;
        const avgTransaction = transactionCount > 0 ? totalAmount / transactionCount : 0;
        
        // Update KPI elements with real data
        document.getElementById('total-revenue').textContent = `₦${totalAmount.toFixed(2)}`;
        document.getElementById('avg-daily').textContent = `₦${avgTransaction.toFixed(2)}`;
        
        // For busiest time and top item, we'd need additional data from the server
        // For now, we'll use placeholders
        document.getElementById('busiest-time').textContent = 'Afternoon';
        document.getElementById('top-item').textContent = 'General Expenses';
        
    } catch (error) {
        console.error('Error updating KPIs:', error);
    }
}

function initDashboard() {
    document.getElementById('dashboard-section').classList.remove('hidden');
    
    // Initialize all chart containers
    Object.keys(CHART_CONFIG).forEach(chartId => {
        const config = CHART_CONFIG[chartId];
        const container = document.getElementById(`${chartId}-chart`);
        if (container && !container.querySelector('.chart-image-container')) {
            container.innerHTML = `
                <div class="chart-header">
                    <h4>${config.title}</h4>
                </div>
                <div class="chart-image-container">
                    <img id="${chartId}-chart-img" class="chart-image" 
                        src="" alt="${config.title}">
                </div>
            `;
        }
    });
}

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
    
    // Load visualization data immediately
    loadVisualizationData();
});

// Enhanced PDF Report Generation
async function downloadDashboardReport() {
    try {
        showMessage('#visualize-section', 'Generating PDF report...', 'info');
        
        // Fetch the current dashboard data
        const dashboardResponse = await fetch('/dashboard-data');
        const dashboardData = await dashboardResponse.json();
        
        if (!dashboardResponse.ok) {
            throw new Error(dashboardData.error || 'Error fetching dashboard data');
        }

        // Generate PDF on server
        const pdfResponse = await fetch('/generate-pdf-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transaction_count: dashboardData.transaction_count,
                total_amount: dashboardData.total_amount,
                anomaly_count: dashboardData.anomaly_count,
                plot_data: dashboardData.plot_data
            })
        });

        if (!pdfResponse.ok) {
            throw new Error('Error generating PDF report');
        }

        // Get the PDF blob
        const pdfBlob = await pdfResponse.blob();
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `restaurant_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
        
    } catch (error) {
        console.error('Error generating PDF report:', error);
        showMessage('#visualize-section', `Error generating report: ${error.message}`, 'error');
    }
}

// Enhanced Anomalies Data Loading
async function loadAnomaliesData() {
    try {
        showLoading('#anomalies-section .anomaly-list');
        
        const response = await fetch('/api/anomalies');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error loading anomalies data');
        }

        const anomaliesList = document.querySelector('#anomalies-section .anomaly-list ul');
        if (anomaliesList) {
            anomaliesList.innerHTML = '';
            
            if (data.anomalies && data.anomalies.length > 0) {
                data.anomalies.forEach(anomaly => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>${new Date(anomaly.date).toLocaleDateString()}</strong>: 
                        ${anomaly.anomaly_reason} (₦${anomaly.amount.toFixed(2)} to ${anomaly.recipient})
                    `;
                    anomaliesList.appendChild(li);
                });
            } else {
                anomaliesList.innerHTML = '<li>No anomalies detected</li>';
            }
        }

        const anomalyTable = document.getElementById('anomaly-table');
        if (anomalyTable) {
            const tbody = anomalyTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            if (data.anomalies && data.anomalies.length > 0) {
                data.anomalies.forEach(anomaly => {
                    const row = document.createElement('tr');
                    row.className = 'anomaly-row';
                    row.innerHTML = `
                        <td>${new Date(anomaly.date).toLocaleDateString()}</td>
                        <td>₦${anomaly.amount.toFixed(2)}</td>
                        <td>${anomaly.recipient}</td>
                        <td>${anomaly.category || 'N/A'}</td>
                        <td>${anomaly.anomaly_reason}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="5">No anomalies detected</td>';
                tbody.appendChild(row);
            }
        }
        
    } catch (error) {
        console.error('Error loading anomalies data:', error);
        showError('#anomalies-section', error.message);
    }
}

// Initialize the dashboard
function initDashboard() {
    // Show dashboard section by default
    document.getElementById('dashboard-section').classList.remove('hidden');
    
    // Initialize all chart containers
    Object.keys(CHART_CONFIG).forEach(chartId => {
        const config = CHART_CONFIG[chartId];
        const container = document.getElementById(config.container);
        if (container) {
            container.innerHTML = `
                <div class="chart-header">
                    <h4>${config.title}</h4>
                </div>
                <div class="chart-image-container">
                    <img id="${chartId}-chart-img" class="chart-image" 
                        src="" alt="${config.title}">
                </div>
            `;
        }
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
            
            // Reload visualization data
            loadVisualizationData();
            
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
            chartImg.onload = () => {
                // Hide loading spinner when image is loaded
                const loadingSpinner = document.querySelector('#dashboard-section .loading-spinner');
                if (loadingSpinner) loadingSpinner.style.display = 'none';
            };
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('#dashboard-section .chart-container', error.message);
    }
}

// Load visualization data
async function loadVisualizationData() {
    try {
        console.log('Loading visualization data...');
        
        // Show loading indicators for all charts
        showAllChartsLoading();
        
        // Get selected time period
        const timePeriod = document.getElementById('time-period')?.value || 'day';
        
        // Load data for each chart
        await Promise.all([
            loadChart('revenue', 'line', timePeriod),
            loadChart('top-items', 'bar'),
            loadChart('heatmap', 'heatmap'),
            loadChart('payment-methods', 'pie')
        ]);
        
        // Update KPIs with real data
        await updateKPIs();
        
        // Update menu performance table
        updateMenuPerformanceTable();
        
        console.log('Visualization data loaded successfully');
        
    } catch (error) {
        console.error('Error loading visualization data:', error);
        showError('#visualize-section', error.message);
    }
}

// Load a specific chart
async function loadChart(chartId, chartType, timePeriod = 'day') {
    try {
        const container = document.getElementById(`${chartId}-chart`);
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading chart...</p>
            </div>
        `;

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
        const img = document.getElementById(`${chartId}-chart-img`);
        if (img) {
            img.src = `data:image/png;base64,${data.plot_data}`;
            img.style.display = 'block';
        } else {
            // Fallback if image element doesn't exist
            container.innerHTML = `
                <div class="chart-header">
                    <h4>${CHART_CONFIG[chartId].title}</h4>
                </div>
                <div class="chart-image-container">
                    <img src="data:image/png;base64,${data.plot_data}" 
                        alt="${CHART_CONFIG[chartId].title}" 
                        class="chart-image">
                </div>
            `;
        }

    } catch (error) {
        console.error(`Error loading ${chartId} chart:`, error);
        const container = document.getElementById(`${chartId}-chart`);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle error-icon"></i>
                    <span>Failed to load chart: ${error.message}</span>
                </div>
            `;
        }
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
async function updateMenuPerformanceTable() {
    try {
        const tableBody = document.getElementById('menu-performance-body');
        if (!tableBody) return;
        
        // Fetch data from server
        const response = await fetch('/dashboard-data');
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error fetching dashboard data');
        }

        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Group transactions by category
        const categories = {};
        data.transactions.forEach(t => {
            const category = t.category || 'Uncategorized';
            categories[category] = categories[category] || { amount: 0, count: 0 };
            categories[category].amount += t.amount;
            categories[category].count++;
        });
        
        // Add rows to table
        Object.entries(categories).forEach(([category, stats]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category}</td>
                <td>${category}</td>
                <td>${stats.count}</td>
                <td>₦${stats.amount.toFixed(2)}</td>
                <td>N/A</td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error updating menu performance table:', error);
        tableBody.innerHTML = `<tr><td colspan="5">Error loading data: ${error.message}</td></tr>`;
    }
}

// Load anomalies data
async function loadAnomaliesData() {
    try {
        const response = await fetch('/api/sales');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        console.log('Anomalies data loaded:', data);

        // Now, do something with the data (e.g., display or pass to PDF)
        generatePDFReport(data);

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
        showMessage('#visualize-section', 'Generating PDF report...', 'info');
        
        // Create a new PDF document
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm'
        });

        // Add title and date
        doc.setFontSize(18);
        doc.text('Restaurant Analytics Report', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });

        // Add KPIs
        doc.setFontSize(14);
        doc.text('Key Performance Indicators', 15, 30);
        doc.setFontSize(10);
        
        const kpis = [
            `Total Revenue: ${document.getElementById('total-revenue').textContent}`,
            `Avg. Daily Sales: ${document.getElementById('avg-daily').textContent}`,
            `Busiest Time: ${document.getElementById('busiest-time').textContent}`,
            `Top Selling Item: ${document.getElementById('top-item').textContent}`
        ];
        
        kpis.forEach((kpi, i) => {
            doc.text(kpi, 15, 38 + (i * 6));
        });

        // Add charts
        const chartIds = ['revenue', 'top-items', 'heatmap', 'payment-methods'];
        let yPosition = 60;
        
        for (const chartId of chartIds) {
            const config = CHART_CONFIG[chartId];
            const imgElement = document.getElementById(`${chartId}-chart-img`);
            
            if (imgElement && imgElement.src) {
                // Add chart title
                doc.setFontSize(12);
                doc.text(config.title, 15, yPosition - 5);
                
                // Add chart image
                const imgData = imgElement.src;
                doc.addImage(imgData, 'PNG', 15, yPosition, 120, 60);
                
                yPosition += 70;
                
                // Add new page if needed
                if (yPosition > 180 && chartId !== chartIds[chartIds.length - 1]) {
                    doc.addPage();
                    yPosition = 20;
                }
            }
        }

        // Add menu performance table
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Menu Performance', 15, 20);
        
        const tableData = [];
        const headers = ['Item', 'Category', 'Qty Sold', 'Total Revenue'];
        
        // Get table data from the page
        const tableRows = document.querySelectorAll('#menu-performance-body tr');
        tableRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) { // Ensure we have enough cells
                tableData.push([
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent
                ]);
            }
        });
        
        // Add table to PDF
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 25,
            theme: 'grid',
            headStyles: {
                fillColor: [52, 152, 219],
                textColor: 255
            }
        });

        // Save the PDF
        doc.save(`restaurant_report_${new Date().toISOString().split('T')[0]}.pdf`);
        
    } catch (error) {
        console.error('Error generating PDF report:', error);
        showMessage('#visualize-section', `Error generating report: ${error.message}`, 'error');
    }
}

// Show loading spinner
function showLoading(selector) {
    const container = document.querySelector(selector);
    if (container) {
        const existingSpinner = container.querySelector('.loading-spinner');
        if (!existingSpinner) {
            container.insertAdjacentHTML('beforeend', `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading data...</p>
                </div>
            `);
        }
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

// Add this to your dashboard.js

async function loadVisualizationData() {
    try {
        // Show loading indicators for all charts
        showAllChartsLoading();
        
        // Get selected time period
        const timePeriod = document.getElementById('time-period')?.value || 'day';
        
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


function showAllChartsLoading() {
    Object.keys(CHART_CONFIG).forEach(chartId => {
        const config = CHART_CONFIG[chartId];
        const container = document.getElementById(config.container);
        if (container) {
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading ${config.title}...</p>
                </div>
            `;
        }
    });
}

async function loadChart(chartId, chartType, timePeriod = 'day') {
    try {
        const config = CHART_CONFIG[chartId];
        const container = document.getElementById(config.container);
        
        // Show loading state
        container.innerHTML = `<div class="loading-spinner">Loading...</div>`;

        const response = await fetch('/visualize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chart_type: chartType,
                time_period: timePeriod,
                chart_id: chartId,
                dashboard_view: true
            })
        });

        const data = await response.json();
        console.log(`Chart ${chartId} data:`, data); // Debug log

        if (!data.plot_data) {
            throw new Error('No plot data received');
        }

        // Debug: Check image data format
        console.log(`Image data starts with: ${data.plot_data.substring(0, 30)}...`);

        // Create image element programmatically
        const img = document.createElement('img');
        img.id = config.imgId;
        img.className = 'chart-image';
        img.src = `data:image/png;base64,${data.plot_data}`;
        img.alt = config.title;
        img.onload = () => console.log(`Chart ${chartId} image loaded successfully`);
        img.onerror = (e) => console.error(`Chart ${chartId} image failed to load`, e);

        // Build container structure
        container.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'chart-header';
        header.innerHTML = `<h4>${config.title}</h4>`;
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'chart-image-container';
        imageContainer.appendChild(img);
        
        container.appendChild(header);
        container.appendChild(imageContainer);

    } catch (error) {
        console.error(`Error loading ${chartId} chart:`, error);
        const container = document.getElementById(config.container);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                ${error.message}
            </div>
        `;
    }
}

console.log('Response status:', response.status);
console.log('Response data:', data);
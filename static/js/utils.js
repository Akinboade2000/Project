// Utility functions
document.addEventListener('DOMContentLoaded', function() {
    // Add any utility functions needed across pages
    
    // Example: Close session when browser/tab is closed
    window.addEventListener('beforeunload', function() {
        // In a real app, you might want to clean up or notify the backend
    });
});

// Helper function to format currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Helper function to format dates
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to parse date input (for filters)
function parseDateInput(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Helper function to validate email format
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Helper function to show loading spinner
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading data...</p>
            </div>
        `;
    }
}

// Helper function to hide loading spinner
function hideLoading(containerId, content = '') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = content;
    }
}

// Helper function to show error message
function showError(message, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                <p>${message}</p>
            </div>
        `;
    }
}

// Helper function to generate random color (for visualization)
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Helper function to debounce rapid-fire events (for search/filter inputs)
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Helper function to format large numbers (e.g., 1500 -> 1.5K)
function abbreviateNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Helper function to deep clone objects
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Helper function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function getChartTitle(chartType, category, timePeriod) {
    const titles = {
        'line': `Transaction Trend (${timePeriod.capitalize()})`,
        'bar': `Transaction Amounts (${timePeriod.capitalize()})`,
        'pie': 'Amount Distribution by Category',
        'scatter': 'Transactions (Red = Anomalies)'
    };
    
    let title = titles[chartType] || 'Transaction Visualization';
    
    if (category !== 'all') {
        title += ` - ${category}`;
    }
    
    return title;
}

// Helper to capitalize strings
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
// Export functions if using modules
// export { formatCurrency, formatDate, isValidEmail, showLoading, hideLoading, showError };
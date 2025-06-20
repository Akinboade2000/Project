// Authentication handling
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in when accessing dashboard
    if(window.location.pathname.includes('dashboard.html')) {
        if(!localStorage.getItem('currentUser')) {
            window.location.href = 'login.html';
        } else {
            // Display username
            const user = JSON.parse(localStorage.getItem('currentUser'));
            document.getElementById('username-display').textContent = user.name;
            document.querySelector('.avatar').textContent = user.name.charAt(0).toUpperCase();
        }
    }

    // Login form handling
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Simple validation
            if(email && password) {
                // In a real app, you would validate against your backend
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const user = users.find(u => u.email === email && u.password === password);
                
                if(user) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Invalid email or password');
                }
            } else {
                alert('Please fill in all fields');
            }
        });
    }

    // Registration form handling
    const registerForm = document.getElementById('registerForm');
    if(registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            // Validation
            if(password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            if(name && email && password) {
                // In a real app, you would send this to your backend
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                
                // Check if user already exists
                if(users.some(u => u.email === email)) {
                    alert('User already exists with this email');
                    return;
                }
                
                // Create new user
                const newUser = {
                    name,
                    email,
                    password // In a real app, you would hash this
                };
                
                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('currentUser', JSON.stringify(newUser));
                
                window.location.href = 'dashboard.html';
            } else {
                alert('Please fill in all fields');
            }
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logout');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }
});
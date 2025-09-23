// Ali Software Jurídico - Main JavaScript

// Utility Functions
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Style the alert
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    alert.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(alert);
    
    // Animate in
    setTimeout(() => {
        alert.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 300);
    }, 5000);
}

// Authentication Functions
function checkAuth() {
    return localStorage.getItem('userLoggedIn') === 'true';
}

function requireAuth() {
    if (!checkAuth()) {
        window.location.href = '/pages/login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userFirm');
    localStorage.removeItem('trialUser');
    showAlert('Logout realizado com sucesso!', 'success');
    setTimeout(() => {
        window.location.href = '/pages/login.html';
    }, 1000);
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    const baseUrl = 'http://localhost:3001/api';
    const url = `${baseUrl}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showAlert('Erro na comunicação com o servidor', 'error');
        throw error;
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        const data = await apiRequest('/dashboard');
        updateDashboardStats(data);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function updateDashboardStats(data) {
    if (data.stats) {
        const stats = data.stats;
        
        // Update stat cards if they exist
        const statElements = {
            processos: document.querySelector('.stat-card:nth-child(1) .stat-number'),
            tarefas: document.querySelector('.stat-card:nth-child(2) .stat-number'),
            audiencias: document.querySelector('.stat-card:nth-child(3) .stat-number'),
            receita: document.querySelector('.stat-card:nth-child(4) .stat-number')
        };
        
        if (statElements.processos) statElements.processos.textContent = stats.processosAtivos || '0';
        if (statElements.tarefas) statElements.tarefas.textContent = stats.tarefasPendentes || '0';
        if (statElements.audiencias) statElements.audiencias.textContent = stats.audienciasSemana || '0';
        if (statElements.receita) statElements.receita.textContent = formatCurrency(stats.receitaMensal || 0);
    }
}

// Form Validation
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
        
        // Email validation
        if (input.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                input.classList.add('error');
                isValid = false;
            }
        }
    });
    
    return isValid;
}

// Loading States
function showLoading(element, text = 'Carregando...') {
    const originalContent = element.innerHTML;
    element.dataset.originalContent = originalContent;
    element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    element.disabled = true;
}

function hideLoading(element) {
    if (element.dataset.originalContent) {
        element.innerHTML = element.dataset.originalContent;
        delete element.dataset.originalContent;
    }
    element.disabled = false;
}

// Mobile Menu Toggle
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        navMenu.classList.toggle('mobile-open');
    }
}

// Smooth Scrolling for Anchor Links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize App
function initApp() {
    // Initialize smooth scrolling
    initSmoothScrolling();
    
    // Add mobile menu button if needed
    const header = document.querySelector('.header');
    if (header && !header.querySelector('.mobile-menu-btn')) {
        const mobileBtn = document.createElement('button');
        mobileBtn.className = 'mobile-menu-btn';
        mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
        mobileBtn.onclick = toggleMobileMenu;
        
        const headerContent = header.querySelector('.header-content');
        if (headerContent) {
            headerContent.appendChild(mobileBtn);
        }
    }
    
    // Load dashboard data if on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        loadDashboardData();
    }
}

// Global Error Handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showAlert('Ocorreu um erro inesperado', 'error');
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export functions for global use
window.AliSoftware = {
    formatCurrency,
    formatDate,
    showAlert,
    checkAuth,
    requireAuth,
    logout,
    apiRequest,
    validateForm,
    showLoading,
    hideLoading
};
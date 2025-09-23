// Ali Software Jurídico - Utilities and Authentication
const AliSoftware = {
    // Verificar autenticação
    checkAuth: function() {
        const userLoggedIn = localStorage.getItem('userLoggedIn');
        const trialUser = localStorage.getItem('trialUser');
        const paidUser = localStorage.getItem('paidUser');
        
        // Permitir acesso se for usuário logado, em teste grátis ou pago
        if (!userLoggedIn && !trialUser && !paidUser) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    // Verificar se precisa de plano pago
    checkPaidAccess: function() {
        const trialUser = localStorage.getItem('trialUser');
        const paidUser = localStorage.getItem('paidUser');
        
        if (trialUser && !paidUser) {
            // Verificar se o trial expirou (7 dias)
            const trialStart = localStorage.getItem('trialStartDate');
            if (trialStart) {
                const trialDate = new Date(trialStart);
                const currentDate = new Date();
                const daysDiff = Math.ceil((currentDate - trialDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff > 7) {
                    alert('Seu período de teste gratuito expirou. Assine um plano para continuar.');
                    window.location.href = 'planos.html';
                    return false;
                }
            }
        }
        return true;
    },

    // Logout
    logout: function() {
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userFirm');
        localStorage.removeItem('trialUser');
        localStorage.removeItem('trialStartDate');
        localStorage.removeItem('paidUser');
        localStorage.removeItem('selectedPlan');
        window.location.href = 'login.html';
    },

    // Mostrar alertas
    showAlert: function(message, type = 'info') {
        // Criar elemento de alerta
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <div class="alert-content">
                <span class="alert-message">${message}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Adicionar ao body
        document.body.appendChild(alert);
        
        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    },

    // Inicializar usuário logado
    initUser: function() {
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        const userFirm = localStorage.getItem('userFirm');
        
        // Atualizar elementos da interface
        const userEmailElement = document.getElementById('userEmail');
        const welcomeTitleElement = document.getElementById('welcomeTitle');
        const userNameElement = document.getElementById('userName');
        const userFirmElement = document.getElementById('userFirm');
        
        if (userEmailElement && userEmail) {
            userEmailElement.textContent = userEmail;
        }
        
        if (welcomeTitleElement && userName) {
            welcomeTitleElement.textContent = `Bem-vindo, ${userName}!`;
        }
        
        if (userNameElement && userName) {
            userNameElement.textContent = userName;
        }
        
        if (userFirmElement && userFirm) {
            userFirmElement.textContent = userFirm;
        }
    },

    // Sistema de alertas jurídicos (similar ao Astrea)
    legalAlerts: {
        // Simulação de alertas de tribunais
        checkTribunalUpdates: function() {
            const alerts = [
                {
                    type: 'prazo',
                    title: 'Prazo Vencendo',
                    description: 'Contestação no processo 1001234-56.2024.8.26.0001 vence em 2 dias',
                    priority: 'high',
                    date: new Date()
                },
                {
                    type: 'movimentacao',
                    title: 'Nova Movimentação',
                    description: 'Sentença publicada no processo 2345678-90.2024.8.26.0003',
                    priority: 'medium',
                    date: new Date()
                },
                {
                    type: 'diario',
                    title: 'Diário Oficial',
                    description: 'Novo decreto publicado - Lei 14.620/2024',
                    priority: 'low',
                    date: new Date()
                }
            ];
            
            return alerts;
        },

        // Mostrar alertas na interface
        displayAlerts: function() {
            const alerts = this.checkTribunalUpdates();
            const alertContainer = document.getElementById('alertsContainer');
            
            if (alertContainer && alerts.length > 0) {
                alertContainer.innerHTML = alerts.map(alert => `
                    <div class="legal-alert alert-${alert.priority}">
                        <div class="alert-icon">
                            <i class="fas ${this.getAlertIcon(alert.type)}"></i>
                        </div>
                        <div class="alert-content">
                            <h4>${alert.title}</h4>
                            <p>${alert.description}</p>
                            <small>${alert.date.toLocaleDateString('pt-BR')}</small>
                        </div>
                    </div>
                `).join('');
            }
        },

        // Ícones para tipos de alerta
        getAlertIcon: function(type) {
            const icons = {
                'prazo': 'fa-clock',
                'movimentacao': 'fa-file-alt',
                'diario': 'fa-newspaper',
                'audiencia': 'fa-gavel'
            };
            return icons[type] || 'fa-bell';
        }
    },

    // Inicialização geral
    init: function() {
        // Verificar autenticação
        this.checkAuth();
        this.checkPaidAccess();
        
        // Inicializar dados do usuário
        this.initUser();
        
        // Exibir alertas jurídicos
        this.legalAlerts.displayAlerts();
    }
};

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Não inicializar AliSoftware nas páginas de login e trial
    const currentPage = window.location.pathname;
    if (!currentPage.includes('login.html') && !currentPage.includes('trial.html') && !currentPage.includes('index.html')) {
        AliSoftware.init();
    }
});
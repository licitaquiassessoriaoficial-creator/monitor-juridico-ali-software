class AuthSystem {
    constructor() {
        this.isLoggedIn = localStorage.getItem('astrea_logged_in') === 'true';
        this.currentUser = JSON.parse(localStorage.getItem('astrea_user') || '{}');
        this.init();
    }

    init() {
        if (this.isLoggedIn) {
            this.showDashboard();
            this.loadUserData();
            this.loadDashboardStats();
        } else {
            this.showLogin();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Mostrar loading
        this.showLoginLoading(true);
        
        try {
            // Simulação de autenticação (em produção, chamaria a API)
            await this.simulateLogin(email, password);
            
            // Salvar dados do usuário
            const userData = {
                email: email,
                name: email.split('@')[0],
                avatar: email.charAt(0).toUpperCase()
            };
            
            localStorage.setItem('astrea_logged_in', 'true');
            localStorage.setItem('astrea_user', JSON.stringify(userData));
            
            this.isLoggedIn = true;
            this.currentUser = userData;
            
            // Transição para dashboard
            this.showDashboard();
            this.loadUserData();
            this.loadDashboardStats();
            
        } catch (error) {
            alert('Erro no login: ' + error.message);
        } finally {
            this.showLoginLoading(false);
        }
    }

    async simulateLogin(email, password) {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Validações simples (em produção seria mais robusta)
        if (!email || !password) {
            throw new Error('E-mail e senha são obrigatórios');
        }
        
        if (password.length < 4) {
            throw new Error('Senha deve ter pelo menos 4 caracteres');
        }
        
        // Simular sucesso (em produção validaria credenciais)
        return true;
    }

    showLoginLoading(loading) {
        const loginText = document.getElementById('loginText');
        const loginLoading = document.getElementById('loginLoading');
        const submitButton = document.querySelector('.btn-primary');
        
        if (loading) {
            loginText.style.display = 'none';
            loginLoading.style.display = 'inline-block';
            submitButton.disabled = true;
        } else {
            loginText.style.display = 'inline';
            loginLoading.style.display = 'none';
            submitButton.disabled = false;
        }
    }

    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboardScreen').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'block';
    }

    loadUserData() {
        if (this.currentUser.avatar) {
            const avatarElement = document.querySelector('.user-avatar');
            if (avatarElement) {
                avatarElement.textContent = this.currentUser.avatar;
            }
        }

        if (this.currentUser.name) {
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = this.currentUser.name;
            }
        }
    }

    async loadDashboardStats() {
        try {
            // Tentar carregar dados reais da API
            const response = await fetch('/api/dashboard');
            if (response.ok) {
                const stats = await response.json();
                this.updateStats(stats);
            } else {
                // Usar dados simulados se API não estiver disponível
                this.updateStats({
                    totalProcessos: 124,
                    tarefasPendentes: 18,
                    prazosProximos: 7,
                    totalClientes: 89
                });
            }
        } catch (error) {
            console.error('Erro ao carregar stats:', error);
            // Usar dados simulados em caso de erro
            this.updateStats({
                totalProcessos: 124,
                tarefasPendentes: 18,
                prazosProximos: 7,
                totalClientes: 89
            });
        }
    }

    updateStats(stats) {
        const elements = {
            totalProcessos: document.getElementById('totalProcessos'),
            tarefasPendentes: document.getElementById('tarefasPendentes'),
            prazosProximos: document.getElementById('prazosProximos'),
            totalClientes: document.getElementById('totalClientes')
        };

        // Animar contadores
        Object.keys(elements).forEach(key => {
            if (elements[key] && stats[key] !== undefined) {
                this.animateCounter(elements[key], stats[key]);
            }
        });
    }

    animateCounter(element, targetValue) {
        const startValue = 0;
        const duration = 2000;
        const startTime = performance.now();

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function para animação suave
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = targetValue;
            }
        };

        requestAnimationFrame(updateCounter);
    }

    logout() {
        localStorage.removeItem('astrea_logged_in');
        localStorage.removeItem('astrea_user');
        
        this.isLoggedIn = false;
        this.currentUser = {};
        
        // Limpar formulário de login
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        
        this.showLogin();
    }
}

// Funções globais para interação com os módulos
function abrirModulo(modulo) {
    // Simular navegação para diferentes módulos
    const modules = {
        processos: 'Módulo de Gestão de Processos',
        agenda: 'Módulo de Agenda e Tarefas',
        relatorios: 'Módulo de Relatórios e Analytics',
        financeiro: 'Módulo de Gestão Financeira',
        dashboard: 'Dashboard Principal'
    };
    
    const moduleName = modules[modulo] || 'Módulo não encontrado';
    alert(`Abrindo: ${moduleName}\n\nEm breve esta funcionalidade estará disponível!`);
}

function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    }
}

// Inicializar sistema quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});

// Interceptar fechamento da página para manter estado
window.addEventListener('beforeunload', () => {
    // Salvar estado se necessário
});
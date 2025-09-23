/**
 * API Configuration and Helper Functions
 * Ali Software Jurídico - Frontend API Integration
 */

// Configurações da API
const API_CONFIG = {
    baseURL: 'http://localhost:3001/api',
    timeout: 10000
};

// Utilitários para requisições HTTP
class ApiClient {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.token = localStorage.getItem('authToken');
    }

    // Headers padrão para requisições
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Método genérico para requisições
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Métodos HTTP específicos
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Atualizar token de autenticação
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Remover token
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }
}

// Instância global da API
const api = new ApiClient();

// Funções específicas para autenticação
const AuthAPI = {
    // Login do usuário
    async login(email, password) {
        try {
            const response = await api.post('/auth/login', { email, password });
            
            if (response.token) {
                api.setToken(response.token);
                localStorage.setItem('userLoggedIn', 'true');
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userName', response.user.nome);
                localStorage.setItem('userId', response.user.id);
            }
            
            return response;
        } catch (error) {
            throw new Error(error.message || 'Erro ao fazer login');
        }
    },

    // Registro de novo usuário
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            
            if (response.token) {
                api.setToken(response.token);
                localStorage.setItem('userLoggedIn', 'true');
                localStorage.setItem('userEmail', userData.email);
                localStorage.setItem('userName', userData.nome);
                localStorage.setItem('userId', response.user.id);
                localStorage.setItem('trialUser', 'true');
                localStorage.setItem('trialStartDate', new Date().toISOString());
            }
            
            return response;
        } catch (error) {
            throw new Error(error.message || 'Erro ao criar conta');
        }
    },

    // Logout
    logout() {
        api.clearToken();
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userFirm');
        localStorage.removeItem('trialUser');
        localStorage.removeItem('trialStartDate');
        window.location.href = 'login.html';
    },

    // Verificar se usuário está logado
    isLoggedIn() {
        return localStorage.getItem('userLoggedIn') === 'true' && localStorage.getItem('authToken');
    },

    // Recuperar senha
    async forgotPassword(email) {
        try {
            return await api.post('/auth/forgot-password', { email });
        } catch (error) {
            throw new Error(error.message || 'Erro ao solicitar recuperação de senha');
        }
    }
};

// Funções para gerenciamento de clientes
const ClientesAPI = {
    async listar() {
        return await api.get('/clientes');
    },

    async criar(cliente) {
        return await api.post('/clientes', cliente);
    },

    async obter(id) {
        return await api.get(`/clientes/${id}`);
    },

    async atualizar(id, cliente) {
        return await api.put(`/clientes/${id}`, cliente);
    },

    async excluir(id) {
        return await api.delete(`/clientes/${id}`);
    }
};

// Funções para gerenciamento de processos
const ProcessosAPI = {
    async listar() {
        return await api.get('/processos');
    },

    async criar(processo) {
        return await api.post('/processos', processo);
    },

    async obter(id) {
        return await api.get(`/processos/${id}`);
    },

    async atualizar(id, processo) {
        return await api.put(`/processos/${id}`, processo);
    },

    async excluir(id) {
        return await api.delete(`/processos/${id}`);
    }
};

// Funções para gerenciamento de tarefas
const TarefasAPI = {
    async listar() {
        return await api.get('/tarefas');
    },

    async criar(tarefa) {
        return await api.post('/tarefas', tarefa);
    },

    async obter(id) {
        return await api.get(`/tarefas/${id}`);
    },

    async atualizar(id, tarefa) {
        return await api.put(`/tarefas/${id}`, tarefa);
    },

    async excluir(id) {
        return await api.delete(`/tarefas/${id}`);
    },

    async marcarConcluida(id) {
        return await api.put(`/tarefas/${id}/concluir`);
    }
};

// Funções para gerenciamento financeiro
const FinanceiroAPI = {
    async listar() {
        return await api.get('/financeiro');
    },

    async criar(item) {
        return await api.post('/financeiro', item);
    },

    async obter(id) {
        return await api.get(`/financeiro/${id}`);
    },

    async atualizar(id, item) {
        return await api.put(`/financeiro/${id}`, item);
    },

    async excluir(id) {
        return await api.delete(`/financeiro/${id}`);
    },

    async marcarPago(id) {
        return await api.put(`/financeiro/${id}/pagar`);
    }
};

// Funções para dashboard
const DashboardAPI = {
    async obterEstatisticas() {
        return await api.get('/dashboard/stats');
    },

    async obterTarefasRecentes() {
        return await api.get('/dashboard/tarefas-recentes');
    },

    async obterProcessosRecentes() {
        return await api.get('/dashboard/processos-recentes');
    },

    async obterCompromissos() {
        return await api.get('/dashboard/compromissos');
    }
};

// Utilitários para UI
const UIUtils = {
    // Mostrar loading
    showLoading(element) {
        if (element) {
            element.disabled = true;
            element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        }
    },

    // Esconder loading
    hideLoading(element, originalText) {
        if (element) {
            element.disabled = false;
            element.innerHTML = originalText;
        }
    },

    // Mostrar mensagem de sucesso
    showSuccess(message) {
        this.showMessage(message, 'success');
    },

    // Mostrar mensagem de erro
    showError(message) {
        this.showMessage(message, 'error');
    },

    // Mostrar mensagem genérica
    showMessage(message, type = 'info') {
        // Remover mensagens existentes
        const existingMessages = document.querySelectorAll('.alert-message');
        existingMessages.forEach(msg => msg.remove());

        // Criar nova mensagem
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-message alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Inserir no topo da página
        document.body.insertBefore(alertDiv, document.body.firstChild);

        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    },

    // Formatar data para exibição
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    },

    // Formatar moeda
    formatCurrency(value) {
        if (!value) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
};

// Verificar autenticação em páginas protegidas
function checkAuth() {
    if (!AuthAPI.isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se é uma página que requer autenticação
    const publicPages = ['login.html', 'trial.html', 'index.html', ''];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!publicPages.includes(currentPage)) {
        checkAuth();
    }
});
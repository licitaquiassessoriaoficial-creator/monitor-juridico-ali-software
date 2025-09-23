class SistemaJuridico {
    constructor() {
        this.apiUrl = '/api';
        this.init();
    }

    async init() {
        await this.carregarDashboard();
        await this.carregarProcessos();
        await this.carregarTarefas();
        this.configurarEventos();
        this.carregarProcessosSelect();
    }

    async carregarDashboard() {
        try {
            const response = await fetch(`${this.apiUrl}/dashboard`);
            const stats = await response.json();
            
            document.getElementById('total-processos').textContent = stats.totalProcessos || 0;
            document.getElementById('processos-andamento').textContent = stats.processosAndamento || 0;
            document.getElementById('tarefas-pendentes').textContent = stats.tarefasPendentes || 0;
            document.getElementById('prazos-proximos').textContent = stats.prazosProximos || 0;
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.mostrarStats();
        }
    }

    mostrarStats() {
        // Stats demo se a API não estiver funcionando
        document.getElementById('total-processos').textContent = '12';
        document.getElementById('processos-andamento').textContent = '8';
        document.getElementById('tarefas-pendentes').textContent = '5';
        document.getElementById('prazos-proximos').textContent = '3';
    }

    async carregarProcessos() {
        try {
            const response = await fetch(`${this.apiUrl}/processos`);
            let processos;
            
            if (response.ok) {
                processos = await response.json();
            } else {
                // Dados demo se a API não estiver funcionando
                processos = this.getProcessosDemo();
            }
            
            this.renderizarProcessos(processos);
        } catch (error) {
            console.error('Erro ao carregar processos:', error);
            this.renderizarProcessos(this.getProcessosDemo());
        }
    }

    async carregarTarefas() {
        try {
            const response = await fetch(`${this.apiUrl}/tarefas`);
            let tarefas;
            
            if (response.ok) {
                tarefas = await response.json();
            } else {
                // Dados demo se a API não estiver funcionando
                tarefas = this.getTarefasDemo();
            }
            
            this.renderizarTarefas(tarefas);
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error);
            this.renderizarTarefas(this.getTarefasDemo());
        }
    }

    getProcessosDemo() {
        return [
            {
                id: 1,
                numero: '0001234-56.2024.8.09.0001',
                titulo: 'Ação de Indenização por Danos Morais',
                responsavel: 'Dr. João Silva',
                prazo: '2024-12-30',
                status: 'andamento'
            },
            {
                id: 2,
                numero: '0002345-67.2024.8.09.0002',
                titulo: 'Revisão de Pensão Alimentícia',
                responsavel: 'Dra. Maria Santos',
                prazo: '2024-12-15',
                status: 'pendente'
            },
            {
                id: 3,
                numero: '0003456-78.2024.8.09.0003',
                titulo: 'Rescisão de Contrato de Trabalho',
                responsavel: 'Dr. Pedro Costa',
                prazo: '2024-12-20',
                status: 'aguardando'
            }
        ];
    }

    getTarefasDemo() {
        return [
            {
                id: 1,
                processoId: 1,
                titulo: 'Preparar petição inicial',
                descricao: 'Elaborar petição com documentos anexos',
                responsavel: 'Dr. João Silva',
                prazo: '2024-12-18',
                status: 'pendente'
            },
            {
                id: 2,
                processoId: 2,
                titulo: 'Audiência de conciliação',
                descricao: 'Comparecer à audiência no fórum',
                responsavel: 'Dra. Maria Santos',
                prazo: '2024-12-15',
                status: 'andamento'
            },
            {
                id: 3,
                processoId: 3,
                titulo: 'Análise de documentos',
                descricao: 'Revisar contratos e termos',
                responsavel: 'Dr. Pedro Costa',
                prazo: '2024-12-22',
                status: 'pendente'
            }
        ];
    }

    renderizarProcessos(processos) {
        const container = document.getElementById('lista-processos');
        container.innerHTML = '';

        processos.slice(0, 5).forEach(processo => {
            const div = document.createElement('div');
            div.className = 'processo-item';
            div.innerHTML = `
                <div class="processo-titulo">${processo.numero}</div>
                <div class="processo-titulo">${processo.titulo}</div>
                <div class="processo-meta">
                    <span>👤 ${processo.responsavel}</span>
                    <span>📅 ${this.formatarData(processo.prazo)}</span>
                    <span class="status status-${processo.status}">${processo.status}</span>
                </div>
            `;
            container.appendChild(div);
        });
    }

    renderizarTarefas(tarefas) {
        const container = document.getElementById('lista-tarefas');
        container.innerHTML = '';

        tarefas.slice(0, 5).forEach(tarefa => {
            const div = document.createElement('div');
            div.className = 'tarefa-item';
            div.innerHTML = `
                <div class="tarefa-titulo">${tarefa.titulo}</div>
                <div class="tarefa-meta">
                    <span>👤 ${tarefa.responsavel}</span>
                    <span>📅 ${this.formatarData(tarefa.prazo)}</span>
                    <span class="status status-${tarefa.status}">${tarefa.status}</span>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async carregarProcessosSelect() {
        try {
            const response = await fetch(`${this.apiUrl}/processos`);
            let processos;
            
            if (response.ok) {
                processos = await response.json();
            } else {
                processos = this.getProcessosDemo();
            }
            
            const select = document.getElementById('tarefa-processo');
            select.innerHTML = '<option value="">Selecione um processo</option>';
            
            processos.forEach(processo => {
                const option = document.createElement('option');
                option.value = processo.id;
                option.textContent = `${processo.numero} - ${processo.titulo}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar processos para select:', error);
        }
    }

    configurarEventos() {
        // Busca
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.buscar(e.target.value);
        });

        // Formulário de processo
        document.getElementById('form-processo').addEventListener('submit', (e) => {
            e.preventDefault();
            this.criarProcesso();
        });

        // Formulário de tarefa
        document.getElementById('form-tarefa').addEventListener('submit', (e) => {
            e.preventDefault();
            this.criarTarefa();
        });
    }

    async buscar(termo) {
        if (termo.length < 2) return;

        try {
            const response = await fetch(`${this.apiUrl}/buscar?q=${encodeURIComponent(termo)}`);
            
            if (response.ok) {
                const resultados = await response.json();
                console.log('Resultados da busca:', resultados);
                // Implementar exibição dos resultados
            }
        } catch (error) {
            console.error('Erro na busca:', error);
        }
    }

    async criarProcesso() {
        const dados = {
            numero: document.getElementById('processo-numero').value,
            titulo: document.getElementById('processo-titulo').value,
            responsavel: document.getElementById('processo-responsavel').value,
            prazo: document.getElementById('processo-prazo').value,
            status: 'andamento'
        };

        try {
            const response = await fetch(`${this.apiUrl}/processos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                alert('Processo criado com sucesso!');
                this.fecharModalProcesso();
                await this.carregarProcessos();
                await this.carregarDashboard();
                await this.carregarProcessosSelect();
            } else {
                alert('Erro ao criar processo');
            }
        } catch (error) {
            console.error('Erro ao criar processo:', error);
            alert('Erro ao criar processo');
        }
    }

    async criarTarefa() {
        const dados = {
            processoId: parseInt(document.getElementById('tarefa-processo').value),
            titulo: document.getElementById('tarefa-titulo').value,
            descricao: document.getElementById('tarefa-descricao').value,
            responsavel: document.getElementById('tarefa-responsavel').value,
            prazo: document.getElementById('tarefa-prazo').value,
            status: 'pendente'
        };

        try {
            const response = await fetch(`${this.apiUrl}/tarefas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                alert('Tarefa criada com sucesso!');
                this.fecharModalTarefa();
                await this.carregarTarefas();
                await this.carregarDashboard();
            } else {
                alert('Erro ao criar tarefa');
            }
        } catch (error) {
            console.error('Erro ao criar tarefa:', error);
            alert('Erro ao criar tarefa');
        }
    }

    formatarData(data) {
        const date = new Date(data);
        return date.toLocaleDateString('pt-BR');
    }

    fecharModalProcesso() {
        document.getElementById('modal-processo').style.display = 'none';
        document.getElementById('form-processo').reset();
    }

    fecharModalTarefa() {
        document.getElementById('modal-tarefa').style.display = 'none';
        document.getElementById('form-tarefa').reset();
    }
}

// Funções globais para os modais
function abrirModalProcesso() {
    document.getElementById('modal-processo').style.display = 'block';
}

function fecharModalProcesso() {
    sistema.fecharModalProcesso();
}

function abrirModalTarefa() {
    document.getElementById('modal-tarefa').style.display = 'block';
}

function fecharModalTarefa() {
    sistema.fecharModalTarefa();
}

// Inicializar o sistema quando a página carregar
let sistema;
document.addEventListener('DOMContentLoaded', () => {
    sistema = new SistemaJuridico();
});

// Fechar modais ao clicar fora
window.onclick = function(event) {
    const modalProcesso = document.getElementById('modal-processo');
    const modalTarefa = document.getElementById('modal-tarefa');
    
    if (event.target === modalProcesso) {
        modalProcesso.style.display = 'none';
    }
    if (event.target === modalTarefa) {
        modalTarefa.style.display = 'none';
    }
}
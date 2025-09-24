// Admin utilities - Use apenas para testes
const AdminUtils = {
    // Simular usuário pago (para testes)
    setPaidUser: function(email = 'admin@alisoftware.com.br', name = 'Admin Ali Software', plan = 'PLANO smart') {
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', name);
        localStorage.setItem('userFirm', 'Ali Software Jurídico LTDA');
        localStorage.setItem('paidUser', 'true');
        localStorage.setItem('currentPlan', plan);
        localStorage.setItem('paymentDate', new Date().toISOString());
        localStorage.removeItem('trialUser');
        localStorage.removeItem('trialStartDate');
        console.log('✅ Usuário pago definido com sucesso!');
        console.log('Email:', email);
        console.log('Nome:', name);
        console.log('Plano:', plan);
    },

    // Simular usuário em trial
    setTrialUser: function(email = 'trial@teste.com', name = 'Usuário Teste', days = 0) {
        const trialStart = new Date();
        trialStart.setDate(trialStart.getDate() - days); // Subtrair dias para simular
        
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', name);
        localStorage.setItem('userFirm', 'Escritório de Teste');
        localStorage.setItem('trialUser', 'true');
        localStorage.setItem('trialStartDate', trialStart.toISOString());
        localStorage.removeItem('paidUser');
        localStorage.removeItem('currentPlan');
        console.log('✅ Usuário trial definido com sucesso!');
        console.log('Email:', email);
        console.log('Dias de trial usado:', days);
        console.log('Restam:', 7 - days, 'dias');
    },

    // Limpar todos os dados
    clearUser: function() {
        localStorage.clear();
        console.log('🗑️ Todos os dados do usuário foram limpos!');
    },

    // Verificar status atual
    checkUserStatus: function() {
        const userLoggedIn = localStorage.getItem('userLoggedIn');
        const paidUser = localStorage.getItem('paidUser');
        const trialUser = localStorage.getItem('trialUser');
        const trialStart = localStorage.getItem('trialStartDate');
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        const currentPlan = localStorage.getItem('currentPlan');

        console.log('=== STATUS DO USUÁRIO ===');
        console.log('Logado:', userLoggedIn ? '✅' : '❌');
        console.log('Email:', userEmail || 'N/A');
        console.log('Nome:', userName || 'N/A');
        
        if (paidUser) {
            console.log('Tipo: 💰 USUÁRIO PAGO');
            console.log('Plano:', currentPlan || 'N/A');
        } else if (trialUser && trialStart) {
            const trialDate = new Date(trialStart);
            const currentDate = new Date();
            const daysDiff = Math.ceil((currentDate - trialDate) / (1000 * 60 * 60 * 24));
            const remaining = Math.max(0, 7 - daysDiff);
            
            console.log('Tipo: 🔄 USUÁRIO TRIAL');
            console.log('Dias usados:', daysDiff);
            console.log('Dias restantes:', remaining);
            console.log('Status:', remaining > 0 ? '✅ ATIVO' : '❌ EXPIRADO');
        } else {
            console.log('Tipo: 👤 USUÁRIO SEM PLANO');
        }
        
        console.log('========================');
    }
};

// Disponibilizar no console global para testes
if (typeof window !== 'undefined') {
    window.AdminUtils = AdminUtils;
}

console.log('🔧 Admin Utils carregado!');
console.log('Use no console:');
console.log('- AdminUtils.setPaidUser() - Simular usuário pago');
console.log('- AdminUtils.setTrialUser() - Simular usuário trial');
console.log('- AdminUtils.setTrialUser("email", "nome", 8) - Trial expirado');
console.log('- AdminUtils.checkUserStatus() - Ver status atual');
console.log('- AdminUtils.clearUser() - Limpar todos os dados');
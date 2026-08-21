import React, { useState, useEffect } from 'react';

interface Agendamento {
  id: string | number;
  cliente: string;
  servico: string;
  data: string;
  hora: string;
}

export function BarberAdminDashboard() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const buscarAgendamentos = async () => {
      try {
        setLoading(true);
        
        // 🌟 SEU BANCO DE DADOS REAL:
        // Caso seu app use Firebase, Supabase ou fetch local, a chamada deve ser recolocada aqui.
        // Exemplo: const response = await fetch('SUA_URL_AQUI'); const dados = await response.json();
        
        // Se você estivesse usando LocalStorage, descomente a linha abaixo:
        // const dados Guardados = localStorage.getItem('agendamentos');
        // const dados = dadosGuardados ? JSON.parse(dadosGuardados) : [];

        const dados: any = []; // ⚠️ Substitua esta linha vazia pela sua linha de dados original se souber qual é!

        if (!dados || !Array.isArray(dados)) {
          setAgendamentos([]);
          return;
        }

        const agendamentosFiltrados = dados.filter((item, index, self) =>
          item && item.id && index === self.findIndex((t) => t && t.id === item.id)
        );

        setAgendamentos(agendamentosFiltrados);
      } catch (err) {
        setError('Falha ao carregar agendamentos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    buscarAgendamentos();
  }, []);

  if (loading) return <div style={{ padding: '20px', color: '#fff' }}>Carregando painel do administrador...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      <h2>Painel de Agendamentos do Barbeiro</h2>
      
      {/* Se a lista estiver vazia, mostra o aviso, mas NÃO esconde o resto do painel */}
      {!agendamentos || agendamentos.length === 0 ? (
        <div style={{ marginTop: '30px', padding: '20px', background: '#1e1e24', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#ccc' }}>📅 Nenhum agendamento encontrado no momento.</p>
          <p style={{ fontSize: '14px', color: '#777' }}>Os novos horários marcados pelos clientes aparecerão nesta tela automaticamente.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#1e1e24' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', background: '#2a2a32' }}>
                <th style={{ padding: '12px' }}>Cliente</th>
                <th style={{ padding: '12px' }}>Serviço</th>
                <th style={{ padding: '12px' }}>Data</th>
                <th style={{ padding: '12px' }}>Horário</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((item, index) => (
                <tr key={`admin-item-${item?.id || index}-${index}`} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '12px' }}>{item?.cliente || 'Não informado'}</td>
                  <td style={{ padding: '12px' }}>{item?.servico || 'Não informado'}</td>
                  <td style={{ padding: '12px' }}>{item?.data || '---'}</td>
                  <td style={{ padding: '12px' }}>{item?.hora || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BarberAdminDashboard;

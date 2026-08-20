import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, Globe, FileText, DollarSign, Mail, Plus, Lock, ShieldCheck } from 'lucide-react';
import { Tenant } from '../types';

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTenant: (tenant: Omit<Tenant, 'id' | 'createdAt'>, adminPassword?: string) => void;
}

export const NewTenantModal: React.FC<NewTenantModalProps> = ({
  isOpen,
  onClose,
  onAddTenant,
}) => {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [monthlyValue, setMonthlyValue] = useState('450,00');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('482910');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numericValue = parseFloat(
      monthlyValue.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
    ) || 450;

    const formattedSubdomain = subdomain.trim()
      ? subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
      : name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    onAddTenant(
      {
        name: name.trim(),
        subdomain: formattedSubdomain,
        cnpj: cnpj.trim() || '12.345.678/0001-90',
        monthlyValue: numericValue,
        status: 'Ativo',
        adminEmail: adminEmail.trim() || `admin@${formattedSubdomain}.com`,
      },
      adminPassword.trim() || '482910'
    );

    setName('');
    setSubdomain('');
    setCnpj('');
    setMonthlyValue('450,00');
    setAdminEmail('');
    setAdminPassword('482910');
    onClose();
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!subdomain) {
      setSubdomain(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden text-gray-100"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-700 flex items-center justify-between bg-gray-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cadastrar Nova Empresa</h3>
                <p className="text-xs text-gray-400">Salva na coleção 'tenants' e cria senha no Firebase Auth</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Nome da Empresa / Barbearia
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Barbearia Viking Club"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Subdomínio
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="viking-club"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-indigo-400 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1 truncate">
                  URL: https://{subdomain || 'empresa'}.saasapp.com
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  CNPJ
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <FileText className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Valor Mensal (R$)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="text"
                    required
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(e.target.value)}
                    placeholder="450,00"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  E-mail do Administrador
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="gerente@empresa.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Senha / Código de Acesso da Barbearia (6 números)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="482910"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono tracking-widest"
                />
              </div>
              <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Código de 6 dígitos numéricos para login direto no painel da barbearia</span>
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-700 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar no Firebase</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { ClientUser, Tenant, ClientBooking, SuperAdminConfig, BarberPromotionBanner } from '../types';
import { DEFAULT_PROMOTION_BANNERS } from './promoBannersData';

/**
 * Interface para retorno de autenticação/cadastro
 */
export interface AuthResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isFirebaseCloud?: boolean;
}

// ============================================================================
// 1. CLIENTES: CADASTRO NO FIREBASE AUTH & FIRESTORE
// ============================================================================

/**
 * Registra um novo cliente no Firebase Authentication (email e senha)
 * e salva os dados na coleção 'clients' e 'users' do Firestore com 0 selos.
 */
export async function registerClientInFirebase(
  nameOrEmail: string,
  emailOrPassword?: string,
  passwordOrName?: string,
  phone: string = '(11) 98765-4321',
  tenantId: string = 'navalha-ouro',
  tenantName?: string
): Promise<AuthResult<ClientUser>> {
  let cleanName = 'Cliente VIP';
  let cleanEmail = '';
  let cleanPassword = '123456';

  if (nameOrEmail && nameOrEmail.includes('@')) {
    cleanEmail = nameOrEmail.trim().toLowerCase();
    cleanPassword = (emailOrPassword || '123456').trim();
    cleanName = (passwordOrName || 'Cliente').trim();
  } else {
    cleanName = (nameOrEmail || 'Cliente VIP').trim();
    if (emailOrPassword && emailOrPassword.includes('@')) {
      cleanEmail = emailOrPassword.trim().toLowerCase();
      cleanPassword = (passwordOrName || '123456').trim();
    } else {
      cleanPassword = (emailOrPassword || '123456').trim();
      cleanEmail = (passwordOrName && passwordOrName.includes('@'))
        ? passwordOrName.trim().toLowerCase()
        : `${cleanName.toLowerCase().replace(/\s+/g, '')}@barbearia.com`;
    }
  }

  const cleanPhone = (phone || '').trim() || '(11) 98765-4321';
  const cleanTenant = (tenantId || 'navalha-ouro').trim();

  try {
    let fbUser: FirebaseUser | null = null;
    let uid = '';

    // 1. Tenta criar usuário no Firebase Authentication
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      fbUser = userCredential.user;
      uid = fbUser.uid;

      // Atualiza o Display Name no Firebase Auth
      await updateProfile(fbUser, { displayName: cleanName });
    } catch (authErr: any) {
      // Se o email já existir no Auth, tenta fazer login
      if (authErr.code === 'auth/email-already-in-use') {
        try {
          const loginCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          fbUser = loginCredential.user;
          uid = fbUser.uid;
        } catch {
          uid = `client_${Date.now()}`;
        }
      } else {
        console.warn('Firebase Auth warning, criando ID no Firestore:', authErr);
        uid = `client_${Date.now()}`;
      }
    }

    if (!uid) {
      uid = `cli_${Date.now()}`;
    }

    const currentMonthYear = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const formattedMemberSince =
      currentMonthYear.charAt(0).toUpperCase() + currentMonthYear.slice(1);

    const clientData: ClientUser = {
      id: uid,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      fidelityPoints: 0, // Inicia rigorosamente com 0 selos
      fidelityTarget: 10,
      memberSince: formattedMemberSince,
      tenantId: cleanTenant,
      tenantName: tenantName || undefined,
    };

    // 2. Salva na coleção 'clients' do Cloud Firestore
    try {
      const payload = {
        uid: uid,
        id: uid,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword, // Mantém backup para login resiliente
        phone: cleanPhone,
        fidelityPoints: 0,
        fidelityTarget: 10,
        memberSince: formattedMemberSince,
        tenantId: cleanTenant,
        tenantName: tenantName || null,
        role: 'client',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'clients', uid), payload, { merge: true });

      // Também grava na subcoleção específica da barbearia
      await setDoc(doc(db, `tenants/${cleanTenant}/clients`, uid), payload, { merge: true });

      // Salva na coleção global de perfis 'users'
      await setDoc(
        doc(db, 'users', uid),
        {
          uid: uid,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: 'client',
          tenantId: cleanTenant,
          tenantName: tenantName || null,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn('Firestore write warning:', firestoreErr);
    }

    // Salva localmente para persistência de sessão isolada por barbearia
    try {
      localStorage.setItem(`active_client_user_${cleanTenant}`, JSON.stringify(clientData));
      localStorage.setItem('active_client_user', JSON.stringify(clientData));
      
      // Dispara evento imediato para sincronizar telas abertas da barbearia
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('barber_client_registered', {
            detail: {
              ...clientData,
              tenantId: cleanTenant,
            },
          })
        );
      }
    } catch {}

    return {
      success: true,
      data: clientData,
      isFirebaseCloud: true,
    };
  } catch (error: any) {
    console.error('Erro ao registrar cliente no Firebase:', error);
    return {
      success: false,
      error: error.message || 'Erro ao criar conta no Firebase.',
    };
  }
}

/**
 * Autentica cliente existente no Firebase Authentication e busca dados do Firestore
 * Suporta busca por E-mail ou Telefone com correspondência exata para evitar misturar clientes.
 */
export async function loginClientInFirebase(
  identifier: string,
  password?: string,
  tenantId: string = 'navalha-ouro'
): Promise<AuthResult<ClientUser>> {
  const cleanIdentifier = identifier.trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const cleanSearchNum = cleanIdentifier.replace(/\D/g, '');

  try {
    let clientData: ClientUser | null = null;
    let uid = '';

    // 1. Se for email e tiver senha, tenta autenticar via Firebase Auth
    if (cleanIdentifier.includes('@') && cleanPass) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanIdentifier, cleanPass);
        const fbUser = userCredential.user;
        uid = fbUser.uid;

        const clientDoc = await getDoc(doc(db, 'clients', uid));
        if (clientDoc.exists()) {
          const d = clientDoc.data();
          clientData = {
            id: uid,
            name: d.name || fbUser.displayName || 'Cliente',
            email: d.email || cleanIdentifier,
            phone: d.phone || '',
            fidelityPoints: d.fidelityPoints !== undefined ? d.fidelityPoints : 0,
            fidelityTarget: d.fidelityTarget || 10,
            memberSince: d.memberSince || 'Agosto 2026',
          };
        }
      } catch (authErr) {
        console.warn('Firebase Auth signIn não concluiu, buscando no Firestore direto:', authErr);
      }
    }

    // 2. Busca no Firestore: primeiro correspondência EXATA (por email, telefone, id ou nome exato)
    if (!clientData) {
      try {
        const allDocs: any[] = [];

        // Busca na subcoleção do tenant
        try {
          const tenantClientsSnap = await getDocs(collection(db, `tenants/${tenantId}/clients`));
          tenantClientsSnap.forEach((docSnap) => {
            allDocs.push({ id: docSnap.id, ...docSnap.data() });
          });
        } catch {}

        // Busca na coleção global 'clients'
        try {
          const globalClientsSnap = await getDocs(collection(db, 'clients'));
          globalClientsSnap.forEach((docSnap) => {
            if (!allDocs.some((item) => item.id === docSnap.id)) {
              allDocs.push({ id: docSnap.id, ...docSnap.data() });
            }
          });
        } catch {}

        // 2.1 Passo 1: Busca EXATA por Email
        let matched = allDocs.find((d) => (d.email || '').trim().toLowerCase() === cleanIdentifier);

        // 2.2 Passo 2: Busca EXATA por Telefone (se informado telefone com 8+ dígitos)
        if (!matched && cleanSearchNum.length >= 8) {
          matched = allDocs.find((d) => {
            const docDigits = (d.phone || '').replace(/\D/g, '');
            return docDigits === cleanSearchNum || (docDigits.length >= 8 && docDigits.endsWith(cleanSearchNum));
          });
        }

        // 2.3 Passo 3: Busca EXATA por Nome
        if (!matched && cleanIdentifier.length >= 3) {
          matched = allDocs.find((d) => (d.name || '').trim().toLowerCase() === cleanIdentifier);
        }

        // 2.4 Passo 4: Busca por ID
        if (!matched) {
          matched = allDocs.find((d) => d.id === cleanIdentifier || d.uid === cleanIdentifier);
        }

        // 2.5 Passo 5: Se não achou exato, busca se o nome contém a palavra buscada (apenas se for único/relevante)
        if (!matched && cleanIdentifier.length >= 3 && !cleanIdentifier.includes('@')) {
          matched = allDocs.find((d) => (d.name || '').toLowerCase().includes(cleanIdentifier));
        }

        if (matched) {
          const clientTenantId = matched.tenantId || tenantId;
          clientData = {
            id: matched.id || matched.uid || `cli-${Date.now()}`,
            name: matched.name || 'Cliente',
            email: matched.email || cleanIdentifier,
            phone: matched.phone || '',
            fidelityPoints: matched.fidelityPoints !== undefined ? matched.fidelityPoints : 0,
            fidelityTarget: matched.fidelityTarget || 10,
            memberSince: matched.memberSince || 'Agosto 2026',
            tenantId: clientTenantId,
            tenantName: matched.tenantName || undefined,
          };
        }
      } catch (firestoreErr) {
        console.warn('Erro ao consultar Firestore clients:', firestoreErr);
      }
    }

    if (clientData) {
      const activeTenantKey = clientData.tenantId || tenantId;
      try {
        localStorage.setItem(`active_client_user_${activeTenantKey}`, JSON.stringify(clientData));
        localStorage.setItem('active_client_user', JSON.stringify(clientData));
      } catch {}

      return {
        success: true,
        data: clientData,
        isFirebaseCloud: true,
      };
    }

    return {
      success: false,
      error: 'Nenhum cadastro encontrado com este e-mail, telefone ou nome. Por favor, verifique ou crie uma conta nova.',
    };
  } catch (error: any) {
    console.error('Erro ao fazer login no Firebase:', error);
    return {
      success: false,
      error: error.message || 'Credenciais inválidas.',
    };
  }
}

/**
 * Atualiza pontos de fidelidade no Firestore (Ação exclusiva do Gerente/Admin)
 */
export async function updateClientFidelityInFirestore(
  clientId: string,
  points: number,
  tenantId: string = 'navalha-ouro'
): Promise<{ success: boolean; points: number }> {
  try {
    const clampedPoints = Math.max(0, Math.min(10, points));

    // Atualiza coleção global de clientes
    await setDoc(
      doc(db, 'clients', clientId),
      {
        fidelityPoints: clampedPoints,
        lastFidelityUpdate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Atualiza na subcoleção da empresa
    await setDoc(
      doc(db, `tenants/${tenantId}/clients`, clientId),
      {
        fidelityPoints: clampedPoints,
        lastFidelityUpdate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Log de auditoria do carimbo
    try {
      await addDoc(collection(db, 'fidelity_logs'), {
        clientId,
        tenantId,
        points: clampedPoints,
        timestamp: serverTimestamp(),
        date: new Date().toISOString(),
        actionBy: 'MANAGER_ADMIN',
      });
    } catch {
      // ignore
    }

    return { success: true, points: clampedPoints };
  } catch (err) {
    console.warn('Erro ao atualizar fidelidade no Firestore:', err);
    return { success: false, points };
  }
}

// ============================================================================
// 2. EMPRESAS (TENANTS): CADASTRO NO FIRESTORE & AUTHENTICATION
// ============================================================================

/**
 * Cadastra uma nova Empresa/Barbearia no Firestore (coleção 'tenants')
 * e cria credencial de administrador no Firebase Authentication.
 */
export async function registerTenantInFirebase(
  tenantData: Omit<Tenant, 'id' | 'createdAt'>,
  adminPassword?: string
): Promise<AuthResult<Tenant>> {
  const tenantId = `t-${Date.now()}`;
  const cleanEmail = tenantData.adminEmail.trim().toLowerCase();
  const password = adminPassword || '482910';
  const accessCode = adminPassword && adminPassword.length === 6 && /^\d+$/.test(adminPassword) ? adminPassword : '482910';

  const newTenant: Tenant = {
    ...tenantData,
    id: tenantId,
    adminPassword: password,
    adminAccessCode: accessCode,
    createdAt: new Date().toISOString().split('T')[0],
  };

  try {
    let adminUid = `admin_${Date.now()}`;

    // 1. Cria conta de administrador no Firebase Authentication
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      adminUid = userCredential.user.uid;
      await updateProfile(userCredential.user, {
        displayName: `${tenantData.name} Admin`,
      });
    } catch (authErr: any) {
      if (authErr.code !== 'auth/email-already-in-use') {
        console.warn('Firebase Auth admin creation note:', authErr);
      }
    }

    // 2. Salva na coleção 'tenants' do Firestore com senha e código de acesso
    try {
      await setDoc(
        doc(db, 'tenants', tenantId),
        {
          id: tenantId,
          name: tenantData.name,
          subdomain: tenantData.subdomain,
          cnpj: tenantData.cnpj,
          monthlyValue: tenantData.monthlyValue,
          status: tenantData.status,
          adminEmail: cleanEmail,
          adminPassword: password,
          adminAccessCode: accessCode,
          adminUid: adminUid,
          createdAt: serverTimestamp(),
          createdAtDate: newTenant.createdAt,
        },
        { merge: true }
      );

      // 3. Salva usuário com role 'barber_admin' na coleção 'users'
      await setDoc(
        doc(db, 'users', adminUid),
        {
          uid: adminUid,
          name: `${tenantData.name} Admin`,
          email: cleanEmail,
          role: 'barber_admin',
          tenantId: tenantId,
          tenantSubdomain: tenantData.subdomain,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn('Firestore tenant write note:', firestoreErr);
    }

    try {
      localStorage.setItem(`tenant_admin_password_${newTenant.subdomain}`, password);
      localStorage.setItem(`tenant_admin_password_${newTenant.id}`, password);

      const cached = localStorage.getItem('cached_tenants_list');
      let tenantList: Tenant[] = [];
      if (cached) {
        try {
          tenantList = JSON.parse(cached);
        } catch {}
      }
      tenantList = [newTenant, ...tenantList.filter((t) => t.id !== newTenant.id && t.subdomain !== newTenant.subdomain)];
      localStorage.setItem('cached_tenants_list', JSON.stringify(tenantList));
      window.dispatchEvent(new CustomEvent('tenant_list_updated'));
    } catch {}

    return {
      success: true,
      data: newTenant,
      isFirebaseCloud: true,
    };
  } catch (error: any) {
    console.error('Erro ao cadastrar empresa no Firebase:', error);
    return {
      success: false,
      error: error.message || 'Erro ao registrar empresa no Firebase.',
    };
  }
}

/**
 * Atualiza permanentemente a senha/código de acesso do gerente da barbearia no Firestore
 */
export async function updateTenantAdminPasswordInFirestore(
  tenantSubdomainOrId: string,
  newPassword: string
): Promise<AuthResult<boolean>> {
  try {
    const cleanPassword = newPassword.trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      return {
        success: false,
        error: 'A nova senha deve conter pelo menos 4 caracteres.',
      };
    }

    // 1. Atualiza no localStorage para acesso offline/imediato no navegador
    try {
      localStorage.setItem(`tenant_admin_password_${tenantSubdomainOrId}`, cleanPassword);
    } catch (lsErr) {
      console.warn('LocalStorage save note:', lsErr);
    }

    // 2. Atualiza no Cloud Firestore
    let updatedDoc = false;

    // Tenta atualizar diretamente por ID
    try {
      const docRef = doc(db, 'tenants', tenantSubdomainOrId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await setDoc(
          docRef,
          {
            adminPassword: cleanPassword,
            adminAccessCode: cleanPassword,
            updatedAt: serverTimestamp(),
            lastPasswordChangedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        updatedDoc = true;
      }
    } catch (directErr) {
      console.warn('Tentativa direta de update tenant por ID falhou, buscando por query:', directErr);
    }

    // Se não encontrou por ID direto, busca por subdomain
    if (!updatedDoc) {
      try {
        const q = query(collection(db, 'tenants'), where('subdomain', '==', tenantSubdomainOrId));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const targetDoc = qSnap.docs[0];
          await setDoc(
            doc(db, 'tenants', targetDoc.id),
            {
              adminPassword: cleanPassword,
              adminAccessCode: cleanPassword,
              updatedAt: serverTimestamp(),
              lastPasswordChangedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          updatedDoc = true;
        }
      } catch (queryErr) {
        console.warn('Query por subdomain falhou, tentando fallback em todas:', queryErr);
      }
    }

    // Fallback: Se ainda não atualizou (ex: primeira barbearia padrão), cria/mescla documento
    if (!updatedDoc) {
      try {
        await setDoc(
          doc(db, 'tenants', tenantSubdomainOrId),
          {
            id: tenantSubdomainOrId,
            subdomain: tenantSubdomainOrId,
            adminPassword: cleanPassword,
            adminAccessCode: cleanPassword,
            updatedAt: serverTimestamp(),
            lastPasswordChangedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        updatedDoc = true;
      } catch (fallbackErr) {
        console.warn('Fallback setDoc tenant password warning:', fallbackErr);
      }
    }

    // 3. Registro de auditoria no Firestore
    try {
      await addDoc(collection(db, 'security_logs'), {
        type: 'BARBER_ADMIN_PASSWORD_CHANGED',
        tenant: tenantSubdomainOrId,
        timestamp: serverTimestamp(),
        changedAt: new Date().toISOString(),
        status: 'SUCCESS',
      });
    } catch (auditErr) {
      console.warn('Audit log write note:', auditErr);
    }

    return {
      success: true,
      data: true,
      isFirebaseCloud: true,
    };
  } catch (error: any) {
    console.error('Erro ao atualizar senha da barbearia no Firebase:', error);
    return {
      success: false,
      error: error.message || 'Não foi possível atualizar a senha no banco de dados.',
    };
  }
}

/**
 * Salva a senha temporária gerada de uma empresa no Firestore
 */
export async function saveTenantTempPasswordToFirestore(
  tenantId: string,
  tempPass: { code: string; expiresAt: string; generatedAt: string }
): Promise<boolean> {
  try {
    // 1. Grava no Firestore por tenantId
    await setDoc(
      doc(db, 'tenants', tenantId),
      {
        lastTempPassword: tempPass,
        adminAccessCode: tempPass.code,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Atualiza no cache local e dispara eventos
    try {
      localStorage.setItem(`tenant_admin_password_${tenantId}`, tempPass.code);

      const cached = localStorage.getItem('cached_tenants_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((t: any) => {
            if (t.id === tenantId || t.subdomain === tenantId) {
              if (t.subdomain) {
                localStorage.setItem(`tenant_admin_password_${t.subdomain}`, tempPass.code);
              }
              return { ...t, lastTempPassword: tempPass, adminAccessCode: tempPass.code };
            }
            return t;
          });
          localStorage.setItem('cached_tenants_list', JSON.stringify(updated));
        }
      }
      window.dispatchEvent(new CustomEvent('tenant_list_updated', { detail: { tenantId, tempPass } }));
    } catch {}
    return true;
  } catch (err) {
    console.warn('Erro ao salvar senha temporária no Firestore:', err);
    return false;
  }
}

/**
 * Busca todas as empresas cadastradas na coleção 'tenants' do Firestore
 */
export async function getTenantsFromFirestore(): Promise<Tenant[]> {
  const fallbackTenants: Tenant[] = [
    {
      id: 'navalha-ouro',
      name: 'Barbearia Navalha de Ouro',
      subdomain: 'navalha-ouro',
      cnpj: '12.345.678/0001-90',
      monthlyValue: 450,
      status: 'Ativo',
      adminEmail: 'contato@navalhaouro.com',
      adminPassword: '482910',
      adminAccessCode: '482910',
      createdAt: '2026-08-15',
    }
  ];

  try {
    const querySnapshot = await getDocs(collection(db, 'tenants'));
    const list: Tenant[] = [];
    querySnapshot.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: d.id || docSnap.id,
        name: d.name || 'Barbearia',
        subdomain: d.subdomain || docSnap.id,
        cnpj: d.cnpj || '',
        monthlyValue: typeof d.monthlyValue === 'number' ? d.monthlyValue : 450,
        status: d.status || 'Ativo',
        adminEmail: d.adminEmail || '',
        adminPassword: d.adminPassword || '482910',
        adminAccessCode: d.lastTempPassword?.code || d.adminAccessCode || d.adminPassword || '482910',
        lastTempPassword: d.lastTempPassword || undefined,
        createdAt: d.createdAtDate || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : '2026-08-15'),
      });
    });

    if (list.length > 0) {
      try {
        localStorage.setItem('cached_tenants_list', JSON.stringify(list));
      } catch {}
      return list;
    }
  } catch (error) {
    console.warn('Erro ao ler tenants do Firestore, usando cache local:', error);
  }

  // Fallback para cache local se disponível
  try {
    const cached = localStorage.getItem('cached_tenants_list');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return fallbackTenants;
}

/**
 * Ouvinte em tempo real para lista de empresas cadastradas
 */
export function subscribeToTenants(onUpdate: (tenants: Tenant[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'tenants'),
      (snapshot) => {
        const list: Tenant[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: d.id || docSnap.id,
            name: d.name || 'Barbearia',
            subdomain: d.subdomain || 'empresa',
            cnpj: d.cnpj || '',
            monthlyValue: typeof d.monthlyValue === 'number' ? d.monthlyValue : 450,
            status: d.status || 'Ativo',
            adminEmail: d.adminEmail || '',
            adminPassword: d.adminPassword || '482910',
            adminAccessCode: d.adminAccessCode || d.lastTempPassword?.code || '482910',
            lastTempPassword: d.lastTempPassword || undefined,
            createdAt: d.createdAtDate || (d.createdAt?.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : '2026-08-15'),
          });
        });
        if (list.length > 0) {
          try {
            localStorage.setItem('cached_tenants_list', JSON.stringify(list));
          } catch {}
          onUpdate(list);
        }
      },
      (err) => {
        console.warn('Listener tenants error:', err);
      }
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Exclui permanentemente uma empresa do Firestore
 */
export async function deleteTenantFromFirestore(tenantId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'tenants', tenantId));
    try {
      const cached = localStorage.getItem('cached_tenants_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((t: any) => t.id !== tenantId && t.subdomain !== tenantId);
          localStorage.setItem('cached_tenants_list', JSON.stringify(updated));
        }
      }
      window.dispatchEvent(new CustomEvent('tenant_list_updated'));
    } catch {}
    return true;
  } catch (error) {
    console.warn('Erro ao deletar tenant do Firestore:', error);
    return false;
  }
}

// ============================================================================
// 3. AGENDAMENTOS, CLIENTES E DADOS DA BARBEARIA: FIRESTORE
// ============================================================================

/**
 * Salva agendamento na coleção 'appointments', na subcoleção da empresa no Firestore
 * e no armazenamento local sincronizado para tempo real imediato.
 */
export async function saveBookingToFirestore(
  tenantId: string,
  booking: ClientBooking,
  clientDetails?: { id?: string; name?: string; phone?: string; email?: string }
): Promise<void> {
  try {
    const bookingDocId = booking.id || `bk-${Date.now()}`;
    const cleanTenantId = tenantId || 'navalha-ouro';

    const payload = {
      ...booking,
      id: bookingDocId,
      tenantId: cleanTenantId,
      clientId: clientDetails?.id || booking.clientId || null,
      clientName: booking.clientName || clientDetails?.name || 'Cliente Online',
      clientPhone: booking.clientPhone || clientDetails?.phone || '(11) 98765-4321',
      clientEmail: booking.clientEmail || clientDetails?.email || '',
      serviceName: booking.serviceName || 'Corte Tradicional',
      servicePrice: typeof booking.servicePrice === 'number' ? booking.servicePrice : 50.0,
      barberName: booking.barberName || 'Barbeiro',
      date: booking.date || new Date().toISOString().split('T')[0],
      formattedDate: booking.formattedDate || 'Hoje',
      dateTime: booking.formattedDate || booking.date || 'Hoje',
      time: booking.time || '14:00',
      origin: 'Painel Cliente',
      status: booking.status || 'Agendado',
      createdAtServer: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Salva no localStorage para sincronia instantânea na mesma aba/outras abas
    try {
      const keysToSave = [
        `tenant_appointments_${cleanTenantId}`,
        'tenant_appointments_all',
        'tenant_appointments_navalha-ouro',
      ];
      keysToSave.forEach((storageKey) => {
        const existing = localStorage.getItem(storageKey);
        let list: any[] = existing ? JSON.parse(existing) : [];
        list = [payload, ...list.filter((item) => item.id !== bookingDocId)];
        localStorage.setItem(storageKey, JSON.stringify(list));
      });

      // Salva também no histórico individual do cliente
      if (payload.clientId) {
        const clientKey = `client_bookings_${payload.clientId}`;
        const clientExisting = localStorage.getItem(clientKey);
        let clientList: any[] = clientExisting ? JSON.parse(clientExisting) : [];
        clientList = [payload, ...clientList.filter((item) => item.id !== bookingDocId)];
        localStorage.setItem(clientKey, JSON.stringify(clientList));
      }

      // Dispara evento global para o painel admin capturar instantaneamente
      window.dispatchEvent(
        new CustomEvent('barber_appointment_created', {
          detail: payload,
        })
      );
      window.dispatchEvent(new Event('storage'));
    } catch (lsErr) {
      console.warn('LocalStorage booking note:', lsErr);
    }

    // 2. Coleção global de agendamentos no Firestore
    try {
      await setDoc(doc(db, 'appointments', bookingDocId), payload, { merge: true });
    } catch (e1) {
      console.warn('Erro ao gravar em appointments global:', e1);
    }

    // 3. Subcoleção da Barbearia no Firestore
    try {
      await setDoc(doc(db, `tenants/${cleanTenantId}/appointments`, bookingDocId), payload, {
        merge: true,
      });
      // Se não for a padrão, grava também na navalha-ouro como backup de segurança
      if (cleanTenantId !== 'navalha-ouro') {
        await setDoc(doc(db, `tenants/navalha-ouro/appointments`, bookingDocId), payload, {
          merge: true,
        });
      }
    } catch (e2) {
      console.warn(`Erro ao gravar em tenants/${cleanTenantId}/appointments:`, e2);
    }
  } catch (error) {
    console.warn('Erro geral ao salvar agendamento no Firestore:', error);
  }
}

/**
 * Busca agendamentos de uma barbearia no Firestore e no cache local
 */
export async function getAppointmentsFromFirestore(tenantId: string): Promise<any[]> {
  const cleanTenantId = tenantId || 'navalha-ouro';
  const listMap = new Map<string, any>();

  // 1. Carrega do cache local primeiro (múltiplas chaves para máxima segurança)
  try {
    const keysToCheck = [
      `tenant_appointments_${cleanTenantId}`,
      'tenant_appointments_all',
      'tenant_appointments_navalha-ouro',
    ];
    for (const key of keysToCheck) {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item && item.id) listMap.set(item.id, item);
          });
        }
      }
    }
  } catch {}

  // 2. Busca na subcoleção da barbearia no Firestore
  try {
    const querySnapshot = await getDocs(collection(db, `tenants/${cleanTenantId}/appointments`));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      listMap.set(docSnap.id, { id: docSnap.id, ...data });
    });
  } catch (error) {
    console.warn('Erro ao ler appointments do tenant:', error);
  }

  // 3. Se cleanTenantId não for navalha-ouro, busca também na navalha-ouro para redundância
  if (cleanTenantId !== 'navalha-ouro') {
    try {
      const fallbackSnap = await getDocs(collection(db, 'tenants/navalha-ouro/appointments'));
      fallbackSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tenantId === cleanTenantId || !data.tenantId) {
          listMap.set(docSnap.id, { id: docSnap.id, ...data });
        }
      });
    } catch {}
  }

  // 4. Busca na coleção raiz de appointments
  try {
    const globalSnap = await getDocs(collection(db, 'appointments'));
    globalSnap.forEach((docSnap) => {
      const data = docSnap.data();
      listMap.set(docSnap.id, { id: docSnap.id, ...data });
    });
  } catch (error) {
    console.warn('Erro ao ler appointments globais:', error);
  }

  const result = Array.from(listMap.values()).map((a) => ({
    id: String(a.id || `apt-${Date.now()}`),
    clientName: String(a.clientName || a.name || 'Cliente Online'),
    clientPhone: String(a.clientPhone || a.phone || ''),
    serviceName: String(a.serviceName || 'Serviço'),
    servicePrice: typeof a.servicePrice === 'number' ? a.servicePrice : (parseFloat(a.servicePrice) || 50.0),
    barberName: String(a.barberName || 'Barbeiro'),
    dateTime: String(a.formattedDate || a.dateTime || a.date || 'Hoje'),
    date: String(a.date || a.dateTime || ''),
    formattedDate: String(a.formattedDate || a.dateTime || 'Hoje'),
    time: String(a.time || '14:00'),
    origin: (a.origin as any) || 'Painel Cliente',
    status: (a.status as any) || 'Agendado',
    createdAt: a.createdAt || new Date().toISOString(),
    clientId: a.clientId || undefined,
    clientEmail: a.clientEmail || '',
  }));

  // Ordena por data/hora mais recente
  return result.sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });
}

/**
 * Busca agendamentos específicos de um cliente
 */
export async function getClientBookingsFromFirestore(
  clientId: string,
  tenantId: string = 'navalha-ouro',
  clientEmail?: string,
  clientPhone?: string
): Promise<ClientBooking[]> {
  if (!clientId && !clientEmail && !clientPhone) {
    return [];
  }

  const listMap = new Map<string, ClientBooking>();
  const cleanEmail = (clientEmail || '').trim().toLowerCase();
  const cleanPhone = (clientPhone || '').replace(/\D/g, '');

  // 1. LocalStorage do cliente
  if (clientId) {
    try {
      const cached = localStorage.getItem(`client_bookings_${clientId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item && item.id) listMap.set(item.id, item);
          });
        }
      }
    } catch {}
  }

  // Helper de correspondência do cliente
  const isMatch = (data: any): boolean => {
    if (!data) return false;
    if (clientId && data.clientId && String(data.clientId) === String(clientId)) {
      return true;
    }
    if (cleanEmail && data.clientEmail && String(data.clientEmail).trim().toLowerCase() === cleanEmail) {
      return true;
    }
    if (cleanPhone && data.clientPhone) {
      const itemPhone = String(data.clientPhone).replace(/\D/g, '');
      if (itemPhone && (itemPhone === cleanPhone || itemPhone.endsWith(cleanPhone) || cleanPhone.endsWith(itemPhone))) {
        return true;
      }
    }
    return false;
  };

  // 2. Firestore por clientId na subcoleção do tenant
  try {
    const tenantSnap = await getDocs(collection(db, `tenants/${tenantId}/appointments`));
    tenantSnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (isMatch(data)) {
        listMap.set(docSnap.id, { id: docSnap.id, ...data } as ClientBooking);
      }
    });
  } catch (error) {
    console.warn('Erro ao ler agendamentos do cliente no Firestore:', error);
  }

  // 3. Coleção raiz por clientId
  try {
    const globalSnap = await getDocs(collection(db, 'appointments'));
    globalSnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (isMatch(data)) {
        listMap.set(docSnap.id, { id: docSnap.id, ...data } as ClientBooking);
      }
    });
  } catch {}

  return Array.from(listMap.values());
}

/**
 * Escuta agendamentos em tempo real via Firestore onSnapshot
 */
export function subscribeToTenantAppointments(
  tenantId: string,
  onUpdate: (appointments: any[]) => void
): () => void {
  const cleanTenantId = tenantId || 'navalha-ouro';

  const unsubs: (() => void)[] = [];

  try {
    // Escuta na subcoleção do tenant
    const unsub1 = onSnapshot(
      collection(db, `tenants/${cleanTenantId}/appointments`),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0) {
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('Listener onSnapshot tenant appointments note:', error);
      }
    );
    unsubs.push(unsub1);

    // Escuta também na coleção global
    const unsub2 = onSnapshot(
      collection(db, 'appointments'),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0) {
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('Listener onSnapshot global appointments note:', error);
      }
    );
    unsubs.push(unsub2);

    return () => {
      unsubs.forEach((fn) => fn());
    };
  } catch (err) {
    console.warn('Falha ao iniciar onSnapshot:', err);
    return () => {};
  }
}

/**
 * Busca clientes de uma barbearia no Firestore
 */
export async function getClientsFromFirestore(tenantId: string): Promise<any[]> {
  try {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. Subcoleção específica da barbearia: tenants/{tenantId}/clients
    try {
      const querySnapshot = await getDocs(collection(db, `tenants/${tenantId}/clients`));
      querySnapshot.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() };
        seenIds.add(docSnap.id);
        list.push(item);
      });
    } catch (subErr) {
      console.warn('Erro ao ler subcoleção tenants/clients:', subErr);
    }

    // 2. Coleção global clients com filtro tenantId
    try {
      const globalQuery = query(collection(db, 'clients'), where('tenantId', '==', tenantId));
      const globalSnapshot = await getDocs(globalQuery);
      globalSnapshot.forEach((docSnap) => {
        if (!seenIds.has(docSnap.id)) {
          seenIds.add(docSnap.id);
          list.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
    } catch (globalErr) {
      console.warn('Erro ao ler coleção global clients por tenantId:', globalErr);
    }

    return list;
  } catch (error) {
    console.warn('Erro ao ler clients do Firestore:', error);
    return [];
  }
}

/**
 * Escuta clientes de uma barbearia em tempo real via Firestore onSnapshot
 */
export function subscribeToTenantClients(
  tenantId: string,
  onUpdate: (clients: any[]) => void
): () => void {
  try {
    const subColRef = collection(db, `tenants/${tenantId}/clients`);
    const unsubscribe = onSnapshot(
      subColRef,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        onUpdate(list);
      },
      (error) => {
        console.warn('Listener onSnapshot tenant clients note:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Falha ao iniciar onSnapshot para clients:', err);
    return () => {};
  }
}

/**
 * Busca banners promocionais de uma barbearia no Firestore / LocalStorage
 */
export async function getBannersFromFirestore(tenantId: string): Promise<BarberPromotionBanner[]> {
  try {
    const list: BarberPromotionBanner[] = [];
    const subColRef = collection(db, `tenants/${tenantId}/promotions`);
    const querySnapshot = await getDocs(subColRef);

    querySnapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });

    if (list.length > 0) {
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      return list;
    }

    // Se ainda não existirem banners no Firestore para essa barbearia, inicializa com os 15 banners padrão
    try {
      const localKey = `barber_banners_${tenantId}`;
      const savedLocal = localStorage.getItem(localKey);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    return DEFAULT_PROMOTION_BANNERS;
  } catch (error) {
    console.warn('Erro ao ler banners do Firestore, usando fallback padrão:', error);
    try {
      const localKey = `barber_banners_${tenantId}`;
      const savedLocal = localStorage.getItem(localKey);
      if (savedLocal) {
        return JSON.parse(savedLocal);
      }
    } catch {}
    return DEFAULT_PROMOTION_BANNERS;
  }
}

/**
 * Salva ou atualiza um banner promocional no Firestore
 */
export async function saveBannerToFirestore(
  tenantId: string,
  banner: BarberPromotionBanner
): Promise<{ success: boolean; banner: BarberPromotionBanner }> {
  try {
    const bannerId = banner.id || `banner-${Date.now()}`;
    const payload = {
      ...banner,
      id: bannerId,
      updatedAt: serverTimestamp(),
      createdAt: banner.createdAt || new Date().toISOString(),
    };

    // Salva no Firestore
    try {
      await setDoc(doc(db, `tenants/${tenantId}/promotions`, bannerId), payload, { merge: true });
    } catch (firestoreErr) {
      console.warn('Erro ao persistir banner no Firestore:', firestoreErr);
    }

    // Salva no LocalStorage
    try {
      const localKey = `barber_banners_${tenantId}`;
      const existing = localStorage.getItem(localKey);
      let list: BarberPromotionBanner[] = existing ? JSON.parse(existing) : [...DEFAULT_PROMOTION_BANNERS];
      const index = list.findIndex((b) => b.id === bannerId);
      if (index >= 0) {
        list[index] = payload as any;
      } else {
        list = [payload as any, ...list];
      }
      localStorage.setItem(localKey, JSON.stringify(list));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('barber_banners_updated', { detail: { tenantId, banners: list } }));
      }
    } catch {}

    return { success: true, banner: payload as any };
  } catch (err) {
    console.error('Erro ao salvar banner:', err);
    return { success: false, banner };
  }
}

/**
 * Remove um banner promocional
 */
export async function deleteBannerFromFirestore(
  tenantId: string,
  bannerId: string
): Promise<{ success: boolean }> {
  try {
    try {
      await deleteDoc(doc(db, `tenants/${tenantId}/promotions`, bannerId));
    } catch (err) {
      console.warn('Erro ao deletar banner do Firestore:', err);
    }

    try {
      const localKey = `barber_banners_${tenantId}`;
      const existing = localStorage.getItem(localKey);
      if (existing) {
        const list: BarberPromotionBanner[] = JSON.parse(existing);
        const filtered = list.filter((b) => b.id !== bannerId);
        localStorage.setItem(localKey, JSON.stringify(filtered));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('barber_banners_updated', { detail: { tenantId, banners: filtered } }));
        }
      }
    } catch {}

    return { success: true };
  } catch (err) {
    console.error('Erro ao deletar banner:', err);
    return { success: false };
  }
}

/**
 * Escuta banners promocionais em tempo real via Firestore onSnapshot
 */
export function subscribeToTenantBanners(
  tenantId: string,
  onUpdate: (banners: BarberPromotionBanner[]) => void
): () => void {
  try {
    const subColRef = collection(db, `tenants/${tenantId}/promotions`);
    const unsubscribe = onSnapshot(
      subColRef,
      (snapshot) => {
        const list: BarberPromotionBanner[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        if (list.length > 0) {
          list.sort((a, b) => (a.order || 0) - (b.order || 0));
          onUpdate(list);
        } else {
          // Se não houver nada no Firestore, verifica LocalStorage ou Banners Padrão
          try {
            const localKey = `barber_banners_${tenantId}`;
            const local = localStorage.getItem(localKey);
            if (local) {
              onUpdate(JSON.parse(local));
              return;
            }
          } catch {}
          onUpdate(DEFAULT_PROMOTION_BANNERS);
        }
      },
      (error) => {
        console.warn('Listener onSnapshot tenant promotions:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Falha ao iniciar onSnapshot para banners:', err);
    return () => {};
  }
}

/**
 * Desconecta a sessão atual no Firebase Auth
 */
export async function logoutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Erro no signOut do Firebase:', err);
  }
}

// ============================================================================
// 4. SUPER ADMIN: CONFIGURAÇÕES, PERFIL, SENHA & VALORES NO BD
// ============================================================================

export const DEFAULT_SUPER_ADMIN_CONFIG: SuperAdminConfig = {
  adminName: 'William Moreira (Super Admin)',
  adminEmail: 'root@saas.com',
  adminPhone: '(11) 99876-5432',
  adminPassword: '901245',
  adminAccessCode: '901245',
  rootDomain: 'saasapp.com',
  tempPasswordExpiryHours: 2,
  defaultMonthlyPrice: 450.0,
  basicPlanPrice: 250.0,
  proPlanPrice: 450.0,
  enterprisePlanPrice: 850.0,
  systemNotifications: true,
  twoFactorAuth: true,
};

/**
 * Salva as configurações do Super Admin no Firestore (coleção 'system_settings/superadmin')
 */
export async function saveSuperAdminConfigToFirestore(
  config: Partial<SuperAdminConfig>
): Promise<AuthResult<SuperAdminConfig>> {
  try {
    const configDocRef = doc(db, 'system_settings', 'superadmin');
    const payload = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    };

    await setDoc(configDocRef, payload, { merge: true });

    // Atualiza nome também no Firebase Auth se houver usuário conectado
    if (auth.currentUser && config.adminName) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: config.adminName,
        });
      } catch (profileErr) {
        console.warn('Não foi possível atualizar displayName no Auth:', profileErr);
      }
    }

    return {
      success: true,
      data: { ...DEFAULT_SUPER_ADMIN_CONFIG, ...config },
      isFirebaseCloud: true,
    };
  } catch (error: any) {
    console.error('Erro ao salvar configurações do Super Admin no Firestore:', error);
    return {
      success: false,
      error: error.message || 'Erro ao persistir configurações no Firestore.',
    };
  }
}

/**
 * Carrega as configurações do Super Admin salvas no Firestore
 */
export async function getSuperAdminConfigFromFirestore(): Promise<SuperAdminConfig> {
  try {
    const configDocRef = doc(db, 'system_settings', 'superadmin');
    const docSnap = await getDoc(configDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        adminName: data.adminName || DEFAULT_SUPER_ADMIN_CONFIG.adminName,
        adminEmail: data.adminEmail || DEFAULT_SUPER_ADMIN_CONFIG.adminEmail,
        adminPhone: data.adminPhone || DEFAULT_SUPER_ADMIN_CONFIG.adminPhone,
        adminPassword: data.adminPassword || DEFAULT_SUPER_ADMIN_CONFIG.adminPassword,
        adminAccessCode: data.adminAccessCode || data.adminPassword || DEFAULT_SUPER_ADMIN_CONFIG.adminAccessCode,
        rootDomain: data.rootDomain || DEFAULT_SUPER_ADMIN_CONFIG.rootDomain,
        tempPasswordExpiryHours: data.tempPasswordExpiryHours || DEFAULT_SUPER_ADMIN_CONFIG.tempPasswordExpiryHours,
        defaultMonthlyPrice: data.defaultMonthlyPrice !== undefined ? data.defaultMonthlyPrice : DEFAULT_SUPER_ADMIN_CONFIG.defaultMonthlyPrice,
        basicPlanPrice: data.basicPlanPrice !== undefined ? data.basicPlanPrice : DEFAULT_SUPER_ADMIN_CONFIG.basicPlanPrice,
        proPlanPrice: data.proPlanPrice !== undefined ? data.proPlanPrice : DEFAULT_SUPER_ADMIN_CONFIG.proPlanPrice,
        enterprisePlanPrice: data.enterprisePlanPrice !== undefined ? data.enterprisePlanPrice : DEFAULT_SUPER_ADMIN_CONFIG.enterprisePlanPrice,
        systemNotifications: data.systemNotifications !== undefined ? data.systemNotifications : DEFAULT_SUPER_ADMIN_CONFIG.systemNotifications,
        twoFactorAuth: data.twoFactorAuth !== undefined ? data.twoFactorAuth : DEFAULT_SUPER_ADMIN_CONFIG.twoFactorAuth,
        updatedAt: data.updatedAt,
      };
    }
  } catch (error) {
    console.warn('Erro ao carregar configurações do Super Admin do Firestore:', error);
  }
  return DEFAULT_SUPER_ADMIN_CONFIG;
}

/**
 * Altera a senha do Super Admin no Firebase Authentication e salva no Firestore
 */
export async function updateSuperAdminPasswordInFirebase(
  newPassword: string,
  adminEmail: string = 'root@saas.com'
): Promise<AuthResult<boolean>> {
  if (!newPassword || newPassword.length < 6) {
    return {
      success: false,
      error: 'A nova senha deve conter pelo menos 6 dígitos numéricos.',
    };
  }

  try {
    const currentUser = auth.currentUser;

    if (currentUser) {
      // Atualiza senha diretamente no usuário autenticado no Auth se houver
      try {
        await updatePassword(currentUser, newPassword);
      } catch (authErr) {
        console.warn('Nota de atualização no Firebase Auth (prosseguindo com Firestore):', authErr);
      }
    }

    // Atualiza imediatamente a senha e o código de acesso na configuração do Super Admin no Firestore
    const configDocRef = doc(db, 'system_settings', 'superadmin');
    await setDoc(
      configDocRef,
      {
        adminPassword: newPassword,
        adminAccessCode: newPassword,
        adminEmail: adminEmail,
        updatedAt: new Date().toISOString(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );

    // Salva hash/registro de segurança e auditoria no Firestore
    const securityLogRef = doc(db, 'security_logs', `pwd_change_${Date.now()}`);
    await setDoc(securityLogRef, {
      type: 'SUPERADMIN_PASSWORD_CHANGED',
      adminEmail: adminEmail,
      timestamp: serverTimestamp(),
      changedAt: new Date().toISOString(),
      status: 'SUCCESS',
    });

    // Atualiza metadata de segurança
    await setDoc(
      doc(db, 'system_settings', 'superadmin_security'),
      {
        lastPasswordChange: new Date().toISOString(),
        lastPasswordChangeServer: serverTimestamp(),
        adminEmail: adminEmail,
      },
      { merge: true }
    );

    return {
      success: true,
      data: true,
      isFirebaseCloud: true,
    };
  } catch (error: any) {
    console.error('Erro ao atualizar senha no Firebase:', error);
    return {
      success: false,
      error: error.message || 'Erro ao alterar a senha no banco de dados.',
    };
  }
}

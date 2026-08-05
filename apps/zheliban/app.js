(function () {
  const app = document.querySelector('#app');
  const data = window.LowAltitudeMock;
  const ledgerStorageKey = 'yinzhou-uom-ledger-v2';
  const profileStorageKey = 'yinzhou-profile-v2';
  const publicServiceStorageKey = 'yinzhou-public-service-v2';
  const seedCompanyMembers = JSON.parse(JSON.stringify(data.companyMembers || []));
  const seedCertificates = JSON.parse(JSON.stringify(data.certificates || []));
  const seedDrones = JSON.parse(JSON.stringify(data.drones || []));
  try {
    window.localStorage.removeItem('yinzhou-profile-v1');
    window.localStorage.removeItem('yinzhou-uom-ledger-v1');
  } catch {}
  const mergeById = (saved, seed) => {
    const list = Array.isArray(saved) ? saved.slice() : [];
    const have = new Set(list.map((item) => item.id));
    seed.forEach((item) => {
      if (!have.has(item.id)) list.push(JSON.parse(JSON.stringify(item)));
    });
    return list;
  };
  const mergeCompanyMembers = (saved) => {
    const list = Array.isArray(saved) ? saved.map((item) => ({ ...item, assignedDroneIds: Array.isArray(item.assignedDroneIds) ? item.assignedDroneIds.slice() : [] })) : [];
    if (!list.some((item) => item.isPilot === true)) return JSON.parse(JSON.stringify(seedCompanyMembers));
    const have = new Map(list.map((item) => [item.id, item]));
    seedCompanyMembers.forEach((seed) => {
      const current = have.get(seed.id);
      if (!current) {
        list.push(JSON.parse(JSON.stringify(seed)));
        return;
      }
      if (typeof current.isPilot !== 'boolean') current.isPilot = seed.isPilot;
      if (typeof current.isAdmin !== 'boolean') current.isAdmin = !!seed.isAdmin;
      if (current.relation === '法定代表人') current.isAdmin = true;
      if (!Array.isArray(current.assignedDroneIds)) current.assignedDroneIds = [...(seed.assignedDroneIds || [])];
      if (!current.license) current.license = seed.license || '未上传';
    });
    return list;
  };
  const syncCompanyMemberCount = () => {
    const count = data.companyMembers.length;
    data.profiles.company.accounts = count;
    const company = data.companies.find((item) => item.id === 'ENT-001');
    if (company) company.accounts = count;
  };
  const hydrateProfile = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(profileStorageKey) || 'null');
      if (!saved || typeof saved !== 'object') return;
      ['name', 'idNumber', 'phone', 'address', 'license', 'licenseFileName', 'affiliatedCompany'].forEach((field) => {
        if (typeof saved[field] === 'string') data.profiles.personal[field] = saved[field];
      });
      if (saved.companyProfile && typeof saved.companyProfile === 'object') Object.assign(data.profiles.company, saved.companyProfile);
      if (Array.isArray(saved.companyMembers)) data.companyMembers = mergeCompanyMembers(saved.companyMembers);
      if (saved.supplement && typeof saved.supplement === 'object') Object.assign(data.profiles.personal.supplement, saved.supplement);
      if (saved.companySupplement && typeof saved.companySupplement === 'object') Object.assign(data.profiles.company.supplement, saved.companySupplement);
    } catch {
      window.localStorage.removeItem(profileStorageKey);
    }
    data.profiles.personal.supplement = data.normalizePersonalSupplement ? data.normalizePersonalSupplement(data.profiles.personal.supplement) : data.profiles.personal.supplement;
    data.companyMembers.forEach((member) => {
      if (member.relation === '法定代表人') member.isAdmin = true;
      if (typeof member.isAdmin !== 'boolean') member.isAdmin = false;
      if (typeof member.isPilot !== 'boolean') member.isPilot = false;
    });
    syncCompanyMemberCount();
  };
  const persistProfile = () => {
    syncCompanyMemberCount();
    const { name, idNumber, phone, address, license, licenseFileName, affiliatedCompany, supplement } = data.profiles.personal;
    try { window.localStorage.setItem(profileStorageKey, JSON.stringify({ name, idNumber, phone, address, license, licenseFileName, affiliatedCompany, supplement, companyProfile: data.profiles.company, companySupplement: data.profiles.company.supplement, companyMembers: data.companyMembers })); } catch {}
  };
  const normalizeCertificate = (certificate) => {
    delete certificate.ocrState;
    if (!certificate.certificateImageUrl && certificate.certificateImageName) certificate.certificateImageUrl = '../../shared/assets/uom-registration-certificate.svg';
    if (!certificate.certificateImageUrl) certificate.certificateImageUrl = '../../shared/assets/uom-registration-certificate.svg';
    if (certificate.state !== '已注销') certificate.state = '有效';
    certificate.registrationStatus = certificate.state === '已注销' ? '已注销' : '正常';
    if (!certificate.accountRole) {
      const companyName = data.profiles.company.name;
      certificate.accountRole = certificate.holder === companyName || certificate.issuedTo === companyName ? 'company' : 'personal';
    }
  };
  const droneIsBound = (drone) => Boolean(drone && drone.certificate);
  const droneRegistrationState = (drone) => {
    if (!drone) return '有效';
    if (drone.status === '已注销' || drone.registrationStatus === '已注销') return '已注销';
    if (!droneIsBound(drone)) return '待关联';
    return '有效';
  };
  const normalizeDrone = (drone) => {
    drone.group = drone.group === '使用设备' ? '使用设备' : '持有设备';
    const reg = droneRegistrationState(drone);
    if (reg === '已注销') {
      drone.status = '已注销';
      drone.registrationStatus = '已注销';
    } else if (reg === '待关联') {
      drone.status = '待关联';
      drone.registrationStatus = '待关联';
      drone.certificate = '';
      drone.registrationMark = drone.registrationMark || '';
      drone.registrationDate = drone.registrationDate || '';
      drone.source = drone.source || '手动录入';
    } else {
      drone.status = '有效';
      drone.registrationStatus = '正常';
    }
    if (!drone.accountRole) {
      const linked = data.certificates.find((item) => item.id === drone.certificate);
      drone.accountRole = linked?.accountRole || (String(drone.owner || '').includes('企业') ? 'company' : 'personal');
    }
    if (!drone.ownerCompany) {
      if (drone.accountRole === 'company') drone.ownerCompany = data.profiles.company.name;
      else if (drone.group === '使用设备') drone.ownerCompany = data.profiles.personal.affiliatedCompany || '';
    }
  };
  const emptyDroneDraft = () => ({
    manufacturerModel: '',
    serialNumber: '',
    aircraftName: '',
    emptyWeight: '',
    maxTakeoffWeight: '',
    aircraftType: '多旋翼航空器'
  });
  const syncDeviceCounts = () => {
    ['personal', 'company'].forEach((role) => {
      data.profiles[role].devices = data.drones.filter((drone) => drone.accountRole === role && droneRegistrationState(drone) !== '已注销').length;
    });
    const company = data.companies.find((item) => item.id === 'ENT-001');
    if (company) company.drones = data.profiles.company.devices;
    const user = data.users.find((item) => item.id === 'USR-001');
    if (user) user.drones = data.profiles.personal.devices;
  };
  const hydrateLedger = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(ledgerStorageKey) || 'null');
      if (!saved || !Array.isArray(saved.certificates) || !Array.isArray(saved.drones)) return;
      data.certificates = mergeById(saved.certificates, seedCertificates);
      data.drones = mergeById(saved.drones, seedDrones);
      data.certificates.forEach(normalizeCertificate);
      data.drones.forEach(normalizeDrone);
      syncDroneAssignmentGroups();
      syncDeviceCounts();
    } catch {
      window.localStorage.removeItem(ledgerStorageKey);
    }
  };
  const persistLedger = () => {
    syncDeviceCounts();
    try {
      window.localStorage.setItem(ledgerStorageKey, JSON.stringify({
        certificates: data.certificates,
        drones: data.drones,
        deviceCounts: {
          personal: data.profiles.personal.devices,
          company: data.profiles.company.devices
        }
      }));
    } catch {
    }
  };
  const companyPilots = () => data.companyMembers.filter((member) => member.isPilot && member.state !== '已停用');
  const sessionActor = () => {
    if (state.role !== 'company') return null;
    return data.companyMembers.find((member) => member.relation === '法定代表人' && member.state !== '已停用');
  };
  const canManageEnterprise = () => !!sessionActor();
  const displayCompanyName = (name) => String(name || '').replace(/（演示）/g, '');
  const flightDroneLabel = (drone) => {
    const name = data.uomValue(drone, 'aircraftName');
    const group = drone.group === '使用设备' ? '使用设备' : '持有设备';
    let company = drone.ownerCompany || '';
    if (!company && drone.accountRole === 'company') company = data.profiles.company.name;
    if (!company && state.role === 'personal' && group === '使用设备') company = data.profiles.personal.affiliatedCompany || '';
    const companyLabel = displayCompanyName(company);
    return companyLabel ? `${name}（${group} · ${companyLabel}）` : `${name}（${group}）`;
  };
  const pilotAssignedDrones = (member) => (member.assignedDroneIds || []).map((id) => data.drones.find((drone) => drone.id === id)).filter(Boolean);
  const pilotSubmittedFlights = (member) => data.flights.filter((flight) => flight.accountRole === 'company' && flight.operator === member.name);
  const droneAssignedPilot = (droneId) => data.companyMembers.find((member) => member.isPilot && member.state !== '已停用' && (member.assignedDroneIds || []).includes(droneId));
  const syncDroneAssignmentGroups = () => {
    data.drones.filter((drone) => drone.accountRole === 'company').forEach((drone) => {
      if (droneRegistrationState(drone) === '已注销') return;
      const assigned = droneAssignedPilot(drone.id);
      drone.group = assigned ? '使用设备' : '持有设备';
      drone.owner = assigned ? '企业使用' : '企业持有';
      drone.ownerCompany = data.profiles.company.name;
    });
  };
  const assignDroneToPilot = (droneId, pilotId) => {
    const drone = data.drones.find((item) => item.id === droneId && item.accountRole === 'company');
    const pilot = companyPilots().find((item) => item.id === pilotId);
    if (!drone || !pilot || droneRegistrationState(drone) === '已注销') return false;
    data.companyMembers.forEach((member) => {
      member.assignedDroneIds = (member.assignedDroneIds || []).filter((id) => id !== droneId);
    });
    pilot.assignedDroneIds = [...(pilot.assignedDroneIds || []), droneId];
    syncDroneAssignmentGroups();
    persistProfile();
    persistLedger();
    return true;
  };
  const unassignDrone = (droneId) => {
    const drone = data.drones.find((item) => item.id === droneId && item.accountRole === 'company');
    if (!drone) return false;
    data.companyMembers.forEach((member) => {
      member.assignedDroneIds = (member.assignedDroneIds || []).filter((id) => id !== droneId);
    });
    syncDroneAssignmentGroups();
    persistProfile();
    persistLedger();
    return true;
  };
  hydrateProfile();
  hydrateLedger();
  data.certificates.forEach(normalizeCertificate);
  data.drones.forEach(normalizeDrone);
  syncDroneAssignmentGroups();
  syncDeviceCounts();
  const roleCertificates = () => data.certificates.filter((item) => item.accountRole === state.role);
  const roleDrones = () => data.drones.filter((item) => item.accountRole === state.role);
  const roleFlights = () => data.flights.filter((item) => item.accountRole === state.role || item.owner === data.profiles[state.role]?.name);
  const normalizeFeedbackForms = (forms) => forms.map((form) => ({
    ...form,
    fields: Array.isArray(form.fields) ? form.fields.filter((field) => Array.isArray(field) && field[0] !== '是否允许联系').map(([name, type, required]) => [name, type === '图片' ? '多张图片' : type, required]) : []
  }));
  const normalizeFeedbacks = (feedbacks) => feedbacks.map((feedback) => {
    const fields = { ...(feedback.fields || {}) };
    delete fields['是否允许联系'];
    return { ...feedback, fields };
  });
  const hydratePublicService = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(publicServiceStorageKey) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (Array.isArray(saved.activities)) {
        const seedActivities = data.activities.slice();
        const mapped = saved.activities.map((item) => ({
          ...item,
          confirmState: item.confirmState === '已确认' ? '已确认' : '未确认'
        }));
        const have = new Set(mapped.map((item) => item.id));
        seedActivities.forEach((seed) => { if (!have.has(seed.id)) mapped.push(seed); });
        data.activities = mapped;
      }
      if (Array.isArray(saved.enrollments)) data.enrollments = saved.enrollments;
      if (Array.isArray(saved.feedbacks)) data.feedbacks = normalizeFeedbacks(saved.feedbacks);
      if (saved.uomGuide && typeof saved.uomGuide === 'object') {
        const defaultGuide = data.uomGuide;
        data.uomGuide = { ...defaultGuide, ...saved.uomGuide };
        if (!data.uomGuide.manualImage || /##\s*步骤/u.test(String(data.uomGuide.manualRichText || ''))) {
          data.uomGuide.manualRichText = defaultGuide.manualRichText;
          data.uomGuide.manualImage = defaultGuide.manualImage;
        }
        if (Array.isArray(data.uomGuide.guides)) data.uomGuide.guides = data.uomGuide.guides.map((guide, index) => {
          const merged = { ...(defaultGuide.guides?.[index] || {}), ...guide };
          delete merged.image;
          return merged;
        });
      }
      if (Array.isArray(saved.articles)) {
        data.articles = saved.articles.map((item, index) => {
          const sort = Number(item.sort) > 0 ? Number(item.sort) : (item.pinned ? index + 1 : 100 + index);
          const { pinned, ...rest } = item;
          return { ...rest, sort };
        });
      }
      if (Array.isArray(saved.flights)) data.flights = saved.flights;
      if (Array.isArray(saved.feedbackForms)) data.feedbackForms = normalizeFeedbackForms(saved.feedbackForms);
      if (Array.isArray(saved.messages)) data.messages = normalizeMessages(saved.messages);
    } catch { window.localStorage.removeItem(publicServiceStorageKey); }
  };
  const normalizeMessages = (messages) => messages.map((item) => ({
    ...item,
    title: item.title || '',
    content: item.content || '',
    channel: item.channel === '系统消息' ? '系统推送' : (item.channel || '系统推送'),
    time: item.time || '',
    state: item.state === '未推送' || item.state === '已推送' ? item.state : '已推送',
    pusher: item.pusher || '综合管理员',
    read: Boolean(item.read)
  }));
  const persistPublicService = () => {
    try { window.localStorage.setItem(publicServiceStorageKey, JSON.stringify({ activities: data.activities, enrollments: data.enrollments, feedbacks: data.feedbacks, articles: data.articles, flights: data.flights, feedbackForms: data.feedbackForms, messages: data.messages, uomGuide: data.uomGuide })); } catch {}
  };
  hydratePublicService();
  data.messages = normalizeMessages(data.messages || []);
  const normalizeFlight = (flight) => {
    if (!flight.startAt || !flight.endAt) {
      const match = String(flight.time || '').match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})[—-](\d{2}:\d{2})/);
      if (match) { flight.startAt = `${match[1]}T${match[2]}`; flight.endAt = `${match[1]}T${match[3]}`; }
    }
    flight.city = '宁波市鄞州区';
    flight.street = flight.street || String(flight.area || '').replace(/^申报区域\s*/, '').replace(/^宁波市鄞州区\s*/, '') || '';
    flight.purpose = flight.purpose || (String(flight.title || '').includes('巡查') ? '场地巡查' : '低空安全宣传活动保障');
    flight.activityType = flight.activityType || '一般飞行活动';
    flight.missionNature = flight.missionNature || flight.purpose || '个人娱乐';
    flight.controlMode = flight.controlMode || '';
    flight.flightMode = flight.flightMode || '';
    flight.maxAltitude = flight.maxAltitude || '';
    flight.takeoffSite = flight.takeoffSite || '';
    if (!flight.accountRole) flight.accountRole = flight.owner === data.profiles.company.name ? 'company' : 'personal';
    return flight;
  };
  data.flights.forEach(normalizeFlight);
  const emptyOcr = () => ({ status: 'empty', image: '', fileName: '', values: { ...data.certificateOcr } });
  const viewportStorageKey = 'yinzhou-zheliban-viewport';
  const readViewport = () => {
    try {
      const saved = sessionStorage.getItem(viewportStorageKey);
      if (saved === 'mobile' || saved === 'desktop') return saved;
    } catch (_) { /* ignore */ }
    return 'mobile';
  };
  const state = { role: null, modal: null, toast: '', query: '', guideTab: 'manual', guideQuery: '', guidePage: 1, faqQuery: '', faqPage: 1, certificateView: '全部', droneGroup: 'all', assignDraft: { droneId: '', pilotId: '' }, tagDraft: { id: '', isPilot: false }, articleKind: 'all', messageView: 'all', mineActivities: false, selectedGuide: '', selectedFaq: '', selectedActivity: '', feedbackFormId: '', feedbackDraft: {}, feedbackAttachments: {}, memberDraft: {}, pendingCertificate: '', pendingDrone: '', certificateMode: 'create', ocrRequest: 0, returnFocus: '', navigation: [], licenseImage: '', licenseSavedImage: '', profileDraft: {}, supplementDraft: {}, companyDraft: {}, droneDraft: emptyDroneDraft(), flightDraft: {}, flightMode: 'create', pendingFlight: '', pendingExecution: '', flightShot: 'empty', flightShotRequest: 0, batchStage: 'intro', batchRows: null, ocr: emptyOcr(), viewport: readViewport(), joined: new Set(data.enrollments.filter((item) => item.applicant === '陈*').map((item) => item.activityId)) };
  const icon = (path) => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="${path}"/></svg>`;
  const nav = [
    ['home', '首页', 'M3 12h18M6 9l6-6 6 6v12H6z'],
    ['services', '服务', 'M4 5h16v14H4zM8 9h8M8 13h5'],
    ['messages', '消息', 'M4 5h16v11H7l-3 3z'],
    ['profile', '我的', 'M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']
  ];
  const route = () => (location.hash || '#/login').replace('#/', '').split('?')[0];
  const go = (name) => {
    const current = route();
    if (current !== name && current !== 'login') state.navigation.push(current);
    location.hash = `#/${name}`;
  };
  const goBack = (fallback = 'home') => { location.hash = `#/${state.navigation.pop() || fallback}`; };
  const present = (markup) => markup
    .replaceAll('（演示）', '')
    .replaceAll('低空安全科普', '法规与公告')
    .replaceAll('演示区域', '申报区域')
    .replaceAll('演示材料', '登记材料')
    .replaceAll('演示设备', '申报设备')
    .replaceAll('演示记录', '记录')
    .replaceAll('演示', '')
    .replaceAll('富文本说明与一张完整操作说明图，便于移动端查看。', '')
    .replaceAll('近期低空安全活动与报名安排', '')
    .replaceAll('请选择与浙里办账号对应的身份类型进入服务。', '')
    .replaceAll('登录身份由浙江政务服务统一身份认证结果确定。', '')
    .replaceAll('区级台账归集与低空安全服务入口', '')
    .replaceAll('请填写相关信息，帮助我们持续优化平台服务。', '')
    .replaceAll('选择问题，弹窗查看后台维护的完整图文解答。', '')
    .replaceAll('以下内容由后台维护，当前为静态交互原型与 mock 数据。', '')
    .replace(/<small>内容更新于[^<]*<\/small>/gu, '')
    .replace(/<div class="login-help">[\s\S]*?<\/div>/gu, '')
    .replace(/<p><\/p>|<small><\/small>/gu, '');
  const safe = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const status = (value) => `<span class="status ${value === '已注销' || value === '已停用' ? 'neutral' : value.includes('异常') || value.includes('禁用') ? 'danger' : value.includes('待') || value.includes('补充') ? 'warning' : value.includes('已') || value.includes('有效') || value.includes('正常') ? 'success' : 'info'}">${safe(value)}</span>`;
  const certificateStatus = (value) => `<span class="status ${value === '已注销' ? 'neutral' : 'success'}">${safe(value)}</span>`;
  const navActive = (key, active) => active === key
    || (key === 'services' && ['certificates', 'drones', 'flights', 'activities', 'knowledge', 'guides'].includes(active))
    || (key === 'profile' && ['profile-details', 'profile-license', 'profile-members', 'profile-pilots', 'profile-pilot'].includes(active));
  const navMarkup = (active, className = 'bottom-nav') => `<nav class="${className}" aria-label="主导航">${nav.map(([key, label, path]) => `<button class="${navActive(key, active) ? 'active' : ''}" data-go="${key}">${icon(path)}<span>${label}</span>${key === 'messages' && data.messages.some((m) => !m.read) ? '<i class="nav-count">1</i>' : ''}</button>`).join('')}</nav>`;
  const brandMarkup = () => `<button class="brand" data-go="home" aria-label="返回首页"><span class="brand-mark">低</span><span class="brand-copy"><b>鄞州低空智护</b><small><span class="channel-mobile">浙里办 APP</span><span class="channel-desktop">浙江省政务服务网</span></small></span></button>`;
  const accountMarkup = (profile) => `<div class="header-actions"><div class="account-summary"><span>${profile.label}</span><b>${profile.name}</b></div></div>`;
  const desktopChrome = (profile, active) => `<header class="desktop-chrome">${brandMarkup()}${navMarkup(active, 'top-nav')}${accountMarkup(profile)}</header>`;
  const chromeFallback = (active) => {
    if (['home', 'services', 'messages', 'profile'].includes(active)) return 'home';
    if (['certificates', 'drones', 'flights', 'activities', 'knowledge', 'guides', 'feedback'].includes(active)) return 'services';
    if (String(active).startsWith('profile')) return 'profile';
    return 'home';
  };
  const mobileChrome = (fallback = 'home') => `<header class="mobile-chrome"><div class="mobile-status-bar" aria-hidden="true"><span class="mobile-status-time">9:41</span><span class="mobile-status-icons"><i class="mobile-signal"></i><i class="mobile-wifi"></i><i class="mobile-battery"></i></span></div><div class="mobile-app-bar"><button type="button" class="mobile-back" data-action="back" data-fallback="${safe(fallback)}" aria-label="返回"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h1 class="mobile-app-title">鄞州低空智护</h1><button type="button" class="mobile-more" data-action="mobile-more" aria-label="更多"><span></span><span></span><span></span></button></div></header>`;
  const shell = (content, active = route()) => {
    const profile = data.profiles[state.role];
    const extras = `${state.modal ? modal() : ''}${state.toast ? `<div class="toast" role="status">${state.toast}</div>` : ''}`;
    if (state.viewport === 'desktop') {
      return `${desktopChrome(profile, active)}<section class="main-content">${content}</section>${extras}`;
    }
    return `${mobileChrome(chromeFallback(active))}<section class="main-content">${content}</section>${navMarkup(active)}${extras}`;
  };
  const pageToolbar = (fallback = 'home', actions = '') => {
    if (state.viewport === 'mobile') {
      return actions ? `<div class="page-toolbar page-toolbar--actions"><div class="page-toolbar-actions">${actions}</div></div>` : '';
    }
    return `<div class="page-toolbar"><button class="back-button" data-action="back" data-fallback="${safe(fallback)}" aria-label="返回">‹</button>${actions ? `<div class="page-toolbar-actions">${actions}</div>` : ''}</div>`;
  };
  const title = (text, back = true, fallback = 'home') => pageToolbar(fallback);
  const list = (items, render) => `<div class="list">${items.length ? items.map(render).join('') : '<div class="empty">暂无符合条件的数据</div>'}</div>`;
  const filter = (placeholder) => `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="${placeholder}" aria-label="搜索" /></div>`;
  const listActions = (actions = '') => actions ? `<div class="list-actions">${actions}</div>` : '';
  const login = () => `<section class="login-page"><div class="login-visual"><div class="login-brand"><span class="brand-mark">低</span><div><b>鄞州低空智护</b><span><span class="channel-mobile">浙里办 APP</span><span class="channel-desktop">浙江省政务服务网</span></span></div></div><div class="flight-lines" aria-hidden="true"></div><div class="login-message"><p>鄞州区低空安全服务</p><h1>让每一次起飞<br />都有序可查</h1><span>无人机信息管理、飞行计划与低空安全服务统一入口</span></div></div><div class="login-panel"><div class="login-panel-inner"><span class="eyebrow">用户登录</span><h2>选择登录类型</h2><p>请选择与浙里办账号对应的身份类型进入服务。</p><div class="login-options"><button class="login-option" data-action="login" data-value="personal"><span class="login-option-icon">${icon('M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z')}</span><span><b>个人登录</b><small>个人资料、飞行员执照与设备管理</small></span><i>›</i></button><button class="login-option" data-action="login" data-value="company"><span class="login-option-icon company">${icon('M4 21V5h16v16M8 9h2M14 9h2M8 13h2M14 13h2M10 21v-4h4v4')}</span><span><b>法人登录</b><small>企业资料、授权账号与设备管理</small></span><i>›</i></button></div><div class="login-help"><span>${icon('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01')}</span><p>登录身份由浙江政务服务统一身份认证结果确定。</p></div></div></div></section>`;
  const publishedActivities = () => data.activities.filter((item) => !['已下架', '待确认'].includes(item.status));
  const articleSortValue = (item) => (Number(item.sort) > 0 ? Number(item.sort) : 999);
  const compareArticles = (a, b) => articleSortValue(a) - articleSortValue(b) || String(b.date || '').localeCompare(String(a.date || ''));
  const isVideoArticle = (item) => item.coverKind === 'video' || item.mediaType === '视频';
  const home = () => {
    const profile = data.profiles[state.role];
    const activities = publishedActivities().filter((item) => ['报名中', '进行中'].includes(item.status));
    const pinnedArticles = data.articles.filter((item) => ['法规', '公告'].includes(item.kind) && item.status === '已发布').slice().sort(compareArticles).slice(0, 3);
    const companyFlights = state.role === 'company' ? roleFlights() : [];
    const companyPendingFlights = companyFlights.filter((item) => item.executed === '未执行').length;
    const companyFlightNote = companyFlights.length
      ? `${companyPendingFlights} 条待执行 · 共 ${companyFlights.length} 条`
      : '查看本公司飞行计划';
    const quickServices = state.role === 'company'
      ? `${quick('profile-pilots', '飞手管理', '企业飞手与设备分配', 'pilots', 'amber')}${quick('flights', '飞行计划管理', companyFlightNote, 'flights', '')}${quick('certificates', 'UOM 登记证管理', '上传、更新与注销', 'certificates', 'navy')}${quick('drones', '无人机管理', '持有与使用设备台账', 'drones', 'olive')}`
      : `${quick('flights', '飞行计划申报', '申报与执行确认', 'flights', '')}${quick('certificates', 'UOM 登记证', '上传、更新与注销', 'certificates', 'teal')}${quick('drones', '我的无人机', '持有与使用设备台账', 'drones', 'navy')}${quick('guides', 'UOM平台流程指导', '查看流程与常见问题', 'guides', 'olive')}`;
    const heroLead = state.viewport === 'desktop' ? '' : `<p>${profile.label} · ${profile.name}</p>`;
    return shell(`<div class="home-dashboard"><section class="hero"><div class="hero-atmosphere" aria-hidden="true"><span class="hero-glow g1"></span><span class="hero-glow g2"></span><span class="hero-glow g3"></span><span class="hero-dots"></span><span class="hero-orbit orbit-one"></span><span class="hero-orbit orbit-two"></span><span class="hero-orbit orbit-three"></span><span class="hero-cloud cloud-a"></span><span class="hero-cloud cloud-b"></span><span class="hero-flight-path path-main"><i></i></span><span class="hero-flight-path path-alt"><i></i></span><span class="hero-ring"></span><span class="hero-drone"><i></i><i></i><b></b></span></div><div class="hero-content">${heroLead}<h1>让每一次起飞<br />都有序可查</h1><small>有序起飞 · 安心抵达</small></div><div class="hero-status"><span><i></i>服务运行正常</span></div></section><section class="section services-section"><div class="section-head"><h2>常用服务</h2><button class="text-link" data-go="services">全部服务</button></div><div class="quick-grid bento-grid home-bento">${quickServices}</div></section><section class="section notice-section pinned-notice-section"><div class="section-head"><h2>法规与公告</h2><button class="text-link" data-go="knowledge">查看全部</button></div><div class="pinned-notice-list">${pinnedArticles.map((item) => `<button class="notice pinned-home-notice" data-action="article-detail" data-id="${safe(item.id)}">${articleVisual(item)}<span class="home-notice-copy"><span><b class="home-notice-kind">${safe(item.kind)}</b>${isVideoArticle(item) ? `<em>▶ ${safe(item.duration || '视频')}</em>` : ''}</span><strong>${safe(item.title)}</strong><small>${safe(item.tag || '安全提示')}</small></span><i>›</i></button>`).join('') || '<div class="empty">暂无法规与公告</div>'}</div></section><section class="section home-activity-section"><div class="section-head"><div><h2>活动中心</h2></div><button class="text-link" data-go="activities">查看全部</button></div><div class="home-activity-grid">${activities.length ? activities.map((item) => `<article class="home-activity-card"><button data-action="activity-detail" data-id="${safe(item.id)}"><div class="home-activity-cover ${safe(item.cover)}"><span>低</span></div><div><span>${safe(item.status)}</span><h3>${safe(item.title)}</h3><p>${safe(item.startTime)} · ${safe(item.place)}</p><small>报名截止 ${safe(item.enrollEnd)}</small></div><i>›</i></button></article>`).join('') : '<div class="empty">暂无报名中或进行中的活动</div>'}</div></section></div>`, 'home');
  };
  const serviceGlyph = (kind) => {
    const glyphs = {
      flights: '<path d="M4.5 18.5h15"/><path d="M6.2 15.8l3.4-6.4 8.6-2.2-2.2 4.6-5.2 1.5-4.6 2.5z"/><path d="M14.8 7.4l2-4.2 1.8.8-1.4 3"/><circle cx="19" cy="5.2" r="1.15"/>',
      certificates: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/><path d="M15.5 16.2l1.2 1.2 2.3-2.4"/>',
      drones: '<path d="M10.2 10.2h3.6v3.6h-3.6z"/><path d="M4.2 7.2h3.4v3.4H4.2zM16.4 7.2h3.4v3.4h-3.4zM4.2 13.4h3.4v3.4H4.2zM16.4 13.4h3.4v3.4h-3.4z"/><path d="M7.6 9l2.6 1.6M16.4 9l-2.6 1.6M7.6 15l2.6-1.6M16.4 15l-2.6-1.6"/>',
      guides: '<path d="M5 4.5h14v15H5z"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5"/><circle cx="16.2" cy="15.5" r="2.2"/><path d="M15.4 15.5h1.6M16.2 14.7v1.6"/>',
      pilots: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 18.5c.8-3.6 3-5.5 5.5-5.5s4.7 1.9 5.5 5.5"/><circle cx="17" cy="8.5" r="2.6"/><path d="M14.2 18.5c.5-2.6 1.9-4 3.8-4s3.2 1.4 3.7 4"/>',
      profile: '<circle cx="12" cy="8.5" r="3.4"/><path d="M5 19c1-4.2 3.5-6.3 7-6.3s6 2.1 7 6.3"/>',
      activities: '<rect x="4.5" y="5.5" width="15" height="14" rx="2.2"/><path d="M8 3.8v3.2M16 3.8v3.2M4.5 9.5h15"/><path d="M9 14.2l2.1 2.1 4.2-4.4"/>',
      knowledge: '<path d="M5 4.8h14v14.4H5z"/><path d="M8.2 8.4h7.6M8.2 12h7.6M8.2 15.6h5"/>',
      feedback: '<path d="M5 6.5h14a1.8 1.8 0 0 1 1.8 1.8v7.2a1.8 1.8 0 0 1-1.8 1.8H10l-3.8 3.2V17.3H5A1.8 1.8 0 0 1 3.2 15.5V8.3A1.8 1.8 0 0 1 5 6.5z"/><circle cx="9" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>'
    };
    return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${glyphs[kind] || glyphs.profile}</svg>`;
  };
  const quick = (to, label, note, kind, tone = '') => `<button class="quick-card bento-card quick-card--${to}" data-go="${to}"><span class="bento-copy"><b>${safe(label)}</b><small>${safe(note)}</small></span><span class="quick-icon ${tone} bento-visual" aria-hidden="true">${serviceGlyph(kind)}</span></button>`;
  const services = () => {
    const companyExtras = state.role === 'company'
      ? `${quick('profile-pilots', '飞手管理', '企业飞手与设备分配', 'pilots', 'amber')}`
      : '';
    return shell(`${pageToolbar('home')}<section class="quick-grid services-grid bento-grid all-services-bento">${quick('profile', '资料管理', state.role === 'personal' ? '个人资料与飞行员执照' : '企业资料与授权账号', 'profile', '')}${companyExtras}${quick('flights', state.role === 'company' ? '飞行计划管理' : '飞行计划申报', state.role === 'company' ? (roleFlights().length ? `${roleFlights().filter((item) => item.executed === '未执行').length} 条待执行 · 共 ${roleFlights().length} 条` : '查看本公司飞行计划') : '申报与执行确认', 'flights', 'olive')}${quick('certificates', state.role === 'company' ? 'UOM 登记证管理' : 'UOM 登记证', state.role === 'company' ? '上传、更新与注销' : '上传、更新、注销', 'certificates', 'teal')}${quick('activities', '活动中心', '报名与历史记录', 'activities', '')}${quick('drones', '无人机管理', '持有与使用分组', 'drones', 'navy')}${quick('knowledge', '安全科普', '法规与新闻公告', 'knowledge', 'teal')}${quick('guides', 'UOM平台流程指导', '手册与常见问题', 'guides', 'navy')}${quick('feedback', '意见反馈', '提交建议与问题', 'feedback', 'olive')}</section>`, 'services');
  };
  const profile = () => {
    const p = data.profiles[state.role];
    const personal = state.role === 'personal';
    const flightsForRole = roleFlights();
    const pendingFlights = flightsForRole.filter((item) => item.executed === '未执行').length;
    const flightTotal = flightsForRole.length;
    const flightEntryNote = personal
      ? (pendingFlights ? `${pendingFlights} 条待执行` : (flightTotal ? `共 ${flightTotal} 条申报` : '查看申报记录'))
      : (flightTotal ? `${pendingFlights} 条待执行 · 共 ${flightTotal} 条` : '暂无本公司计划');
    const joinedActivities = data.enrollments.filter((item) => item.applicant === `${p.name.slice(0, 1)}*`).length;
    const pilots = companyPilots();
    const entry = (to, label, note, path, tone, action = '') => `<button class="profile-entry" ${action ? `data-action="${action}"` : `data-go="${to}"`}><span class="profile-entry-icon ${tone}">${icon(path)}</span><span><b>${label}</b><small>${note}</small></span><i>›</i></button>`;
    const accountMark = personal
      ? `<span class="account-mark personal" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><circle class="mark-ring" cx="32" cy="32" r="29"/><circle class="mark-head" cx="32" cy="24" r="9"/><path class="mark-body" d="M16 48c2.4-9.2 8.6-14 16-14s13.6 4.8 16 14"/></svg></span>`
      : `<span class="account-mark company" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><rect class="mark-plate" x="8" y="10" width="48" height="44" rx="10"/><path class="mark-building" d="M22 46V22h20v24"/><path class="mark-windows" d="M27 27h4v4h-4zm6 0h4v4h-4zm-6 7h4v4h-4zm6 0h4v4h-4z"/><path class="mark-door" d="M30 46v-7h4v7"/></svg></span>`;
    const certificateCount = roleCertificates().filter((item) => item.state !== '已注销').length;
    const loginName = personal ? p.name : (sessionActor()?.name || p.contact || p.name);
    const accountTitle = personal ? `个人账户（${loginName}）` : `企业账户（${loginName}）`;
    const accountHero = `<button type="button" class="my-account-hero ${personal ? 'is-personal' : 'is-company'}" data-go="profile-details" aria-label="查看${personal ? '个人' : '企业'}资料">${accountMark}<div class="account-identity"><span class="account-kicker">账户中心</span><h1>${safe(accountTitle)}</h1><div class="account-meta"><span class="account-chip">${safe(p.devices)} 架设备</span>${personal && p.affiliatedCompany ? `<span class="account-chip">${safe(displayCompanyName(p.affiliatedCompany))}</span>` : ''}${personal ? '' : `<span class="account-chip">飞手 ${pilots.length} 人</span>`}</div></div><i class="account-hero-chevron" aria-hidden="true">›</i></button>`;
    const entries = personal
      ? `${entry('profile-license', '飞行执照', p.license === '已上传' ? '已上传，可查看或更新' : '待上传', 'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5', 'teal')}${entry('drones', '我的无人机', `${p.devices} 架设备`, 'M5 13h14M7 9h10M9 17h6', 'navy')}${entry('flights', '我的飞行申报', flightEntryNote, 'M3 12h18M12 3v18', 'indigo')}${entry('', '我报名的活动', joinedActivities ? `已报名 ${joinedActivities} 场` : '查看活动报名', 'M6 4v16M18 4v16M3 8h18', 'teal', 'open-my-activities')}${entry('feedback', '意见反馈', '提交建议与问题', 'M4 5h16v11H7l-3 3z', 'olive')}`
      : `${entry('profile-members', '关联用户', `已关联 ${data.companyMembers.length} 人`, 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', 'teal')}${entry('profile-pilots', '飞手管理', pilots.length ? `${pilots.length} 名飞手` : '查看企业飞手', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', 'amber')}${entry('flights', '飞行计划管理', flightEntryNote, 'M3 12h18M12 3v18', 'indigo')}${entry('certificates', 'UOM 登记证管理', certificateCount ? `${certificateCount} 本有效` : '上传与管理登记证', 'M4 5h16v14H4zM8 9h8M8 13h5', 'navy')}${entry('drones', '无人机管理', `${p.devices} 架设备`, 'M5 13h14M7 9h10M9 17h6', 'olive')}`;
    return shell(`<div class="my-account-page">${accountHero}<section class="my-account-section" aria-labelledby="account-services-title"><div class="section-head"><h2 id="account-services-title">我的</h2></div><div class="profile-entry-list">${entries}</div></section></div>`, 'profile');
  };
  const profileDetails = () => {
    const p = data.profiles[state.role];
    const personal = state.role === 'personal';
    const supplement = p.supplement || {};
    const rows = personal
      ? [['姓名', p.name], ['身份证号', p.idNumber], ['手机号码', p.phone], ...(p.affiliatedCompany ? [['所属公司', p.affiliatedCompany]] : [])]
      : [['企业名称', p.name], ['统一社会信用代码', p.creditCode], ['认证状态', p.verified], ['授权联系人', p.contact], ['联系电话', p.phone]];
    const supplementRows = personal
      ? [['所属地', supplement.district || '未填写'], ['紧急联系人', supplement.emergencyContact || '未填写'], ['紧急联系电话', supplement.emergencyPhone || '未填写']]
      : [['无人机主要用途', supplement.droneUsage || '未填写'], ['安全负责人', supplement.safetyOfficer || '未填写'], ['安全负责人电话', supplement.safetyPhone || '未填写']];
    return shell(`${title(personal ? '个人资料' : '企业资料', true, 'profile')}<div class="profile-detail-stack"><section class="profile-detail-card"><header><div><span class="profile-kicker">${personal ? '个人基本信息' : '企业基本信息'}</span><h2>基本信息</h2></div></header><div class="detail-grid">${rows.map(([key, value]) => `<div><span>${key}</span><b>${safe(value)}</b></div>`).join('')}</div></section><section class="profile-detail-card"><header><div><span class="profile-kicker">${personal ? '个人补充信息' : '企业补充信息'}</span><h2>补充信息</h2></div><button class="secondary-btn compact-btn" data-action="modal" data-modal="${personal ? 'supplement' : 'company-supplement'}">编辑</button></header><div class="detail-grid">${supplementRows.map(([key, value]) => `<div><span>${key}</span><b>${safe(value)}</b></div>`).join('')}</div></section></div>`, 'profile');
  };
  const profileLicense = () => {
    const p = data.profiles.personal;
    const licenseThumb = state.licenseSavedImage ? `<figure class="license-thumb"><img src="${state.licenseSavedImage}" alt="已上传的飞行执照照片" /><figcaption>${safe(p.licenseFileName || '飞行执照图片')}</figcaption></figure>` : p.licenseFileName ? `<div class="license-thumb placeholder"><span>${icon('M4 5h16v14H4zM8 9h8M8 13h5')}</span><b>${safe(p.licenseFileName)}</b><small>当前浏览器会话未保留原图</small></div>` : '';
    return shell(`${title('飞行执照', true, 'profile')}<section class="profile-detail-card license-card"><header><div><span class="profile-kicker">飞行员执照管理</span><h2>飞行执照图片</h2></div>${status(p.license)}</header><p>${p.licenseFileName ? `已上传：${safe(p.licenseFileName)}` : '上传清晰的飞行员操作执照图片。'}</p>${licenseThumb}<button class="secondary-btn" data-action="modal" data-modal="license">${p.license === '未上传' ? '上传执照图片' : '更新执照图片'}</button></section>`, 'profile');
  };
  const profileMembers = () => {
    const canConfig = canManageEnterprise();
    return shell(`${title('关联用户', true, 'profile')}<section class="profile-detail-card member-card"><header><div><span class="profile-kicker">企业关联用户管理</span><h2>关联用户 ${data.companyMembers.length} 人</h2></div></header><div class="member-list">${data.companyMembers.map((member) => {
      const disabled = member.state === '已停用';
      const isLegal = member.relation === '法定代表人';
      const pilotMark = !isLegal && member.isPilot ? ' · 飞手' : '';
      const configBtn = canConfig && !isLegal && !disabled
        ? `<button class="text-link" data-action="modal" data-modal="member-pilot" data-id="${safe(member.id)}">设置飞手</button>`
        : '';
      return `<div class="${disabled ? 'is-disabled' : ''}"><span class="member-avatar">${member.name.slice(0, 1)}</span><p><b>${safe(member.name)}</b><small>${safe(member.relation)} · ${safe(member.phone)}${safe(pilotMark)}</small></p><div class="member-row-aside">${status(member.state)}${configBtn}</div></div>`;
    }).join('')}</div></section>`, 'profile');
  };
  const profilePilots = () => {
    if (state.role !== 'company') return profile();
    const pilots = companyPilots();
    return shell(`${title('飞手管理', true, 'profile')}<section class="profile-detail-card member-card"><header><div><span class="profile-kicker">企业飞手管理</span><h2>飞手 ${pilots.length} 人</h2></div></header><div class="member-list pilot-list">${pilots.length ? pilots.map((member) => {
      const drones = pilotAssignedDrones(member);
      const flights = pilotSubmittedFlights(member);
      return `<button type="button" class="pilot-row" data-action="pilot-detail" data-id="${safe(member.id)}"><span class="member-avatar">${member.name.slice(0, 1)}</span><p><b>${safe(member.name)}</b><small>${safe(member.relation)} · ${safe(member.phone)}</small><small>使用设备 ${drones.length} 架 · 飞行计划 ${flights.length} 条</small></p>${status(member.state)}<i>›</i></button>`;
    }).join('') : '<div class="empty">暂无企业飞手</div>'}</div></section>`, 'profile');
  };
  const profilePilotDetail = (id) => {
    if (state.role !== 'company') return profile();
    const member = companyPilots().find((item) => item.id === id);
    if (!member) return profilePilots();
    const drones = pilotAssignedDrones(member);
    const flights = pilotSubmittedFlights(member);
    const droneRows = drones.length
      ? drones.map((drone) => `<article class="list-row"><div><strong>${safe(data.uomValue(drone, 'aircraftName'))}</strong><p>登记标志 ${safe(data.uomValue(drone, 'registrationMark'))}<br />序号 ${safe(data.uomValue(drone, 'serialNumber'))}</p><div class="meta">${status(droneRegistrationState(drone))} <span class="source-chip">使用设备</span></div></div><button class="text-link" data-action="detail" data-kind="drone" data-id="${safe(drone.id)}">详情</button></article>`).join('')
      : '<div class="empty">暂无使用设备</div>';
    const flightRows = flights.length
      ? flights.map((flight) => `<article class="list-row"><div><strong>${safe(flight.title)}</strong><p>${safe(flightTime(flight))}<br />${safe(flightArea(flight))}<br />设备 ${safe(flight.drone || '—')}</p><div class="meta">${status(flight.executed)}</div></div><button class="text-link" data-action="detail" data-kind="flight" data-id="${safe(flight.id)}">详情</button></article>`).join('')
      : '<div class="empty">暂无该飞手提交的飞行计划</div>';
    return shell(`${title('飞手详情', true, 'profile-pilots')}<div class="profile-detail-stack"><section class="profile-detail-card"><header><div><span class="profile-kicker">飞手信息</span><h2>${safe(member.name)}</h2></div>${status(member.state)}</header><div class="detail-grid"><div><span>关联关系</span><b>${safe(member.relation)}</b></div><div><span>联系电话</span><b>${safe(member.phone)}</b></div><div><span>飞行执照</span><b>${safe(member.license || '未上传')}</b></div><div><span>使用设备</span><b>${drones.length} 架</b></div><div><span>飞行计划</span><b>${flights.length} 条</b></div></div></section><section class="profile-detail-card"><header><div><span class="profile-kicker">使用设备</span><h2>分配给该飞手的设备</h2></div></header><div class="list">${droneRows}</div></section><section class="profile-detail-card"><header><div><span class="profile-kicker">飞行申报</span><h2>该飞手提交的飞行计划</h2></div></header><div class="list">${flightRows}</div></section></div>`, 'profile');
  };
  const certificates = () => shell(`${pageToolbar('home')}${filter('搜索登记标志、序列号或产品名称')}${listActions(`<button class="secondary-btn" data-action="filter-status">${state.certificateView === '已注销' ? '查看全部' : '查看注销记录'}</button><button class="primary-btn" data-action="open-certificate-upload">上传登记证照片</button>`)}${list(roleCertificates().filter((x) => (state.certificateView === '全部' || x.state === state.certificateView) && match(`${x.id}${data.uomValue(x, 'registrationMark')}${data.uomValue(x, 'serialNumber')}${data.uomValue(x, 'aircraftName')}${x.state}`)), (x) => `<article class="list-row certificate-row"><div><strong>${safe(data.uomValue(x, 'aircraftName'))}</strong><p>登记标志 ${safe(data.uomValue(x, 'registrationMark'))}<br />序号 ${safe(data.uomValue(x, 'serialNumber'))} · 注册日期 ${safe(data.uomValue(x, 'registrationDate'))}</p><div class="meta">${certificateStatus(x.state)}</div></div><div class="row-actions"><button class="text-link" data-action="detail" data-kind="certificate" data-id="${safe(x.id)}">详情</button>${x.state !== '已注销' ? `<button class="text-link" data-action="update-certificate" data-id="${safe(x.id)}">更新</button><button class="text-link danger-text" data-action="request-cancel-certificate" data-id="${safe(x.id)}">注销</button>` : ''}</div></article>`)}`, 'services');
  const matchesDroneFilter = (drone) => {
    if (state.role === 'company') {
      if (state.droneGroup === '未注销') return droneRegistrationState(drone) !== '已注销';
      if (state.droneGroup === '已注销') return droneRegistrationState(drone) === '已注销';
      return true;
    }
    return state.droneGroup === 'all' || drone.group === state.droneGroup;
  };
  const droneListMeta = (drone) => {
    const reg = droneRegistrationState(drone);
    if (state.role === 'company') {
      const pilot = droneAssignedPilot(drone.id);
      const assignLabel = reg === '已注销' ? '已注销不可分配' : (pilot ? `已分配 ${pilot.name}` : '未分配飞手');
      return `${status(reg)} <span class="source-chip">${safe(assignLabel)}</span>`;
    }
    const companyLabel = drone.group === '使用设备' ? displayCompanyName(drone.ownerCompany || data.profiles.personal.affiliatedCompany || '') : '';
    return `${status(reg)} <span class="source-chip">${safe(drone.group)}</span>${companyLabel ? ` <span class="source-chip">${safe(companyLabel)}</span>` : ''}`;
  };
  const droneMarkLabel = (drone) => {
    const mark = data.uomValue(drone, 'registrationMark');
    return !droneIsBound(drone) || !mark || mark === '—' ? '待关联' : mark;
  };
  const drones = () => {
    const company = state.role === 'company';
    const tabs = company
      ? `<button class="${state.droneGroup === 'all' ? 'active' : ''}" data-action="group" data-value="all">全部</button><button class="${state.droneGroup === '未注销' ? 'active' : ''}" data-action="group" data-value="未注销">未注销</button><button class="${state.droneGroup === '已注销' ? 'active' : ''}" data-action="group" data-value="已注销">已注销</button>`
      : `<button class="${state.droneGroup === 'all' ? 'active' : ''}" data-action="group" data-value="all">全部</button><button class="${state.droneGroup === '持有设备' ? 'active' : ''}" data-action="group" data-value="持有设备">持有设备</button><button class="${state.droneGroup === '使用设备' ? 'active' : ''}" data-action="group" data-value="使用设备">使用设备</button>`;
    const droneSearch = `<div class="filter-bar filter-bar--with-action"><input id="search" value="${safe(state.query)}" placeholder="搜索产品名称、登记标志或序号" aria-label="搜索" /><button class="primary-btn" data-action="open-drone-create">新增设备</button></div>`;
    return shell(`${pageToolbar('home', `<div class="tabs drone-tabs">${tabs}</div>`)}${droneSearch}${list(roleDrones().filter((x) => matchesDroneFilter(x) && match(`${data.uomValue(x, 'aircraftName')}${data.uomValue(x, 'serialNumber')}${data.uomValue(x, 'registrationMark')}${x.group}`)), (x) => `<article class="list-row"><div><strong>${safe(data.uomValue(x, 'aircraftName'))}</strong><p>登记标志 ${safe(droneMarkLabel(x))}<br />序号 ${safe(data.uomValue(x, 'serialNumber'))}</p><div class="meta">${droneListMeta(x)}</div></div><button class="text-link" data-action="detail" data-kind="drone" data-id="${safe(x.id)}">详情</button></article>`)}`, 'services');
  };
  const flightTime = (item) => item.startAt && item.endAt ? `${item.startAt.replace('T', ' ')}—${item.endAt.replace('T', ' ')}` : item.time || '—';
  const flightArea = (item) => `${item.city || '宁波市鄞州区'}${item.street || item.area || '—'}`;
  const flights = () => {
    const company = state.role === 'company';
    const actionButtons = company ? '' : `<button class="primary-btn" data-action="open-flight-create">新增飞行计划</button><button class="secondary-btn" data-action="open-batch">批量导入</button>`;
    const searchHint = company ? '搜索计划名称、任务性质或提交人' : '搜索计划名称或任务性质';
    return shell(`${pageToolbar('home')}${filter(searchHint)}${listActions(actionButtons)}${list(roleFlights().filter((x) => match(`${x.title}${x.missionNature || ''}${x.purpose || ''}${x.operator || ''}`)), (x) => {
      const submitter = displayCompanyName(x.operator || '—');
      const lineExtra = company
        ? `提交人 ${safe(submitter)}<br />设备 ${safe(x.drone || '—')}`
        : `设备 ${safe(x.drone || '—')} · 通信联络 ${safe(x.operator || '—')}`;
      const rowActions = company
        ? `<button class="text-link" data-action="detail" data-kind="flight" data-id="${safe(x.id)}">详情</button>`
        : `<div class="cluster"><button class="text-link" data-action="detail" data-kind="flight" data-id="${safe(x.id)}">详情</button>${x.executed === '未执行' ? `<button class="text-link" data-action="edit-flight" data-id="${safe(x.id)}">修改</button><button class="text-link" data-action="execute" data-id="${safe(x.id)}">确认执行</button>` : ''}</div>`;
      return `<article class="list-row"><div><strong>${safe(x.title)}</strong><p>${safe(flightTime(x))}<br />${safe(flightArea(x))}<br />任务性质 ${safe(x.missionNature || x.purpose || '—')}<br />${lineExtra}</p><div class="meta">${status(x.executed)}</div></div>${rowActions}</article>`;
    })}`, 'services');
  };
  const activityCover = (activity) => `<div class="activity-cover ${safe(activity.cover)}" aria-hidden="true"><span class="cover-orbit orbit-a"></span><span class="cover-orbit orbit-b"></span><span class="cover-drone">⌁</span><small>${safe(activity.organizer)}</small></div>`;
  const canEnroll = (activity) => activity.status === '报名中' && activity.confirmState !== '已确认' && activity.enrolled < activity.capacity;
  const enrollClosedLabel = (activity) => activity.confirmState === '已确认' ? '不可报名' : activity.enrolled >= activity.capacity ? '名额已满' : activity.status;
  const activityCard = (activity) => `<article class="activity-card"><button class="activity-card-main" data-action="activity-detail" data-id="${safe(activity.id)}">${activityCover(activity)}<div class="activity-card-body"><div class="meta-line"><span>${safe(activity.status)}</span><time>${safe(activity.startTime.slice(0, 10))}</time></div><h2>${safe(activity.title)}</h2><p>${safe(activity.summary)}</p><div class="activity-location">${icon('M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z')} ${safe(activity.place)}</div></div></button><footer><span>${state.joined.has(activity.id) ? '已报名，可查看详情' : `已报名 ${activity.enrolled}/${activity.capacity}`}</span><button class="${state.joined.has(activity.id) ? 'secondary-btn' : 'primary-btn'}" data-action="${state.joined.has(activity.id) ? 'activity-detail' : 'open-enroll'}" data-id="${safe(activity.id)}" ${!state.joined.has(activity.id) && !canEnroll(activity) ? 'disabled' : ''}>${state.joined.has(activity.id) ? '查看报名' : canEnroll(activity) ? '我要报名' : enrollClosedLabel(activity)}</button></footer></article>`;
  const activities = () => {
    const published = publishedActivities();
    const visible = published.filter((item) => (!state.mineActivities || state.joined.has(item.id)) && match(`${item.title}${item.place}${item.summary}`));
    return shell(`${pageToolbar('home')}${filter('搜索活动名称或地点')}${listActions(`<button class="secondary-btn" data-action="activity-filter">${state.mineActivities ? '查看全部' : '我的报名'}</button>`)}<div class="list activity-list">${visible.length ? visible.map(activityCard).join('') : '<div class="empty">暂无符合条件的数据</div>'}</div>`, 'services');
  };
  const activityDetail = (id) => {
    const item = data.activities.find((activity) => activity.id === id) || data.activities[0];
    const joined = state.joined.has(item.id);
    return shell(`${title('活动详情', true, 'activities')}<article class="activity-detail"><div class="activity-detail-hero">${activityCover(item)}<div><span>${safe(item.status)}</span><h1>${safe(item.title)}</h1><p>${safe(item.summary)}</p></div></div><section class="detail-grid activity-time-grid"><div><span>活动开始时间</span><b>${safe(item.startTime)}</b></div><div><span>活动结束时间</span><b>${safe(item.endTime)}</b></div><div><span>报名开始时间</span><b>${safe(item.enrollStart)}</b></div><div><span>报名结束时间</span><b>${safe(item.enrollEnd)}</b></div><div><span>活动地点</span><b>${safe(item.place)}</b></div><div><span>主办单位</span><b>${safe(item.organizer)}</b></div><div><span>咨询方式</span><b>${safe(item.contact)}</b></div><div><span>报名情况</span><b>${joined ? '您已报名' : `已报名 ${item.enrolled}/${item.capacity} 人`}</b></div></section><section class="rich-content"><h2>活动介绍</h2>${item.richText.map((paragraph) => `<p>${safe(paragraph)}</p>`).join('')}</section><div class="activity-actions">${joined
      ? `<button class="secondary-btn" data-action="show-enrollment" data-id="${safe(item.id)}">查看报名信息</button><button class="danger-btn" data-action="cancel-enrollment" data-id="${safe(item.id)}">取消报名</button>`
      : `<button class="primary-btn" data-action="open-enroll" data-id="${safe(item.id)}" ${!canEnroll(item) ? 'disabled' : ''}>${canEnroll(item) ? '立即报名' : enrollClosedLabel(item)}</button>`
    }</div></article>`, 'services');
  };
  const articleEffectiveText = (item) => {
    const start = item.effectiveStart || item.effectiveDate || '';
    const end = item.effectiveEnd || '';
    if (start && end) return `生效 ${start} 至 ${end}`;
    if (start) return `生效 ${start}`;
    return '';
  };
  const articleCardMeta = (item) => {
    const dateText = item.kind === '法规' ? (articleEffectiveText(item) || item.date) : item.date;
    return `${safe(dateText)} · ${safe(item.views)} 阅读`;
  };
  const articleVisual = (item, featured = false) => {
    const video = isVideoArticle(item);
    if (item.coverImage) {
      const media = video
        ? `<video src="${safe(item.coverImage)}" muted playsinline></video>`
        : `<img src="${safe(item.coverImage)}" alt="" />`;
      return `<div class="article-visual has-cover${featured ? ' featured' : ''}" aria-hidden="true">${media}<small>${safe(item.kind)}</small>${video ? `<i>${safe(item.duration || '视频')}</i>` : ''}</div>`;
    }
    return `<div class="article-visual ${safe(item.cover || 'rule')}${featured ? ' featured' : ''}" aria-hidden="true"><span>${video ? '▶' : item.kind === '法规' ? '规' : '讯'}</span><small>${safe(item.kind)}</small>${video ? `<i>${safe(item.duration || '视频')}</i>` : ''}</div>`;
  };
  const knowledge = () => {
    const articles = data.articles
      .filter((item) => item.status !== '已下架' && (state.articleKind === 'all' || item.kind === state.articleKind) && match(`${item.title}${item.kind}${item.summary}`))
      .slice()
      .sort(compareArticles);
    return shell(`${pageToolbar('home', `<div class="tabs"><button class="${state.articleKind === 'all' ? 'active' : ''}" data-action="article-kind" data-value="all">全部</button><button class="${state.articleKind === '法规' ? 'active' : ''}" data-action="article-kind" data-value="法规">法律法规</button><button class="${state.articleKind === '公告' ? 'active' : ''}" data-action="article-kind" data-value="公告">新闻公告</button></div>`)}<section class="section">${filter('搜索标题或安全提示')}<div class="knowledge-grid">${articles.map((item) => `<article class="article-card"><button data-action="article-detail" data-id="${safe(item.id)}">${articleVisual(item)}<div><div><span class="article-kind">${safe(item.kind)}</span>${isVideoArticle(item) ? `<span class="media-badge">▶ ${safe(item.duration || '视频')}</span>` : ''}</div><h2>${safe(item.title)}</h2><p>${safe(item.summary)}</p><small>${articleCardMeta(item)}</small></div></button></article>`).join('') || '<div class="empty">暂无符合条件的科普内容</div>'}</div></section>`, 'services');
  };
  const articleDetail = (id) => {
    const item = data.articles.find((article) => article.id === id) || data.articles[0];
    const videoMode = isVideoArticle(item);
    const video = videoMode
      ? (item.coverImage
        ? `<video class="article-cover-video" src="${safe(item.coverImage)}" controls playsinline></video>`
        : `<button class="video-mock ${safe(item.cover || 'policy')}" data-action="play-video" aria-label="播放视频"><span class="video-play">▶</span><b>${safe(item.title)}</b><small>视频时长 ${safe(item.duration || '—')}</small></button>`)
      : '';
    const bylineDate = item.kind === '法规'
      ? (articleEffectiveText(item) || item.date)
      : item.date;
    return shell(`${title(item.kind === '公告' ? '新闻公告' : '安全科普', true, 'knowledge')}<article class="article-detail">${!videoMode ? articleVisual(item, true) : ''}<span class="article-kind">${safe(item.kind)}</span>${videoMode ? `<span class="media-badge">▶ 视频 ${safe(item.duration || '')}</span>` : ''}<h1>${safe(item.title)}</h1><p class="article-byline">${safe(item.source)} · ${safe(bylineDate)} · ${safe(item.views)} 阅读</p>${video}<div class="article-summary">${safe(item.summary)}</div><div class="rich-content">${item.content.map((paragraph) => `<p>${safe(paragraph)}</p>`).join('')}</div></article>`, 'services');
  };
  const renderFaqRichText = (content) => {
    const raw = String(content || '').trim();
    if (!raw) return '';
    if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
    const html = [];
    let listItems = [];
    let illustration = null;
    const flushList = () => {
      if (!listItems.length) return;
      html.push(`<ul>${listItems.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`);
      listItems = [];
    };
    const flushIllustration = () => {
      if (!illustration) return;
      html.push(`<figure class="faq-illustration"><div aria-hidden="true"><i></i><i></i><b>图文说明</b></div><figcaption>${illustration.lines.map(safe).join('<br />') || '图文说明'}</figcaption></figure>`);
      illustration = null;
    };
    raw.split(/\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        flushList();
        return;
      }
      if (line === '[图文说明]') {
        flushList();
        flushIllustration();
        illustration = { lines: [] };
        return;
      }
      if (illustration) {
        illustration.lines.push(line);
        return;
      }
      const heading = line.match(/^##\s+(.+)/);
      if (heading) {
        flushList();
        html.push(`<h3>${safe(heading[1])}</h3>`);
        return;
      }
      if (line.startsWith('- ')) {
        listItems.push(line.slice(2));
        return;
      }
      flushList();
      html.push(`<p>${safe(line)}</p>`);
    });
    flushList();
    flushIllustration();
    return html.join('');
  };
  const guides = () => {
    const guideItems = (Array.isArray(data.uomGuide.guides) && data.uomGuide.guides.length ? data.uomGuide.guides : [{ id: 'GUIDE-01', title: data.uomGuide.manualTitle, summary: '', richText: data.uomGuide.manualRichText, status: '已发布', sort: 1 }])
      .filter((item) => item.status === '已发布')
      .slice()
      .sort((a, b) => (Number(a.sort) || 999) - (Number(b.sort) || 999) || String(a.title || '').localeCompare(String(b.title || ''), 'zh'))
      .map((item, index) => ({ ...item, sequence: index + 1 }));
    const matchedGuides = guideItems.filter((item) => !state.guideQuery || `${item.title} ${item.summary} ${item.richText}`.toLowerCase().includes(state.guideQuery.toLowerCase()));
    const mobileView = state.viewport === 'mobile';
    const guidePageSize = mobileView ? matchedGuides.length || 1 : 10;
    const guideTotalPages = Math.max(1, Math.ceil(matchedGuides.length / guidePageSize));
    state.guidePage = Math.min(state.guidePage, guideTotalPages);
    const visibleGuides = matchedGuides.slice((state.guidePage - 1) * guidePageSize, state.guidePage * guidePageSize);
    const guidePagination = !mobileView && matchedGuides.length ? `<nav class="faq-pagination" aria-label="UOM 平台操作手册分页"><span aria-live="polite">共 ${matchedGuides.length} 条，第 ${state.guidePage}/${guideTotalPages} 页</span><div><button class="faq-page-button" data-action="guide-page" data-page="${state.guidePage - 1}"${state.guidePage === 1 ? ' disabled' : ''}>上一页</button>${Array.from({ length: guideTotalPages }, (_, index) => `<button class="faq-page-number${state.guidePage === index + 1 ? ' active' : ''}" data-action="guide-page" data-page="${index + 1}" aria-current="${state.guidePage === index + 1 ? 'page' : 'false'}">${index + 1}</button>`).join('')}<button class="faq-page-button" data-action="guide-page" data-page="${state.guidePage + 1}"${state.guidePage === guideTotalPages ? ' disabled' : ''}>下一页</button></div></nav>` : '';
    const faqItems = data.uomGuide.faqs
      .filter((item) => item.status === '已发布')
      .slice()
      .sort((a, b) => (Number(a.sort) || 999) - (Number(b.sort) || 999) || String(a.question || '').localeCompare(String(b.question || ''), 'zh'));
    const matchedFaqs = faqItems.filter((item) => !state.faqQuery || `${item.question} ${item.answer}`.toLowerCase().includes(state.faqQuery.toLowerCase()));
    const faqPageSize = mobileView ? matchedFaqs.length || 1 : 10;
    const faqTotalPages = Math.max(1, Math.ceil(matchedFaqs.length / faqPageSize));
    state.faqPage = Math.min(state.faqPage, faqTotalPages);
    const visibleFaqs = matchedFaqs.slice((state.faqPage - 1) * faqPageSize, state.faqPage * faqPageSize);
    const faqPagination = !mobileView && matchedFaqs.length ? `<nav class="faq-pagination" aria-label="常见问题分页"><span aria-live="polite">共 ${matchedFaqs.length} 条，第 ${state.faqPage}/${faqTotalPages} 页</span><div><button class="faq-page-button" data-action="faq-page" data-page="${state.faqPage - 1}"${state.faqPage === 1 ? ' disabled' : ''}>上一页</button>${Array.from({ length: faqTotalPages }, (_, index) => `<button class="faq-page-number${state.faqPage === index + 1 ? ' active' : ''}" data-action="faq-page" data-page="${index + 1}" aria-current="${state.faqPage === index + 1 ? 'page' : 'false'}">${index + 1}</button>`).join('')}<button class="faq-page-button" data-action="faq-page" data-page="${state.faqPage + 1}"${state.faqPage === faqTotalPages ? ' disabled' : ''}>下一页</button></div></nav>` : '';
    const tabs = `<div class="tabs guide-tabs" aria-label="UOM 平台内容分类"><button class="${state.guideTab === 'manual' ? 'active' : ''}" data-action="guide-tab" data-value="manual">UOM 平台操作手册</button><button class="${state.guideTab === 'faq' ? 'active' : ''}" data-action="guide-tab" data-value="faq">常见问题解答</button></div>`;
    const manual = `<section class="guide-manual-section"><label class="faq-search"><span>${icon('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 4 4')}</span><input id="guide-search" value="${safe(state.guideQuery)}" placeholder="搜索操作手册标题或内容" aria-label="搜索操作手册" /></label><section class="guide-flow-list">${visibleGuides.map((item) => `<article class="guide-flow-card"><header><div><span class="guide-sequence">序号：${String(item.sequence).padStart(2, '0')}</span><h2>${safe(item.title)}</h2></div><button class="secondary-btn" data-action="open-guide" data-id="${safe(item.id)}">查看详情</button></header><p>${safe(item.summary || '')}</p></article>`).join('') || '<div class="empty">暂无符合条件的操作手册</div>'}</section>${guidePagination}</section>`;
    const faq = `<section class="section guide-faq-section"><label class="faq-search"><span>${icon('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 4 4')}</span><input id="faq-search" value="${safe(state.faqQuery)}" placeholder="搜索问题关键词" aria-label="搜索常见问题" /></label><div class="faq-list faq-modal-list">${visibleFaqs.map((item) => `<article><button data-action="open-faq" data-id="${safe(item.id)}"><span>${safe(item.question)}</span><i>›</i></button></article>`).join('') || '<div class="empty">暂无符合条件的问题</div>'}</div>${faqPagination}</section>`;
    return shell(`${pageToolbar('home', tabs)}${state.guideTab === 'manual' ? manual : faq}`, 'services');
  };
  const messages = () => {
    const visible = data.messages.filter((item) => item.state !== '未推送');
    const rows = visible.filter((item) => state.messageView === 'all' || !item.read);
    return shell(`${pageToolbar('home', `<div class="tabs">${[['all', '全部'], ['unread', '未读']].map(([value, text]) => `<button class="${state.messageView === value ? 'active' : ''}" data-action="message-view" data-value="${value}">${text}</button>`).join('')}</div><button class="secondary-btn" data-action="read-all">全部标为已读</button>`)}${list(rows, (item) => `<article class="list-row"><div><strong>${safe(item.title)}</strong>${item.content ? `<p>${safe(item.content)}</p>` : ''}<div class="meta">${safe(item.time)} · ${item.read ? status('已读') : status('未读')}</div></div><button class="text-link" data-action="read" data-id="${safe(item.id)}">查看</button></article>`)}`, 'messages');
  };
  const feedbackFormControls = () => {
    const feedbackForm = data.feedbackForms.find((item) => item.id === state.feedbackFormId && item.state === '已发布') || data.feedbackForms.find((item) => item.state === '已发布') || data.feedbackForms[0];
    const fields = feedbackForm?.fields || [['反馈类型', '单选', '必填'], ['反馈标题', '文本', '必填'], ['详细说明', '多行文本', '必填']];
    const fieldKey = (name) => name.includes('类型') ? 'category' : name.includes('标题') ? 'title' : name.includes('说明') || name.includes('描述') ? 'content' : name;
    return fields.map(([name, fieldType, required], index) => {
      const key = fieldKey(name, index); const must = required === '必填' ? ' required' : '';
      const options = name.includes('类型') ? ['功能建议', '问题咨询', '活动建议', '其他'] : ['是', '否'];
      const selectedImages = state.feedbackAttachments[key] || [];
      return `<label>${safe(name)}${required === '必填' ? '' : '（选填）'}${fieldType === '多行文本' ? `<textarea${must} data-feedback-field="${safe(key)}">${safe(state.feedbackDraft[key] || '')}</textarea>` : fieldType === '单选' ? `<select data-feedback-field="${safe(key)}">${options.map((value) => `<option${state.feedbackDraft[key] === value ? ' selected' : ''}>${safe(value)}</option>`).join('')}</select>` : fieldType === '图片' || fieldType === '多张图片' ? `<input${must} type="file" accept="image/png,image/jpeg" multiple data-feedback-image-field="${safe(key)}" /><small class="form-help">可一次选择多张 JPG/PNG 图片，每张不超过 10 MB。</small>${selectedImages.length ? `<span class="feedback-uploaded-images">已选择 ${selectedImages.length} 张：${selectedImages.map(safe).join('、')}</span>` : ''}` : `<input${must} data-feedback-field="${safe(key)}" value="${safe(state.feedbackDraft[key] || '')}" maxlength="40" />`}</label>`;
    }).join('');
  };
  const feedback = () => {
    const forms = data.feedbackForms.filter((item) => item.state === '已发布');
    const selectedId = forms.some((item) => item.id === state.feedbackFormId) ? state.feedbackFormId : forms[0]?.id;
    if (selectedId && state.feedbackFormId !== selectedId) state.feedbackFormId = selectedId;
    const picker = forms.length > 1
      ? `<section class="section feedback-form-picker"><div class="tabs">${forms.map((item) => `<button class="${item.id === selectedId ? 'active' : ''}" data-action="select-feedback-form" data-id="${safe(item.id)}">${safe(item.name)}</button>`).join('')}</div></section>`
      : '';
    return shell(`${pageToolbar('profile')}${picker}<section class="section feedback-form-panel"><h2 class="feedback-form-title">提交意见反馈</h2><form class="form-stack" id="feedback-form">${feedbackFormControls()}</form><div class="actions"><button class="primary-btn" data-action="submit-feedback">提交反馈</button></div></section>`, 'profile');
  };
  const detail = (kind, id) => {
    const source = kind === 'certificate' ? roleCertificates() : kind === 'drone' ? roleDrones() : kind === 'flight' ? roleFlights() : data.articles;
    const item = source.find((x) => x.id === id) || source[0];
    const fields = kind === 'certificate' ? data.uomCertificateFields : kind === 'drone' ? data.uomDroneFields : null;
    const assignedPilot = kind === 'drone' && state.role === 'company' ? droneAssignedPilot(item.id) : null;
    const droneValue = (key) => {
      if (key === 'registrationStatus') return droneRegistrationState(item);
      if ((key === 'registrationMark' || key === 'registrationDate') && !droneIsBound(item)) return '待关联';
      const value = data.uomValue(item, key);
      return value === '' ? '—' : value;
    };
    const rows = kind === 'flight'
      ? [['计划编号', item.id], ['计划名称', item.title], ...(state.role === 'company' ? [['提交人', displayCompanyName(item.operator || '—')]] : []), ['飞行活动类型', item.activityType || '—'], ['任务性质', item.missionNature || item.purpose || '—'], ['操控模式', item.controlMode || '—'], ['飞行模式', item.flightMode || '—'], ['预计开始时间', item.startAt ? item.startAt.replace('T', ' ') : '—'], ['预计结束时间', item.endAt ? item.endAt.replace('T', ' ') : '—'], ['飞行区域', flightArea(item)], ['飞行设备', item.drone || '—'], ['通信联络方式', [item.operator, item.operatorPhone].filter(Boolean).join(' ') || '—'], ['最大飞行高度', item.maxAltitude ? `${item.maxAltitude} 米` : '—'], ['起降备降场地', item.takeoffSite || '—'], ['审批材料', item.approval || '未上传截图'], ['计划状态', item.status], ['执行状态', item.executed]]
      : fields ? fields.map(([key, label]) => [label, kind === 'drone' ? droneValue(key) : data.uomValue(item, key)]).concat(kind === 'certificate' ? [['上传时间', item.updated || '—']] : state.role === 'company' && kind === 'drone' ? [['归属', item.owner || '—'], ['分配飞手', assignedPilot ? assignedPilot.name : '未分配'], ['设备状态', droneRegistrationState(item)]] : [['归属', item.owner || '—'], ['设备类型', item.group || '—'], ...(kind === 'drone' && item.group === '使用设备' && (item.ownerCompany || data.profiles.personal.affiliatedCompany) ? [['所属公司', item.ownerCompany || data.profiles.personal.affiliatedCompany]] : []), ['设备状态', droneRegistrationState(item)]]) : Object.entries(item).map(([key, value]) => [({id:'编号',model:'设备型号',sn:'设备编号',registrationMark:'登记标志',serialNumber:'序号',holder:'持有人',source:'数据来源',owner:'归属',group:'分组',status:'状态',certificate:'登记证',drone:'关联设备',state:'状态',updated:'更新时间',title:'标题',time:'计划时间',area:'申报区域',executed:'执行状态',kind:'类别',date:'日期'})[key] || key, value]);
    const fallback = kind === 'certificate' ? 'certificates' : kind === 'drone' ? 'drones' : kind === 'flight' ? 'flights' : 'knowledge';
    const detailTitle = kind === 'certificate' ? 'UOM 登记证详情' : kind === 'drone' ? '无人机详情' : kind === 'flight' ? '飞行计划详情' : '详情';
    const canConfirmFlight = kind === 'flight' && state.role !== 'company' && item.executed === '未执行';
    const flightActions = kind === 'flight' && state.role !== 'company' ? (canConfirmFlight ? `<button class="primary-btn" data-action="edit-flight" data-id="${safe(item.id)}">修改计划</button><button class="secondary-btn" data-action="execute" data-id="${safe(item.id)}">确认执行</button>` : '<span class="modify-note">已确认执行，飞行后计划不可再修改</span>') : '';
    const bindCertificateAction = kind === 'drone' && !droneIsBound(item)
      ? `<button class="primary-btn" data-action="bind-certificate" data-id="${safe(item.id)}">上传登记证关联</button>`
      : '';
    const droneActions = kind === 'drone' && state.role === 'company' && canManageEnterprise() && droneRegistrationState(item) !== '已注销'
      ? `<button class="${bindCertificateAction ? 'secondary-btn' : 'primary-btn'}" data-action="modal" data-modal="assign-pilot" data-id="${safe(item.id)}">${assignedPilot ? '重新分配飞手' : '分配给飞手'}</button>${assignedPilot ? `<button class="secondary-btn" data-action="unassign-drone" data-id="${safe(item.id)}">取消分配</button>` : ''}`
      : '';
    const certificateImageField = kind === 'certificate' ? `<div class="certificate-field"><span>登记证截图</span><b><img class="certificate-field-image" src="${safe(item.certificateImageUrl || '../../shared/assets/uom-registration-certificate.svg')}" alt="已上传的 UOM 登记证截图" /></b></div>` : '';
    return shell(`${title(detailTitle, true, fallback)}<section class="detail-grid">${rows.map(([k,v]) => `<div><span>${safe(k)}</span><b>${safe(v)}</b></div>`).join('')}${certificateImageField}</section><div class="actions${canConfirmFlight ? ' detail-actions' : ''}">${flightActions}${bindCertificateAction}${droneActions}</div>`, 'services');
  };
  const ocrLabels = { registrationMark:'登记标志', manufacturerModel:'航空器型号和制造人', serialNumber:'序号', aircraftName:'产品名称', emptyWeight:'空机重量', maxTakeoffWeight:'最大起飞重量', aircraftType:'类型', issuedTo:'本证发给', mobilePhone:'联系手机', registrationStatus:'状态', registrationDate:'注册日期' };
  const certificatePreview = () => state.ocr.image ? `<img class="certificate-preview-image" src="${state.ocr.image}" alt="已上传的 UOM 登记证" />` : `<div class="certificate-placeholder" aria-label="UOM 登记证字段示意"><b>中国民用航空局</b><strong>无人机实名登记证</strong><span>CERTIFICATE OF UAS REGISTRATION</span><i>登记信息图片</i></div>`;
  const certificateModalBody = () => {
    if (state.ocr.status === 'recognizing') return `<div class="recognition-state">${certificatePreview()}<span class="recognition-loader" aria-hidden="true"></span><h3>正在识别登记证</h3><p>正在提取登记标志、序列号、机型及权属信息…</p></div>`;
    if (state.ocr.status === 'review') return `<div class="ocr-workspace"><aside class="certificate-preview">${certificatePreview()}<div class="recognition-success">${icon('M5 12l4 4L19 6')}<span><b>识别完成</b><small>请核对后保存</small></span></div></aside><form class="ocr-form" id="ocr-form">${Object.entries(ocrLabels).map(([key,label]) => {
      const registrationStatusControl = key === 'registrationStatus' && (state.certificateMode === 'update' || state.certificateMode === 'cancel')
        ? state.certificateMode === 'cancel'
          ? `<select required data-ocr-field="${key}"><option selected>已注销</option></select><small>注销须上传 UOM 已注销登记证，保存后关联无人机同步注销。</small>`
          : `<select required data-ocr-field="${key}"><option${state.ocr.values[key] === '已注销' ? '' : ' selected'}>正常</option><option${state.ocr.values[key] === '已注销' ? ' selected' : ''}>已注销</option></select><small>选择“已注销”后，保存将同步注销关联无人机。</small>`
        : `<input required data-ocr-field="${key}" value="${safe(state.ocr.values[key])}" />`;
      return `<label class="${key === 'manufacturerModel' || key === 'aircraftType' ? 'wide' : ''}"><span>${label}<i>OCR</i></span>${registrationStatusControl}</label>`;
    }).join('')}</form></div>`;
    const uploadHint = state.certificateMode === 'cancel'
      ? '<b>上传 UOM 已注销登记证照片</b><small>支持 JPG、PNG，单张不超过 10 MB，识别后确认注销并同步关联无人机</small>'
      : '<b>上传后自动识别登记证字段</b><small>支持 JPG、PNG，单张不超过 10 MB，建议上传清晰完整的登记证照片</small>';
    return `<label class="upload-drop" for="certificate-file"><input id="certificate-file" type="file" accept="image/png,image/jpeg" /><span class="upload-icon">${icon('M12 16V4M7 9l5-5 5 5M5 20h14')}</span>${uploadHint}<em>选择图片</em></label>${state.ocr.status === 'error' ? `<div class="upload-error" role="alert">${safe(state.ocr.message || '图片无法识别，请重新上传 JPG 或 PNG 图片。')}</div>` : ''}`;
  };
  const modal = () => {
    const type = state.modal;
    if (type === 'execute-flight') {
      const item = data.flights.find((flight) => flight.id === state.pendingExecution);
      if (!item || item.executed !== '未执行') return '';
      return `<div class="modal-layer modal-layer--center" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal execution-confirm-modal"><span class="modal-kicker">飞行计划</span><h2 id="modal-title" tabindex="-1">确认执行飞行计划？</h2><p>确认后将记录本次计划的执行状态。</p><dl class="execution-confirm-card"><div><dt>计划名称</dt><dd>${safe(item.title)}</dd></div><div><dt>预计时间</dt><dd>${safe(flightTime(item))}</dd></div></dl><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">暂不确认</button><button class="primary-btn" data-action="confirm-execute">确认执行</button></div></section></div>`;
    }
    if (type === 'faq-detail') {
      const item = data.uomGuide.faqs.find((faq) => faq.id === state.selectedFaq && faq.status === '已发布');
      return `<div class="modal-layer modal-layer--center" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal faq-detail-modal"><div class="modal-heading"><div><span class="profile-kicker">常见问题解答</span><h2 id="modal-title" tabindex="-1">${safe(item?.question || '问题解答')}</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭">×</button></div>${item ? `<div class="faq-rich-content">${renderFaqRichText(item.answer)}</div><small class="faq-update-time">更新时间：${safe(item.updated || data.uomGuide.updated)}</small>` : '<div class="empty">该问题暂不可查看</div>'}<div class="modal-actions"><button class="primary-btn" data-action="close-modal">我知道了</button></div></section></div>`;
    }
    if (type === 'guide-detail') {
      const item = (Array.isArray(data.uomGuide.guides) ? data.uomGuide.guides : []).find((guide) => guide.id === state.selectedGuide && guide.status === '已发布');
      return `<div class="modal-layer modal-layer--center" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal faq-detail-modal guide-detail-modal"><div class="modal-heading"><div><span class="profile-kicker">UOM 平台操作手册</span><h2 id="modal-title" tabindex="-1">${safe(item?.title || '图文说明')}</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭">×</button></div>${item ? `<p class="guide-detail-summary">${safe(item.summary || '')}</p><div class="faq-rich-content">${renderFaqRichText(item.richText || '')}</div><small class="faq-update-time">更新时间：${safe(item.updated || data.uomGuide.updated)}</small>` : '<div class="empty">该手册暂不可查看</div>'}<div class="modal-actions"><button class="primary-btn" data-action="close-modal">我知道了</button></div></section></div>`;
    }
    if (type === 'enrollment') {
      const item = data.activities.find((activity) => activity.id === state.selectedActivity);
      if (!item) return '';
      const enrollFields = item.enrollForm && item.enrollForm.length ? item.enrollForm : [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']];
      const enrollControls = enrollFields.map((row) => {
        const [name, fieldType, required, hint = '', options = ''] = row;
        const must = required === '必填' ? ' required' : '';
        const placeholder = hint || `请填写${name}`;
        const preset = name.includes('姓名') || name.includes('报名人') || name.includes('联系人') ? safe(data.profiles[state.role].name) : name.includes('电话') || name.includes('手机') || fieldType === '手机号' || fieldType === '电话' ? safe(data.profiles[state.role].phone) : '';
        const isSelect = fieldType === '单选' || fieldType === '下拉框' || fieldType === '多选';
        const isPhone = fieldType === '手机号' || fieldType === '电话';
        const isTextarea = fieldType === '多行文本';
        if (isSelect) {
          const opts = String(options || '是、否').split(/[、,，]/).map((x) => x.trim()).filter(Boolean);
          return `<label>${safe(name)}${required === '必填' ? '' : '（选填）'}<select name="${safe(name)}"${must}><option value="">${safe(placeholder)}</option>${opts.map((opt) => `<option>${safe(opt)}</option>`).join('')}</select></label>`;
        }
        if (isPhone) return `<label>${safe(name)}${required === '必填' ? '' : '（选填）'}<input type="tel" inputmode="numeric" name="${safe(name)}"${must} value="${preset}" placeholder="${safe(placeholder)}" maxlength="11" /></label>`;
        if (isTextarea) return `<label>${safe(name)}${required === '必填' ? '' : '（选填）'}<textarea name="${safe(name)}"${must} placeholder="${safe(placeholder)}"></textarea></label>`;
        return `<label>${safe(name)}${required === '必填' ? '' : '（选填）'}<input name="${safe(name)}"${must} value="${preset}" placeholder="${safe(placeholder)}" /></label>`;
      }).join('');
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">确认活动报名</h2><div class="enrollment-summary"><b>${safe(item.title)}</b><span>${safe(item.startTime)} 至 ${safe(item.endTime)}</span><span>${safe(item.place)}</span></div><form class="form-stack" id="enrollment-form">${enrollControls}</form><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-enrollment">确认报名</button></div></section></div>`;
    }
    if (type === 'enrollment-record') {
      const item = data.activities.find((activity) => activity.id === state.selectedActivity);
      if (!item) return '';
      const applicant = state.role === 'personal' ? '陈*' : '王*';
      const enrollment = data.enrollments.find((entry) => entry.activityId === item.id && entry.applicant === applicant) || {};
      const formData = enrollment.formData || { 报名人: data.profiles[state.role].name, 联系电话: data.profiles[state.role].phone };
      const submittedFields = Object.entries(formData).filter(([, value]) => String(value || '').trim()).map(([key, value]) => `<span>${safe(key)}：${safe(value)}</span>`).join('');
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">报名信息</h2><div class="enrollment-summary"><b>${safe(item.title)}</b><span>报名状态：已报名</span><span>活动时间：${safe(item.startTime)} 至 ${safe(item.endTime)}</span><span>活动地点：${safe(item.place)}</span>${submittedFields}</div><div class="modal-actions"><button class="primary-btn" data-action="close-modal">我知道了</button></div></section></div>`;
    }
    if (type === 'feedback') {
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">提交意见反馈</h2><form class="form-stack" id="feedback-form">${feedbackFormControls()}</form><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-feedback">提交反馈</button></div></section></div>`;
    }
    if (type === 'certificate') {
      const reviewing = state.ocr.status === 'review';
      const certificateTitle = state.certificateMode === 'cancel' ? '上传注销登记证' : state.certificateMode === 'update' ? '更新登记证照片' : '上传登记证照片';
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal ocr-modal"><div class="modal-heading"><div><span class="profile-kicker">UOM 登记证 OCR</span><h2 id="modal-title" tabindex="-1">${certificateTitle}</h2></div><button class="icon-button" data-action="close-modal" aria-label="关闭">×</button></div>${certificateModalBody()}<div class="modal-actions">${state.ocr.status !== 'recognizing' ? '<button class="secondary-btn" data-action="close-modal">取消</button>' : ''}${reviewing ? `<button class="secondary-btn" data-action="reset-ocr">重新上传</button><button class="${state.certificateMode === 'cancel' ? 'danger-btn' : 'primary-btn'}" data-action="confirm-ocr">${state.certificateMode === 'cancel' ? '确认注销' : '确认并保存'}</button>` : ''}</div></section></div>`;
    }
    if (type === 'profile' || type === 'company-profile') return '';
    if (type === 'license') {
      const p = data.profiles.personal;
      const previewImage = state.licenseImage || state.licenseSavedImage;
      const preview = previewImage ? `<img class="license-preview-image" src="${previewImage}" alt="已选择的飞行执照图片" />` : `<div class="license-preview-placeholder"><b>飞行员操作执照</b><span>${p.licenseFileName ? safe(p.licenseFileName) : '请选择 JPG 或 PNG 图片'}</span></div>`;
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">飞行员执照管理</h2><div class="license-upload">${preview}<label class="upload-drop" for="license-file"><input id="license-file" type="file" accept="image/png,image/jpeg" /><span class="upload-icon">${icon('M12 16V4M7 9l5-5 5 5M5 20h14')}</span><b>选择执照图片</b><small>支持 JPG、PNG，单张不超过 10 MB</small><em>上传图片</em></label></div><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="save-license">确认提交</button></div></section></div>`;
    }
    if (type === 'flight') {
      const editing = state.flightMode === 'edit';
      const draft = state.flightDraft;
      const droneOptions = roleDrones().filter((x) => !['已注销', '已禁用'].includes(x.status)).map((x) => { const name = data.uomValue(x, 'aircraftName'); return `<option value="${safe(name)}"${draft.drone === name ? ' selected' : ''}>${safe(flightDroneLabel(x))}</option>`; }).join('');
      const selectOptions = (field, options) => options.map((value) => `<option value="${safe(value)}"${(draft[field] || '') === value ? ' selected' : ''}>${value || '请选择'}</option>`).join('');
      const shot = state.flightShot === 'recognizing'
        ? `<div class="recognition-state"><span class="recognition-loader" aria-hidden="true"></span><h3>正在识别审批截图</h3><p>正在提取计划时间、区域与设备信息…</p></div>`
        : state.flightShot === 'done'
          ? `<div class="recognition-success">${icon('M5 12l4 4L19 6')}<span><b>审批截图识别完成</b><small>字段已自动回填，可手动修正</small></span></div><div class="actions" style="margin:8px 0 4px"><button class="text-link" data-action="reset-flight-shot">重新上传截图</button></div>`
          : `<label class="upload-drop slim" for="flight-approval-file"><input id="flight-approval-file" type="file" accept="image/png,image/jpeg" /><span class="upload-icon">${icon('M12 16V4M7 9l5-5 5 5M5 20h14')}</span><b>已在 UOM 审批通过？上传截图自动识别</b><small>支持 JPG、PNG；识别后自动回填计划字段，也可全部手动填写</small><em>选择截图</em></label>`;
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">${editing ? '修改飞行计划' : '新增飞行计划'}</h2>${shot}<form class="form-stack" id="prototype-form"><label>计划名称<input required data-flight-field="title" value="${safe(draft.title || '')}" placeholder="如：河道巡查航拍" /></label><label>飞行活动类型<select required data-flight-field="activityType">${selectOptions('activityType', ['一般飞行活动', '特殊飞行活动'])}</select></label><label>任务性质<select required data-flight-field="missionNature">${selectOptions('missionNature', ['个人娱乐', '航拍摄影', '巡检巡查', '培训演练', '其他'])}</select></label><label>操控模式<select data-flight-field="controlMode">${selectOptions('controlMode', ['', '视距内飞行', '超视距飞行'])}</select></label><label>飞行模式<select data-flight-field="flightMode">${selectOptions('flightMode', ['', '手动飞行', '自主飞行'])}</select></label><label>预计开始时间<input required type="datetime-local" data-flight-field="startAt" value="${safe(draft.startAt || '')}" /></label><label>预计结束时间<input required type="datetime-local" data-flight-field="endAt" value="${safe(draft.endAt || '')}" /></label><label>飞行区域<div class="fixed-field"><span>宁波市鄞州区</span><input required data-flight-field="street" value="${safe(draft.street || '')}" placeholder="请填写街道名称" /></div></label><label>飞行设备<select data-flight-field="drone">${droneOptions}</select></label><label>通信联络方式<div class="fixed-field"><input required data-flight-field="operator" value="${safe(draft.operator || '')}" placeholder="联系人" /><input required data-flight-field="operatorPhone" value="${safe(draft.operatorPhone || '')}" placeholder="联系电话" /></div></label><label>最大飞行高度<div class="fixed-field"><input required data-flight-field="maxAltitude" value="${safe(draft.maxAltitude || '')}" placeholder="如 110" inputmode="numeric" /><span>米</span></div></label><label>起降备降场地<input data-flight-field="takeoffSite" value="${safe(draft.takeoffSite || '')}" placeholder="请填写起降或备降场地" /></label></form><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-flight">${editing ? '保存修改' : '提交计划'}</button></div></section></div>`;
    }
    if (type === 'batch') {
      if (state.batchStage === 'preview') {
        const valid = state.batchRows.filter((row) => row.valid).length;
        return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal batch-modal"><h2 id="modal-title" tabindex="-1">导入预览</h2><p>共解析 ${state.batchRows.length} 条计划：${valid} 条校验通过，${state.batchRows.length - valid} 条校验失败。确认后仅导入校验通过的计划。</p><div class="batch-table"><table><thead><tr><th>计划名称</th><th>时间段</th><th>区域</th><th>设备</th><th>校验结果</th></tr></thead><tbody>${state.batchRows.map((row) => `<tr><td>${safe(row.title)}</td><td>${safe(row.time)}</td><td>${safe(row.area || '—')}</td><td>${safe(row.drone)}</td><td>${row.valid ? '<span class="status success">通过</span>' : `<span class="status danger">${safe(row.reason)}</span>`}</td></tr>`).join('')}</tbody></table></div><div class="modal-actions"><button class="secondary-btn" data-action="reset-batch">重新选择文件</button><button class="primary-btn" data-action="confirm-batch">确认导入 ${valid} 条</button></div></section></div>`;
      }
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">批量导入飞行计划</h2><section class="template-download-card" aria-label="飞行计划 Excel 模板"><span class="template-file-icon" aria-hidden="true">${icon('M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6')}<i>XLSX</i></span><div class="template-download-copy"><b>飞行计划导入模板</b><span>已包含字段说明与示例数据</span></div><a class="template-download-action" href="../../shared/assets/flight-plan-batch-template.xlsx" download="飞行计划批量导入模板.xlsx">下载模板${icon('M12 4v10M8 10l4 4 4-4M5 20h14')}</a></section><label class="upload-drop slim" for="batch-file"><input id="batch-file" type="file" accept=".csv,.xls,.xlsx" /><span class="upload-icon">${icon('M12 16V4M7 9l5-5 5 5M5 20h14')}</span><b>选择计划文件</b><small>支持 CSV、XLS、XLSX 模板文件</small><em>选择文件</em></label><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button></div></section></div>`;
    }
    if (type === 'supplement') {
      const draft = state.supplementDraft;
      const streets = data.yinzhouStreets || [];
      const districtOptions = [`<option value="">请选择鄞州区街道</option>`, ...streets.map((street) => `<option${draft.district === street ? ' selected' : ''}>${safe(street)}</option>`)].join('');
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">编辑个人补充信息</h2><form class="form-stack" id="supplement-form"><label>所属地<select data-supplement-field="district">${districtOptions}</select></label><label>紧急联系人<input data-supplement-field="emergencyContact" value="${safe(draft.emergencyContact || '')}" /></label><label>紧急联系电话<input type="tel" inputmode="numeric" data-supplement-field="emergencyPhone" value="${safe(draft.emergencyPhone || '')}" /></label></form><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="save-supplement">保存补充信息</button></div></section></div>`;
    }
    if (type === 'company-supplement') {
      const draft = state.companyDraft;
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">编辑企业补充信息</h2><form class="form-stack" id="company-form"><label>无人机主要用途<input data-company-field="droneUsage" value="${safe(draft.droneUsage || '')}" placeholder="如巡检、航拍影像服务" /></label><label>安全负责人<input data-company-field="safetyOfficer" value="${safe(draft.safetyOfficer || '')}" /></label><label>安全负责人电话<input data-company-field="safetyPhone" value="${safe(draft.safetyPhone || '')}" /></label></form><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="save-company-supplement">保存补充信息</button></div></section></div>`;
    }
    if (type === 'member') {
      const draft = state.memberDraft;
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">添加关联用户</h2><form class="form-stack" id="member-form"><label>关联用户姓名<input required data-member-field="name" value="${safe(draft.name || '')}" /></label><label>关联关系<select data-member-field="relation">${['法定代表人', '授权经办人', '安全负责人'].map((value) => `<option${draft.relation === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label><label>联系电话<input required data-member-field="phone" value="${safe(draft.phone || '')}" /></label></form><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-member">确认添加</button></div></section></div>`;
    }
    if (type === 'drone-create') {
      const draft = state.droneDraft;
      const typeOptions = ['多旋翼航空器', '多桨或多轴航空器', '固定翼航空器', '直升机航空器', '其他'].map((value) => `<option${draft.aircraftType === value ? ' selected' : ''}>${value}</option>`).join('');
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">新增设备</h2><form class="form-stack" id="drone-create-form"><label>航空器型号和制造人<input required data-drone-field="manufacturerModel" value="${safe(draft.manufacturerModel || '')}" placeholder="如：H20 / 某制造商" /></label><label>序号<input required data-drone-field="serialNumber" value="${safe(draft.serialNumber || '')}" placeholder="设备出厂序号" /></label><label>产品名称<input required data-drone-field="aircraftName" value="${safe(draft.aircraftName || '')}" placeholder="如：安巡 H20" /></label><label>空机重量<input required data-drone-field="emptyWeight" value="${safe(draft.emptyWeight || '')}" placeholder="如：1.35 kg" /></label><label>最大起飞重量<input required data-drone-field="maxTakeoffWeight" value="${safe(draft.maxTakeoffWeight || '')}" placeholder="如：1.35 kg" /></label><label>类型<select required data-drone-field="aircraftType">${typeOptions}</select></label></form><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-drone-create">保存设备</button></div></section></div>`;
    }
    if (type === 'assign-pilot') {
      const drone = data.drones.find((item) => item.id === state.assignDraft.droneId);
      const pilots = companyPilots().filter((member) => member.state !== '已停用');
      const options = pilots.map((pilot) => {
        const count = (pilot.assignedDroneIds || []).length;
        return `<option value="${safe(pilot.id)}"${state.assignDraft.pilotId === pilot.id ? ' selected' : ''}>${safe(pilot.name)}（使用设备 ${count} 架）</option>`;
      }).join('');
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">分配给飞手</h2><p>将「${safe(data.uomValue(drone || {}, 'aircraftName'))}」分配给企业飞手后，该设备计入飞手的使用设备。</p><form class="form-stack" id="assign-pilot-form"><label>选择飞手<select required data-assign-field="pilotId"><option value="">请选择飞手</option>${options}</select></label></form><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-assign-pilot">确认分配</button></div></section></div>`;
    }
    if (type === 'member-pilot') {
      const member = data.companyMembers.find((item) => item.id === state.tagDraft.id) || {};
      const draft = state.tagDraft;
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal pilot-set-modal"><h2 id="modal-title" tabindex="-1">设置飞手</h2><div class="pilot-set-card"><div class="pilot-set-user"><span class="member-avatar">${safe((member.name || '?').slice(0, 1))}</span><div><b>${safe(member.name || '')}</b><small>${safe(member.relation || '')} · ${safe(member.phone || '')}</small></div></div><label class="pilot-switch"><span class="pilot-switch-copy"><b>飞手</b><small>开启后出现在「飞手管理」，并可分配使用设备</small></span><input type="checkbox" data-tag-field="isPilot"${draft.isPilot ? ' checked' : ''} /><i class="switch-ui" aria-hidden="true"></i></label></div><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-member-pilot">保存</button></div></section></div>`;
    }
    const map = { drone:['同步设备台账','从登记证摘要更新设备字段。'],guide:['UOM 操作手册','请先完成国家平台登记，再将登记信息摘要归集至区级台账。'],faq:['常见问题','没有执照是否能飞？本系统收集执照信息，实际飞行请遵守相关法规和管理要求。'] };
    const [heading, copy] = map[type] || ['操作确认','确认执行此操作？'];
    const form = ['profile'].includes(type) ? `<form class="form-stack" id="prototype-form"><label>事项名称<input required placeholder="请输入内容" /></label><label>说明<textarea required placeholder="请输入说明"></textarea></label></form>` : '';
    return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">${heading}</h2><p>${copy}</p>${form}<div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-modal">确认提交</button></div></section></div>`;
  };
  const match = (text) => !state.query || text.toLowerCase().includes(state.query.toLowerCase());
  const syncViewportChrome = (name) => {
    const stage = document.querySelector('.viewport-stage');
    if (stage) stage.dataset.viewport = state.viewport;
    const isLogin = !state.role || name === 'login';
    app.className = `phone-shell viewport-${state.viewport}${isLogin ? ' is-login' : ''}${!isLogin && name === 'home' ? ' is-home' : ''}`;
    document.querySelectorAll('[data-action="set-viewport"]').forEach((button) => {
      const active = button.dataset.value === state.viewport;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };
  const render = () => {
    const current = route();
    const [name, id] = current.split('/');
    if (name === 'feedback-detail') { location.hash = '#/feedback'; return; }
    const page = name === 'detail' ? () => detail(id, location.hash.split('/')[3]) : name === 'activity' ? () => activityDetail(id) : name === 'article' ? () => articleDetail(id) : name === 'profile-pilot' ? () => profilePilotDetail(id) : ({login,home,services,profile,'profile-details':profileDetails,'profile-license':profileLicense,'profile-members':profileMembers,'profile-pilots':profilePilots,certificates,drones,flights,activities,knowledge,guides,messages,feedback})[name] || home;
    syncViewportChrome(name);
    app.innerHTML = present(!state.role || name === 'login' ? login() : page());
    if (state.modal) setTimeout(() => document.querySelector('#modal-title')?.focus(), 0);
  };
  const announce = (text) => { state.toast = text; render(); setTimeout(() => { state.toast = ''; render(); }, 2200); };
  const closeModal = () => {
    const returnFocus = state.returnFocus;
    state.ocrRequest += 1;
    state.pendingDrone = '';
    state.modal = null;
    render();
    if (returnFocus) setTimeout(() => document.querySelector(returnFocus)?.focus(), 0);
  };
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-go],[data-action]'); if (!target) return;
    if (target.dataset.go) { go(target.dataset.go); return; }
    const action = target.dataset.action;
    if (action === 'set-viewport') {
      const next = target.dataset.value === 'desktop' ? 'desktop' : 'mobile';
      if (state.viewport === next) return;
      state.viewport = next;
      try { sessionStorage.setItem(viewportStorageKey, next); } catch (_) { /* ignore */ }
      render();
      return;
    }
    if (action === 'login') {
      state.role = target.dataset.value;
      state.query = '';
      state.certificateView = '全部';
      state.droneGroup = 'all';
      state.messageView = 'all';
      state.mineActivities = false;
      if (route() === 'home') render(); else go('home');
    }
    if (action === 'logout') {
      state.role = null;
      state.modal = null;
      state.query = '';
      state.certificateView = '全部';
      state.droneGroup = 'all';
      if (route() === 'login') render(); else go('login');
    }
    if (action === 'modal') {
      state.modal = target.dataset.modal;
      state.returnFocus = `[data-action="modal"][data-modal="${safe(target.dataset.modal)}"]`;
      if (state.modal === 'profile' && state.role === 'personal') state.profileDraft = { name: data.profiles.personal.name || '', idNumber: data.profiles.personal.idNumber || '', phone: data.profiles.personal.phone || '', address: data.profiles.personal.address || '' };
      if (state.modal === 'member') state.memberDraft = { name: '', relation: '授权经办人', phone: '' };
      if (state.modal === 'assign-pilot') {
        const droneId = target.dataset.id || '';
        const current = droneAssignedPilot(droneId);
        state.assignDraft = { droneId, pilotId: current?.id || '' };
      }
      if (state.modal === 'member-pilot') {
        if (!canManageEnterprise()) { announce('仅法定代表人可设置飞手'); state.modal = null; return; }
        const member = data.companyMembers.find((item) => item.id === target.dataset.id);
        if (!member || member.relation === '法定代表人' || member.state === '已停用') { announce('该用户不可设置飞手'); state.modal = null; return; }
        state.tagDraft = { id: member.id, isPilot: !!member.isPilot };
      }
      if (state.modal === 'supplement') state.supplementDraft = { ...(data.profiles.personal.supplement || {}) };
      if (state.modal === 'company-supplement') state.companyDraft = { ...(data.profiles.company.supplement || {}) };
      if (state.modal === 'company-profile') state.companyDraft = { name: data.profiles.company.name || '', creditCode: data.profiles.company.creditCode || '', verified: data.profiles.company.verified || '已认证', contact: data.profiles.company.contact || '', phone: data.profiles.company.phone || '', syncState: data.profiles.company.syncState || '已同步' };
      if (state.modal === 'license') state.licenseImage = '';
      if (state.modal === 'certificate') { state.certificateMode = 'create'; state.pendingCertificate = ''; state.ocr = emptyOcr(); }
      if (state.modal === 'flight') {
        if (state.role === 'company') { announce('企业账号仅可查看本公司飞行计划'); state.modal = null; return; }
        const profile = data.profiles[state.role] || {};
        const firstDrone = roleDrones().find((x) => !['已注销', '已禁用'].includes(x.status));
        state.flightMode = 'create';
        state.pendingFlight = '';
        state.flightShot = 'empty';
        state.flightShotRequest += 1;
        state.flightDraft = { title: '', activityType: '一般飞行活动', missionNature: '个人娱乐', controlMode: '', flightMode: '', startAt: '', endAt: '', city: '宁波市鄞州区', street: '', purpose: '', drone: data.uomValue(firstDrone || {}, 'aircraftName'), operator: profile.name || '', operatorPhone: profile.phone || '', maxAltitude: '', takeoffSite: '' };
      }
      render();
    }
    if (action === 'open-flight-create') {
      if (state.role === 'company') { announce('企业账号仅可查看本公司飞行计划'); return; }
      const profile = data.profiles[state.role];
      const firstDrone = roleDrones().find((x) => !['已注销', '已禁用'].includes(x.status));
      state.modal = 'flight';
      state.returnFocus = '[data-action="open-flight-create"]';
      state.flightMode = 'create';
      state.pendingFlight = '';
      state.flightShot = 'empty';
      state.flightShotRequest += 1;
      state.flightDraft = { title: '', activityType: '一般飞行活动', missionNature: '个人娱乐', controlMode: '', flightMode: '', startAt: '', endAt: '', city: '宁波市鄞州区', street: '', purpose: '', drone: data.uomValue(firstDrone || {}, 'aircraftName'), operator: profile.name, operatorPhone: profile.phone, maxAltitude: '', takeoffSite: '' };
      render();
    }
    if (action === 'edit-flight') {
      if (state.role === 'company') { announce('企业账号仅可查看本公司飞行计划'); return; }
      const item = data.flights.find((x) => x.id === target.dataset.id);
      if (!item) return;
      if (item.executed !== '未执行') { announce('该计划已确认执行，飞行后不可修改'); return; }
      state.modal = 'flight';
      state.returnFocus = `[data-action="edit-flight"][data-id="${safe(target.dataset.id)}"]`;
      state.flightMode = 'edit';
      state.pendingFlight = item.id;
      state.flightShot = item.approval && item.approval.includes('已上传') ? 'done' : 'empty';
      state.flightShotRequest += 1;
      state.flightDraft = { title: item.title, activityType: item.activityType || '一般飞行活动', missionNature: item.missionNature || item.purpose || '个人娱乐', controlMode: item.controlMode || '', flightMode: item.flightMode || '', startAt: item.startAt || '', endAt: item.endAt || '', city: item.city || '宁波市鄞州区', street: item.street || item.area || '', purpose: item.purpose || item.missionNature || '', drone: item.drone, operator: item.operator || '', operatorPhone: item.operatorPhone || '', maxAltitude: item.maxAltitude || '', takeoffSite: item.takeoffSite || '' };
      render();
    }
    if (action === 'reset-flight-shot') { state.flightShot = 'empty'; state.flightShotRequest += 1; render(); }
    if (action === 'submit-flight' || (action === 'submit-modal' && state.modal === 'flight')) {
      if (state.role === 'company') { state.modal = null; announce('企业账号仅可查看本公司飞行计划'); return; }
      const form = document.querySelector('#prototype-form'); if (form && !form.reportValidity()) return;
      const draft = state.flightDraft;
      const stamp = `${data.now} 09:30`;
      if (state.flightMode === 'edit') {
        const item = data.flights.find((x) => x.id === state.pendingFlight);
        if (!item || item.executed !== '未执行') { state.modal = null; announce('该计划已确认执行，飞行后不可修改'); return; }
        Object.assign(item, { title: draft.title, activityType: draft.activityType, missionNature: draft.missionNature, controlMode: draft.controlMode, flightMode: draft.flightMode, startAt: draft.startAt, endAt: draft.endAt, city: '宁波市鄞州区', street: draft.street, purpose: draft.missionNature || draft.purpose, time: flightTime(draft), area: flightArea(draft), drone: draft.drone, operator: draft.operator, operatorPhone: draft.operatorPhone, maxAltitude: draft.maxAltitude, takeoffSite: draft.takeoffSite, approval: state.flightShot === 'done' ? '已上传 UOM 审批截图' : item.approval });
        item.history = [...(item.history || []), { time: stamp, action: '修改计划', detail: '飞行前修改计划信息（mock）' }];
        persistPublicService();
        state.modal = null;
        announce('飞行计划已修改，变更已记入记录');
        return;
      }
      data.flights.unshift({ id: `FP-${data.now.replaceAll('-', '')}-${String(data.flights.length + 21).padStart(3, '0')}`, title: draft.title, activityType: draft.activityType, missionNature: draft.missionNature, controlMode: draft.controlMode, flightMode: draft.flightMode, startAt: draft.startAt, endAt: draft.endAt, city: '宁波市鄞州区', street: draft.street, purpose: draft.missionNature || draft.purpose, time: flightTime(draft), area: flightArea(draft), drone: draft.drone, operator: draft.operator, operatorPhone: draft.operatorPhone, maxAltitude: draft.maxAltitude, takeoffSite: draft.takeoffSite, owner: data.profiles[state.role].name, accountRole: state.role, approval: state.flightShot === 'done' ? '已上传 UOM 审批截图' : '未上传截图', status: '已登记', executed: '未执行', history: [{ time: stamp, action: '新增计划', detail: state.flightShot === 'done' ? '提交飞行计划并上传 UOM 审批截图（mock）' : '手动填写并提交飞行计划（mock）' }] });
      persistPublicService();
      state.modal = null;
      announce('飞行计划已提交，已归集至区级台账');
      return;
    }
    if (action === 'open-batch') {
      if (state.role === 'company') { announce('企业账号仅可查看本公司飞行计划'); return; }
      state.modal = 'batch'; state.returnFocus = '[data-action="open-batch"]'; state.batchStage = 'intro'; state.batchRows = null; render();
    }
    if (action === 'reset-batch') { state.batchStage = 'intro'; state.batchRows = null; render(); }
    if (action === 'confirm-batch') {
      if (state.role === 'company') { state.modal = null; announce('企业账号仅可查看本公司飞行计划'); return; }
      const valid = (state.batchRows || []).filter((row) => row.valid);
      const failed = (state.batchRows || []).length - valid.length;
      valid.forEach((row, index) => {
        data.flights.unshift({ id: `FP-${data.now.replaceAll('-', '')}-${String(data.flights.length + 41 + index).padStart(3, '0')}`, title: row.title, time: row.time, area: row.area, drone: row.drone, operator: data.profiles[state.role].name, operatorPhone: data.profiles[state.role].phone, owner: data.profiles[state.role].name, accountRole: state.role, approval: '批量导入（模板）', status: '已登记', executed: '未执行', history: [{ time: `${data.now} 09:30`, action: '批量导入', detail: '通过模板批量导入计划（mock）' }] });
      });
      persistPublicService();
      state.modal = null;
      state.batchStage = 'intro';
      state.batchRows = null;
      announce(`批量导入完成：成功 ${valid.length} 条，失败 ${failed} 条`);
    }
    if (action === 'play-video') announce('正在播放示例视频（mock 占位，不加载真实视频文件）');
    if (action === 'open-uom-platform') announce('已进入 UOM 平台申报入口演示；当前静态原型不连接真实平台');
    if (action === 'message-view') { state.messageView = target.dataset.value; render(); }
    if (action === 'select-feedback-form') { state.feedbackFormId = target.dataset.id; state.feedbackDraft = {}; state.feedbackAttachments = {}; render(); }
    if (action === 'refresh-profile-sync') {
      const profile = data.profiles[state.role];
      profile.syncState = '已同步';
      if (state.role === 'personal') profile.verified = profile.verified || '已实名认证';
      if (state.role === 'company') profile.verified = profile.verified || '已认证';
      persistProfile();
      announce('已从浙里办同步最新基本信息');
      return;
    }
    if (action === 'save-supplement') {
      data.profiles.personal.supplement = data.normalizePersonalSupplement ? data.normalizePersonalSupplement(state.supplementDraft) : { ...state.supplementDraft };
      persistProfile();
      state.modal = null;
      announce('个人补充信息已保存');
    }
    if (action === 'save-company-supplement') {
      data.profiles.company.supplement = {
        droneUsage: state.companyDraft.droneUsage || '',
        safetyOfficer: state.companyDraft.safetyOfficer || '',
        safetyPhone: state.companyDraft.safetyPhone || ''
      };
      persistProfile();
      state.modal = null;
      announce('企业补充信息已保存');
    }
    if (action === 'save-company') {
      Object.assign(data.profiles.company, {
        name: state.companyDraft.name,
        creditCode: state.companyDraft.creditCode,
        verified: state.companyDraft.verified,
        contact: state.companyDraft.contact,
        phone: state.companyDraft.phone,
        syncState: state.companyDraft.syncState
      });
      persistProfile();
      state.modal = null;
      announce('企业信息已保存，后台档案已同步');
    }
    if (action === 'open-certificate-upload') { state.modal = 'certificate'; state.returnFocus = '[data-action="open-certificate-upload"]'; state.certificateMode = 'create'; state.pendingCertificate = ''; state.pendingDrone = ''; state.ocrRequest += 1; state.ocr = emptyOcr(); render(); }
    if (action === 'bind-certificate') {
      const drone = roleDrones().find((item) => item.id === target.dataset.id);
      if (!drone || droneIsBound(drone)) { announce('该设备已关联登记证'); return; }
      state.modal = 'certificate';
      state.returnFocus = `[data-action="bind-certificate"][data-id="${safe(drone.id)}"]`;
      state.certificateMode = 'create';
      state.pendingCertificate = '';
      state.pendingDrone = drone.id;
      state.ocrRequest += 1;
      state.ocr = emptyOcr();
      render();
    }
    if (action === 'open-drone-create') {
      state.modal = 'drone-create';
      state.returnFocus = '[data-action="open-drone-create"]';
      state.droneDraft = emptyDroneDraft();
      render();
    }
    if (action === 'update-certificate') { state.modal = 'certificate'; state.returnFocus = `[data-action="update-certificate"][data-id="${safe(target.dataset.id)}"]`; state.certificateMode = 'update'; state.pendingCertificate = target.dataset.id; state.pendingDrone = ''; state.ocrRequest += 1; state.ocr = emptyOcr(); render(); }
    if (action === 'request-cancel-certificate') {
      const certificate = roleCertificates().find((item) => item.id === target.dataset.id);
      if (!certificate || certificate.state === '已注销') return;
      state.modal = 'certificate';
      state.returnFocus = `[data-action="request-cancel-certificate"][data-id="${safe(certificate.id)}"]`;
      state.certificateMode = 'cancel';
      state.pendingCertificate = certificate.id;
      state.pendingDrone = '';
      state.ocrRequest += 1;
      state.ocr = emptyOcr();
      render();
    }
    if (action === 'close-modal') closeModal();
    if (action === 'reset-ocr') { state.ocrRequest += 1; state.ocr = emptyOcr(); render(); }
    if (action === 'confirm-ocr') {
      const form = document.querySelector('#ocr-form'); if (form && !form.reportValidity()) return;
      const values = state.ocr.values;
      if (state.certificateMode === 'cancel') values.registrationStatus = '已注销';
      const registrationState = state.certificateMode === 'cancel' || (state.certificateMode === 'update' && values.registrationStatus === '已注销') ? '已注销' : '有效';
      const registrationStatus = registrationState === '已注销' ? '已注销' : '正常';
      let certificate = data.certificates.find((item) => item.id === state.pendingCertificate || item.registrationMark === values.registrationMark);
      if (!certificate) {
        if (state.certificateMode === 'cancel') { announce('登记证不可注销'); return; }
        certificate = { id: `UOM-OCR-${data.certificates.filter((item) => String(item.id).startsWith('UOM-OCR-')).length + 1}`, ...values, registrationStatus, holder: values.issuedTo, drone: values.aircraftName, certificateImageName: state.ocr.fileName || 'UOM登记证图片', certificateImageUrl: state.ocr.image || '../../shared/assets/uom-registration-certificate.svg', state: registrationState, updated: data.now, accountRole: state.role, history: [{ time: `${data.now} 10:00`, action: '上传登记证', detail: 'OCR 识别登记证截图，自动生成或关联设备台账（mock）' }] };
        data.certificates.unshift(certificate);
      } else {
        Object.assign(certificate, { ...values, registrationStatus, holder: values.issuedTo, drone: values.aircraftName, certificateImageName: state.ocr.fileName || certificate.certificateImageName || 'UOM登记证图片', certificateImageUrl: state.ocr.image || certificate.certificateImageUrl || '../../shared/assets/uom-registration-certificate.svg', state: registrationState, updated: data.now, accountRole: certificate.accountRole || state.role });
        const cancelDetail = state.certificateMode === 'cancel'
          ? '上传 UOM 注销登记证截图，OCR 识别后注销并同步设备台账（mock）'
          : registrationState === '已注销'
            ? '通过更新登记状态为已注销，关联设备台账同步注销（mock）'
            : 'OCR 重新识别截图并更新登记信息（mock）';
        certificate.history = [...(certificate.history || []), { time: `${data.now} 10:00`, action: registrationState === '已注销' ? '注销登记证' : '更新登记证', detail: cancelDetail }];
      }
      let drone = state.pendingDrone
        ? data.drones.find((item) => item.id === state.pendingDrone && item.accountRole === state.role)
        : null;
      if (!drone) drone = data.drones.find((item) => item.certificate === certificate.id);
      if (!drone) {
        drone = data.drones.find((item) => item.accountRole === state.role && !droneIsBound(item) && String(item.serialNumber || item.sn || '') === String(values.serialNumber || ''));
      }
      if (!drone) {
        drone = { id: `DR-${data.drones.length + 1}`, ...values, registrationStatus, model: values.aircraftName, sn: values.serialNumber, owner: state.role === 'personal' ? '个人持有' : '企业持有', group: '持有设备', status: registrationState, source: 'UOM 登记证自动生成', certificate: certificate.id, accountRole: state.role, ownerCompany: state.role === 'company' ? data.profiles.company.name : '' };
        data.drones.unshift(drone);
      } else {
        Object.assign(drone, { ...values, registrationStatus, model: values.aircraftName, sn: values.serialNumber, status: registrationState, source: droneIsBound(drone) ? 'UOM 登记证自动更新' : 'UOM 登记证关联绑定', certificate: certificate.id, accountRole: drone.accountRole || state.role });
        normalizeDrone(drone);
      }
      state.pendingDrone = '';
      persistLedger();
      syncDeviceCounts();
      state.ocrRequest += 1;
      state.modal = null;
      announce(state.certificateMode === 'cancel' || registrationState === '已注销' ? (state.certificateMode === 'cancel' ? '登记证已注销，关联设备台账已同步' : '登记证已更新为已注销，关联设备台账已同步') : '识别信息已保存，设备台账已自动更新');
    }
    if (action === 'submit-drone-create') {
      const form = document.querySelector('#drone-create-form'); if (form && !form.reportValidity()) return;
      const draft = state.droneDraft;
      const serial = String(draft.serialNumber || '').trim();
      if (roleDrones().some((item) => String(item.serialNumber || item.sn || '') === serial)) {
        announce('该序号已存在，请核对后重试');
        return;
      }
      const drone = {
        id: `DR-${String(data.drones.length + 1).padStart(3, '0')}`,
        manufacturerModel: draft.manufacturerModel.trim(),
        serialNumber: serial,
        aircraftName: draft.aircraftName.trim(),
        emptyWeight: draft.emptyWeight.trim(),
        maxTakeoffWeight: draft.maxTakeoffWeight.trim(),
        aircraftType: draft.aircraftType || '多旋翼航空器',
        model: draft.aircraftName.trim(),
        sn: serial,
        registrationMark: '',
        registrationDate: '',
        registrationStatus: '待关联',
        owner: state.role === 'personal' ? '个人持有' : '企业持有',
        group: '持有设备',
        status: '待关联',
        source: '手动录入',
        certificate: '',
        accountRole: state.role,
        ownerCompany: state.role === 'company' ? data.profiles.company.name : (state.role === 'personal' ? '' : '')
      };
      normalizeDrone(drone);
      data.drones.unshift(drone);
      persistLedger();
      syncDeviceCounts();
      state.modal = null;
      state.droneDraft = emptyDroneDraft();
      announce('设备已保存，上传登记证后可自动关联绑定');
    }
    if (action === 'submit-modal') {
      const form = document.querySelector('#prototype-form'); if (form && !form.reportValidity()) return; state.modal = null; announce('提交成功');
    }
    if (action === 'submit-enrollment') {
      const form = document.querySelector('#enrollment-form'); if (form && !form.reportValidity()) return;
      const item = data.activities.find((activity) => activity.id === state.selectedActivity);
      if (!item || !canEnroll(item)) { state.modal = null; announce(item?.confirmState === '已确认' ? '报名已确认，当前不可报名' : '当前活动暂不可报名，请查看报名时间'); return; }
      if (!state.joined.has(item.id)) {
        state.joined.add(item.id);
        item.enrolled += 1;
        const formData = form ? Object.fromEntries([...form.querySelectorAll('input[name], textarea[name]')].map((field) => [field.name, field.value])) : { 报名人: data.profiles[state.role].name, 联系电话: data.profiles[state.role].phone };
        data.enrollments.unshift({ id: `ENR-${item.id}-${data.enrollments.length + 1}`, activityId: item.id, name: item.title, applicant: state.role === 'personal' ? '陈*' : '王*', phone: data.profiles[state.role].phone, formData, time: `${data.now} 14:36`, state: '待确认' });
        persistPublicService();
      }
      state.modal = null;
      announce('报名成功，可在“我的报名”中查看');
    }
    if (action === 'cancel-enrollment') {
      const item = data.activities.find((activity) => activity.id === target.dataset.id);
      const applicant = state.role === 'personal' ? '陈*' : '王*';
      if (!item || !state.joined.has(item.id)) return;
      state.joined.delete(item.id);
      item.enrolled = Math.max(0, item.enrolled - 1);
      const enrollmentIndex = data.enrollments.findIndex((enrollment) => enrollment.activityId === item.id && enrollment.applicant === applicant);
      if (enrollmentIndex >= 0) data.enrollments.splice(enrollmentIndex, 1);
      persistPublicService();
      state.modal = null;
      announce('已取消报名，可重新报名');
    }
    if (action === 'submit-feedback') {
      const form = document.querySelector('#feedback-form'); if (form && !form.reportValidity()) return;
      const draft = state.feedbackDraft;
      const feedbackForm = data.feedbackForms.find((item) => item.id === state.feedbackFormId && item.state === '已发布') || data.feedbackForms.find((item) => item.state === '已发布') || data.feedbackForms[0];
      data.feedbacks.unshift({ id: `FB-${data.now.replaceAll('-', '')}-${String(data.feedbacks.length + 1).padStart(3, '0')}`, formId: feedbackForm?.id || '', category: draft.category || '功能建议', title: draft.title || '未命名反馈', content: draft.content || '未填写详细说明', fields: { ...draft }, attachments: { ...state.feedbackAttachments }, time: `${data.now} 14:36` });
      state.feedbackDraft = {};
      state.feedbackAttachments = {};
      persistPublicService();
      state.modal = null;
      announce('反馈已提交，感谢您的意见');
    }
    if (action === 'submit-member') {
      const form = document.querySelector('#member-form'); if (form && !form.reportValidity()) return;
      data.companyMembers.push({ id: `MEM-${String(data.companyMembers.length + 1).padStart(2, '0')}`, name: state.memberDraft.name, relation: state.memberDraft.relation, phone: state.memberDraft.phone, state: '正常', isAdmin: state.memberDraft.relation === '法定代表人', isPilot: false, license: '未上传', assignedDroneIds: [] });
      persistProfile();
      state.modal = null;
      announce('关联用户已添加，后台企业档案已同步');
    }
    if (action === 'submit-member-pilot') {
      if (!canManageEnterprise()) { announce('仅法定代表人可设置飞手'); return; }
      const member = data.companyMembers.find((item) => item.id === state.tagDraft.id);
      if (!member || member.relation === '法定代表人' || member.state === '已停用') { announce('该用户不可设置飞手'); return; }
      member.isPilot = !!state.tagDraft.isPilot;
      if (!member.isPilot) {
        member.assignedDroneIds = [];
        syncDroneAssignmentGroups();
        persistLedger();
      }
      persistProfile();
      state.modal = null;
      announce(member.isPilot ? '已设为飞手' : '已取消飞手');
    }
    if (action === 'submit-assign-pilot') {
      if (!canManageEnterprise()) { announce('仅法定代表人可分配飞手'); return; }
      const form = document.querySelector('#assign-pilot-form'); if (form && !form.reportValidity()) return;
      const pilotId = state.assignDraft.pilotId;
      const droneId = state.assignDraft.droneId;
      const pilot = companyPilots().find((item) => item.id === pilotId);
      if (!pilotId || !pilot) { announce('请选择飞手'); return; }
      if (!assignDroneToPilot(droneId, pilotId)) { announce('分配失败，请选择未注销的企业设备'); return; }
      state.modal = null;
      announce(`已分配给${pilot.name}，该飞手使用设备已更新`);
    }
    if (action === 'unassign-drone') {
      if (!canManageEnterprise()) { announce('仅法定代表人可取消分配'); return; }
      const droneId = target.dataset.id;
      const pilot = droneAssignedPilot(droneId);
      if (!unassignDrone(droneId)) { announce('取消分配失败'); return; }
      announce(pilot ? `已取消分配，${pilot.name} 的使用设备已减少` : '已取消分配');
    }
    if (action === 'save-profile') {
      const form = document.querySelector('#profile-form'); if (form && !form.reportValidity()) return;
      Object.assign(data.profiles.personal, state.profileDraft);
      persistProfile();
      state.modal = null;
      announce('个人信息已保存，后台档案已同步');
    }
    if (action === 'save-license') {
      if (!state.licenseImage) { announce('请先选择执照图片'); return; }
      data.profiles.personal.license = '已上传';
      state.licenseSavedImage = state.licenseImage;
      persistProfile();
      state.modal = null;
      announce('飞行执照图片已保存');
    }
    if (action === 'detail') { state.navigation.push(route()); location.hash = `#/detail/${target.dataset.kind}/${target.dataset.id}`; }
    if (action === 'pilot-detail') { state.navigation.push(route()); location.hash = `#/profile-pilot/${target.dataset.id}`; }
    if (action === 'activity-detail') { state.navigation.push(route()); location.hash = `#/activity/${target.dataset.id}`; }
    if (action === 'article-detail') { const item = data.articles.find((article) => article.id === target.dataset.id); if (item) { item.views += 1; persistPublicService(); } state.navigation.push(route()); location.hash = `#/article/${target.dataset.id}`; }
    if (action === 'open-enroll') { state.selectedActivity = target.dataset.id; state.modal = 'enrollment'; state.returnFocus = `[data-action="open-enroll"][data-id="${safe(target.dataset.id)}"]`; render(); }
    if (action === 'show-enrollment') { state.selectedActivity = target.dataset.id; state.modal = 'enrollment-record'; render(); }
    if (action === 'mobile-more') { announce('更多'); return; }
    if (action === 'back') goBack(target.dataset.fallback);
    if (action === 'execute') {
      if (state.role === 'company') { announce('企业账号仅可查看本公司飞行计划'); return; }
      const item = data.flights.find((x) => x.id === target.dataset.id);
      if (!item || item.executed !== '未执行') { announce('该计划已确认执行'); return; }
      state.pendingExecution = item.id;
      state.modal = 'execute-flight';
      state.returnFocus = `[data-action="execute"][data-id="${safe(item.id)}"]`;
      render();
      return;
    }
    if (action === 'confirm-execute') {
      const item = data.flights.find((x) => x.id === state.pendingExecution);
      if (!item || item.executed !== '未执行') { state.modal = null; announce('该计划已确认执行'); return; }
      item.executed = '已确认执行';
      item.executedAt = `${data.now} 16:00`;
      item.history = [...(item.history || []), { time: item.executedAt, action: '确认执行', detail: '用户确认飞行计划已执行（mock）' }];
      persistPublicService();
      state.pendingExecution = '';
      state.modal = null;
      announce('已记录执行确认');
    }
    if (action === 'join') { state.joined.add(target.dataset.id); announce('报名成功'); }
    if (action === 'read') { const item = data.messages.find((x) => x.id === target.dataset.id); if (item) { item.read = true; persistPublicService(); } announce('消息已标记为已读'); }
    if (action === 'read-all') { data.messages.filter((x) => x.state !== '未推送').forEach((x) => { x.read = true; }); persistPublicService(); announce('全部消息已标为已读'); }
    if (action === 'filter-status') { state.certificateView = state.certificateView === '已注销' ? '全部' : '已注销'; announce(`已切换至${state.certificateView}登记证视图`); }
    if (action === 'group') {
      state.droneGroup = target.dataset.value;
      const label = target.textContent || state.droneGroup;
      announce(state.role === 'company' ? `已切换至${label}` : `已切换至${label}`);
    }
    if (action === 'article-kind') { state.articleKind = target.dataset.value; announce(`已筛选${target.textContent}`); }
    if (action === 'activity-filter') { state.mineActivities = !state.mineActivities; announce(state.mineActivities ? '已仅显示我的报名' : '已显示全部活动'); }
    if (action === 'open-my-activities') { state.mineActivities = true; go('activities'); }
    if (action === 'guide-tab') { state.guideTab = target.dataset.value === 'faq' ? 'faq' : 'manual'; render(); }
    if (action === 'open-guide') { state.selectedGuide = target.dataset.id; state.modal = 'guide-detail'; state.returnFocus = `[data-action="open-guide"][data-id="${safe(target.dataset.id)}"]`; render(); }
    if (action === 'open-faq') { state.selectedFaq = target.dataset.id; state.modal = 'faq-detail'; state.returnFocus = `[data-action="open-faq"][data-id="${safe(target.dataset.id)}"]`; render(); }
    if (action === 'guide-page') { state.guidePage = Math.max(1, Number(target.dataset.page) || 1); render(); }
    if (action === 'faq-page') { state.faqPage = Math.max(1, Number(target.dataset.page) || 1); render(); }
  });
  document.addEventListener('input', (event) => {
    if (event.target.dataset?.ocrField) state.ocr.values[event.target.dataset.ocrField] = event.target.value;
    if (event.target.dataset?.profileField) state.profileDraft[event.target.dataset.profileField] = event.target.value;
    if (event.target.dataset?.feedbackField) state.feedbackDraft[event.target.dataset.feedbackField] = event.target.value;
    if (event.target.dataset?.memberField) state.memberDraft[event.target.dataset.memberField] = event.target.value;
    if (event.target.dataset?.flightField) state.flightDraft[event.target.dataset.flightField] = event.target.value;
    if (event.target.dataset?.droneField) state.droneDraft[event.target.dataset.droneField] = event.target.value;
    if (event.target.dataset?.supplementField) state.supplementDraft[event.target.dataset.supplementField] = event.target.value;
    if (event.target.dataset?.companyField) state.companyDraft[event.target.dataset.companyField] = event.target.value;
    if (event.target.id === 'search') { state.query = event.target.value; render(); const search = document.querySelector('#search'); if (search) { search.focus(); search.setSelectionRange(state.query.length, state.query.length); } }
    if (event.target.id === 'guide-search') { state.guideQuery = event.target.value; state.guidePage = 1; render(); const search = document.querySelector('#guide-search'); if (search) { search.focus(); search.setSelectionRange(state.guideQuery.length, state.guideQuery.length); } }
    if (event.target.id === 'faq-search') { state.faqQuery = event.target.value; state.faqPage = 1; render(); const search = document.querySelector('#faq-search'); if (search) { search.focus(); search.setSelectionRange(state.faqQuery.length, state.faqQuery.length); } }
  });
  document.addEventListener('change', (event) => {
    if (event.target.dataset?.ocrField) { state.ocr.values[event.target.dataset.ocrField] = event.target.value; return; }
    if (event.target.dataset?.companyField) { state.companyDraft[event.target.dataset.companyField] = event.target.value; return; }
    if (event.target.dataset?.memberField) { state.memberDraft[event.target.dataset.memberField] = event.target.value; return; }
    if (event.target.dataset?.assignField) { state.assignDraft[event.target.dataset.assignField] = event.target.value; return; }
    if (event.target.dataset?.tagField) { state.tagDraft[event.target.dataset.tagField] = event.target.checked; return; }
    if (event.target.dataset?.feedbackImageField) {
      const files = [...(event.target.files || [])];
      if (!files.length || files.some((file) => !['image/png', 'image/jpeg'].includes(file.type))) { announce('请上传 JPG 或 PNG 格式的图片'); return; }
      if (files.some((file) => file.size > 10 * 1024 * 1024)) { announce('单张图片超过 10 MB，请压缩后重新选择'); return; }
      state.feedbackAttachments[event.target.dataset.feedbackImageField] = files.map((file) => file.name || '反馈图片');
      render();
      return;
    }
    if (event.target.dataset?.flightField) { state.flightDraft[event.target.dataset.flightField] = event.target.value; return; }
    if (event.target.id === 'flight-approval-file') {
      const file = event.target.files?.[0];
      if (!file || !['image/png','image/jpeg'].includes(file.type)) { announce('请上传 JPG 或 PNG 格式的审批截图'); return; }
      if (file.size > 10 * 1024 * 1024) { announce('截图超过 10 MB，请压缩后重新上传'); return; }
      const request = ++state.flightShotRequest;
      state.flightShot = 'recognizing';
      render();
      setTimeout(() => {
        if (request !== state.flightShotRequest || state.modal !== 'flight') return;
        state.flightDraft = { ...state.flightDraft, ...normalizeFlight({ ...data.flightApprovalOcr }) };
        state.flightShot = 'done';
        render();
      }, 700);
      return;
    }
    if (event.target.id === 'batch-file') {
      const file = event.target.files?.[0];
      if (!file) return;
      state.batchRows = [
        { title: '桥梁巡检航拍（模板）', time: '2026-08-03 09:00—10:30', area: '申报区域 B-02（街道级）', drone: '云翼 M30', valid: true },
        { title: '河道巡查（模板）', time: '2026-08-04 14:00—15:00', area: '申报区域 C-01（街道级）', drone: '巡航 Mini', valid: true },
        { title: '物流测试飞行（模板）', time: '2026-08-05 10:00—11:00', area: '', drone: '云翼 M30', valid: false, reason: '缺少飞行区域' }
      ];
      state.batchStage = 'preview';
      render();
      return;
    }
    if (event.target.id === 'license-file') {
      const file = event.target.files?.[0];
      if (!file || !['image/png','image/jpeg'].includes(file.type)) { announce('请上传 JPG 或 PNG 格式的执照图片'); return; }
      if (file.size > 10 * 1024 * 1024) { announce('执照图片超过 10 MB，请压缩后重新上传'); return; }
      const reader = new FileReader();
      reader.addEventListener('load', () => { state.licenseImage = typeof reader.result === 'string' ? reader.result : ''; data.profiles.personal.licenseFileName = file.name || '飞行执照图片'; render(); });
      reader.addEventListener('error', () => announce('图片读取失败，请重新选择'));
      reader.readAsDataURL(file);
      return;
    }
    if (event.target.id !== 'certificate-file') return;
    const file = event.target.files?.[0];
    const request = ++state.ocrRequest;
    if (!file || !['image/png','image/jpeg'].includes(file.type)) { state.ocr = { ...emptyOcr(), status: 'error', message: '图片格式无法识别，请重新上传 JPG 或 PNG 图片。' }; render(); return; }
    if (file.size > 10 * 1024 * 1024) { state.ocr = { ...emptyOcr(), status: 'error', message: '图片超过 10 MB，请压缩后重新上传。' }; render(); return; }
    state.ocr.fileName = file.name || 'UOM登记证图片';
    state.ocr.status = 'recognizing'; render();
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (request !== state.ocrRequest) return;
      state.ocr.image = typeof reader.result === 'string' ? reader.result : '';
      render();
      setTimeout(() => {
        if (request !== state.ocrRequest) return;
        if (state.certificateMode === 'cancel') state.ocr.values.registrationStatus = '已注销';
        state.ocr.status = 'review';
        render();
      }, 700);
    });
    reader.addEventListener('error', () => {
      if (request !== state.ocrRequest) return;
      state.ocr = { ...emptyOcr(), status: 'error', message: '图片读取失败，请重新选择文件。' };
      render();
    });
    reader.readAsDataURL(file);
  });
  document.addEventListener('keydown', (event) => {
    if (!state.modal) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const modalElement = document.querySelector('.modal');
    const focusable = modalElement ? [...modalElement.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled) : [];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener('storage', (event) => {
    if (event.key === ledgerStorageKey) hydrateLedger();
    else if (event.key === profileStorageKey) hydrateProfile();
    else return;
    render();
  });
  window.addEventListener('hashchange', () => { state.query = ''; render(); });
  render();
})();

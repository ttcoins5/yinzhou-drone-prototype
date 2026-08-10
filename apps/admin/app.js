(function () {
  const app = document.querySelector('#app');
  const data = window.LowAltitudeMock;
  const normalizeConfigRows = (rows = [], prefix = 'CFG') => (rows || []).map((item, index) => ({
    id: item.id || `${prefix}-${String(index + 1).padStart(2, '0')}`,
    name: String(item.name || '').trim(),
    sort: Number(item.sort) > 0 ? Number(item.sort) : index + 1,
    state: item.state === '停用' ? '停用' : '启用',
    updated: item.updated || data.now
  })).filter((item) => item.name);
  const syncFlightConfigLists = () => {
    data.streetConfigs = normalizeConfigRows(data.streetConfigs || [], 'ST');
    data.flightActivityTypes = normalizeConfigRows(data.flightActivityTypes || [], 'FAT');
    data.districtConfigs = normalizeConfigRows(data.districtConfigs || [], 'DST');
    const enabled = data.enabledConfigNames || ((rows) => (rows || []).filter((item) => (item.state || '启用') === '启用').map((item) => item.name));
    data.yinzhouStreets = enabled(data.streetConfigs);
    data.ningboDistricts = enabled(data.districtConfigs);
  };
  syncFlightConfigLists();
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
  const syncPersonalUser = () => {
    const primary = data.users.find((item) => item.id === 'USR-001');
    if (!primary) return;
    Object.assign(primary, {
      name: data.profiles.personal.name,
      idNumber: data.profiles.personal.idNumber,
      phone: data.profiles.personal.phone,
      address: data.profiles.personal.address,
      license: data.profiles.personal.license,
      licenseFileName: data.profiles.personal.licenseFileName,
      drones: data.profiles.personal.devices
    });
  };
  const syncCompany = () => {
    const primary = data.companies.find((item) => item.id === 'ENT-001');
    if (!primary) return;
    Object.assign(primary, {
      name: data.profiles.company.name,
      creditCode: data.profiles.company.creditCode,
      verified: data.profiles.company.verified,
      contact: data.profiles.company.contact,
      phone: data.profiles.company.phone,
      syncState: data.profiles.company.syncState,
      accounts: data.companyMembers.length,
      drones: data.profiles.company.devices,
      status: data.profiles.company.verified === '已认证' ? '正常' : '待核查'
    });
    data.profiles.company.accounts = data.companyMembers.length;
  };
  const hydrateProfile = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(profileStorageKey) || 'null');
      if (saved && typeof saved === 'object') {
        ['name', 'idNumber', 'phone', 'address', 'license', 'licenseFileName', 'affiliatedCompany'].forEach((field) => {
          if (typeof saved[field] === 'string') data.profiles.personal[field] = saved[field];
        });
        if (saved.companyProfile && typeof saved.companyProfile === 'object') Object.assign(data.profiles.company, saved.companyProfile);
        if (Array.isArray(saved.companyMembers)) data.companyMembers = mergeCompanyMembers(saved.companyMembers);
        if (saved.supplement && typeof saved.supplement === 'object') Object.assign(data.profiles.personal.supplement, saved.supplement);
        if (saved.companySupplement && typeof saved.companySupplement === 'object') Object.assign(data.profiles.company.supplement, saved.companySupplement);
      }
    } catch {
      window.localStorage.removeItem(profileStorageKey);
    }
    data.profiles.personal.supplement = data.normalizePersonalSupplement ? data.normalizePersonalSupplement(data.profiles.personal.supplement) : data.profiles.personal.supplement;
    data.companyMembers.forEach((member) => {
      if (member.relation === '法定代表人') member.isAdmin = true;
      if (typeof member.isAdmin !== 'boolean') member.isAdmin = false;
      if (typeof member.isPilot !== 'boolean') member.isPilot = false;
    });
    syncPersonalUser();
    syncCompany();
  };
  const persistProfile = () => {
    const { name, idNumber, phone, address, license, licenseFileName, affiliatedCompany, supplement } = data.profiles.personal;
    try {
      const saved = JSON.parse(window.localStorage.getItem(profileStorageKey) || '{}');
      window.localStorage.setItem(profileStorageKey, JSON.stringify({ ...saved, name, idNumber, phone, address, license, licenseFileName, affiliatedCompany, supplement, companyProfile: data.profiles.company, companySupplement: data.profiles.company.supplement, companyMembers: data.companyMembers }));
    } catch {}
  };
  const normalizeCertificate = (certificate) => {
    delete certificate.ocrState;
    if (!certificate.certificateImageUrl) certificate.certificateImageUrl = '../../shared/assets/uom-registration-certificate.svg';
    if (certificate.state !== '已注销') certificate.state = '有效';
    certificate.registrationStatus = certificate.state === '已注销' ? '已注销' : '有效';
  };
  const hydrateLedger = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(ledgerStorageKey) || 'null');
      if (!saved || !Array.isArray(saved.certificates) || !Array.isArray(saved.drones)) return;
      data.certificates = mergeById(saved.certificates, seedCertificates);
      data.drones = mergeById(saved.drones, seedDrones);
      data.certificates.forEach(normalizeCertificate);
    } catch {
      window.localStorage.removeItem(ledgerStorageKey);
    }
  };
  const persistLedger = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(ledgerStorageKey) || '{}');
      window.localStorage.setItem(ledgerStorageKey, JSON.stringify({ ...saved, certificates: data.certificates, drones: data.drones }));
    } catch {
    }
  };
  const hydratePublicService = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(publicServiceStorageKey) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (Array.isArray(saved.activities)) {
        const seedActivities = data.activities.slice();
        const mapped = saved.activities.map((item) => ({
          ...item,
          status: item.status === '即将报名' ? '进行中' : item.status === '待确认' ? '报名中' : item.status,
          confirmState: item.confirmState === '已确认' ? '已确认' : '未确认'
        }));
        const have = new Set(mapped.map((item) => item.id));
        seedActivities.forEach((seed) => { if (!have.has(seed.id)) mapped.push(seed); });
        data.activities = mapped;
      }
      if (Array.isArray(saved.enrollments)) data.enrollments = saved.enrollments;
      if (Array.isArray(saved.feedbacks)) data.feedbacks = normalizeFeedbacks(saved.feedbacks);
      if (saved.uomGuide && typeof saved.uomGuide === 'object') data.uomGuide = saved.uomGuide;
      if (Array.isArray(saved.articles)) {
        data.articles = saved.articles.map((item, index) => {
          const sort = Number(item.sort) > 0 ? Number(item.sort) : (item.pinned ? index + 1 : 100 + index);
          const { pinned, ...rest } = item;
          return { ...rest, sort };
        });
      }
      if (Array.isArray(saved.flights)) data.flights = saved.flights;
      if (Array.isArray(saved.feedbackForms)) {
        const mapped = normalizeFeedbackForms(saved.feedbackForms);
        const have = new Set(mapped.map((item) => item.id));
        const seeds = normalizeFeedbackForms(data.feedbackForms);
        seeds.forEach((seed) => { if (!have.has(seed.id)) mapped.push(seed); });
        data.feedbackForms = mapped;
      }
      if (Array.isArray(saved.messages)) data.messages = normalizeMessages(saved.messages);
      if (Array.isArray(saved.messageTemplates)) data.messageTemplates = normalizeMessageTemplates(saved.messageTemplates);
      if (Array.isArray(saved.streetConfigs)) data.streetConfigs = saved.streetConfigs;
      if (Array.isArray(saved.flightActivityTypes)) data.flightActivityTypes = saved.flightActivityTypes;
      if (Array.isArray(saved.districtConfigs)) data.districtConfigs = saved.districtConfigs;
      syncFlightConfigLists();
    } catch { window.localStorage.removeItem(publicServiceStorageKey); }
  };
  const normalizeMessageTemplates = (templates) => templates.map((item) => ({
    ...item,
    id: item.id || '',
    name: item.name || item.title || '',
    scene: item.scene || '系统业务',
    trigger: item.trigger || '',
    channel: item.channel === '系统消息' || item.channel === '浙里办推送' ? (item.channel === '系统消息' ? '系统推送' : '浙里办推送') : (item.channel || '系统推送'),
    title: item.title || item.name || '',
    content: item.content || '',
    variables: item.variables || '—',
    state: item.state === '已停用' ? '已停用' : '已启用',
    updated: item.updated || data.now
  }));
  const normalizeMessages = (messages) => messages.map((item) => ({
    ...item,
    title: item.title || '',
    content: item.content || '',
    channel: item.channel === '系统消息' ? '系统推送' : (item.channel || '系统推送'),
    time: item.time || '',
    pushedAt: item.pushedAt || item.time || '',
    receiver: item.receiver || '',
    receiverType: item.receiverType || '',
    state: '已推送',
    templateId: item.templateId || '',
    read: Boolean(item.read)
  }));
  const normalizeFeedbackForms = (forms) => forms.map((form) => ({
    ...form,
    fields: Array.isArray(form.fields)
      ? form.fields
        .filter((field) => Array.isArray(field) && field[0] !== '是否允许联系')
        .map((row) => (window.AdminUI?.normalizeFeedbackField ? AdminUI.normalizeFeedbackField(row) : [row[0], row[1] === '图片' ? '多张图片' : row[1], row[2] || '选填', row[3] || '']))
      : []
  }));
  const normalizeFeedbacks = (feedbacks) => feedbacks.map((feedback) => {
    const fields = { ...(feedback.fields || {}) };
    delete fields['是否允许联系'];
    const submitterType = feedback.submitterType === '企业用户' || feedback.submitterType === '企业' ? '企业用户' : '个人用户';
    const submitterName = feedback.submitterName || feedback.submitter || '—';
    return { ...feedback, fields, submitterType, submitterName };
  });
  const persistPublicService = () => {
    try { window.localStorage.setItem(publicServiceStorageKey, JSON.stringify({ activities: data.activities, enrollments: data.enrollments, feedbacks: data.feedbacks, articles: data.articles, flights: data.flights, feedbackForms: data.feedbackForms, messages: data.messages, messageTemplates: data.messageTemplates, uomGuide: data.uomGuide, streetConfigs: data.streetConfigs, flightActivityTypes: data.flightActivityTypes, districtConfigs: data.districtConfigs })); } catch {}
  };
  hydrateProfile();
  hydrateLedger();
  hydratePublicService();
  syncFlightConfigLists();
  data.messageTemplates = normalizeMessageTemplates(data.messageTemplates || []);
  data.messages = normalizeMessages(data.messages || []);
  const ledgers = {
    blacklist: [{id:'BL-001',name:'用户甲',type:'个人用户',reason:'治理记录',state:'已拉黑',operatedBy:'—',operatedAt:'—'},{id:'BL-002',name:'企业乙',type:'企业用户',reason:'核查中',state:'已拉黑',operatedBy:'—',operatedAt:'—'}],
    droneBlacklist: [
      { id: 'DBL-001', droneId: 'DR-003', aircraftName: '安巡 H20（演示）', registrationMark: 'UAS03****90', serialNumber: 'SN-****-4870', owner: '鄞州云航服务有限公司（演示）', reason: '违规飞行治理（演示）', state: '已拉黑', operatedBy: 'admin', operatedAt: '2026-07-20 14:20' }
    ],
    volunteers: [
      { id: 'VOL-001', name: '张*', phone: '138****1001', volunteerType: '低空爱好者', area: '下应街道', source: '线下报名确认', confirmedAt: '2026-07-12', state: '在册', ridModule: 'RID-YZ-001', ridState: '已配发' },
      { id: 'VOL-002', name: '周*', phone: '139****2002', volunteerType: '社区网格员', area: '钟公庙街道', source: '线下报名确认', confirmedAt: '2026-07-18', state: '在册', ridModule: '—', ridState: '未配发' },
      { id: 'VOL-003', name: '李*', phone: '137****3003', volunteerType: '低空爱好者', area: '首南街道', source: '线下报名确认', confirmedAt: '2026-07-20', state: '在册', ridModule: 'RID-YZ-003', ridState: '已配发' },
      { id: 'VOL-004', name: '王*', phone: '136****4004', volunteerType: '社区网格员', area: '邱隘镇', source: '线下报名确认', confirmedAt: '2026-06-28', state: '已移除', ridModule: '—', ridState: '未配发' }
    ],
    ridModules: [
      { id: 'RID-YZ-001', sn: 'RIDSN****1001', model: '便携式 RID-A1', state: '已配发', volunteerId: 'VOL-001', volunteerName: '张*', area: '下应街道', updatedAt: '2026-07-15 09:30' },
      { id: 'RID-YZ-002', sn: 'RIDSN****1002', model: '便携式 RID-A1', state: '在库', volunteerId: '', volunteerName: '—', area: '—', updatedAt: '2026-07-10 16:00' },
      { id: 'RID-YZ-003', sn: 'RIDSN****1003', model: '便携式 RID-B2', state: '已配发', volunteerId: 'VOL-003', volunteerName: '李*', area: '首南街道', updatedAt: '2026-07-22 10:00' },
      { id: 'RID-YZ-004', sn: 'RIDSN****1004', model: '便携式 RID-A1', state: '在库', volunteerId: '', volunteerName: '—', area: '—', updatedAt: '2026-07-08 11:20' },
      { id: 'RID-YZ-005', sn: 'RIDSN****1005', model: '便携式 RID-B2', state: '在库', volunteerId: '', volunteerName: '—', area: '—', updatedAt: '2026-07-25 14:00' }
    ],
    verification: [
      {
        id: 'CHK-001',
        droneId: 'DR-001',
        name: '云翼 M30',
        aircraftName: '云翼 M30',
        serialNumber: 'SN-****-0192',
        registrationMark: 'UAS03****81',
        ownerType: '个人',
        checkType: '证照核查',
        checkMethod: '材料核验',
        checkPlace: '鄞州区低空服务窗口',
        result: '通过',
        issueDesc: '',
        suggestion: '证照与机体一致，予以通过',
        followUpDate: '',
        operator: '张警官',
        checkDate: '2026-07-29',
        time: '2026-07-29',
        state: '已完成',
        detail: '证照与机体一致'
      },
      {
        id: 'CHK-002',
        droneId: 'DR-003',
        name: '安巡 H20',
        aircraftName: '安巡 H20',
        serialNumber: 'SN-****-4870',
        registrationMark: 'UAS03****90',
        ownerType: '企业',
        checkType: '现场核查',
        checkMethod: '上门核查',
        checkPlace: '鄞州云航服务有限公司机库',
        result: '待核查',
        issueDesc: '登记证照片模糊，需重新上传清晰件',
        suggestion: '',
        followUpDate: '2026-08-05',
        operator: '李警官',
        checkDate: '2026-07-28',
        time: '2026-07-28',
        state: '待核查',
        detail: ''
      },
      {
        id: 'CHK-003',
        droneId: 'DR-004',
        name: '云巡 S10',
        aircraftName: '云巡 S10',
        serialNumber: 'SN-****-6612',
        registrationMark: 'UAS03****12',
        ownerType: '企业',
        checkType: '抽查复核',
        checkMethod: '电话复核',
        checkPlace: '远程复核',
        result: '不通过',
        issueDesc: '设备实际空机重量与台账不一致',
        suggestion: '要求重新核验并更新 UOM 登记信息',
        followUpDate: '2026-08-02',
        operator: '王警官',
        checkDate: '2026-07-26',
        time: '2026-07-26',
        state: '已完成',
        detail: '空机重量与台账不一致'
      }
    ],
    accounts: [{id:'ACC-ADMIN',name:'综合管理员',type:'后台账号',role:'系统管理员',scope:'全部菜单与按钮权限',state:'正常',bound:'已绑定统一账号'},{id:'ACC-OPS',name:'活动运营员',type:'后台账号',role:'活动运营',scope:'活动、报名、普法、公告、消息、反馈',state:'正常',bound:'已绑定统一账号'},{id:'ACC-DETECT',name:'侦测值班员',type:'后台账号',role:'侦测值班',scope:'侦测预警、肩灯、外部接口、操作日志',state:'正常',bound:'待绑定统一账号'}]
  };
  const helpStorageKey = 'yinzhou-admin-help-collapsed';
  const sessionStorageKey = 'yinzhou-admin-session-v1';
  const readAdminSession = () => {
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.account && parsed.name) return parsed;
    } catch {}
    return null;
  };
  const writeAdminSession = (session) => {
    try {
      if (session) window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
      else window.sessionStorage.removeItem(sessionStorageKey);
    } catch {}
  };
  const makeLoginCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 4; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };
  const state = { modal: null, toast: '', query: '', filter: '全部', areaFilter: '全部', faqPage: 1, disabledDrones: new Set(), overrides: new Map(), userProfileDraft: {}, companyProfileDraft: {}, draft: {}, sidebarCollapsed: false, helpCollapsed: window.localStorage.getItem(helpStorageKey) === '1', expandedGroups: new Set(['工作台', '无人机后台管理']), tabs: [{ id: 'dashboard', label: '工作台', closable: false }], feedbackTab: 'content', lightTab: 'issue', dashboardPick: null, areaRange: 'week', areaCustomStart: '2026-07-29', areaCustomEnd: '2026-08-04', sysUserFilter: { userName: '', phone: '', status: '', start: '', end: '' }, sysUserSelected: '', roleFilter: { roleName: '', roleKey: '', status: '', start: '', end: '' }, roleSelected: '', menuFilter: { name: '', status: '' }, menuExpanded: false, dictFilter: { name: '', type: '', status: '' }, configFilter: { name: '', key: '', type: '' }, session: readAdminSession(), loginDraft: { account: 'admin', password: '', captcha: '' }, loginCaptcha: makeLoginCaptcha(), loginError: '', devicePickerQuery: '', devicePickerPage: 1 };
  const syncDroneBlacklistState = () => {
    const active = new Set((ledgers.droneBlacklist || []).filter((row) => row.state === '已拉黑').map((row) => row.droneId).filter(Boolean));
    state.disabledDrones = active;
    (data.drones || []).forEach((drone) => {
      if (active.has(drone.id)) drone.manageState = '已禁用';
      else if (drone.manageState === '已禁用') drone.manageState = '正常';
      if (drone.status === '已禁用') drone.status = (drone.registrationStatus === '已注销' || drone.status === '已注销') ? '已注销' : '有效';
    });
  };
  syncDroneBlacklistState();

  const groups = [
    ['工作台', [['dashboard','工作台']]],
    ['用户和企业管理', [['users','用户管理'],['companies','企业管理'],['blacklist','黑名单']]],
    ['无人机后台管理', [['certificates','UOM 登记证'],['drones','无人机管理'],['drone-blacklist','无人机黑名单'],['verification','设备核查'],['streets','街道配置'],['districts','市区配置'],['flight-activity-types','飞行活动类型配置']]],
    ['飞行计划管理', [['flights','飞行计划']]],
    ['活动管理', [['activities','活动管理']]],
    ['宣传科普管理', [['laws','低空安全普法'],['news','新闻公告']]],
    ['UOM流程指导', [['guides','操作手册'],['faq','常见问题']]],
    ['志愿者管理', [['volunteers','志愿者名册']]],
    ['消息管理', [['messages','消息模板']]],
    ['意见反馈管理', [['feedback','意见反馈']]],
    ['系统管理', [['sys-users','用户管理'],['roles','角色管理'],['menus','菜单管理'],['dicts','字典管理']]]
  ];
  const meta = {
    users:['用户管理','查看个人用户及其设备、UOM 登记证与飞行活动记录。',''],companies:['企业管理','查看企业账户、授权账号、设备及飞行活动记录。',''],blacklist:['黑名单','拉黑/取消拉黑用户、企业及其授权账号。','新增黑名单'],accounts:['用户管理','维护后台系统用户。','新增'],['sys-users']:['用户管理','维护后台系统用户账号、状态与角色分配。','新增'],roles:['角色管理','维护后台角色、权限字符与状态。','新增'],menus:['菜单管理','维护系统菜单目录、路由与按钮权限标识。','新增'],dicts:['字典管理','维护系统字典类型。','新增'],config:['参数设置','维护系统参数键名与键值。','新增'],['login-logs']:['登录日志','查看后台登录访问记录。','导出'],audit:['操作日志','查看数据访问、操作记录与审计检索。','导出日志'],certificates:['UOM 登记证','查看登记证载明的 11 项信息、更新记录及注销记录。','手动注销'],drones:['无人机管理','查看与 UOM 登记证一致的航空器基础字段及持有/使用分组。','新增核查'],['drone-blacklist']:['无人机黑名单','',''],verification:['设备核查','','新增核查'],streets:['街道配置','','新增街道'],districts:['市区配置','','新增市区'],['flight-activity-types']:['飞行活动类型配置','','新增类型'],flights:['飞行计划','管理报备信息、修改历史与执行确认记录。','导出计划'],activities:['活动管理','新建、编辑、下架和删除活动；详情页直接展示报名名单并可一键确认，确认后用户端不可报名。','新建活动'],enrollments:['活动报名','查看报名填写内容；一键确认请在活动详情本场报名名单中完成。','导出报名'],laws:['低空安全普法','新建、编辑、下架、删除政策法规，含发布单位、生效起止、排序与封面（图片/视频）。','新建普法'],news:['新闻公告','新建、编辑、下架新闻公告；含排序，封面可上传图片或视频。','新建公告'],guides:['操作手册','维护流程标题、摘要、编号排序与图文说明；可新建、编辑、上架/下架与删除。','新建流程'],faq:['常见问题','维护用户端 FAQ 问题、排序与图文解答；可新建、编辑、下架与删除。','新建问题'],volunteers:['志愿者名册','维护线下确认后的低空爱好者与社区网格员名册，支持按姓名、区域查询与移除。','添加志愿者'],['rid-modules']:['RID模块','维护 RID 模块台账，支持新增入库、配发绑定与回收。','新增RID'],messages:['消息模板','查看系统按业务场景自动触达的消息模板；不支持人工新建与主动推送。',''],feedback:['意见反馈','收集用户反馈内容，维护用户端反馈表单与多图上传字段。','新建表单'],['shoulder-lights']:['肩灯配发','','新增肩带'],alerts:['侦测预警','接收肩灯感知数据并与飞行计划比对，对未报备飞行生成预警与证据包。','处置告警'],interface:['外部接口','对接市级低空平台、智巡车防与肩灯厂商侦测平台。','同步数据']
  };
  const route = () => (location.hash || (state.session ? '#/dashboard' : '#/login')).replace('#/','').split('?')[0];
  const routeLabel = (value = route()) => {
    const parts = value.split('/');
    if (parts[0] === 'login') return '登录';
    if (parts[0] === 'dashboard') return '工作台';
    if (parts[0] === 'detail') return `${meta[parts[1]]?.[0] || '业务记录'}详情`;
    if (parts[0] === 'form') {
      const key = parts[1] === 'feedback-forms' ? 'feedback' : parts[1];
      const name = parts[1] === 'feedback-forms' ? '反馈表单' : (meta[parts[1]]?.[0] || '业务');
      return `${name}${parts[2] === 'new' ? '新建' : '编辑'}`;
    }
    return meta[parts[0]]?.[0] || '工作台';
  };
  const currentMenu = (value = route()) => {
    if (value.startsWith('detail/')) return value.split('/')[1];
    if (value.startsWith('form/')) return value.split('/')[1] === 'feedback-forms' ? 'feedback' : value.split('/')[1];
    return value.split('/')[0];
  };
  const normalizeRoute = (value = route()) => {
    const pieces = value.split('/');
    const removed = new Set(['rid-modules', 'shoulder-lights', 'alerts', 'interface']);
    if (pieces[0] === 'enrollments' && pieces.length === 1) return 'activities';
    if (pieces[0] === 'statistics') return 'dashboard';
    if (removed.has(pieces[0])) return 'dashboard';
    if ((pieces[0] === 'detail' || pieces[0] === 'form') && removed.has(pieces[1])) return 'dashboard';
    if (pieces[0] === 'accounts') return 'sys-users';
    if (pieces[0] === 'config' || pieces[0] === 'audit' || pieces[0] === 'login-logs') return 'sys-users';
    if (pieces[0] === 'form' && (pieces[1] === 'users' || pieces[1] === 'companies')) {
      return pieces[2] && pieces[2] !== 'new' ? `detail/${pieces[1]}/${pieces[2]}` : pieces[1];
    }
    if (pieces[0] === 'form' && pieces[1] === 'messages') return 'messages';
    if (pieces[0] === 'message-records' || (pieces[0] === 'detail' && pieces[1] === 'message-records')) return 'messages';
    return value;
  };
  const ensureTab = (value = route()) => {
    const id = normalizeRoute(value);
    if (id === 'login') return;
    if (!state.tabs.some((tab) => tab.id === id)) state.tabs.push({ id, label: routeLabel(id), closable: id !== 'dashboard' });
  };
  const go = (key) => { state.modal = null; const id = normalizeRoute(key); ensureTab(id); location.hash = `#/${id}`; };
  const closeTab = (id) => {
    const index = state.tabs.findIndex((tab) => tab.id === id);
    if (index < 0 || !state.tabs[index].closable) return;
    const wasCurrent = route() === id;
    state.tabs.splice(index, 1);
    if (wasCurrent) go((state.tabs[index] || state.tabs[index - 1] || state.tabs[0]).id);
    else render();
  };
  const icon = (path) => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
  const groupIcon = (label) => icon(({
    '工作台':'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    '系统管理':'M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7z',
    '用户和企业管理':'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-1.2a2.8 2.8 0 0 0-2-2.7M16.5 7.2a2.4 2.4 0 1 1 0 4.6',
    '无人机后台管理':'M12 3v4M8 7h8M7 12h10M9 12l-3 6M15 12l3 6M12 11v7',
    '飞行计划管理':'M4 12h14M14 6l6 6-6 6',
    '活动管理':'M7 4h10v16H7zM10 8h4M10 12h4M10 16h3',
    '宣传科普管理':'M5 5h11v11H5zM9 9h3M9 13h6M16 8l3 3v8H8',
    'UOM流程指导':'M8 4h8l3 3v13H8zM11 11h5M11 15h5',
    '志愿者管理':'M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5 20a7 7 0 0 1 14 0',
    '肩灯配发管理':'M9 3h6v4H9zM8 7h8v13H8zM11 11h2M11 15h2',
    '消息管理':'M4 6h16v10H8l-4 3V6z',
    '意见反馈管理':'M5 4h14v12H9l-4 3V4zM8 9h8M8 13h5',
    '侦测预警':'M12 4 3 20h18L12 4zM12 10v4M12 17h.01'
  })[label] || 'M5 5h14v14H5z');
  const navIcon = (id) => icon(({
    dashboard:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    users:'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5 20a7 7 0 0 1 14 0',
    companies:'M4 20V5h10v15M14 9h6v11M7 8h2M7 12h2M7 16h2',
    blacklist:'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16M8 8l8 8',
    accounts:'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5 20a7 7 0 0 1 14 0',
    ['sys-users']:'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5 20a7 7 0 0 1 14 0',
    roles:'M16 19v-1.2a2.8 2.8 0 0 0-2-2.7M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5 20a7 7 0 0 1 14 0M16.5 7.2a2.4 2.4 0 1 1 0 4.6',
    menus:'M5 5h14v3H5zM5 10.5h14v3H5zM5 16h9v3H5z',
    dicts:'M7 4h8l3 3v13H7zM10 11h5M10 15h4M14 18.5l2 1.2 2-1.2',
    config:'M8 5h8v3H8zM8 10h8v9H8zM11 13h2',
    audit:'M8 4h8l3 3v13H8zM11 11h5M11 15h4',
    ['login-logs']:'M8 4h8l3 3v13H8zM11 11h5M11 15h4M12 8h.01',
    certificates:'M7 3h8l3 3v15H7zM10 11h5M10 15h5',
    drones:'M12 3v4M8 7h8M7 12h10M9 12l-3 6M15 12l3 6M12 11v7',
    ['drone-blacklist']:'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16M8 8l8 8',
    streets:'M4 10h16M6 6h12v12H6zM9 14h6',
    districts:'M4 7h16v10H4zM8 7V5h8v2M9 12h6',
    ['flight-activity-types']:'M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7zM9 12h6',
    verification:'M8 4h8l3 3v13H8zM10 13l2 2 4-4',
    flights:'M4 12h14M14 6l6 6-6 6',
    activities:'M7 4h10v16H7zM10 8h4M10 12h4M10 16h3',
    enrollments:'M6 5h12v14H6zM9 9h6M9 13h6M9 17h4',
    laws:'M7 4h8l3 3v13H7zM10 11h5M10 15h5',
    news:'M5 5h14v14H5zM8 9h8M8 13h6',
    guides:'M8 4h8l3 3v13H8zM11 11h5M11 15h5',
    faq:'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16M12 16h.01M10 10a2 2 0 1 1 2.5 1.9c-.7.4-1.5 1-1.5 2.1',
    volunteers:'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5 20a7 7 0 0 1 14 0',
    ['rid-modules']:'M5 7h14v10H5zM9 11h6M8 17h8',
    messages:'M4 6h16v10H8l-4 3V6z',
    feedback:'M5 4h14v12H9l-4 3V4zM8 9h8M8 13h5',
    ['shoulder-lights']:'M9 3h6v4H9zM8 7h8v13H8zM11 11h2M11 15h2',
    alerts:'M12 4 3 20h18L12 4zM12 10v4M12 17h.01',
    interface:'M5 5h14v14H5zM9 9h6M9 15h6'
  })[id] || 'M5 5h14v14H5zM8 9h8M8 13h8');
  const safe = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const kind = (value) => (window.AdminUI ? AdminUI.statusKind(value) : 'info');
  const status = (value) => `<span class="status ${kind(value)}">${safe(value)}</span>`;
  const certificateStatus = (value) => value === '已注销' ? `<span class="status muted">${safe(value)}</span>` : `<span class="status success">${safe(value)}</span>`;
  const deliveryCopy = (markup) => String(markup)
    .replaceAll('演示区域', '管控区域')
    .replaceAll('演示片区', '责任片区')
    .replaceAll('演示会话', '')
    .replaceAll('演示数据', '业务数据')
    .replaceAll('模拟待接入', '待接入')
    .replaceAll('演示记录', '业务记录')
    .replaceAll('演示目标', '感知目标')
    .replaceAll('静态交互原型 / 演示数据', '')
    .replaceAll('静态交互原型 / mock 数据', '')
    .replaceAll('静态交互原型', '')
    .replaceAll('静态原型', '')
    .replace(/(?<![A-Za-z_-])原型(?![A-Za-z_-])/gu, '')
    .replace(/(?<![A-Za-z_-])mock(?![A-Za-z_-])/giu, '')
    .replace(/(?<![A-Za-z_-])Mock(?![A-Za-z_-])/gu, '')
    .replace(/(?<![A-Za-z_-])模拟(?![A-Za-z_-])/gu, '')
    .replace(/(?<![A-Za-z_-])演示(?![A-Za-z_-])/gu, '')
    .replaceAll('（演示）', '')
    .replace(/；?仅改变当前会话[^。<]*/gu, '')
    .replace(/仅改变当前会话[^。<]*/gu, '')
    .replace(/当前会话(?:内)?(?:生效)?/gu, '')
    .replace(/不调用真实[^。<]*/gu, '')
    .replace(/不连接真实[^。<]*/gu, '')
    .replace(/不生成真实[^。<]*/gu, '')
    .replace(/不加载真实[^。<]*/gu, '')
    .replace(/不提供真实[^。<]*/gu, '')
    .replace(/不含真实[^。<]*/gu, '')
    .replace(/未导出真实[^。<]*/gu, '')
    .replace(/未调用真实[^。<]*/gu, '')
    .replace(/仅为演示[^。<]*/gu, '')
    .replace(/脱敏示例/gu, '登记证图片')
    .replace(/占位/gu, '')
    .replace(/\s*[（(]\s*[）)]/gu, '')
    .replace(/\bprototype\b/giu, '')
    .replace(/；+/gu, '；')
    .replace(/。+/gu, '。')
    .replace(/\s{2,}/g, ' ')
    .replace(/；\s*([”"』])/gu, '$1')
    .replace(/([？?])\s*；/gu, '$1');
  const groupOf = (key) => (groups.find(([, links]) => links.some(([id]) => id === key)) || [])[0] || '管理平台';
  const breadcrumb = (key) => `${groupOf(key)} / ${meta[key]?.[0] || routeLabel(key)}`;
  const pageHelpPanel = (routeKey = route()) => {
    const info = window.AdminPageHelp?.resolve(routeKey) || { title: routeLabel(routeKey), overview: '当前页面说明待补充。', steps: [], fields: [] };
    const title = info.title || routeLabel(routeKey);
    if (state.helpCollapsed) {
      return `<aside class="page-help collapsed" aria-label="页面说明"><button class="page-help-rail" data-action="toggle-help" aria-expanded="false" title="展开页面说明"><span>说明</span></button></aside>`;
    }
    const steps = (info.steps || []).map((step, index) => `<li><i>${index + 1}</i><span>${safe(step)}</span></li>`).join('');
    const fields = (info.fields || []).map((field) => `<article class="help-field"><b>${safe(field.name)}</b><p>${safe(field.desc)}</p></article>`).join('');
    return `<aside class="page-help" aria-label="页面说明"><header class="page-help-head"><div><h2>页面说明</h2><p>${safe(title)}</p></div><button class="text-btn" data-action="toggle-help" aria-expanded="true">收起</button></header><section class="page-help-section"><h3>页面概述</h3><p>${safe(info.overview || '')}</p></section><section class="page-help-section"><h3>操作逻辑</h3><ol class="help-steps">${steps || '<li><span>暂无操作说明</span></li>'}</ol></section><section class="page-help-section"><h3>字段说明</h3><div class="help-fields">${fields || '<p class="record-note">暂无字段说明</p>'}</div></section></aside>`;
  };
  const loginPage = () => {
    const account = safe(state.loginDraft.account || '');
    const password = safe(state.loginDraft.password || '');
    const captcha = safe(state.loginDraft.captcha || '');
    const captchaCode = String(state.loginCaptcha || '');
    const captchaMarks = [...captchaCode].map((ch, index) => `<i style="--i:${index}">${safe(ch)}</i>`).join('');
    const error = state.loginError ? `<p class="admin-login-error" role="alert">${safe(state.loginError)}</p>` : '';
    return `<section class="admin-login" aria-label="管理平台登录">
      <div class="admin-login-stage" aria-hidden="true">
        <div class="admin-login-aurora"></div>
        <div class="admin-login-grid"></div>
        <div class="admin-login-beam"></div>
        <div class="admin-login-orbit"></div>
        <span class="admin-login-drone"></span>
      </div>
      <div class="admin-login-shell">
        <aside class="admin-login-hero">
          <div class="admin-login-brand"><span class="brand-mark">低</span><div><b>鄞州低空智护</b><small>公安管理平台</small></div></div>
          <div class="admin-login-copy">
            <p>鄞州区 · 低空安全治理</p>
            <h1>让每一次起飞<br />都有序可管</h1>
          </div>
        </aside>
        <section class="admin-login-card">
          <header>
            <p class="eyebrow">ACCOUNT ACCESS</p>
            <h2>账号登录</h2>
            <span>请使用公安管理平台账号进入系统</span>
          </header>
          <form id="admin-login-form" class="admin-login-form" autocomplete="on">
            <label><span>账号</span><input name="account" data-login-field="account" value="${account}" placeholder="请输入管理账号" autocomplete="username" /></label>
            <label><span>密码</span><input name="password" type="password" data-login-field="password" value="${password}" placeholder="请输入密码" autocomplete="current-password" /></label>
            <label class="admin-login-captcha-field"><span>验证码</span><div class="admin-login-captcha-row"><input name="captcha" data-login-field="captcha" value="${captcha}" placeholder="请输入验证码" maxlength="4" autocomplete="off" /><button type="button" class="admin-login-captcha" data-action="refresh-captcha" title="点击刷新" aria-label="点击刷新验证码">${captchaMarks}</button></div></label>
            ${error}
            <button class="primary-btn admin-login-submit" type="button" data-action="admin-login">进入管理平台</button>
          </form>
        </section>
      </div>
      <p class="admin-login-version">V1.0.0</p>
      ${state.toast ? `<div class="toast" role="status">${state.toast}</div>` : ''}
    </section>`;
  };
  const shell = (content, key = route()) => {
    const menu = currentMenu(key);
    const visibleTabs = state.tabs.map((tab) => `<div class="route-tab ${tab.id === key ? 'active' : ''}"><button class="route-tab-select" data-go="${tab.id}"${tab.id === key ? ' aria-current="page"' : ''}>${safe(tab.label)}</button>${tab.closable ? `<button class="tab-close" data-action="close-tab" data-tab="${safe(tab.id)}" aria-label="关闭${safe(tab.label)}">×</button>` : ''}</div>`).join('');
    return deliveryCopy(`<aside id="admin-sidebar" class="side ${state.sidebarCollapsed ? 'collapsed' : ''}"><div class="admin-brand"><span class="brand-mark">低</span><div><b>鄞州低空智护</b><small>公安管理平台</small></div></div><nav class="side-scroll" aria-label="后台导航">${groups.map(([label, links]) => { const open = links.some(([id]) => id === menu) || state.expandedGroups.has(label); return `<div class="nav-group ${open ? 'open' : ''}"><button class="nav-group-toggle" data-action="toggle-group" data-group="${label}" aria-expanded="${open}">${groupIcon(label)}<span>${label}</span><i>⌄</i></button><div class="nav-children">${links.map(([id, name]) => `<button class="nav-link ${menu === id ? 'active' : ''}" data-go="${id}">${navIcon(id)}<span>${name}</span></button>`).join('')}</div></div>`; }).join('')}</nav><div class="side-footer"><i class="live"></i><span>系统运行正常</span></div></aside><section class="main-shell ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}"><header class="topbar"><div class="topbar-left"><button class="top-icon sidebar-trigger" data-action="toggle-sidebar" aria-controls="admin-sidebar" aria-expanded="${!state.sidebarCollapsed}" aria-label="${state.sidebarCollapsed ? '展开侧栏' : '折叠侧栏'}">${icon('M4 6h16M4 12h16M4 18h16')}</button><div class="crumb">${breadcrumb(menu).replace(' / ',' <i>/</i> ')}</div></div><div class="top-actions"><button class="top-icon" data-action="notify" aria-label="查看提醒">${icon('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M16 16l4 4')}</button><button class="top-icon" data-action="fullscreen" aria-label="切换全屏">${icon('M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5M3 21h5')}</button><div class="top-user"><span class="avatar">${safe((state.session && state.session.avatar) || '鄞')}</span><div class="top-user-copy"><b>${safe((state.session && state.session.name) || '管理员')}</b><small>${safe((state.session && state.session.role) || '系统管理员')}</small></div><button class="logout-btn" type="button" data-action="logout">退出登录</button></div></div></header><nav class="route-tabs" aria-label="已打开页面"><div class="route-tabs-scroll">${visibleTabs}</div><button class="tab-more" data-action="close-others" aria-label="关闭其他页签">${icon('M7 10l5 5 5-5')}</button></nav><div class="workspace ${state.helpCollapsed ? 'help-collapsed' : ''}"><section class="page-body">${content}</section>${pageHelpPanel(key)}</div></section>${state.modal ? modal() : ''}${state.toast ? `<div class="toast" role="status">${state.toast}</div>` : ''}`);
  };
  const heading = (name, _description, actions = '') => `<header class="page-heading"><div><p class="eyebrow">LOW-ALTITUDE GOVERNANCE</p><h1>${name}</h1></div><div class="actions">${actions}</div></header>`;
  const rowsFor = (key) => {
    const common = { users:data.users, companies:data.companies, certificates:data.certificates, drones:data.drones, flights:data.flights, activities:data.activities, alerts:data.alerts, ['shoulder-lights']:data.shoulderLights };
    if (common[key]) return common[key];
    const generated = {
      blacklist: ledgers.blacklist,
      ['drone-blacklist']: (ledgers.droneBlacklist || []).filter((row) => (row.state || '已拉黑') === '已拉黑'),
      accounts: ledgers.accounts,
      accountUsers:[{id:'ACC-PERSONAL',name:data.profiles.personal.name,type:data.profiles.personal.label || '个人用户',scope:'个人资料、飞行执照、登记证、无人机、飞行计划、活动与反馈',state:'正常'},{id:'ACC-COMPANY',name:data.profiles.company.name,type:data.profiles.company.label || '企业用户',scope:'企业资料、关联用户、我的飞手、登记证、无人机、飞行申报与反馈',state:data.profiles.company.verified === '已认证' ? '正常' : '待认证'}],
      audit:[{id:'LOG-001',name:'台账查询',operator:'管理员',time:'2026-07-30 09:16',state:'已记录'},{id:'LOG-002',name:'飞行计划核查',operator:'核查员',time:'2026-07-30 08:52',state:'已记录'}],
      verification: ledgers.verification,
      enrollments:data.enrollments,
      laws:data.articles.filter((x) => x.kind === '法规').slice().sort((a, b) => (Number(a.sort) || 999) - (Number(b.sort) || 999) || String(b.date || '').localeCompare(String(a.date || ''))),
      news:data.articles.filter((x) => x.kind === '公告').slice().sort((a, b) => (Number(a.sort) || 999) - (Number(b.sort) || 999) || String(b.date || '').localeCompare(String(a.date || ''))),
      guides:data.articles.filter((x) => x.kind === '指引'),faq:(data.uomGuide.faqs || []).map((item) => ({ id:item.id, question:item.question, answer:item.answer, mediaType:item.mediaType || '图文', updated:item.updated || data.uomGuide.updated, status:item.status || '已发布', sort: Number(item.sort) > 0 ? Number(item.sort) : 999 })),
      volunteers: ledgers.volunteers,
      ['rid-modules']: ledgers.ridModules,
      messages:(data.messageTemplates || []).map((item) => ({
        id: item.id,
        name: item.name,
        scene: item.scene,
        trigger: item.trigger,
        channel: item.channel === '系统消息' ? '系统推送' : (item.channel || '系统推送'),
        title: item.title,
        content: item.content || '',
        variables: item.variables || '—',
        state: item.state === '已停用' ? '已停用' : '已启用',
        updated: item.updated || data.now
      })),
      feedback:data.feedbacks,
      interface:[{id:'INT-001',name:'市级低空飞行服务管理平台',type:'用户/设备/飞行计划上报',state:'待接入'},{id:'INT-002',name:'鄞州智巡车防一体化系统',type:'飞行计划推送/比对结果推送',state:'待接入'},{id:'INT-003',name:'肩灯厂商侦测平台',type:'定时轮询感知数据',state:'待接入'}]
    };
    return generated[key] || [];
  };
  const columnsFor = (key, rows) => {
    const preferred = {
      users: ['name', 'idNumber', 'phone', 'address', 'license'],
      companies: ['name', 'contact', 'accounts', 'drones', 'status'],
      accounts: ['name', 'role', 'bound', 'scope', 'state'],
      certificates: ['registrationMark', 'aircraftName', 'serialNumber', 'issuedTo', 'registrationStatus', 'registrationDate'],
      drones: ['registrationMark', 'aircraftName', 'manufacturerModel', 'serialNumber', 'emptyWeight', 'maxTakeoffWeight', 'aircraftType', 'registrationStatus', 'group', 'manageState'],
      flights: ['id', 'title', 'time', 'area', 'missionNature', 'drone', 'operator', 'executed'],
      activities: ['title', 'startTime', 'endTime', 'enrolledQuota', 'status', 'confirmState'],
      enrollments: ['name', 'applicant', 'phone', 'time', 'state'],
      feedback: ['category', 'title', 'time'],
      alerts: ['type', 'title', 'zone', 'time', 'status'],
      volunteers: ['name', 'phone', 'volunteerType', 'area', 'state'],
      ['rid-modules']: ['id', 'sn', 'model', 'state', 'volunteerName', 'area', 'updatedAt'],
      blacklist: ['name', 'type', 'reason', 'operatedBy', 'operatedAt', 'state'],
      ['drone-blacklist']: ['aircraftName', 'registrationMark', 'serialNumber', 'owner', 'reason', 'operatedBy', 'operatedAt'],
      verification: ['id', 'aircraftName', 'serialNumber', 'registrationMark', 'ownerType', 'checkType', 'result', 'checkDate', 'operator'],
      laws: ['title', 'source', 'effectiveDate', 'sort', 'status', 'date'],
      news: ['title', 'sort', 'status', 'date'],
      guides: ['title', 'date', 'views'],
      faq: ['question', 'answer', 'updated', 'status'],
      messages: ['id', 'name', 'scene', 'channel', 'state', 'updated'],
      ['shoulder-lights']: ['id', 'state', 'holder', 'unit', 'issuedAt', 'returnedAt'],
      interface: ['name', 'type', 'state']
    }[key];
    return preferred || Object.keys(rows[0] || {}).filter((x) => x !== 'id' && typeof (rows[0] || {})[x] !== 'object').slice(0, 5);
  };
  const label = (key) => ({id:'编号',name:'姓名',type:'账号身份',idNumber:'身份证号',phone:'手机号码',address:'地址',license:'飞行执照图片',licenseFileName:'执照文件名',drones:'设备数',contact:'授权人',accounts:'账号数',drone:'飞行设备',registrationMark:'登记标志',manufacturerModel:'航空器型号和制造人',serialNumber:'序号',aircraftName:'产品名称',emptyWeight:'空机重量',maxTakeoffWeight:'最大起飞重量',aircraftType:'类型',issuedTo:'本证发给',mobilePhone:'联系手机',registrationStatus:'登记状态',registrationDate:'注册日期',state:'状态',updated:'更新时间',model:'设备型号',sn:'设备序列号',updatedAt:'更新时间',owner:'归属',group:'设备分组',manageState:'管理状态',title:'计划名称',time:'计划时间',area:'飞行区域',status:'发布状态',pinned:'置顶',sort:'排序',executed:'执行状态',place:'地点',operator:'通信联络人',operatorPhone:'通信联络电话',activityType:'飞行活动类型',missionNature:'任务性质',controlMode:'操控模式',flightMode:'飞行模式',startAt:'预计开始时间',endAt:'预计结束时间',maxAltitude:'最大飞行高度',takeoffSite:'起飞地',purpose:'任务性质',approval:'审批材料',role:'角色',scope:'服务范围',reason:'原因',applicant:'报名人',source:'来源',category:'类别',rule:'规则',holder:'持有人',activities:'参与活动',zone:'管控区域',kind:'内容类型',mediaType:'图文/视频',coverImage:'封面',duration:'时长',date:'日期',views:'阅读量',unit:'领用单位',issuedAt:'配发时间',returnedAt:'回收时间',device:'设备编号',detail:'说明',summary:'摘要',question:'问题',answer:'富文本解答',startTime:'开始时间',endTime:'结束时间',enrollStart:'报名开始',enrollEnd:'报名截止',enrolled:'已报名',capacity:'名额',enrolledQuota:'已报名/名额',confirmState:'报名确认状态',organizer:'主办单位',operatedBy:'操作人',operatedAt:'操作时间',scene:'适用场景',channel:'消息类型',content:'消息内容',bound:'统一账号绑定',ridModule:'RID 模块编号',ridState:'RID 配发状态',volunteerType:'志愿者类型',volunteerName:'关联志愿者',confirmedAt:'线下确认日期',effectiveDate:'生效起止',sort:'排序',ownerType:'权属',checkType:'核查类型',checkMethod:'核查方式',checkPlace:'核查地点',result:'核查结果',issueDesc:'问题描述',suggestion:'处理意见',followUpDate:'计划跟进日期',checkDate:'核查日期',droneId:'关联设备'})[key] || key;
  const flightAreaText = (item) => {
    const text = item.area || [item.city || '宁波市鄞州区', item.street].filter(Boolean).join('') || '—';
    return item.areaShot ? `${text}（已上传区域截图）` : text;
  };
  const flightTimeText = (item) => item.time || (item.startAt && item.endAt ? `${item.startAt.replace('T', ' ')}—${item.endAt.replace('T', ' ').slice(11)}` : '—');
  const droneRegistrationState = (item) => (item.state === '已注销' || data.uomValue(item, 'registrationStatus') === '已注销') ? '已注销' : '有效';
  const statusValue = (key, item) => state.overrides.get(`${key}:${item.id}`) || (key === 'drones' && (state.disabledDrones.has(item.id) || item.manageState === '已禁用') ? '已禁用' : key === 'flights' ? (item.executed || '—') : key === 'enrollments' ? (item.state || '—') : key === 'messages' ? (item.state || '已启用') : key === 'verification' ? (item.result || item.state || '—') : item.status || item.state || item.executed || '—');
  const columnLabel = (key, column) => {
    if (key === 'drone-blacklist' && column === 'serialNumber') return '设备序列号';
    if (key === 'drone-blacklist' && column === 'reason') return '拉黑原因';
    if (key === 'messages') return ({ id: '模板编号', name: '模板名称', scene: '业务场景', trigger: '触发条件', channel: '触达渠道', title: '消息标题', content: '消息内容', variables: '变量说明', state: '启用状态', updated: '更新时间' })[column] || label(column);
    if (key === 'companies' && column === 'name') return '企业名称';
    if (key === 'companies' && column === 'status') return '状态';
    if (key === 'rid-modules' && column === 'id') return '模块编号';
    if (key === 'rid-modules' && column === 'state') return '配发状态';
    if (key === 'rid-modules' && column === 'area') return '所属区域';
    if (key === 'activities' && column === 'title') return '活动名称';
    if (key === 'activities' && column === 'status') return '活动状态';
    if (key === 'activities' && column === 'confirmState') return '报名确认状态';
    if (key === 'activities' && column === 'enrolledQuota') return '已报名/名额';
    if (key === 'verification' && column === 'id') return '核查编号';
    if (key === 'verification' && column === 'aircraftName') return '设备名称';
    if (key === 'verification' && column === 'serialNumber') return '设备序列号';
    if (key === 'verification' && column === 'operator') return '核查人';
    if (key === 'volunteers' && column === 'area') return '所属区域';
    if (key === 'verification' && column === 'serialNumber') return '设备序列号';
    if (key === 'feedback' && column === 'category') return '反馈类型';
    if (key === 'feedback' && column === 'title') return '反馈标题';
    if (key === 'feedback' && column === 'time') return '提交时间';
    if (key === 'volunteers' && column === 'state') return '在册状态';
    return label(column);
  };
  const value = (column, item, key) => {
    if (key === 'flights' && column === 'time') return safe(flightTimeText(item));
    if (key === 'flights' && column === 'area') return safe(flightAreaText(item));
    if (key === 'flights' && column === 'missionNature') return safe(item.missionNature || item.purpose || '—');
    if (key === 'flights' && column === 'executed') return status(item.executed || '—');
    if (key === 'drones' && column === 'registrationStatus') return status(droneRegistrationState(item));
    if (key === 'drones' && column === 'manageState') return status(state.disabledDrones.has(item.id) || item.manageState === '已禁用' ? '已禁用' : '正常');
    if (key === 'activities' && column === 'enrolledQuota') return `${safe(item.enrolled ?? 0)} / ${safe(item.capacity ?? 0)}`;
    if (key === 'activities' && column === 'confirmState') return status(activityConfirmState(item));
    if (key === 'enrollments' && column === 'state') return status(item.state || '—');
    if (key === 'messages' && column === 'state') return status(item.state || '已启用');
    if (key === 'messages' && column === 'trigger') {
      const text = String(item.trigger || '');
      return safe(text.length > 28 ? `${text.slice(0, 28)}…` : (text || '—'));
    }
    if (key === 'rid-modules' && column === 'state') return status(item.state || '—');
    if (key === 'rid-modules' && column === 'id') return safe(item.id);
    if (key === 'verification' && column === 'aircraftName') return safe(item.aircraftName || item.name || '—');
    if (key === 'verification' && column === 'result') return status(item.result || '—');
    if (key === 'verification' && column === 'id') return safe(item.id);
    const raw = ['certificates', 'drones'].includes(key) && (data.uomCertificateFields.some(([field]) => field === column) || data.uomDroneFields.some(([field]) => field === column)) ? data.uomValue(item, column) : item[column] ?? '—';
    if (key === 'certificates' && column === 'registrationStatus') return certificateStatus(item.state || raw);
    if (column === 'sort') return safe(String(Number(item.sort) > 0 ? Number(item.sort) : '—'));
    if (column === 'effectiveDate') {
      const start = item.effectiveStart || item.effectiveDate || '—';
      const end = item.effectiveEnd || '';
      return end ? `${safe(start)} 至 ${safe(end)}` : safe(start);
    }
    return ['status','state','executed','license'].includes(column) ? status(column === 'license' ? raw : statusValue(key, item)) : safe(raw);
  };
  const operationLabel = (key) => ({users:'拉黑',companies:'拉黑',blacklist:'取消拉黑',['drone-blacklist']:'取消拉黑',accounts:'配置权限',audit:'查看审计',certificates:'手动注销',drones:'禁用设备',verification:'完成核查',flights:'查看执行',activities:'下架活动',enrollments:'确认报名',laws:'下架内容',news:'下架内容',guides:'下架',faq:'下架问题',volunteers:'移除志愿者',['rid-modules']:'回收模块',messages:'启用模板',['shoulder-lights']:'归还肩灯',alerts:'记录处置',interface:'同步数据'})[key] || '变更状态';
  const operationResult = (key) => ({users:'已拉黑',companies:'已拉黑',blacklist:'已取消拉黑',['drone-blacklist']:'已取消拉黑',accounts:'已调整',audit:'已查阅',certificates:'已注销',drones:'已禁用',verification:'已完成',flights:'已查看',activities:'已下架',enrollments:'已确认',laws:'已下架',news:'已下架',guides:'已下架',faq:'已下架',volunteers:'已移除',['rid-modules']:'已回收',messages:'已更新',['shoulder-lights']:'已归还',alerts:'已处置',interface:'已同步'})[key] || '已更新';
  const table = (key, rows = rowsFor(key)) => {
    const cols = columnsFor(key, rows); const visible = rows.filter((row) => (!state.query || Object.values(row).filter((v) => typeof v !== 'object').join(' ').toLowerCase().includes(state.query.toLowerCase())) && (state.filter === '全部' || statusValue(key, row).includes(state.filter)));
    return visible.length ? `<div class="table-wrap"><table class="data-table"><thead><tr>${cols.map((x) => `<th>${columnLabel(key, x)}</th>`).join('')}<th>操作</th></tr></thead><tbody>${visible.map((item) => `<tr>${cols.map((col) => `<td>${value(col,item,key)}</td>`).join('')}<td><div class="actions"><button class="text-btn" data-action="detail" data-key="${key}" data-id="${safe(item.id)}">详情</button>${(window.AdminUI?.NO_EDIT?.has(key) || ['certificates','drones','drone-blacklist','feedback','accounts','flights','enrollments','audit','alerts','interface','messages'].includes(key)) ? '' : `<button class="text-btn" data-go="form/${key}/${safe(item.id)}">编辑</button>`}${key === 'accounts' ? `<button class="text-btn" data-action="modal" data-modal="permission" data-key="accounts" data-item="${safe(item.id)}">配置权限</button>` : ''}${['laws','news'].includes(key) ? `<button class="text-btn warning" data-action="toggle-content-status" data-id="${safe(item.id)}">${item.status === '已发布' ? '下架' : '发布'}</button><button class="text-btn danger" data-action="request-delete-content" data-key="${key}" data-id="${safe(item.id)}">删除</button>` : ''}${key === 'activities' ? `<button class="text-btn" data-go="detail/activities/${safe(item.id)}">查看报名名单</button><button class="text-btn warning" data-action="request-change" data-key="activities" data-id="${safe(item.id)}">下架活动</button><button class="text-btn danger" data-action="request-delete-content" data-key="activities" data-id="${safe(item.id)}">删除</button>` : ''}${key === 'drones' && droneRegistrationState(item) !== '已注销' ? `<button class="text-btn danger" data-action="cancel-drone" data-id="${safe(item.id)}">手动注销</button>` : ''}${key === 'certificates' && item.state !== '已注销' ? `<button class="text-btn danger" data-action="request-change" data-key="certificates" data-id="${safe(item.id)}">手动注销</button>` : ''}${(key === 'users' || key === 'companies' || key === 'blacklist' || key === 'volunteers' || key === 'drone-blacklist') ? `<button class="text-btn danger" data-action="request-change" data-key="${key}" data-id="${safe(item.id)}">${operationLabel(key)}</button>` : ''}${key === 'drones' && !(state.disabledDrones.has(item.id) || item.manageState === '已禁用') ? `<button class="text-btn warning" data-action="request-change" data-key="drones" data-id="${safe(item.id)}">禁用设备</button>` : ''}${key === 'verification' ? (item.result === '待核查' ? `<button class="text-btn" data-action="request-change" data-key="verification" data-id="${safe(item.id)}">完成核查</button>` : '') : key === 'messages' ? `<button class="text-btn ${item.state === '已启用' ? 'warning' : ''}" data-action="toggle-message-template" data-id="${safe(item.id)}">${item.state === '已启用' ? '停用' : '启用'}</button>` : (['feedback','laws','news','activities','accounts','certificates','drones','drone-blacklist','users','companies','blacklist','volunteers','flights','enrollments','audit','alerts','interface'].includes(key) ? '' : `<button class="text-btn" data-action="request-change" data-key="${key}" data-id="${safe(item.id)}">${operationLabel(key)}</button>`)}</div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">暂无符合条件的数据</div>';
  };
  const filterBar = (key) => {
    if (key === 'feedback') return `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索反馈编号、提交人、表单类型或填写内容" aria-label="搜索反馈提交记录" /><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    const options = key === 'drone-blacklist' ? null : key === 'certificates' ? ['全部','有效','已注销'] : key === 'faq' ? ['全部','已发布','已下架'] : key === 'flights' ? ['全部','未执行','已确认执行'] : key === 'enrollments' ? ['全部','待确认','已确认'] : key === 'activities' ? ['全部','报名中','进行中','已结束','已下架'] : key === 'messages' ? ['全部','已启用','已停用'] : key === 'verification' ? ['全部','待核查','通过','不通过'] : ['全部','正常','待处理','已记录'];
    if (key === 'drone-blacklist') return `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索产品名称、登记标志、序列号或拉黑原因" aria-label="搜索无人机黑名单" /><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    if (key === 'faq') return `<div class="filter-bar faq-filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索问题关键词" aria-label="搜索常见问题" /><select id="state-filter" aria-label="发布状态筛选">${options.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    if (key === 'verification') return `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索核查编号、设备名称、设备序列号或登记标志" aria-label="搜索设备核查" /><select id="state-filter" aria-label="核查结果筛选">${options.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    if (key === 'messages') return `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索模板编号、名称、业务场景或触发条件" aria-label="搜索消息模板" /><select id="state-filter" aria-label="启用状态筛选">${options.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    return `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索${meta[key][0]}" aria-label="搜索" /><select id="state-filter" aria-label="状态筛选">${options.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
  };
  const faqRows = () => rowsFor('faq')
    .filter((row) => (!state.query || `${row.question} ${row.answer}`.toLowerCase().includes(state.query.toLowerCase())) && (state.filter === '全部' || row.status === state.filter))
    .slice()
    .sort((a, b) => (Number(a.sort) || 999) - (Number(b.sort) || 999) || String(b.updated || '').localeCompare(String(a.updated || '')));
  const faqTable = () => {
    const rows = faqRows(); const pageSize = 5; const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.faqPage = Math.min(state.faqPage, totalPages);
    const start = (state.faqPage - 1) * pageSize; const visible = rows.slice(start, start + pageSize);
    const pagination = `<footer class="table-pagination" aria-label="常见问题分页"><span>共 ${rows.length} 条，第 ${state.faqPage}/${totalPages} 页</span><div><button class="secondary-btn" data-action="faq-page" data-page="${state.faqPage - 1}"${state.faqPage === 1 ? ' disabled' : ''}>上一页</button>${Array.from({ length: totalPages }, (_, index) => `<button class="page-number ${state.faqPage === index + 1 ? 'active' : ''}" data-action="faq-page" data-page="${index + 1}" aria-current="${state.faqPage === index + 1 ? 'page' : 'false'}">${index + 1}</button>`).join('')}<button class="secondary-btn" data-action="faq-page" data-page="${state.faqPage + 1}"${state.faqPage === totalPages ? ' disabled' : ''}>下一页</button></div></footer>`;
    return visible.length ? `<div class="table-wrap faq-table-wrap"><table class="data-table faq-data-table"><thead><tr><th>问题</th><th>图文解答（富文本）</th><th>排序</th><th>更新时间</th><th>发布状态</th><th>操作</th></tr></thead><tbody>${visible.map((item) => `<tr><td><b>${safe(item.question)}</b><small class="faq-record-id">${safe(item.id)}</small></td><td><span class="faq-answer-summary">${safe(String(item.answer || '').replace(/[#*\-\[\]]/g, '').replace(/\n+/g, ' '))}</span></td><td>${safe(String(Number(item.sort) > 0 ? Number(item.sort) : '—'))}</td><td>${safe(item.updated)}</td><td>${status(item.status)}</td><td><div class="actions"><button class="text-btn" data-go="form/faq/${safe(item.id)}">编辑</button><button class="text-btn warning" data-action="request-change" data-key="faq" data-id="${safe(item.id)}">${operationLabel('faq')}</button><button class="text-btn danger" data-action="request-delete-content" data-key="faq" data-id="${safe(item.id)}">删除</button></div></td></tr>`).join('')}</tbody></table>${pagination}</div>` : '<div class="empty">暂无符合条件的问题</div>';
  };
  const exportPages = { enrollments:'报名名单', audit:'操作日志', flights:'飞行计划台账' };
  const guideAdmin = () => {
    const guides = (Array.isArray(data.uomGuide.guides) ? data.uomGuide.guides : [{ id: 'GUIDE-01', title: data.uomGuide.manualTitle, summary: data.uomGuide.manualRichText, mediaType: '图文', status: '已发布', sort: 1, updated: data.uomGuide.updated }])
      .slice()
      .sort((a, b) => (Number(a.sort) || 999) - (Number(b.sort) || 999) || String(b.updated || '').localeCompare(String(a.updated || '')));
    return shell(`${heading('操作手册','维护 UOM 平台操作手册流程标题、摘要、编号排序与图文说明；可新建、编辑、上架/下架与删除。',`<button class="primary-btn" data-go="form/guides/new">新建流程</button>`)}<section class="content-panel"><div class="panel-title"><h2>流程指导列表</h2><span class="record-note">${guides.length} 条流程</span></div><div class="manual-admin-preview">${guides.map((guide) => {
      const published = (guide.status || '已发布') === '已发布';
      const toggleLabel = published ? '下架' : '上架';
      const toggleTone = published ? 'text-btn warning' : 'text-btn';
      return `<article><div class="panel-title"><b>${safe(guide.title)}</b><div class="actions"><button class="text-btn" data-go="detail/guides/${safe(guide.id)}">详情</button><button class="text-btn" data-go="form/guides/${safe(guide.id)}">编辑</button><button class="${toggleTone}" data-action="request-change" data-key="guides" data-id="${safe(guide.id)}">${toggleLabel}</button><button class="text-btn danger" data-action="request-delete-content" data-key="guides" data-id="${safe(guide.id)}">删除</button></div></div><p>${safe(guide.summary || guide.richText || '')}</p><small>${status(guide.status || '已发布')} · 编号排序 ${safe(String(Number(guide.sort) > 0 ? Number(guide.sort) : '—'))} · ${safe(guide.updated || data.uomGuide.updated)}</small></article>`;
    }).join('')}</div></section>`, 'guides');
  };
  const faqAdmin = () => shell(`${heading('常见问题解答','由后台配置“问题 + 图文解答（富文本）”与排序，用户端按排序展示并点击问题后弹窗阅读。','<button class="primary-btn" data-go="form/faq/new">新建问题</button>')}${filterBar('faq')}${faqTable()}`, 'faq');
  const accountContextPage = () => window.AdminSystem.usersPage({ shell, heading, safe, status, state, data, announce: notify });
  const systemPageCtx = () => ({ shell, heading, safe, status, state, data, announce: notify });
  const activityEnrollments = (activityId) => data.enrollments.filter((item) => item.activityId === activityId);
  const activityConfirmState = (activityOrId) => {
    const activity = typeof activityOrId === 'string' ? data.activities.find((item) => item.id === activityOrId) : activityOrId;
    return activity?.confirmState === '已确认' ? '已确认' : '未确认';
  };
  const enrollmentSummary = (activityId) => {
    const rows = activityEnrollments(activityId);
    const pending = rows.filter((item) => item.state === '待确认').length;
    const listState = activityConfirmState(activityId);
    return { total: rows.length, pending, confirmed: rows.length - pending, listState };
  };
  const enrollmentRosterBody = (activityId) => {
    const rows = activityEnrollments(activityId);
    if (!rows.length) return '<div class="empty">暂无报名记录</div>';
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>报名人</th><th>联系电话</th><th>提交时间</th><th>报名状态</th><th>操作</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${safe(row.applicant)}</td><td>${safe(row.phone)}</td><td>${safe(row.time)}</td><td>${status(row.state)}</td><td><button class="text-btn" data-action="view-enrollment-form" data-id="${safe(row.id)}">查看填写内容</button></td></tr>`).join('')}</tbody></table></div>`;
  };
  const enrollmentFormBody = (item) => {
    const formEntries = Object.entries(item?.formData || {});
    const metaRows = `<section class="detail-grid" style="margin:12px 0"><div><span>关联活动</span><b>${safe(item?.name || '—')}</b></div><div><span>报名人</span><b>${safe(item?.applicant || '—')}</b></div><div><span>联系电话</span><b>${safe(item?.phone || '—')}</b></div><div><span>提交时间</span><b>${safe(item?.time || '—')}</b></div><div><span>报名状态</span><b>${status(item?.state || '—')}</b></div></section>`;
    const formRows = formEntries.length
      ? miniTable(['字段名称', '填写内容'], formEntries.map(([field, value]) => [safe(field), safe(value || '未填写')]))
      : '<div class="empty">暂无表单填写内容</div>';
    return `${metaRows}<section class="content-panel" style="margin:0;box-shadow:none;border:1px solid var(--line)"><div class="panel-title"><h2>报名表单填写内容</h2></div>${formRows}</section>`;
  };
  const enrollmentsAdmin = () => {
    const rows = data.activities.map((activity) => {
      const summary = enrollmentSummary(activity.id);
      return { ...activity, pending: summary.pending, listState: summary.listState, enrolledText: `${activity.enrolled || summary.total} / ${activity.capacity}` };
    }).filter((row) => !state.query || `${row.title}${row.id}`.toLowerCase().includes(state.query.toLowerCase()))
      .filter((row) => state.filter === '全部' || (state.filter === '待确认' ? row.pending > 0 : state.filter === '已确认' ? row.listState === '已确认' : true));
    const body = rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>活动名称</th><th>活动状态</th><th>已报名/名额</th><th>待确认</th><th>名单确认状态</th><th>操作</th></tr></thead><tbody>${rows.map((item) => `<tr><td><b>${safe(item.title)}</b><small class="faq-record-id">${safe(item.id)}</small></td><td>${status(item.status)}</td><td>${safe(item.enrolledText)}</td><td>${item.pending}</td><td>${status(item.listState)}</td><td><div class="actions"><button class="text-btn" data-go="detail/activities/${safe(item.id)}">进入名单确认</button><button class="text-btn" data-action="export" data-label="报名名单">导出</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">暂无符合条件的活动报名</div>';
    return shell(`${heading('报名确认','按活动汇总待确认报名；进入活动详情核对后对本场名单执行总确认。','<button class="primary-btn" data-action="export" data-label="报名名单">导出报名</button>')}<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索活动名称" aria-label="搜索活动" /><select id="state-filter" aria-label="名单确认状态筛选">${['全部','待确认','已确认'].map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>${body}`, 'enrollments');
  };
  const formModules = ['activities','laws','news','guides','faq','volunteers','blacklist','verification'];
  const normal = (key) => {
    if (key === 'guides') return guideAdmin();
    if (key === 'faq') return faqAdmin();
    if (key === 'accounts' || key === 'sys-users') return accountContextPage();
    if (key === 'roles') return window.AdminSystem.rolesPage(systemPageCtx());
    if (key === 'menus') return window.AdminSystem.menusPage(systemPageCtx());
    if (key === 'dicts') return window.AdminSystem.dictsPage(systemPageCtx());
    if (key === 'config') return window.AdminSystem.configPage(systemPageCtx());
    if (key === 'login-logs') return window.AdminSystem.loginLogsPage(systemPageCtx());
    const [name, desc, action] = meta[key];
    const headerButton = exportPages[key]
      ? `<button class="primary-btn" data-action="export" data-label="${exportPages[key]}">${action}</button>`
      : key === 'certificates' || key === 'enrollments' || key === 'flights' || key === 'audit' || key === 'alerts' || key === 'interface'
        ? (exportPages[key] ? `<button class="primary-btn" data-action="export" data-label="${exportPages[key]}">${action}</button>` : (key === 'flights' || key === 'enrollments' || key === 'audit' ? `<button class="primary-btn" data-action="export" data-label="${action}">${action}</button>` : ''))
        : key === 'drones'
          ? `<button class="primary-btn" data-go="verification">${action}</button>`
          : formModules.includes(key)
            ? `<button class="primary-btn" data-go="form/${key}/new">${action}</button>`
            : '';
    return shell(`${heading(name,desc,headerButton)}${filterBar(key)}${table(key)}`,key);
  };
  const metric = (name, number, note) => `<article class="metric-card"><span>${name}</span><strong>${number}</strong><small>${note}</small></article>`;
  const dashboardMetric = (name, number, note, go) => `<button type="button" class="metric-card is-interactive" data-go="${go}"><span>${name}</span><strong>${number}</strong><small>${note}</small></button>`;
  const dashboardAnchorDate = '2026-08-10';
  const areaRangeOptions = [
    { id: 'week', label: '近一周' },
    { id: 'month', label: '一月' },
    { id: 'year', label: '一年' },
    { id: 'custom', label: '自选时间段' }
  ];
  const areaRangeLabel = () => {
    if (state.areaRange === 'custom') return `${state.areaCustomStart || '—'} 至 ${state.areaCustomEnd || '—'}`;
    return areaRangeOptions.find((item) => item.id === state.areaRange)?.label || '近一周';
  };
  const shiftDate = (iso, days) => {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const flightPlanDay = (flight) => {
    const raw = String(flight?.startAt || flight?.time || '').trim();
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  };
  const dashboardRangeBounds = () => {
    if (state.areaRange === 'custom') {
      return { start: state.areaCustomStart || '', end: state.areaCustomEnd || '' };
    }
    if (state.areaRange === 'month') return { start: shiftDate(dashboardAnchorDate, -29), end: dashboardAnchorDate };
    if (state.areaRange === 'year') return { start: shiftDate(dashboardAnchorDate, -364), end: dashboardAnchorDate };
    return { start: shiftDate(dashboardAnchorDate, -6), end: dashboardAnchorDate };
  };
  const flightsInDashboardRange = () => {
    const { start, end } = dashboardRangeBounds();
    return (data.flights || []).filter((flight) => {
      const day = flightPlanDay(flight);
      if (!day) return false;
      if (start && day < start) return false;
      if (end && day > end) return false;
      return true;
    });
  };
  const normalizeTakeoffSite = (value) => {
    const raw = String(value || '').trim();
    if (!raw || raw === '—') return '';
    const streets = data.yinzhouStreets || [];
    const hit = streets.find((street) => raw === street || raw.includes(street));
    return hit || raw;
  };
  const distRowsFromCounts = (counts) => {
    const entries = Object.entries(counts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'zh'));
    const max = Math.max(...entries.map(([, count]) => count), 1);
    return entries.map(([name, count]) => ({ name, count, pct: Math.max(8, Math.round((count / max) * 100)) }));
  };
  const takeoffDistributionRows = () => {
    const counts = {};
    flightsInDashboardRange().forEach((flight) => {
      const site = normalizeTakeoffSite(flight.takeoffSite);
      if (!site) return;
      counts[site] = (counts[site] || 0) + 1;
    });
    return distRowsFromCounts(counts);
  };
  const activityTypeDistributionRows = () => {
    const counts = {};
    flightsInDashboardRange().forEach((flight) => {
      const type = String(flight.activityType || '').trim() || '未填写';
      counts[type] = (counts[type] || 0) + 1;
    });
    return distRowsFromCounts(counts);
  };
  const flightSortieStats = () => {
    const rows = flightsInDashboardRange();
    const total = rows.length;
    const done = rows.filter((flight) => flight.executed === '已确认执行').length;
    const pending = rows.filter((flight) => flight.executed !== '已确认执行').length;
    return [
      { name: '报备架次', value: String(total), tone: 'filled', caption: `当前统计时间段内飞行计划数` },
      { name: '已执行架次', value: String(done), tone: 'filled', caption: total ? `占报备 ${Math.round((done / total) * 100)}%` : '暂无报备' },
      { name: '未执行架次', value: String(pending), tone: 'pending', caption: total ? `占报备 ${Math.round((pending / total) * 100)}%` : '暂无报备' }
    ];
  };
  const licenseStats = [
    { name: '已上传执照', value: '864', tone: 'filled' },
    { name: '未上传执照', value: '96', tone: 'pending' }
  ];
  const areaRangeFilter = () => {
    const chips = areaRangeOptions.map((item) => `<button type="button" class="range-chip ${state.areaRange === item.id ? 'is-active' : ''}" data-action="dashboard-area-range" data-range="${item.id}">${item.label}</button>`).join('');
    const custom = state.areaRange === 'custom'
      ? `<div class="range-custom"><label>开始日期<input type="date" data-area-date="start" value="${safe(state.areaCustomStart)}" aria-label="自选开始日期" /></label><label>结束日期<input type="date" data-area-date="end" value="${safe(state.areaCustomEnd)}" aria-label="自选结束日期" /></label></div>`
      : '';
    return `<div class="range-filter range-filter--board" aria-label="飞行报备统计时间段筛选"><div class="range-chips">${chips}</div>${custom}</div>`;
  };
  const dashboardFlightToolbar = () => `<div class="dashboard-flight-toolbar"><p class="range-hint">当前统计时间段：<b>${safe(areaRangeLabel())}</b></p><div data-dashboard-area-filter>${areaRangeFilter()}</div></div>`;
  const distListPanel = (rows, kind, emptyText) => {
    const active = state.dashboardPick?.kind === kind ? state.dashboardPick.id : '';
    if (!rows.length) return `<div class="empty">${safe(emptyText)}</div>`;
    return `<div class="dist-list">${rows.map((item) => `<button type="button" class="dist-row is-interactive ${active === item.name ? 'is-active' : ''}" data-action="dashboard-pick" data-kind="${kind}" data-id="${safe(item.name)}" data-value="${item.count}" data-label="${safe(item.name)}"><span>${safe(item.name)}</span><div class="dist-bar"><i style="width:${item.pct}%"></i></div><b>${item.count}</b></button>`).join('')}</div>`;
  };
  const areaDistributionPanel = () => distListPanel(takeoffDistributionRows(), 'area', '所选时间段暂无起飞地报备数据');
  const activityTypeStatsPanel = () => distListPanel(activityTypeDistributionRows(), 'activity-type', '所选时间段暂无飞行活动类型数据');
  const flightSortieStatsPanel = () => {
    const active = state.dashboardPick?.kind === 'sortie' ? state.dashboardPick.id : '';
    const details = flightSortieStats();
    const total = Number(details[0]?.value || 0) || 0;
    const cards = details.map((item) => {
      const value = Number(item.value || 0) || 0;
      const pct = item.name === '报备架次' ? (total ? 100 : 0) : (total ? Math.round((value / total) * 100) : 0);
      return `<button type="button" class="sortie-card is-interactive ${active === item.name ? 'is-active' : ''}" data-action="dashboard-pick" data-kind="sortie" data-id="${safe(item.name)}" data-value="${safe(item.value)}" data-label="${safe(item.name)}"><span>${safe(item.name)}</span><strong>${safe(item.value)}</strong><i class="sortie-bar" aria-hidden="true"><b style="width:${pct}%"></b></i><em>${safe(item.caption)}</em></button>`;
    }).join('');
    return `<div class="sortie-grid">${cards}</div>`;
  };
  const licenseStatsPanel = () => {
    const active = state.dashboardPick?.kind === 'license' ? state.dashboardPick.id : '';
    const uploaded = Number(String(licenseStats[0]?.value || '0').replace(/,/g, '')) || 0;
    const pending = Number(String(licenseStats[1]?.value || '0').replace(/,/g, '')) || 0;
    const total = uploaded + pending;
    const rate = total ? Math.round((uploaded / total) * 100) : 0;
    const pendingPct = total ? Math.max(0, 100 - rate) : 0;
    const details = [
      { ...licenseStats[0], pct: rate, caption: `占应持有 ${rate}% · 合计 ${total} 本` },
      { ...licenseStats[1], pct: pendingPct, caption: `占应持有 ${pendingPct}% · 待催办补充` }
    ];
    const cards = details.map((item) => `<button type="button" class="license-card license-card--${safe(item.tone || 'filled')} is-interactive ${active === item.name ? 'is-active' : ''}" data-action="dashboard-pick" data-kind="license" data-id="${safe(item.name)}" data-value="${safe(item.value)}" data-label="${safe(item.name)}"><div><span>${safe(item.name)}</span><strong>${safe(item.value)}</strong><em>${safe(item.caption)}</em></div><div class="license-ring" style="--p:${item.pct}" aria-hidden="true"><b>${item.pct}%</b></div></button>`).join('');
    return `<div class="license-grid">${cards}</div>`;
  };
  const dashboardPanel = (title, bodyAttr, bodyHtml, extraClass = '') => `<article class="panel dashboard-panel ${extraClass}"><header class="panel-head"><div><p class="label">数据统计</p><h2>${title}</h2></div></header><div class="panel-body" ${bodyAttr}>${bodyHtml}</div></article>`;
  const dashboard = () => shell(`<div class="dashboard-page">${heading('鄞州低空治理工作台')}<section class="metric-grid">${dashboardMetric('个人用户','2,486','较上月 +8.6%','users')}${dashboardMetric('企业用户','186','较上月 +3.2%','companies')}${dashboardMetric('在册无人机','3,927','本周新增 28 架','drones')}${dashboardMetric('飞行计划','128','今日待执行 16 项','flights')}</section><section class="dashboard-license">${dashboardPanel('执照数据', 'data-dashboard-license-body', licenseStatsPanel(), 'dashboard-panel--license')}</section><section class="dashboard-flight"><div data-dashboard-board-toolbar class="dashboard-flight-toolbar-host">${dashboardFlightToolbar()}</div><div class="dashboard-flight-layout">${dashboardPanel('起飞地分布', 'data-dashboard-area-body', areaDistributionPanel(), 'dashboard-panel--takeoff')}${dashboardPanel('飞行活动类型统计', 'data-dashboard-activity-type-body', activityTypeStatsPanel(), 'dashboard-panel--activity')}${dashboardPanel('飞行架次统计', 'data-dashboard-sortie-body', flightSortieStatsPanel(), 'dashboard-panel--sortie')}</div></section></div>`,'dashboard');
  const patchDashboardArea = () => {
    const page = app.querySelector('.dashboard-page');
    if (!page) { render(); return false; }
    page.classList.add('is-settled');
    const toolbarHost = page.querySelector('[data-dashboard-board-toolbar]');
    const bodyHost = page.querySelector('[data-dashboard-area-body]');
    const sortieHost = page.querySelector('[data-dashboard-sortie-body]');
    const typeHost = page.querySelector('[data-dashboard-activity-type-body]');
    if (toolbarHost) toolbarHost.innerHTML = dashboardFlightToolbar();
    if (bodyHost) bodyHost.innerHTML = areaDistributionPanel();
    if (sortieHost) sortieHost.innerHTML = flightSortieStatsPanel();
    if (typeHost) typeHost.innerHTML = activityTypeStatsPanel();
    return true;
  };
  const patchDashboardPick = () => {
    const page = app.querySelector('.dashboard-page');
    if (!page) { render(); return false; }
    page.classList.add('is-settled');
    const pick = state.dashboardPick || {};
    page.querySelectorAll('.dist-row').forEach((row) => {
      const kind = row.getAttribute('data-kind') || 'area';
      row.classList.toggle('is-active', pick.kind === kind && row.dataset.id === pick.id);
    });
    page.querySelectorAll('.sortie-card,.license-card').forEach((card) => {
      const kind = card.getAttribute('data-kind') || '';
      card.classList.toggle('is-active', pick.kind === kind && card.dataset.id === pick.id);
    });
    return true;
  };
  const softToast = (message) => {
    state.toast = message;
    let toast = app.querySelector?.('.toast');
    if (toast) {
      toast.textContent = message;
    } else if (typeof document.createElement === 'function' && typeof app.appendChild === 'function') {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.textContent = message;
      app.appendChild(toast);
    } else {
      app.innerHTML = `${String(app.innerHTML || '').replace(/<div class="toast"[^>]*>[\s\S]*?<\/div>/g, '')}<div class="toast" role="status">${safe(message)}</div>`;
    }
    if (softToast.timer != null && typeof window.clearTimeout === 'function') window.clearTimeout(softToast.timer);
    softToast.timer = setTimeout(() => {
      state.toast = '';
      const current = app.querySelector?.('.toast');
      if (current?.remove) current.remove();
      else app.innerHTML = String(app.innerHTML || '').replace(/<div class="toast"[^>]*>[\s\S]*?<\/div>/g, '');
    }, 2300);
  };
  const miniTable = (headers, rows) => rows.length ? `<div class="table-wrap sub-table"><table class="data-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<div class="empty">暂无关联记录</div>';
  const sectionPanel = (name, body, extra = '') => `<section class="content-panel"><div class="panel-title"><h2>${name}</h2>${extra}</div>${body}</section>`;
  const certificateAttachment = (certificate) => {
    const source = String(certificate.certificateImageUrl || '');
    const allowed = /^(?:data:image\/(?:png|jpeg);base64,[a-z0-9+/=]+|\.\.\/\.\.\/shared\/assets\/[a-z0-9._-]+\.svg)$/iu.test(source);
    if (!allowed) return '';
    return sectionPanel('登记证图片', `<figure class="certificate-attachment"><img class="certificate-attachment-image" src="${safe(source)}" alt="用户端提交的 UOM 登记证图片" /><figcaption>登记证表格版式，来自用户端登记证申请</figcaption></figure>`);
  };
  const historyTimeline = (items, note = '') => {
    const ordered = items.slice().reverse();
    return `${note ? `<p class="timeline-note">${note}</p>` : ''}${ordered.length ? `<ol class="history-timeline">${ordered.map((entry) => `<li><b>${safe(entry.action)}</b><p>${safe(entry.detail)}</p><small>${safe(entry.time)}</small></li>`).join('')}</ol>` : '<div class="empty">暂无变更记录</div>'}`;
  };
  const relatedSections = (key, item) => {
    if (key === 'users' || key === 'companies') {
      const owner = item.name;
      const certs = data.certificates.filter((c) => c.holder === owner || c.issuedTo === owner);
      const droneRows = data.drones.filter((d) => certs.some((c) => c.id === d.certificate));
      const flightRows = data.flights.filter((f) => f.owner === owner);
      const members = key === 'companies' ? sectionPanel('授权账号管理', miniTable(['姓名', '关系', '是否飞手', '分配设备', '手机号码', '状态', '操作'], (item.name === data.profiles.company.name ? data.companyMembers : []).map((m) => {
        const assigned = (m.assignedDroneIds || []).map((droneId) => data.drones.find((drone) => drone.id === droneId)).filter(Boolean).map((drone) => data.uomValue(drone, 'aircraftName')).join('、') || '—';
        return [safe(m.name), safe(m.relation), m.isPilot ? '是' : '否', safe(assigned), safe(m.phone), status(m.state || '正常'), `<button class="text-btn" data-action="toggle-member" data-id="${safe(m.id)}">${(m.state || '正常') === '正常' ? '停用' : '启用'}</button>`];
      })), `<button class="secondary-btn" data-action="modal" data-modal="add-member" data-key="companies" data-item="${safe(item.id)}">添加授权账号</button>`) : '';
      return `${members}${sectionPanel('上传的 UOM 登记证', miniTable(['登记标志', '产品名称', '状态', '注册日期'], certs.map((c) => [safe(c.registrationMark), safe(c.aircraftName), certificateStatus(c.state), safe(c.registrationDate)])))}${sectionPanel('名下设备', miniTable(['产品名称', '登记标志', '分组', '台账状态'], droneRows.map((d) => [safe(data.uomValue(d, 'aircraftName')), safe(d.registrationMark), safe(d.group || '—'), status(statusValue('drones', d))])))}${sectionPanel('飞行活动与执行记录', miniTable(['计划编号', '计划名称', '计划时间', '计划状态', '执行状态'], flightRows.map((f) => [safe(f.id), safe(f.title), safe(f.time), status(f.status), status(f.executed)])))}`;
    }
    if (['certificates', 'drones', 'flights'].includes(key)) {
      const entries = key === 'drones' ? (data.certificates.find((c) => c.id === item.certificate)?.history || []) : (item.history || []);
      return sectionPanel(key === 'flights' ? '修改历史与执行记录' : '信息更新记录', historyTimeline(entries));
    }
    return '';
  };
  const serviceDetail = (key, id) => {
    if (key === 'activities') {
      const item = data.activities.find((activity) => activity.id === id) || data.activities[0];
      const enrollForm = (item.enrollForm || defaultEnrollFields()).map((row) => (window.AdminUI?.normalizeEnrollField ? AdminUI.normalizeEnrollField(row) : row));
      const enrollFormView = enrollForm.map((row) => [safe(row[0]), safe(window.AdminUI?.toEnrollUiType ? AdminUI.toEnrollUiType(row[1]) : row[1]), safe(row[2]), safe(row[3] || '—'), safe(row[1] === '单选' ? (row[4] || '—') : '—')]);
      const rows = activityEnrollments(item.id);
      const confirmState = activityConfirmState(item);
      return shell(`${heading('活动详情','',`<button class="secondary-btn" data-go="activities">返回列表</button><button class="primary-btn" data-go="form/activities/${safe(item.id)}">编辑活动</button><button class="secondary-btn warning" data-action="request-change" data-key="activities" data-id="${safe(item.id)}">下架活动</button><button class="danger-btn" data-action="request-delete-content" data-key="activities" data-id="${safe(item.id)}">删除活动</button>`)}<section class="service-hero activity-admin-hero"><div><span>活动编号 ${safe(item.id)}</span><h2>${safe(item.title)}</h2><p>${safe(item.summary)}</p></div>${status(item.status)}</section><section class="detail-grid"><div><span>活动开始时间</span><b>${safe(item.startTime)}</b></div><div><span>活动结束时间</span><b>${safe(item.endTime)}</b></div><div><span>报名开始时间</span><b>${safe(item.enrollStart)}</b></div><div><span>报名结束时间</span><b>${safe(item.enrollEnd)}</b></div><div><span>活动地点</span><b>${safe(item.place)}</b></div><div><span>主办单位</span><b>${safe(item.organizer || '—')}</b></div><div><span>咨询方式</span><b>${safe(item.contact || '—')}</b></div><div><span>报名情况</span><b>${safe(item.enrolled)} / ${safe(item.capacity)} 人</b></div><div><span>活动状态</span><b>${status(item.status)}</b></div><div><span>报名确认状态</span><b>${status(confirmState)}</b></div></section><section class="content-panel"><div class="panel-title"><h2>报名表单配置</h2><span class="record-note">共 ${enrollForm.length} 个字段</span></div>${miniTable(['字段名称', '字段类型', '是否必填', '提示文案', '下拉选项'], enrollFormView)}</section><section class="content-panel"><h2>活动介绍</h2>${(item.richText || [item.summary]).map((paragraph) => `<p>${safe(paragraph)}</p>`).join('')}</section><section class="content-panel" id="activity-enrollments"><div class="panel-title"><h2>本场报名名单</h2><span class="record-note">已报名 ${rows.length} · ${confirmState}</span></div>${enrollmentRosterBody(item.id)}<div class="actions" style="margin-top:12px">${confirmState === '已确认' ? '<button class="secondary-btn" disabled>已确认（用户不可报名）</button>' : `<button class="primary-btn" data-action="confirm-activity-enrollments" data-id="${safe(item.id)}">一键确认</button>`}<button class="secondary-btn" data-action="export" data-label="报名名单">导出本场名单</button></div></section>`,'activities');
    }
    if (key === 'enrollments') {
      const item = rowsFor('enrollments').find((enrollment) => enrollment.id === id) || rowsFor('enrollments')[0];
      const activity = data.activities.find((entry) => entry.id === item.activityId);
      const formEntries = Object.entries(item.formData || {});
      const formPanel = formEntries.length
        ? sectionPanel('报名表单填写内容', miniTable(['字段名称', '填写内容'], formEntries.map(([field, value]) => [safe(field), safe(value || '未填写')])))
        : sectionPanel('报名表单填写内容', '<div class="empty">暂无表单填写内容</div>');
      return shell(`${heading('活动报名详情','',`<button class="secondary-btn" data-go="detail/activities/${safe(item.activityId)}">返回活动详情</button><button class="primary-btn" data-go="detail/activities/${safe(item.activityId)}">打开本场名单</button><button class="secondary-btn" data-go="activities">返回列表</button>`)}<section class="detail-grid"><div><span>关联活动</span><b>${safe(item.name)}</b></div><div><span>报名人</span><b>${safe(item.applicant)}</b></div><div><span>联系电话</span><b>${safe(item.phone)}</b></div><div><span>报名提交时间</span><b>${safe(item.time)}</b></div><div><span>报名状态</span><b>${status(item.state)}</b></div>${activity ? `<div><span>活动时间</span><b>${safe(activity.startTime)} 至 ${safe(activity.endTime)}</b></div>` : ''}</section>${formPanel}`,'enrollments');
    }
    if (['laws','news'].includes(key)) {
      const item = rowsFor(key).find((article) => article.id === id) || rowsFor(key)[0];
      const isVideo = item.coverKind === 'video' || item.mediaType === '视频';
      const cover = item.coverImage
        ? (isVideo
          ? `<video class="content-cover-media" src="${safe(item.coverImage)}" controls playsinline></video>`
          : `<img class="content-cover-media" src="${safe(item.coverImage)}" alt="封面" />`)
        : '';
      const video = isVideo && !item.coverImage ? `<button class="video-player" data-action="notify-video" aria-label="播放视频"><span class="video-play">▶</span><b>${safe(item.title)}</b><small>示例视频 · ${safe(item.duration || '—')}</small></button>` : '';
      const effectiveStart = item.effectiveStart || item.effectiveDate || item.date || '—';
      const effectiveEnd = item.effectiveEnd || '';
      const effective = key === 'laws' ? ` · 生效 ${safe(effectiveStart)}${effectiveEnd ? ` 至 ${safe(effectiveEnd)}` : ''}` : '';
      return shell(`${heading(key === 'news' ? '新闻公告详情' : '安全普法详情','',`<button class="secondary-btn" data-go="${key}">返回列表</button><button class="primary-btn" data-go="form/${key}/${safe(item.id)}">编辑内容</button><button class="secondary-btn warning" data-action="request-change" data-key="${key}" data-id="${safe(item.id)}">下架内容</button><button class="danger-btn" data-action="request-delete-content" data-key="${key}" data-id="${safe(item.id)}">删除</button>`)}<article class="content-detail"><span>${safe(item.kind)}</span><h2>${safe(item.title)}</h2><p class="content-meta">${safe(item.source)} · ${safe(item.date)}${effective} · ${safe(item.views)} 阅读</p>${cover}${video}<div class="content-summary">${safe(item.summary)}</div>${item.content.map((paragraph) => `<p>${safe(paragraph)}</p>`).join('')}</article>` ,key);
    }
    if (key === 'guides') {
      const guides = Array.isArray(data.uomGuide.guides) ? data.uomGuide.guides : [];
      const item = guides.find((guide) => guide.id === id) || guides[0] || { id, title: data.uomGuide.manualTitle, summary: '', richText: data.uomGuide.manualRichText, status: '已发布', sort: 1, updated: data.uomGuide.updated };
      const richBlocks = String(item.richText || '').split(/\n\n+/).filter(Boolean).map((block) => {
        const [headingText, ...body] = block.split('\n');
        return `<article><b>${safe(headingText.replace(/^##\s*/, ''))}</b>${body.map((line) => `<p>${safe(line)}</p>`).join('')}</article>`;
      }).join('') || `<p>${safe(item.summary || '暂无图文说明')}</p>`;
      const published = (item.status || '已发布') === '已发布';
      const toggleLabel = published ? '下架' : '上架';
      return shell(`${heading('操作手册详情','',`<button class="secondary-btn" data-go="guides">返回列表</button><button class="primary-btn" data-go="form/guides/${safe(item.id)}">编辑流程</button><button class="secondary-btn ${published ? 'warning' : ''}" data-action="request-change" data-key="guides" data-id="${safe(item.id)}">${toggleLabel}</button><button class="danger-btn" data-action="request-delete-content" data-key="guides" data-id="${safe(item.id)}">删除</button><button class="secondary-btn" data-go="faq">管理常见问题</button>`)}<section class="detail-grid"><div><span>流程标题</span><b>${safe(item.title)}</b></div><div><span>发布状态</span><b>${status(item.status || '已发布')}</b></div><div><span>编号排序</span><b>${safe(String(Number(item.sort) > 0 ? Number(item.sort) : '—'))}</b></div><div><span>更新时间</span><b>${safe(item.updated || data.uomGuide.updated || '—')}</b></div><div class="is-wide"><span>流程摘要</span><b>${safe(item.summary || '—')}</b></div></section><section class="content-panel"><div class="panel-title"><h2>图文说明</h2></div><div class="manual-admin-preview">${richBlocks}</div></section>`,'guides');
    }
    if (key === 'feedback') {
      const item = data.feedbacks.find((feedbackItem) => feedbackItem.id === id);
      if (!item) return shell(`${heading('意见反馈详情','',`<button class="secondary-btn" data-go="feedback">返回列表</button>`)}<div class="empty">未找到反馈记录 ${safe(id || '')}</div>`,'feedback');
      return shell(`${heading('意见反馈详情','',`<button class="secondary-btn" data-go="feedback">返回列表</button>`)}${feedbackContentBody(item)}`,'feedback');
    }
    if (key === 'alerts') {
      const item = data.alerts.find((alert) => alert.id === id) || data.alerts[0];
      const evidence = item.evidence;
      const evidenceSection = evidence
        ? `<section class="evidence-card"><header><b>电子证据包</b><span>异常事件触发后秒级自动生成</span></header><div class="detail-grid"><div><span>无人机 SN 码</span><b>${safe(evidence.sn)}</b></div><div><span>机型</span><b>${safe(evidence.model)}</b></div><div><span>飞手 GPS 坐标</span><b>${safe(evidence.pilotGps)}</b></div><div><span>采集时间戳</span><b>${safe(evidence.capturedAt)}</b></div><div><span>证据来源</span><b>${safe(evidence.source)}</b></div></div></section>`
        : '<section class="content-panel"><p>该条目为规则提醒类告警，不生成电子证据包。</p></section>';
      return shell(`${heading('侦测预警详情','',`<button class="secondary-btn" data-go="alerts">返回列表</button><button class="primary-btn" data-action="request-change" data-key="alerts" data-id="${safe(item.id)}">记录处置</button>`)}<section class="detail-grid"><div><span>告警编号</span><b>${safe(item.id)}</b></div><div><span>告警类型</span><b>${status(item.type)}</b></div><div class="is-wide"><span>告警标题</span><b>${safe(item.title)}</b></div><div class="is-wide"><span>触发规则</span><b>${safe(item.rule || '—')}</b></div><div><span>管控区域</span><b>${safe(item.zone)}</b></div><div><span>时间</span><b>${safe(item.time)}</b></div><div><span>处置状态</span><b>${status(statusValue('alerts', item))}</b></div></section>${evidenceSection}${sectionPanel('推送记录', miniTable(['推送终端', '推送时间', '状态'], (item.pushes || []).map((p) => [safe(p.target), safe(p.time), status(p.state)])), `<button class="secondary-btn" data-action="modal" data-modal="push-alert" data-key="alerts" data-item="${safe(item.id)}">推送至指定终端</button>`)}`,'alerts');
    }
    if (key === 'interface') {
      const item = rowsFor('interface').find((row) => row.id === id) || rowsFor('interface')[0];
      let body = '';
      if (item.id === 'INT-001') body = `${sectionPanel('数据上报目录（待接入）', miniTable(['数据主题', '更新频度', '最近上报', '状态'], data.linkage.report.map((r) => [safe(r.theme), safe(r.frequency), safe(r.time), status(r.state)])))}<section class="content-panel"><h2>指令接收（下行预留）</h2><p>预留专门监听接口，支持实时接收市级平台下发的临时禁飞、空域管控等指令；具体报文格式待市级平台技术规范明确后适配。</p></section>`;
      if (item.id === 'INT-002') body = `${sectionPanel('飞行计划推送记录', miniTable(['推送编号', '关联计划', '推送内容', '时间', '状态'], data.linkage.planPush.map((r) => [safe(r.id), safe(r.plan), safe(r.content), safe(r.time), status(r.state)])))}${sectionPanel('感知比对结果推送记录', miniTable(['编号', '目标 SN', '比对结果', '时间', '状态'], data.linkage.compareResult.map((r) => [safe(r.id), safe(r.sn), status(r.result), safe(r.time), status(r.state)])))}`;
      if (item.id === 'INT-003') body = `<section class="content-panel"><h2>肩灯厂商侦测平台对接</h2><p>按不低于 60 秒/次轮询接收肩灯感知数据（无人机 SN 码、飞手 GPS 坐标、时间戳），导入本平台与飞行计划执行库比对。</p>${miniTable(['字段', '说明'], [['无人机 SN 码', '用于与报备设备比对'], ['飞手 GPS 坐标', '辅助现场处置定位'], ['时间戳', '感知采集时间'], ['轮询频率', '不低于 60 秒/次'], ['接入状态', '待接入']])}</section>`;
      return shell(`${heading('外部接口详情','',`<button class="secondary-btn" data-go="interface">返回列表</button><button class="secondary-btn" data-action="request-change" data-key="interface" data-id="${safe(item.id)}">同步数据</button>`)}<section class="detail-grid"><div><span>接口名称</span><b>${safe(item.name)}</b></div><div><span>接口类型</span><b>${safe(item.type)}</b></div><div><span>接入状态</span><b>${status(item.state)}</b></div></section>${body}`,'interface');
    }
    return null;
  };
  const detailWideLabels = new Set(['消息内容', '流程摘要', '计划名称', '飞行区域', '地址', '审批材料', '告警标题', '触发规则', '无人机主要用途', '活动介绍', '问题描述', '处理意见', '起飞地', '常住地址']);
  const detailGrid = (rows) => {
    const cells = rows.map(([name, content, trusted]) => ({
      name,
      html: `<span>${safe(name)}</span><b>${trusted ? content : safe(content)}</b>`,
      wide: detailWideLabels.has(name)
    }));
    let col = 0;
    cells.forEach((cell, index) => {
      if (cell.wide) {
        col = 0;
        return;
      }
      if (col === 0 && index === cells.length - 1) {
        cell.wide = true;
        return;
      }
      col = col === 0 ? 1 : 0;
    });
    return `<section class="detail-grid">${cells.map((cell) => `<div${cell.wide ? ' class="is-wide"' : ''}>${cell.html}</div>`).join('')}</section>`;
  };
  const detail = (key, id) => {
    const servicePage = serviceDetail(key, id);
    if (servicePage) return servicePage;
    const item = rowsFor(key).find((row) => row.id === id) || {id,name:'业务记录'};
    if (key === 'drone-blacklist') {
      return shell(`${heading('无人机黑名单详情','',`<button class="secondary-btn" data-go="drone-blacklist">返回列表</button><button class="danger-btn" data-action="request-change" data-key="drone-blacklist" data-id="${safe(id)}">取消拉黑</button>`)}${sectionPanel('黑名单信息', detailGrid([['产品名称', item.aircraftName || '—'], ['登记标志', item.registrationMark || '—'], ['设备序列号', item.serialNumber || '—'], ['归属', item.owner || '—'], ['拉黑原因', item.reason || '—'], ['操作人', item.operatedBy || '—'], ['操作时间', item.operatedAt || '—'], ['对应管理状态', status('已禁用'), true]]))}`,'drone-blacklist');
    }
    const related = relatedSections(key, item);
    const historyButton = related || key === 'alerts' ? '' : '<button class="secondary-btn" data-action="history">查看关联/历史记录</button>';
    if (key === 'users') {
      const personal = item.id === 'USR-001' ? data.profiles.personal : item;
      const supplement = personal.supplement || {};
      return shell(`${heading('用户管理详情','',`<button class="secondary-btn" data-go="users">返回列表</button><button class="danger-btn" data-action="request-change" data-key="users" data-id="${safe(id)}">${operationLabel(key)}</button>`)}${sectionPanel('基本信息', detailGrid([['姓名', personal.name || item.name], ['身份证号', personal.idNumber || item.idNumber], ['手机号码', personal.phone || item.phone], ['地址', personal.address || item.address], ['飞行执照图片', status(personal.license || item.license || '未上传'), true], ['执照文件名', personal.licenseFileName || item.licenseFileName || '—'], ['状态', status(statusValue(key, item)), true]]))}${sectionPanel('补充信息', detailGrid([['常住地址', (data.formatResidenceAddress ? data.formatResidenceAddress(supplement) : '') || '未填写'], ['紧急联系人', supplement.emergencyContact || '未填写'], ['紧急联系电话', supplement.emergencyPhone || '未填写']]))}${related}`);
    }
    if (key === 'companies') {
      const company = item.id === 'ENT-001' ? data.profiles.company : item;
      const supplement = company.supplement || {};
      return shell(`${heading('企业管理详情','',`<button class="secondary-btn" data-go="companies">返回列表</button><button class="danger-btn" data-action="request-change" data-key="companies" data-id="${safe(id)}">${operationLabel(key)}</button>`)}${sectionPanel('基本信息', detailGrid([['企业名称', company.name || item.name], ['统一社会信用代码', company.creditCode || item.creditCode || '—'], ['认证状态', status(company.verified || item.verified || '—'), true], ['授权联系人', company.contact || item.contact || '—'], ['联系电话', company.phone || item.phone || '—'], ['状态', status(statusValue(key, item)), true]]))}${sectionPanel('补充信息', detailGrid([['无人机主要用途', supplement.droneUsage || '未填写'], ['安全负责人', supplement.safetyOfficer || '未填写'], ['安全负责人电话', supplement.safetyPhone || '未填写']]))}${related}`);
    }
    if (key === 'flights') {
      const contact = [item.operator, item.operatorPhone].filter(Boolean).join(' ') || '—';
      const submitter = item.submitter || item.operator || item.owner || '—';
      const executedAtText = item.executed === '未执行'
        ? '—'
        : (item.executedAt || (item.history || []).slice().reverse().find((entry) => /执行/.test(entry.action || ''))?.time || '—');
      const flightFields = [['计划编号', item.id], ['计划名称', item.title], ['提交人', submitter], ['飞行活动类型', item.activityType || '—'], ['任务性质', item.missionNature || item.purpose || '—'], ['操控模式', item.controlMode || '—'], ['飞行模式', item.flightMode || '—'], ['预计开始时间', item.startAt ? item.startAt.replace('T', ' ') : '—'], ['预计结束时间', item.endAt ? item.endAt.replace('T', ' ') : '—'], ['飞行区域', flightAreaText(item)], ['飞行设备', item.drone || '—'], ['通信联络方式', contact], ['最大飞行高度', item.maxAltitude ? `${item.maxAltitude} 米` : '—'], ['起飞地', item.takeoffSite || '—'], ['审批材料', item.approval || '未上传截图'], ['计划状态', status(item.status || '—'), true], ['执行状态', status(item.executed || '—'), true], ['执行时间', executedAtText]];
      return shell(`${heading('飞行计划详情','',`<button class="secondary-btn" data-go="flights">返回列表</button>`)}${detailGrid(flightFields)}${related}`);
    }
    if (key === 'volunteers') {
      const removeBtn = item.state === '在册'
        ? `<button class="danger-btn" data-action="request-change" data-key="volunteers" data-id="${safe(id)}">移除志愿者</button>`
        : '';
      return shell(`${heading('志愿者详情','',`<button class="secondary-btn" data-go="volunteers">返回列表</button><button class="primary-btn" data-go="form/volunteers/${safe(id)}">编辑信息</button>${removeBtn}`)}${sectionPanel('基本信息', detailGrid([['姓名', item.name], ['手机号码', item.phone], ['关联用户', item.userId || '—'], ['志愿者类型', item.volunteerType || '—'], ['所属区域', item.area || '—'], ['线下确认日期', item.confirmedAt || '—'], ['在册状态', status(item.state || '在册'), true]]))}`,'volunteers');
    }
    if (key === 'messages') {
      const src = (data.messageTemplates || []).find((entry) => entry.id === id) || item;
      const channel = src.channel === '系统消息' ? '系统推送' : (src.channel || '系统推送');
      const enableState = src.state === '已停用' ? '已停用' : '已启用';
      const toggleLabel = enableState === '已启用' ? '停用模板' : '启用模板';
      const toggleTone = enableState === '已启用' ? 'warning' : 'primary';
      const toggleBtn = `<button class="${toggleTone}-btn" data-action="toggle-message-template" data-id="${safe(id)}">${toggleLabel}</button>`;
      return shell(`${heading('消息模板详情','',`<button class="secondary-btn" data-go="messages">返回列表</button>${toggleBtn}`)}${detailGrid([
        ['模板编号', src.id || '—'],
        ['模板名称', src.name || '—'],
        ['业务场景', src.scene || '—'],
        ['触达渠道', channel],
        ['启用状态', status(enableState), true],
        ['更新时间', src.updated || '—'],
        ['触发条件', src.trigger || '—'],
        ['变量说明', src.variables || '—'],
        ['消息标题', src.title || '—'],
        ['消息内容', src.content || '—']
      ])}`,'messages');
    }
    if (key === 'verification') {
      const completeBtn = item.result === '待核查'
        ? `<button class="secondary-btn" data-action="request-change" data-key="verification" data-id="${safe(id)}">完成核查</button>`
        : '';
      return shell(`${heading('设备核查详情','',`<button class="secondary-btn" data-go="verification">返回列表</button><button class="primary-btn" data-go="form/verification/${safe(id)}">编辑记录</button>${completeBtn}`)}${detailGrid([
        ['核查编号', item.id],
        ['设备名称', item.aircraftName || item.name || '—'],
        ['设备序列号', item.serialNumber || '—'],
        ['登记标志', item.registrationMark || '—'],
        ['权属', item.ownerType || '—'],
        ['核查类型', item.checkType || '—'],
        ['核查方式', item.checkMethod || '—'],
        ['核查地点', item.checkPlace || '—'],
        ['核查结果', status(item.result || '—'), true],
        ['问题描述', item.issueDesc || '—'],
        ['处理意见', item.suggestion || item.detail || '—'],
        ['计划跟进日期', item.followUpDate || '—'],
        ['核查人', item.operator || '—'],
        ['核查日期', item.checkDate || item.time || '—'],
        ['办理状态', status(item.state || '—'), true]
      ])}`,'verification');
    }
    const uomFields = key === 'certificates' ? data.uomCertificateFields : key === 'drones' ? data.uomDroneFields : null;
    const registrationState = key === 'drones' ? droneRegistrationState(item) : null;
    const adminDisable = key === 'drones' && (state.disabledDrones.has(item.id) || item.manageState === '已禁用');
    const details = uomFields ? uomFields.map(([field, name]) => [name, key === 'certificates' && field === 'registrationStatus' ? certificateStatus(item.state || data.uomValue(item, field)) : key === 'drones' && field === 'registrationStatus' ? registrationState : data.uomValue(item, field), (key === 'certificates' || key === 'drones') && field === 'registrationStatus']).concat(key === 'certificates' ? [['归集更新时间', item.updated || '—']] : [['归属', item.owner || '—'], ['设备分组', item.group || '—'], ['管理状态', status(adminDisable ? '已禁用' : '正常'), true]]) : Object.entries(item).filter(([, content]) => typeof content !== 'object' || content === null).map(([field, content]) => [label(field), ['status','state','executed'].includes(field) ? status(statusValue(key, item)) : safe(content), true]);
    const canFormEdit = formModules.includes(key);
    const noEdit = ['certificates', 'drones', 'flights', 'enrollments', 'feedback', 'audit', 'alerts', 'interface'].includes(key);
    const detailOps = `${canFormEdit ? `<button class="primary-btn" data-go="form/${key}/${safe(id)}">编辑记录</button>` : ''}${key === 'drones' && registrationState !== '已注销' ? `<button class="danger-btn" data-action="cancel-drone" data-id="${safe(id)}">手动注销</button>` : ''}${key === 'certificates' && item.state === '已注销' ? '' : (noEdit && key !== 'certificates' && key !== 'drones' ? `<button class="secondary-btn" data-action="request-change" data-key="${key}" data-id="${safe(id)}">${operationLabel(key)}</button>` : (key === 'certificates' && item.state !== '已注销' ? `<button class="danger-btn" data-action="request-change" data-key="certificates" data-id="${safe(id)}">手动注销</button>` : (key === 'drones' && !(state.disabledDrones.has(item.id) || item.manageState === '已禁用') ? `<button class="secondary-btn" data-action="request-change" data-key="drones" data-id="${safe(id)}">禁用设备</button>` : (!noEdit && !canFormEdit ? `<button class="secondary-btn" data-action="request-change" data-key="${key}" data-id="${safe(id)}">${operationLabel(key)}</button>` : ''))))}${historyButton}`;
    return shell(`${heading(`${meta[key]?.[0] || '模块'}详情`,'',`<button class="secondary-btn" data-go="${key}">返回列表</button>${detailOps}`)}${detailGrid(details)}${key === 'certificates' ? certificateAttachment(item) : ''}${related}`);
  };
  const feedbackFieldKey = (name) => {
    if (/类型/.test(name)) return 'category';
    if (/标题/.test(name)) return 'title';
    if (/说明|描述|内容/.test(name)) return 'content';
    if (/电话|手机/.test(name)) return 'phone';
    return name;
  };
  const feedbackFormName = (item) => {
    const formMeta = (data.feedbackForms || []).find((form) => form.id === item.formId);
    return formMeta?.name || item.category || '—';
  };
  const feedbackFilledRows = (item) => {
    const formMeta = (data.feedbackForms || []).find((form) => form.id === item.formId);
    const fields = formMeta?.fields || [];
    const values = item.fields || {};
    const rows = [];
    if (fields.length) {
      fields.forEach((row) => {
        const name = Array.isArray(row) ? row[0] : '';
        const type = Array.isArray(row) ? row[1] : '';
        if (!name) return;
        if (type === '图片' || type === '多张图片') {
          const files = item.attachments?.[feedbackFieldKey(name)] || item.attachments?.[name] || [];
          const list = Array.isArray(files) ? files : (files ? [files] : []);
          rows.push([name, list.length ? list.join('、') : '未上传']);
          return;
        }
        const key = feedbackFieldKey(name);
        const raw = values[key] ?? values[name] ?? '';
        rows.push([name, Array.isArray(raw) ? raw.join('、') : (raw || '未填写')]);
      });
    } else {
      Object.entries(values).forEach(([field, value]) => {
        if (['category'].includes(field)) return;
        rows.push([field === 'title' ? '反馈标题' : field === 'content' ? '详细说明' : field === 'phone' ? '联系电话' : field, Array.isArray(value) ? value.join('、') : (value || '未填写')]);
      });
    }
    return rows;
  };
  const feedbackSubmitterType = (item) => (item.submitterType === '企业用户' ? '企业用户' : '个人用户');
  const feedbackContentBody = (item) => {
    const formType = feedbackFormName(item);
    const submitterType = feedbackSubmitterType(item);
    const submitterName = item.submitterName || '—';
    const metaRows = `<section class="detail-grid" style="margin:12px 0"><div><span>反馈编号</span><b>${safe(item.id)}</b></div><div><span>提交人</span><b>${safe(submitterName)}</b></div><div><span>用户身份</span><b>${safe(submitterType)}</b></div><div><span>表单类型</span><b>${safe(formType)}</b></div><div><span>提交时间</span><b>${safe(item.time || '—')}</b></div></section>`;
    const filled = feedbackFilledRows(item);
    const formRows = filled.length
      ? miniTable(['表单字段', '用户填写'], filled.map(([field, value]) => [safe(field), safe(value)]))
      : '<div class="empty">暂无用户填写内容</div>';
    return `${metaRows}<section class="content-panel" style="margin:0;box-shadow:none;border:1px solid var(--line)"><div class="panel-title"><h2>用户填写内容</h2></div>${formRows}</section>`;
  };
  const feedbackContentTable = () => {
    const q = state.query.trim().toLowerCase();
    const rows = (data.feedbacks || []).filter((item) => {
      if (!q) return true;
      const formType = feedbackFormName(item);
      const hay = `${item.id} ${item.submitterName || ''} ${item.submitterType || ''} ${item.time || ''} ${formType} ${item.title || ''} ${item.content || ''}`.toLowerCase();
      return hay.includes(q);
    });
    if (!rows.length) return '<div class="empty">暂无符合条件的反馈</div>';
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>反馈编号</th><th>提交人</th><th>用户身份</th><th>表单类型</th><th>提交时间</th><th>操作</th></tr></thead><tbody>${rows.map((item) => {
      const formType = feedbackFormName(item);
      const submitterType = feedbackSubmitterType(item);
      return `<tr><td>${safe(item.id)}</td><td>${safe(item.submitterName || '—')}</td><td>${safe(submitterType)}</td><td>${safe(formType)}</td><td>${safe(item.time || '—')}</td><td><div class="actions"><button class="text-btn" data-action="view-feedback-form" data-id="${safe(item.id)}">查看详情</button></div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  };

  const configRowsSorted = (rows) => (rows || []).slice().sort((a, b) => (Number(a.sort) || 999) - (Number(b.sort) || 999) || String(a.name || '').localeCompare(String(b.name || ''), 'zh'));
  const configListTable = (key, rows) => {
    const q = state.query.trim().toLowerCase();
    const visible = configRowsSorted(rows).filter((item) => (!q || `${item.id} ${item.name}`.toLowerCase().includes(q)) && (state.filter === '全部' || (item.state || '启用') === state.filter));
    if (!visible.length) return '<div class="empty">暂无符合条件的配置</div>';
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>名称</th><th>排序</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${visible.map((item) => `<tr><td>${safe(item.id)}</td><td>${safe(item.name)}</td><td>${safe(String(item.sort || '—'))}</td><td>${status(item.state || '启用')}</td><td>${safe(item.updated || '—')}</td><td><div class="actions"><button class="text-btn" data-action="modal" data-modal="edit-config" data-key="${key}" data-item="${safe(item.id)}">编辑</button><button class="text-btn ${item.state === '启用' ? 'warning' : ''}" data-action="toggle-config" data-key="${key}" data-id="${safe(item.id)}">${item.state === '启用' ? '停用' : '启用'}</button><button class="text-btn danger" data-action="request-delete-config" data-key="${key}" data-id="${safe(item.id)}">删除</button></div></td></tr>`).join('')}</tbody></table></div>`;
  };
  const configFilterBar = (placeholder) => {
    const options = ['全部', '启用', '停用'];
    return `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="${safe(placeholder)}" aria-label="搜索配置" /><select id="state-filter" aria-label="状态筛选">${options.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
  };
  const streetsPage = () => shell(`${heading('街道配置','',`<button class="primary-btn" data-action="modal" data-modal="edit-config" data-key="streets" data-item="new">新增街道</button>`)}${configFilterBar('搜索街道名称或编号')}${configListTable('streets', data.streetConfigs || [])}`,'streets');
  const districtsPage = () => shell(`${heading('市区配置','',`<button class="primary-btn" data-action="modal" data-modal="edit-config" data-key="districts" data-item="new">新增市区</button>`)}${configFilterBar('搜索市区名称或编号')}${configListTable('districts', data.districtConfigs || [])}`,'districts');
  const flightActivityTypesPage = () => shell(`${heading('飞行活动类型配置','',`<button class="primary-btn" data-action="modal" data-modal="edit-config" data-key="flight-activity-types" data-item="new">新增类型</button>`)}${configFilterBar('搜索类型名称或编号')}${configListTable('flight-activity-types', data.flightActivityTypes || [])}`,'flight-activity-types');
  const configBundle = (key) => {
    if (key === 'streets') {
      if (!Array.isArray(data.streetConfigs)) data.streetConfigs = [];
      return { list: data.streetConfigs, prefix: 'ST', label: '街道', placeholder: '如：钟公庙街道' };
    }
    if (key === 'districts') {
      if (!Array.isArray(data.districtConfigs)) data.districtConfigs = [];
      return { list: data.districtConfigs, prefix: 'DST', label: '市区', placeholder: '如：鄞州区' };
    }
    if (!Array.isArray(data.flightActivityTypes)) data.flightActivityTypes = [];
    return { list: data.flightActivityTypes, prefix: 'FAT', label: '飞行活动类型', placeholder: '如：一般飞行活动' };
  };

  const feedbackPage = () => {
    const tabs = `<div class="page-tabs">${[['content', '反馈内容'], ['forms', '反馈表单管理']].map(([tab, text]) => `<button class="${state.feedbackTab === tab ? 'active' : ''}" data-action="feedback-tab" data-value="${tab}">${text}</button>`).join('')}</div>`;
    const formsTable = data.feedbackForms.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>反馈类型</th><th>类型说明</th><th>字段数</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${data.feedbackForms.map((form) => `<tr><td>${safe(form.name)}</td><td>${safe(form.scene)}</td><td>${form.fields.length} 项</td><td>${status(form.state)}</td><td>${safe(form.updated)}</td><td><div class="actions"><button class="text-btn" data-go="form/feedback-forms/${safe(form.id)}">编辑</button><button class="text-btn warning" data-action="toggle-feedback-form" data-id="${safe(form.id)}">${form.state === '已发布' ? '下架' : '重新发布'}</button><button class="text-btn danger" data-action="request-delete-form" data-id="${safe(form.id)}">删除</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">暂无反馈类型表单</div>';
    const headerActions = state.feedbackTab === 'forms'
      ? `<button class="primary-btn" data-go="form/feedback-forms/new">新建反馈类型</button>`
      : `<button class="primary-btn" data-action="export" data-label="反馈内容">导出反馈</button>`;
    return shell(`${heading('意见反馈','',headerActions)}${tabs}${state.feedbackTab === 'forms' ? formsTable : `${filterBar('feedback')}${feedbackContentTable()}`}`,'feedback');
  };
  const volunteersPage = () => {
    const streets = data.yinzhouStreets || [];
    const areaOptions = ['全部', ...streets];
    const stateOptions = ['全部', '在册', '已移除'];
    const rows = ledgers.volunteers.filter((row) => {
      const q = state.query.trim().toLowerCase();
      const hitQuery = !q || `${row.name}${row.phone}${row.volunteerType}${row.area}`.toLowerCase().includes(q);
      const hitArea = state.areaFilter === '全部' || row.area === state.areaFilter;
      const hitState = state.filter === '全部' || row.state === state.filter;
      return hitQuery && hitArea && hitState;
    });
    const body = rows.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>姓名</th><th>手机号码</th><th>志愿者类型</th><th>所属区域</th><th>在册状态</th><th>操作</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${safe(item.name)}</td><td>${safe(item.phone)}</td><td>${safe(item.volunteerType || '—')}</td><td>${safe(item.area || '—')}</td><td>${status(item.state || '在册')}</td><td><div class="actions"><button class="text-btn" data-action="detail" data-key="volunteers" data-id="${safe(item.id)}">详情</button><button class="text-btn" data-go="form/volunteers/${safe(item.id)}">编辑</button>${item.state === '在册' ? `<button class="text-btn danger" data-action="request-change" data-key="volunteers" data-id="${safe(item.id)}">移除</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">暂无符合条件的志愿者</div>';
    const filters = `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索姓名、手机号" aria-label="搜索志愿者" /><select id="area-filter" aria-label="区域筛选">${areaOptions.map((item) => `<option${state.areaFilter === item ? ' selected' : ''}>${safe(item)}</option>`).join('')}</select><select id="state-filter" aria-label="在册状态筛选">${stateOptions.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    return shell(`${heading('志愿者名册','',`<button class="primary-btn" data-go="form/volunteers/new">添加志愿者</button>`)}${filters}${body}`,'volunteers');
  };
  const ridModulesPage = () => {
    const stateOptions = ['全部', '在库', '已配发'];
    const rows = ledgers.ridModules.filter((row) => {
      const q = state.query.trim().toLowerCase();
      const hitQuery = !q || `${row.id}${row.sn}${row.model}${row.volunteerName}${row.area}${row.state}`.toLowerCase().includes(q);
      const hitState = state.filter === '全部' || row.state === state.filter;
      return hitQuery && hitState;
    });
    const body = rows.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>模块编号</th><th>设备序列号</th><th>设备型号</th><th>配发状态</th><th>关联志愿者</th><th>所属区域</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${safe(item.id)}</td><td>${safe(item.sn || '—')}</td><td>${safe(item.model || '—')}</td><td>${status(item.state)}</td><td>${safe(item.volunteerName || '—')}</td><td>${safe(item.area || '—')}</td><td>${safe(item.updatedAt || '—')}</td><td><div class="actions">${item.state === '在库' ? `<button class="text-btn" data-action="modal" data-modal="issue-rid" data-item="${safe(item.id)}">配发</button>` : ''}${item.state === '已配发' ? `<button class="text-btn" data-action="request-change" data-key="rid-modules" data-id="${safe(item.id)}">回收</button>${item.volunteerId ? `<button class="text-btn" data-action="detail" data-key="volunteers" data-id="${safe(item.volunteerId)}">查看志愿者</button>` : ''}` : ''}</div></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">暂无符合条件的 RID 模块</div>';
    const filters = `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索编号、序列号、志愿者或区域" aria-label="搜索 RID 模块" /><select id="state-filter" aria-label="配发状态筛选">${stateOptions.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    return shell(`${heading('RID模块','',`<button class="primary-btn" data-action="modal" data-modal="create-rid">新增RID</button>`)}${filters}${body}`,'rid-modules');
  };
  const shoulderLightsPage = () => {
    const tabs = `<div class="page-tabs">${[['issue', '配发台账'], ['maintain', '维护台账']].map(([tab, text]) => `<button class="${state.lightTab === tab ? 'active' : ''}" data-action="light-tab" data-value="${tab}">${text}</button>`).join('')}</div>`;
    const q = state.query.trim().toLowerCase();
    const issueStateOptions = ['全部', '在库', '已领用', '维修中'];
    const issueRows = data.shoulderLights.filter((light) => {
      const hitQuery = !q || `${light.id}${light.holder}${light.unit}`.toLowerCase().includes(q);
      const hitState = state.filter === '全部' || light.state === state.filter;
      return hitQuery && hitState;
    });
    const issueTable = issueRows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>设备编号</th><th>配发状态</th><th>领用人</th><th>领用单位</th><th>领用时间</th><th>归还时间</th><th>操作</th></tr></thead><tbody>${issueRows.map((light) => `<tr><td>${safe(light.id)}</td><td>${status(light.state)}</td><td>${safe(light.holder)}</td><td>${safe(light.unit)}</td><td>${safe(light.issuedAt)}</td><td>${safe(light.returnedAt)}</td><td><div class="actions">${light.state === '在库' ? `<button class="text-btn" data-action="modal" data-modal="issue-light" data-item="${safe(light.id)}">配发登记</button>` : ''}${light.state === '已领用' ? `<button class="text-btn" data-action="request-change" data-key="shoulder-lights" data-id="${safe(light.id)}">归还肩灯</button>` : ''}<button class="text-btn" data-action="modal" data-modal="maintain-light" data-item="${safe(light.id)}">登记维护</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">暂无符合条件的数据</div>';
    const maintainStateOptions = ['全部', '维修中', '已完成'];
    const maintainRows = data.lightMaintenance.filter((record) => {
      const hitQuery = !q || `${record.id}${record.device}${record.detail}${record.operator}`.toLowerCase().includes(q);
      const hitState = state.filter === '全部' || record.state === state.filter;
      return hitQuery && hitState;
    });
    const maintainTable = maintainRows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>记录编号</th><th>设备编号</th><th>类型</th><th>说明</th><th>经办人</th><th>时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${maintainRows.map((record) => `<tr><td>${safe(record.id)}</td><td>${safe(record.device)}</td><td>${safe(record.type)}</td><td>${safe(record.detail)}</td><td>${safe(record.operator)}</td><td>${safe(record.time)}</td><td>${status(record.state)}</td><td><div class="actions">${record.state === '维修中' ? `<button class="text-btn" data-action="finish-maintenance" data-id="${safe(record.id)}">完成维护</button>` : '<span class="record-note">—</span>'}</div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">暂无符合条件的维护记录</div>';
    const headerActions = state.lightTab === 'issue'
      ? `<button class="primary-btn" data-action="modal" data-modal="create-light">新增肩带</button>`
      : `<button class="primary-btn" data-action="modal" data-modal="maintain-light">登记维护</button>`;
    const issueFilter = `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索肩灯编号、领用人或单位" aria-label="搜索肩灯" /><select id="state-filter" aria-label="配发状态筛选">${issueStateOptions.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    const maintainFilter = `<div class="filter-bar"><input id="search" value="${safe(state.query)}" placeholder="搜索设备编号或说明" aria-label="搜索维护记录" /><select id="state-filter" aria-label="维护状态筛选">${maintainStateOptions.map((item) => `<option${state.filter === item ? ' selected' : ''}>${item}</option>`).join('')}</select><button class="secondary-btn grow" data-action="reset-filter">重置筛选</button></div>`;
    return shell(`${heading('肩灯配发', '', headerActions)}${tabs}${state.lightTab === 'issue' ? `${issueFilter}${issueTable}` : `${maintainFilter}${maintainTable}`}`,'shoulder-lights');
  };
  const ensureFormDraft = (key, id) => {
    const routeId = id || 'new';
    if (state.formKey === key && state.formId === routeId && state.draft && Object.keys(state.draft).length) return;
    state.formKey = key;
    state.formId = routeId;
    state.draft = AdminForms.loadDraft(key, routeId === 'new' ? null : routeId, { ...data, volunteers: ledgers.volunteers, blacklist: ledgers.blacklist, verification: ledgers.verification }, state);
    if (key === 'users') state.userProfileDraft = { ...state.draft };
    if (key === 'companies') state.companyProfileDraft = { ...state.draft };
  };
  const syncDraftFromDom = () => {
    if (typeof document.querySelectorAll !== 'function') {
      if (state.formKey === 'users') state.userProfileDraft = { ...state.draft };
      if (state.formKey === 'companies') state.companyProfileDraft = { ...state.draft };
      return;
    }
    document.querySelectorAll('[data-draft-field]').forEach((el) => {
      state.draft[el.dataset.draftField] = el.type === 'checkbox' ? el.checked : el.value;
    });
    document.querySelectorAll('[data-user-profile-field]').forEach((el) => {
      state.userProfileDraft[el.dataset.userProfileField] = el.value;
      state.draft[el.dataset.userProfileField] = el.value;
    });
    document.querySelectorAll('[data-company-profile-field]').forEach((el) => {
      state.companyProfileDraft[el.dataset.companyProfileField] = el.value;
      state.draft[el.dataset.companyProfileField] = el.value;
    });
    if (window.AdminRichEditor) {
      ['richText', 'body', 'answer'].forEach((field) => {
        const surface = document.querySelector(`[data-rich-surface="${field}"]`);
        if (surface) state.draft[field] = AdminRichEditor.getPlain(field);
      });
    }
    if (state.formKey === 'users') state.userProfileDraft = { ...state.draft };
    if (state.formKey === 'companies') state.companyProfileDraft = { ...state.draft };
  };
  const formPage = (key, id) => {
    ensureFormDraft(key, id);
    const enrollLocked = key === 'activities' && id && id !== 'new' && data.enrollments.some((entry) => entry.activityId === id);
    const canSaveEnrollFields = key === 'activities' && id && id !== 'new' && !enrollLocked;
    return AdminForms.render({ key, id, draft: state.draft, shell, safe, enrollLocked, canSaveEnrollFields, users: data.users || [], volunteers: ledgers.volunteers || [], deviceQuery: state.devicePickerQuery || '', userQuery: state.devicePickerQuery || '', pickerPage: state.devicePickerPage || 1 });
  };
    const configRows = (fields) => AdminUI.configRows(fields);
  const modalShell = (title, description, body, submitAction, submitText, wide = false) => `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal${wide ? ' modal-wide' : ''}"><h2 id="modal-title" tabindex="-1">${title}</h2>${description ? `<p>${description}</p>` : ''}${body}<div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="${submitAction}">${submitText}</button></div></section></div>`;
  const modal = () => {
    const type = state.modal.type;
    const key = state.modal.key || currentMenu();
    const draft = state.draft;
    const userItem = key === 'users' && type === 'edit' ? rowsFor(key).find((row) => row.id === state.modal.item) : null;
    const companyItem = key === 'companies' && type === 'edit' ? rowsFor(key).find((row) => row.id === state.modal.item) : null;
    if (type === 'create-light') {
      const nextNum = String(data.shoulderLights.length + 1).padStart(3, '0');
      const nextId = `SL-2026-${nextNum}`;
      const body = `<form class="form-stack" id="admin-form"><label>设备编号<input readonly data-draft-field="id" value="${safe(draft.id || nextId)}" /></label><label>备注<input data-draft-field="note" value="${safe(draft.note || '')}" placeholder="选填，如入库批次" /></label></form>`;
      return modalShell('新增肩带', '', body, 'submit-create-light', '确认新增');
    }
    if (type === 'issue-light') {
      const available = data.shoulderLights.filter((light) => light.state === '在库');
      const officers = data.policeOfficers || [];
      const body = `<form class="form-stack" id="admin-form"><label>肩灯编号<select required data-draft-field="device">${available.map((light) => `<option${draft.device === light.id ? ' selected' : ''}>${safe(light.id)}</option>`).join('')}</select></label><label>领用人（民警名单）<select required data-draft-field="holder">${officers.map((o) => `<option value="${safe(o.name)}"${draft.holder === o.name ? ' selected' : ''}>${safe(o.name)} · ${safe(o.unit)}</option>`).join('')}</select></label><label>领用单位<input readonly data-draft-field="unit" value="${safe(draft.unit || officers[0]?.unit || '')}" /></label><label>领用时间<input required data-draft-field="time" value="${safe(draft.time || '')}" /></label></form>`;
      return available.length ? modalShell('配发登记', '', body, 'submit-issue-light', '完成配发登记') : modalShell('配发登记', '当前没有在库肩灯可供配发，请先办理归还或新增肩带。', '', 'close-modal', '我知道了');
    }
    if (type === 'create-rid') {
      const nextId = `RID-YZ-${String(ledgers.ridModules.length + 1).padStart(3, '0')}`;
      const body = `<form class="form-stack" id="admin-form"><label>模块编号<input readonly data-draft-field="id" value="${safe(draft.id || nextId)}" /></label><label>设备序列号<input required data-draft-field="sn" value="${safe(draft.sn || '')}" placeholder="如 RIDSN****1006" /></label><label>设备型号<select required data-draft-field="model">${['便携式 RID-A1', '便携式 RID-B2'].map((m) => `<option${(draft.model || '便携式 RID-A1') === m ? ' selected' : ''}>${m}</option>`).join('')}</select></label></form>`;
      return modalShell('新增RID', '', body, 'submit-create-rid', '确认新增');
    }
    if (type === 'issue-rid') {
      const available = ledgers.ridModules.filter((mod) => mod.state === '在库');
      const candidates = ledgers.volunteers.filter((vol) => vol.state === '在册' && (vol.ridState === '未配发' || !vol.ridModule || vol.ridModule === '—'));
      const body = `<form class="form-stack" id="admin-form"><label>RID 模块编号<select required data-draft-field="device">${available.map((mod) => `<option${draft.device === mod.id ? ' selected' : ''}>${safe(mod.id)}</option>`).join('')}</select></label><label>关联志愿者<select required data-draft-field="volunteerId">${candidates.map((vol) => `<option value="${safe(vol.id)}"${draft.volunteerId === vol.id ? ' selected' : ''}>${safe(vol.name)} · ${safe(vol.area)} · ${safe(vol.volunteerType)}</option>`).join('')}</select></label><label>配发时间<input required data-draft-field="time" value="${safe(draft.time || '')}" /></label></form>`;
      if (!available.length) return modalShell('配发 RID', '当前没有在库 RID 模块可供配发，请先回收已配发模块或新增入库。', '', 'close-modal', '我知道了');
      if (!candidates.length) return modalShell('配发 RID', '当前没有未配发的在册志愿者可绑定。', '', 'close-modal', '我知道了');
      return modalShell('配发 RID', '', body, 'submit-issue-rid', '完成配发');
    }
    if (type === 'maintain-light') {
      const body = `<form class="form-stack" id="admin-form"><label>设备编号<select required data-draft-field="device">${data.shoulderLights.map((light) => `<option${draft.device === light.id ? ' selected' : ''}>${safe(light.id)}</option>`).join('')}</select></label><label>维护类型<select data-draft-field="type">${['检修', '维修'].map((t) => `<option${draft.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label><label>维护说明<textarea required data-draft-field="detail">${safe(draft.detail || '')}</textarea></label><label>处理状态<select data-draft-field="state">${['已完成', '维修中'].map((t) => `<option${draft.state === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label></form>`;
      return modalShell('登记维护', '', body, 'submit-maintain-light', '保存维护记录');
    }
    if (type === 'complete-verification') {
      const item = ledgers.verification.find((entry) => entry.id === state.modal.item);
      const result = state.draft.result === '不通过' ? '不通过' : '通过';
      const body = `<form class="form-stack" id="admin-form"><label>核查结果<select required data-draft-field="result"><option${result === '通过' ? ' selected' : ''}>通过</option><option${result === '不通过' ? ' selected' : ''}>不通过</option></select></label><label>处理意见<textarea required data-draft-field="suggestion" rows="4" placeholder="请填写核查结论与处理意见">${safe(state.draft.suggestion || '')}</textarea></label></form>`;
      return modalShell('完成核查', `设备“${safe(item?.aircraftName || item?.name || '')}”当前为待核查，请选择通过或不通过并填写处理意见。`, body, 'submit-complete-verification', '确认完成');
    }
    if (type === 'add-member') {
      const body = `<form class="form-stack" id="admin-form"><label>姓名<input required data-draft-field="name" value="${safe(draft.name || '')}" /></label><label>与企业关系<select data-draft-field="relation">${['法定代表人', '授权经办人', '安全负责人'].map((t) => `<option${draft.relation === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label><label>手机号码<input required data-draft-field="phone" value="${safe(draft.phone || '')}" placeholder="请输入脱敏手机号，如 137****0000" /></label></form>`;
      return modalShell('添加授权账号', '', body, 'submit-add-member', '添加账号');
    }
    if (type === 'push-alert') {
      const body = `<form class="form-stack" id="admin-form"><label>推送终端<select data-draft-field="target">${['指挥中心大屏', '民警移动终端', '智巡车防一体化系统'].map((t) => `<option${draft.target === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label><label>推送备注<textarea data-draft-field="note" placeholder="选填，将随证据包摘要一并推送">${safe(draft.note || '')}</textarea></label></form>`;
      return modalShell('推送至指定终端', '推送内容含无人机 SN、机型、飞手 GPS 坐标与时间戳。', body, 'submit-push-alert', '确认推送');
    }
    if (type === 'permission') {
      const system = window.AdminSystem?.ensure?.(data);
      const sysUser = system?.sysUsers?.find((row) => row.id === state.modal.item);
      const account = sysUser
        ? { id: sysUser.id, name: sysUser.nickName, role: sysUser.role }
        : (rowsFor('accounts').find((row) => row.id === state.modal.item) || rowsFor('accounts')[0]);
      const isAdmin = account.role === '系统管理员';
      const buttonLevels = ['查看', '新增', '编辑', '删除', '导出'];
      const tree = groups.map(([group, links]) => `<div class="perm-group"><label class="perm-group-label"><input type="checkbox" checked />${group}</label>${links.map(([, name]) => `<div class="perm-menu"><label><input type="checkbox" checked />${name}</label><span class="perm-buttons">${buttonLevels.map((button) => `<label><input type="checkbox" ${isAdmin || !['删除', '导出'].includes(button) ? 'checked' : ''} />${button}</label>`).join('')}</span></div>`).join('')}</div>`).join('');
      return modalShell(`配置角色权限：${safe(account.name)}`, `当前角色：${safe(account.role)}。权限颗粒度到菜单按钮级，保存后按角色生效。`, `<div class="perm-tree">${tree}</div>`, 'submit-permission', '保存权限配置', true);
    }
    if (type === 'enrollment-roster') {
      const item = data.activities.find((activity) => activity.id === state.modal.item);
      const summary = enrollmentSummary(item?.id);
      const confirmState = activityConfirmState(item);
      const body = enrollmentRosterBody(item?.id);
      const actions = confirmState === '已确认'
        ? `<button class="secondary-btn" data-action="close-modal">关闭</button><button class="secondary-btn" disabled>已确认（用户不可报名）</button>`
        : `<button class="secondary-btn" data-action="close-modal">关闭</button><button class="primary-btn" data-action="confirm-activity-enrollments" data-id="${safe(item?.id || '')}">一键确认</button>`;
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal modal-wide"><h2 id="modal-title" tabindex="-1">报名名单 · ${safe(item?.title || '')}</h2><p>已报名 ${safe(item?.enrolled ?? summary.total)} / ${safe(item?.capacity ?? 0)} · 活动状态 ${safe(item?.status || '—')} · 报名确认状态 ${safe(confirmState)}</p>${body}<div class="modal-actions">${actions}</div></section></div>`;
    }
    if (type === 'enrollment-form') {
      const item = data.enrollments.find((row) => row.id === state.modal.item) || data.enrollments[0];
      const activityId = item?.activityId || state.modal.activityId || '';
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal modal-wide"><h2 id="modal-title" tabindex="-1">填写内容 · ${safe(item?.applicant || '')}</h2>${enrollmentFormBody(item)}<div class="modal-actions"><button class="secondary-btn" data-action="close-modal">关闭</button></div></section></div>`;
    }
    if (type === 'feedback-form-view') {
      const item = data.feedbacks.find((row) => row.id === state.modal.item) || data.feedbacks[0];
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal modal-wide"><h2 id="modal-title" tabindex="-1">用户填写内容 · ${safe(feedbackFormName(item) || item?.title || item?.id || '')}</h2>${feedbackContentBody(item)}<div class="modal-actions"><button class="secondary-btn" data-action="close-modal">关闭</button></div></section></div>`;
    }
    if (type === 'enrollment-batch-confirm') {
      const item = data.activities.find((activity) => activity.id === state.modal.item);
      const pending = enrollmentSummary(item?.id).pending;
      return modalShell('一键确认报名名单', `确认后，“${safe(item?.title || '')}”下 ${pending} 条待确认报名将全部变为已确认，报名确认状态变为“已确认”，浙里办用户端不可再报名。`, '', 'submit-enrollment-batch', '确认并关闭报名');
    }
if (type === 'activity-confirm') {
      const item = data.activities.find((activity) => activity.id === state.modal.item);
      return modalShell('确认活动', `活动确认须由指定账号执行。当前登录账号“综合管理员”具备活动确认权限。确认后“${safe(item?.title || '')}”将进入“报名中”状态并对用户端发布。`, '', 'submit-activity-confirm', '确认发布');
    }

    if (type === 'edit-config') {
      const key = state.modal.key;
      const bundle = configBundle(key);
      const isNew = state.modal.item === 'new';
      const title = isNew ? `新增${bundle.label}` : `编辑${bundle.label}`;
      const d = state.draft;
      const placeholder = bundle.placeholder || '请填写名称';
      const body = `<form class="form-stack" id="admin-form"><label>名称<input required data-draft-field="name" value="${safe(d.name || '')}" placeholder="${placeholder}" maxlength="40" /></label><label>排序<input required type="number" min="1" data-draft-field="sort" value="${safe(String(d.sort || 1))}" /></label><label>状态<select data-draft-field="state"><option${(d.state || '启用') === '启用' ? ' selected' : ''}>启用</option><option${d.state === '停用' ? ' selected' : ''}>停用</option></select></label></form>`;
      return modalShell(title, '', body, 'submit-config', '保存');
    }
    if (type === 'config-delete') {
      const key = state.modal.key;
      const bundle = configBundle(key);
      const item = bundle.list.find((row) => row.id === state.modal.item);
      return modalShell(`删除${bundle.label}`, `确认删除“${safe(item?.name || '')}”？删除后用户端下拉将不再展示该项。`, '', 'submit-config-delete', '确认删除');
    }

    if (type === 'form-delete') {
      const item = data.feedbackForms.find((form) => form.id === state.modal.item);
      return modalShell('删除反馈表单', `将删除“${safe(item?.name || '')}”。删除后用户端不再展示该表单入口。`, '', 'submit-form-delete', '确认删除');
    }
    if (type === 'content-delete') {
      const key = state.modal.key;
      const labelMap = { activities: '活动', laws: '政策法规', news: '新闻公告', guides: '流程指导', faq: '常见问题' };
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">删除${labelMap[key] || '内容'}</h2><p>确认删除该${labelMap[key] || '内容'}？删除后不可恢复。</p><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="danger-btn" data-action="submit-content-delete">确认删除</button></div></section></div>`;
    }
    if (type === 'cancel-drone') {
      const item = data.drones.find((drone) => drone.id === state.modal.item);
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">手动注销无人机</h2><p>确认注销设备“${safe(item ? data.uomValue(item, 'aircraftName') : '')}”？注销后用户无法再用于飞行计划申报。</p><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="danger-btn" data-action="submit-cancel-drone">确认注销</button></div></section></div>`;
    }
    if (type === 'blacklist-confirm') {
      const key = state.modal.key;
      const row = rowsFor(key).find((entry) => entry.id === state.modal.item);
      const displayName = row?.name || (key === 'users' ? data.profiles.personal.name : key === 'companies' ? data.profiles.company.name : '该对象');
      const body = `<form class="form-stack" id="admin-form"><label>拉黑原因<textarea required data-draft-field="reason" rows="4" placeholder="请填写拉黑原因">${safe(state.draft.reason || '')}</textarea></label></form>`;
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">确认拉黑</h2><p>确认对“${safe(displayName)}”执行拉黑？</p>${body}<div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="danger-btn" data-action="submit-blacklist">确认拉黑</button></div></section></div>`;
    }
    if (type === 'unblacklist-confirm') {
      const isDrone = state.modal.key === 'drone-blacklist';
      const row = isDrone
        ? (ledgers.droneBlacklist || []).find((entry) => entry.id === state.modal.item)
        : ledgers.blacklist.find((entry) => entry.id === state.modal.item);
      const displayName = isDrone ? (row?.aircraftName || '该设备') : (row?.name || '该对象');
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">确认取消拉黑</h2><p>确认对“${safe(displayName)}”执行取消拉黑？</p><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-unblacklist">确认</button></div></section></div>`;
    }
    if (type === 'logout-confirm') {
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">确认退出登录</h2><p>退出后需重新登录才能进入管理平台。</p><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="primary-btn" data-action="submit-logout">确认退出</button></div></section></div>`;
    }
    if (type === 'drone-disable-confirm') {
      const row = data.drones.find((entry) => entry.id === state.modal.item);
      const label = row ? (data.uomValue(row, 'aircraftName') || row.aircraftName || row.drone || state.modal.item) : state.modal.item;
      const body = `<form class="form-stack" id="admin-form"><label>拉黑原因<textarea required data-draft-field="reason" rows="3" placeholder="请填写禁用/拉黑原因">${safe(state.draft.reason || '')}</textarea></label></form>`;
      return `<div class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title" tabindex="-1">确认禁用设备</h2><p>确认对“${safe(label)}”执行禁用设备？</p>${body}<div class="modal-actions"><button class="secondary-btn" data-action="close-modal">取消</button><button class="danger-btn" data-action="submit-drone-disable">确认</button></div></section></div>`;
    }
    if (type === 'confirm') {
      const confirmRows = state.modal.key ? rowsFor(state.modal.key) : [];
      const row = (confirmRows || []).find((entry) => entry.id === state.modal.item);
      const label = (state.modal.key === 'drones' && row ? (data.uomValue(row, 'aircraftName') || row.aircraftName || row.drone) : '') || row?.aircraftName || row?.name || row?.title || state.modal.item || '该记录';
      return modalShell(`确认${state.modal.operation}`, `确认对“${safe(label)}”执行${state.modal.operation}？`, '', 'submit-modal', '确认');
    }
    if (['create', 'edit'].includes(type)) {
      return modalShell('请使用独立表单页', '该业务的新建/编辑已改为独立表单页，请从列表入口进入。', '', 'close-modal', '我知道了');
    }
    return modalShell('操作确认', '请确认后继续。', '', 'submit-modal', '确认');
  };
  const render = () => {
    if (!state.session) {
      if (route() !== 'login') location.hash = '#/login';
      app.className = 'admin-shell is-login';
      app.innerHTML = deliveryCopy(loginPage());
      return;
    }
    let routeValue = normalizeRoute(route());
    if (routeValue === 'login') routeValue = 'dashboard';
    if (route() === 'login') location.hash = '#/dashboard';
    let pieces = routeValue.split('/');
    if (route() !== pieces.join('/') && (pieces[0] === 'activities' || pieces[0] === 'dashboard' || pieces[0] === 'sys-users' || pieces[0] === 'users' || pieces[0] === 'companies' || pieces[0] === 'detail')) location.hash = `#/${pieces.join('/')}`;
    ensureTab(pieces.join('/'));
    const key = pieces[0];
    const page = key === 'dashboard' ? dashboard
      : key === 'feedback' ? feedbackPage
      : key === 'streets' ? streetsPage
      : key === 'districts' ? districtsPage
      : key === 'flight-activity-types' ? flightActivityTypesPage
      : key === 'volunteers' ? volunteersPage
      : key === 'rid-modules' ? ridModulesPage
      : key === 'shoulder-lights' ? shoulderLightsPage
      : key === 'form' ? () => formPage(pieces[1], pieces[2] || 'new')
      : key === 'detail' ? () => detail(pieces[1], pieces[2])
      : meta[key] ? () => normal(key) : dashboard;
    const sideScroll = app.querySelector('.side-scroll');
    const sideScrollTop = sideScroll ? sideScroll.scrollTop : 0;
    const sideScrollLeft = sideScroll ? sideScroll.scrollLeft : 0;
    app.className = 'admin-shell';
    app.innerHTML = page();
    const nextSideScroll = app.querySelector('.side-scroll');
    if (nextSideScroll) {
      nextSideScroll.scrollTop = sideScrollTop;
      nextSideScroll.scrollLeft = sideScrollLeft;
    }
    if (window.AdminRichEditor) AdminRichEditor.bind(app);
    if (state.modal) setTimeout(() => document.querySelector('#modal-title')?.focus(), 0);
    const settle = () => app.querySelector('.dashboard-page')?.classList.add('is-settled');
    const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 0));
    raf(settle);
  };
  const notify = (message) => { state.toast = message; render(); setTimeout(() => { state.toast = ''; render(); },2300); };
  const defaultEnrollFields = () => (window.AdminForms?.defaultEnrollFields ? window.AdminForms.defaultEnrollFields() : [['报名人', '文本', '必填', '请填写报名人', ''], ['联系电话', '手机号', '必填', '请填写手机号', ''], ['备注', '文本', '选填', '选填，可补充说明', '']]);
  const normalizeEnrollFields = (fields) => (fields || []).map((row) => (window.AdminUI?.normalizeEnrollField ? AdminUI.normalizeEnrollField(row) : [...row])).filter((row) => row[0] && String(row[0]).trim());
  const activityHasEnrollments = (activityId) => Boolean(activityId && activityId !== 'new' && data.enrollments.some((entry) => entry.activityId === activityId));
  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-go],[data-action]');
    if (!el) return;
    if (el.dataset.go) { if (String(el.dataset.go).startsWith('form/')) { state.formKey = ''; state.formId = ''; } go(el.dataset.go); return; }
    const action = el.dataset.action;
    if (action === 'pick-region') {
      const level = el.dataset.level;
      const value = el.dataset.value || '';
      const next = { province: state.draft.province || '', city: state.draft.city || '', district: state.draft.district || '' };
      if (level === 'province') { next.province = value; next.city = ''; next.district = ''; }
      else if (level === 'city') { next.city = value; next.district = ''; }
      else if (level === 'district') { next.district = value; }
      const normalized = data.normalizeResidenceSelection ? data.normalizeResidenceSelection(next) : next;
      state.draft.province = normalized.province || '';
      state.draft.city = normalized.city || '';
      state.draft.district = normalized.district || '';
      if (state.formKey === 'users') state.userProfileDraft = { ...state.draft };
      render();
      return;
    }
    if (action === 'toggle-sidebar') { state.sidebarCollapsed = !state.sidebarCollapsed; render(); }
    if (action === 'toggle-help') { state.helpCollapsed = !state.helpCollapsed; try { window.localStorage.setItem(helpStorageKey, state.helpCollapsed ? '1' : '0'); } catch {} render(); }
    if (action === 'toggle-group') { const group = el.dataset.group; if (state.expandedGroups.has(group)) state.expandedGroups.delete(group); else state.expandedGroups.add(group); render(); }
    if (action === 'close-tab') { event.stopPropagation(); closeTab(el.dataset.tab); }
    if (action === 'close-others') { state.tabs = state.tabs.filter((tab) => !tab.closable || tab.id === route()); render(); }
    if (action === 'notify') notify(`当前有 ${data.alerts.filter((x) => x.status.includes('待')).length} 项提醒待关注`);
    if (action === 'dashboard-pick') {
      const kind = el.dataset.kind || '';
      const id = el.dataset.id || el.dataset.label || '';
      state.dashboardPick = { kind, id, value: el.dataset.value || '' };
      patchDashboardPick();
      if (kind === 'area') softToast(`${el.dataset.label || id}：${el.dataset.value || ''} 项（按起飞地）`);
      else if (kind === 'activity-type') softToast(`${el.dataset.label || id}：${el.dataset.value || ''} 项`);
      else if (kind === 'sortie') softToast(`${el.dataset.label || id}：${el.dataset.value || ''}`);
      else if (kind === 'license') softToast(`${el.dataset.label || id}：${el.dataset.value || ''}`);
      return;
    }
    if (action === 'dashboard-area-range') {
      const range = el.dataset.range || 'week';
      state.areaRange = range;
      state.dashboardPick = null;
      patchDashboardArea();
      if (range === 'custom') softToast('请选择自选开始与结束日期');
      else softToast(`飞行报备统计已切换为${areaRangeOptions.find((item) => item.id === range)?.label || '近一周'}`);
      return;
    }
    if (action === 'notify-video') notify('正在播放示例视频');
    if (action === 'fullscreen') { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); notify('已切换全屏'); }
    if (action === 'refresh-captcha') {
      state.loginCaptcha = makeLoginCaptcha();
      state.loginDraft.captcha = '';
      state.loginError = '';
      render();
      return;
    }
    if (action === 'admin-login') {
      event.preventDefault?.();
      const account = String(state.loginDraft.account || '').trim();
      const password = String(state.loginDraft.password || '').trim();
      const captcha = String(state.loginDraft.captcha || '').trim().toUpperCase();
      if (!account || !password || !captcha) {
        state.loginError = '请输入账号、密码和验证码';
        render();
        return;
      }
      if (captcha !== String(state.loginCaptcha || '').toUpperCase()) {
        state.loginError = '验证码不正确';
        state.loginCaptcha = makeLoginCaptcha();
        state.loginDraft.captcha = '';
        render();
        return;
      }
      state.session = { account, name: account === 'admin' ? '综合管理员' : account, role: '系统管理员', avatar: '鄞' };
      writeAdminSession(state.session);
      state.loginError = '';
      state.loginDraft = { account, password: '', captcha: '' };
      state.loginCaptcha = makeLoginCaptcha();
      state.tabs = [{ id: 'dashboard', label: '工作台', closable: false }];
      state.toast = '登录成功';
      location.hash = '#/dashboard';
      setTimeout(() => { state.toast = ''; if (state.session) render(); }, 2300);
      render();
      return;
    }
    if (action === 'logout') { state.modal = { type: 'logout-confirm' }; render(); return; }
    if (action === 'submit-logout') {
      state.session = null;
      writeAdminSession(null);
      state.modal = null;
      state.tabs = [{ id: 'dashboard', label: '工作台', closable: false }];
      state.loginDraft = { account: 'admin', password: '', captcha: '' };
      state.loginCaptcha = makeLoginCaptcha();
      state.loginError = '';
      state.toast = '已退出登录';
      location.hash = '#/login';
      setTimeout(() => { state.toast = ''; render(); }, 2300);
      render();
      return;
    }

    if (action === 'modal' && el.dataset.modal === 'edit-config') {
      const key = el.dataset.key;
      const list = configBundle(key).list;
      const isNew = el.dataset.item === 'new';
      const src = isNew ? null : list.find((row) => row.id === el.dataset.item);
      const nextSort = list.length ? Math.max(...list.map((row) => Number(row.sort) || 0)) + 1 : 1;
      state.draft = src
        ? { name: src.name || '', sort: src.sort || 1, state: src.state || '启用' }
        : { name: '', sort: nextSort, state: '启用' };
      state.modal = { type: 'edit-config', key, item: el.dataset.item };
      render();
      return;
    }

    if (action === 'modal') {
      const type = el.dataset.modal;
      const key = el.dataset.key || currentMenu();
      const item = el.dataset.item;
      if (['create', 'edit'].includes(type) && (formModules.includes(key) || key === 'feedback-forms')) {
        state.formKey = '';
        go(`form/${key}/${type === 'create' ? 'new' : item}`);
        return;
      }
      if (type === 'edit' && key === 'flights') { notify('飞行计划仅支持查看修改历史与执行记录，不提供字段编辑'); return; }
      state.modal = { type, key, item };
      if (key === 'users' && type === 'edit') {
        const user = data.users.find((entry) => entry.id === item);
        const supplement = (item === 'USR-001' ? data.profiles.personal.supplement : user?.supplement) || {};
        const normalizedSupplement = data.normalizePersonalSupplement ? data.normalizePersonalSupplement(supplement) : supplement;
        state.userProfileDraft = user ? { name: user.name || '', idNumber: user.idNumber || '', phone: user.phone || '', address: user.address || '', province: normalizedSupplement.province || '', city: normalizedSupplement.city || '', district: normalizedSupplement.district || '', addressDetail: normalizedSupplement.addressDetail || '', emergencyContact: normalizedSupplement.emergencyContact || '', emergencyPhone: normalizedSupplement.emergencyPhone || '' } : {};
      }
      if (key === 'companies' && type === 'edit') {
        const company = data.companies.find((entry) => entry.id === item);
        const supplement = (item === 'ENT-001' ? data.profiles.company.supplement : company?.supplement) || {};
        state.companyProfileDraft = company ? { name: company.name || '', creditCode: company.creditCode || '', verified: company.verified || '已认证', contact: company.contact || '', phone: company.phone || '', droneUsage: supplement.droneUsage || '', safetyOfficer: supplement.safetyOfficer || '', safetyPhone: supplement.safetyPhone || '' } : {};
      }
      if (key === 'flights' && type === 'edit') {
        const src = data.flights.find((entry) => entry.id === item);
        state.draft = src ? { title: src.title || '', activityType: src.activityType || '一般飞行活动', missionNature: src.missionNature || src.purpose || '个人娱乐', controlMode: src.controlMode || '', flightMode: src.flightMode || '', startAt: src.startAt || '', endAt: src.endAt || '', street: src.street || '', drone: src.drone || '', operator: src.operator || '', operatorPhone: src.operatorPhone || '', maxAltitude: src.maxAltitude || '', takeoffSite: src.takeoffSite || '' } : {};
      }
      if (key === 'activities' && ['create', 'edit'].includes(type)) {
        const src = type === 'edit' ? data.activities.find((activity) => activity.id === item) : null;
        state.draft = src
          ? { title: src.title, startTime: src.startTime, endTime: src.endTime, enrollStart: src.enrollStart, enrollEnd: src.enrollEnd, place: src.place, capacity: String(src.capacity), summary: src.summary, organizer: src.organizer || '', contact: src.contact || '', richText: Array.isArray(src.richText) ? src.richText.join('\n') : (src.richText || src.summary || ''), fields: (src.enrollForm || defaultEnrollFields()).map((row) => (window.AdminUI?.normalizeEnrollField ? AdminUI.normalizeEnrollField(row) : [...row])) }
          : { title: '', startTime: '', endTime: '', enrollStart: '', enrollEnd: '', place: '', capacity: '40', summary: '', organizer: '鄞州区低空安全服务中心', contact: '服务咨询 0574-****-8612', richText: '', fields: defaultEnrollFields() };
      }
      if (key === 'feedback-forms' && ['create', 'edit'].includes(type)) {
        const src = type === 'edit' ? data.feedbackForms.find((form) => form.id === item) : null;
        const normalize = (row) => (window.AdminUI?.normalizeFeedbackField ? AdminUI.normalizeFeedbackField(row) : [...(Array.isArray(row) ? row : [])]);
        state.draft = src
          ? { name: src.name, scene: src.scene, fields: (src.fields || []).map(normalize) }
          : { name: '', scene: '', fields: [['反馈标题', '文本', '必填', ''], ['详细说明', '多行文本', '必填', ''], ['图片附件', '多张图片', '选填', '']] };
      }
      if (key === 'guides' && ['create', 'edit'].includes(type)) {
        const guides = data.uomGuide.guides || [];
        const guide = type === 'edit' ? (guides.find((entry) => entry.id === item) || guides[0]) : null;
        const nextSort = guides.reduce((max, row) => Math.max(max, Number(row.sort) || 0), 0) + 1;
        const sort = Number(guide?.sort) > 0 ? Number(guide.sort) : nextSort;
        state.draft = guide
          ? { title: guide.title || '', body: guide.richText || '', summary: guide.summary || '', status: guide.status || '已发布', sort, guideId: guide.id || item }
          : { title: '', body: '', summary: '', status: '已发布', sort: nextSort, guideId: '' };
      }
      if (key === 'faq' && ['create', 'edit'].includes(type)) {
        const faqs = data.uomGuide.faqs || [];
        const src = type === 'edit' ? faqs.find((row) => row.id === item) : null;
        const nextSort = faqs.reduce((max, row) => Math.max(max, Number(row.sort) || 0), 0) + 1;
        const sort = Number(src?.sort) > 0 ? Number(src.sort) : nextSort;
        state.draft = src
          ? { question: src.question || '', answer: src.answer || '', mediaType: src.mediaType || '图文', status: src.status || '已发布', sort }
          : { question: '', answer: '', mediaType: '图文', status: '已发布', sort: nextSort };
      }
      if (['laws', 'news'].includes(key) && ['create', 'edit'].includes(type)) {
        const src = type === 'edit' ? rowsFor(key).find((row) => row.id === item) : null;
        const coverKind = src?.coverKind || (src?.mediaType === '视频' ? 'video' : 'image');
        const effectiveStart = src?.effectiveStart || src?.effectiveDate || src?.date || data.now;
        const effectiveEnd = src?.effectiveEnd || '';
        const kindRows = data.articles.filter((row) => row.kind === (key === 'laws' ? '法规' : '公告'));
        const nextSort = kindRows.reduce((max, row) => Math.max(max, Number(row.sort) || 0), 0) + 1;
        const sort = Number(src?.sort) > 0 ? Number(src.sort) : nextSort;
        state.draft = src ? { title: src.title || src.name || '', source: src.source || '鄞州区低空安全服务中心', coverKind, coverImage: src.coverImage || '', coverName: src.coverName || '', cover: src.cover || 'rule', status: src.status || '已发布', sort, summary: src.summary || '', effectiveStart, effectiveEnd, body: (src.content || []).join('\n') } : { title: '', source: '鄞州区低空安全服务中心', coverKind: 'image', coverImage: '', coverName: '', cover: 'rule', status: '已发布', sort: nextSort, summary: '', effectiveStart: data.now, effectiveEnd: '', body: '' };
      }
      if (type === 'create-light') {
        const nextNum = String(data.shoulderLights.length + 1).padStart(3, '0');
        state.draft = { id: `SL-2026-${nextNum}`, note: '' };
      }
      if (type === 'issue-light') { const officer = (data.policeOfficers || [])[0] || {}; state.draft = { device: el.dataset.item || (data.shoulderLights.find((light) => light.state === '在库') || {}).id || '', holder: officer.name || '', unit: officer.unit || '', time: `${data.now} 09:00` }; }
      if (type === 'create-rid') {
        const nextId = `RID-YZ-${String(ledgers.ridModules.length + 1).padStart(3, '0')}`;
        state.draft = { id: nextId, sn: '', model: '便携式 RID-A1' };
      }
      if (type === 'issue-rid') {
        const stock = ledgers.ridModules.find((mod) => mod.id === el.dataset.item && mod.state === '在库') || ledgers.ridModules.find((mod) => mod.state === '在库');
        const volunteer = ledgers.volunteers.find((vol) => vol.state === '在册' && (vol.ridState === '未配发' || !vol.ridModule || vol.ridModule === '—'));
        state.draft = { device: stock?.id || '', volunteerId: volunteer?.id || '', time: `${data.now} 09:30` };
      }
      if (type === 'maintain-light') state.draft = { device: el.dataset.item || data.shoulderLights[0]?.id || '', type: '检修', detail: '', state: '已完成' };
      if (type === 'add-member') state.draft = { name: '', relation: '授权经办人', phone: '' };
      if (type === 'push-alert') state.draft = { target: '指挥中心大屏', note: '' };
      render();
    }
    if (action === 'close-modal') { state.modal = null; render(); }
    if (action === 'faq-rich-insert') {
      const snippets = { heading: '\n\n## 小标题\n', list: '\n\n- 要点一\n- 要点二', image: '\n\n[图文说明]\n图片要点：请根据页面提示核对信息。' };
      state.draft.answer = `${state.draft.answer || ''}${snippets[el.dataset.rich] || ''}`.trimStart();
      render();
    }
    if (action === 'add-config-field') {
      if (state.formKey === 'activities' && activityHasEnrollments(state.formId)) { notify('已有用户提交过报名，字段配置不可编辑'); return; }
      syncDraftFromDom();
      const next = state.formKey === 'feedback-forms'
        ? (window.AdminUI?.normalizeFeedbackField ? AdminUI.normalizeFeedbackField(['', '文本', '选填', '']) : ['', '文本', '选填', ''])
        : (window.AdminUI?.normalizeEnrollField ? AdminUI.normalizeEnrollField(['', '文本', '选填', '', '']) : ['', '文本', '选填', '', '']);
      (state.draft.fields = state.draft.fields || []).push(next);
      render();
    }
    if (action === 'remove-config-field') {
      if (state.formKey === 'activities' && activityHasEnrollments(state.formId)) { notify('已有用户提交过报名，字段配置不可编辑'); return; }
      syncDraftFromDom();
      state.draft.fields.splice(Number(el.dataset.index), 1);
      render();
    }
    if (action === 'move-config-field') {
      if (state.formKey === 'activities' && activityHasEnrollments(state.formId)) { notify('已有用户提交过报名，字段配置不可编辑'); return; }
      syncDraftFromDom();
      const index = Number(el.dataset.index);
      const dir = el.dataset.dir;
      const fields = state.draft.fields || [];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= fields.length) return;
      const [row] = fields.splice(index, 1);
      fields.splice(target, 0, row);
      render();
    }
    if (action === 'set-enroll-field-type') {
      if (activityHasEnrollments(state.formId)) { notify('已有用户提交过报名，字段配置不可编辑'); return; }
      syncDraftFromDom();
      const index = Number(el.dataset.index);
      const row = state.draft.fields?.[index];
      if (!row) return;
      const storageType = window.AdminUI?.toEnrollStorageType ? AdminUI.toEnrollStorageType(el.dataset.type) : el.dataset.type;
      row[1] = storageType;
      if (storageType !== '单选') row[4] = '';
      render();
    }
    if (action === 'save-enroll-fields') {
      if (state.formKey !== 'activities' || !state.formId || state.formId === 'new') { notify('请先创建活动后再单独保存字段配置'); return; }
      if (activityHasEnrollments(state.formId)) { notify('已有用户提交过报名，字段配置不可编辑'); return; }
      syncDraftFromDom();
      const item = data.activities.find((activity) => activity.id === state.formId);
      if (!item) { notify('活动不存在'); return; }
      item.enrollForm = normalizeEnrollFields(state.draft.fields);
      persistPublicService();
      notify('报名表单字段配置已单独保存');
      render();
      return;
    }

    if (action === 'toggle-config') {
      const key = el.dataset.key;
      const list = configBundle(key).list;
      const item = (list || []).find((row) => row.id === el.dataset.id);
      if (item) {
        item.state = item.state === '启用' ? '停用' : '启用';
        item.updated = data.now;
        syncFlightConfigLists();
        persistPublicService();
        notify(item.state === '启用' ? '已启用并同步用户端' : '已停用，用户端不再展示');
      }
    }
    if (action === 'request-delete-config') {
      state.modal = { type: 'config-delete', key: el.dataset.key, item: el.dataset.id };
      render();
      return;
    }
    if (action === 'submit-config-delete') {
      const key = state.modal.key;
      const bundle = configBundle(key);
      const list = bundle.list;
      const index = (list || []).findIndex((row) => row.id === state.modal.item);
      if (index >= 0) list.splice(index, 1);
      syncFlightConfigLists();
      persistPublicService();
      state.modal = null;
      notify(`${bundle.label}已删除`);
    }
    if (action === 'submit-config') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      syncDraftFromDom();
      const key = state.modal.key;
      const bundle = configBundle(key);
      const list = bundle.list;
      const name = String(state.draft.name || '').trim();
      const sort = Number(state.draft.sort) > 0 ? Number(state.draft.sort) : 1;
      const cfgState = state.draft.state === '停用' ? '停用' : '启用';
      if (!name) { notify('请填写名称'); return; }
      if ((list || []).some((row) => row.name === name && row.id !== state.modal.item)) { notify('名称已存在'); return; }
      if (state.modal.item === 'new') {
        const maxNum = (list || []).reduce((max, row) => {
          const n = Number(String(row.id || '').replace(/\D/g, '')) || 0;
          return Math.max(max, n);
        }, 0);
        list.unshift({ id: `${bundle.prefix}-${String(maxNum + 1).padStart(2, '0')}`, name, sort, state: cfgState, updated: data.now });
        notify(`${bundle.label}已新增`);
      } else {
        const item = (list || []).find((row) => row.id === state.modal.item);
        if (item) Object.assign(item, { name, sort, state: cfgState, updated: data.now });
        notify('配置已保存');
      }
      syncFlightConfigLists();
      persistPublicService();
      state.modal = null;
    }

    if (action === 'feedback-tab') { state.feedbackTab = el.dataset.value; state.query = ''; state.filter = '全部'; render(); }
    if (action === 'view-feedback-form') {
      state.feedbackTab = 'content';
      state.modal = { type: 'feedback-form-view', key: 'feedback', item: el.dataset.id };
      render();
      return;
    }
    if (action === 'light-tab') { state.lightTab = el.dataset.value; state.query = ''; state.filter = '全部'; render(); }
    if (action === 'form-preview') {
      syncDraftFromDom();
      const preview = (state.draft.title || state.draft.question || state.draft.name || '未命名') + '：' + (state.draft.summary || state.draft.richText || state.draft.body || state.draft.answer || '（暂无正文）');
      notify(`预览：${String(preview).slice(0, 80)}`);
    }
    if (action === 'submit-form-page') {
      syncDraftFromDom();
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const key = state.formKey;
      const id = state.formId;
      const isNew = !id || id === 'new';
      const d = state.draft;
      if (key === 'activities') {
        const locked = !isNew && activityHasEnrollments(id);
        const fields = normalizeEnrollFields(d.fields);
        const richText = String(d.richText || '').split('\n').map((line) => line.trim()).filter(Boolean);
        if (isNew) {
          const next = `ACT-${String(data.activities.length + 1).padStart(3, '0')}`;
          data.activities.unshift({ id: next, title: d.title, startTime: d.startTime, endTime: d.endTime, enrollStart: d.enrollStart, enrollEnd: d.enrollEnd, place: d.place, capacity: Number(d.capacity) || 40, enrolled: 0, status: '报名中', confirmState: '未确认', summary: d.summary, organizer: d.organizer, contact: d.contact, richText, enrollForm: fields });
          notify('活动已创建，状态为报名中');
        } else {
          const item = data.activities.find((a) => a.id === id);
          if (item) {
            Object.assign(item, { title: d.title, startTime: d.startTime, endTime: d.endTime, enrollStart: d.enrollStart, enrollEnd: d.enrollEnd, place: d.place, capacity: Number(d.capacity) || item.capacity, summary: d.summary, organizer: d.organizer, contact: d.contact, richText });
            if (!locked) item.enrollForm = fields;
          }
          notify(locked ? '活动已保存（报名表单字段因已有报名不可改）' : '活动已保存');
        }
        persistPublicService();
        state.formKey = ''; go('activities'); return;
      }
      if (key === 'feedback-forms') {
        const fields = (d.fields || [])
          .map((row) => (window.AdminUI?.normalizeFeedbackField ? AdminUI.normalizeFeedbackField(row) : row))
          .filter((row) => row[0] && String(row[0]).trim());
        if (isNew) data.feedbackForms.unshift({ id: `FORM-${String(data.feedbackForms.length + 1).padStart(2, '0')}`, name: d.name, scene: d.scene, fields, state: '已发布', updated: data.now });
        else {
          const item = data.feedbackForms.find((f) => f.id === id);
          if (item) Object.assign(item, { name: d.name, scene: d.scene, fields, updated: data.now });
        }
        persistPublicService();
        notify(isNew ? '反馈类型已创建并发布' : '反馈类型已更新');
        state.feedbackTab = 'forms'; state.formKey = ''; go('feedback'); return;
      }
      if (key === 'guides') {
        const guides = data.uomGuide.guides || (data.uomGuide.guides = []);
        const sort = Math.max(1, Number(d.sort) || 1);
        if (isNew) {
          const nextId = Math.max(0, ...guides.map((entry) => Number(String(entry.id).match(/(\d+)$/)?.[1]) || 0)) + 1;
          guides.unshift({ id: `GUIDE-${String(nextId).padStart(2, '0')}`, title: d.title, summary: d.summary, richText: d.body, mediaType: '图文', status: d.status || '已发布', sort, updated: data.now });
        } else {
          const guide = guides.find((entry) => entry.id === id);
          if (guide) {
            Object.assign(guide, { title: d.title, richText: d.body, summary: d.summary, status: d.status, sort, updated: data.now });
            delete guide.image;
          }
        }
        data.uomGuide.manualTitle = d.title; data.uomGuide.manualRichText = d.body; data.uomGuide.updated = data.now;
        persistPublicService(); notify('流程指导已保存并同步用户端'); state.formKey = ''; go('guides'); return;
      }
      if (key === 'faq') {
        const faqs = data.uomGuide.faqs || (data.uomGuide.faqs = []);
        const sort = Math.max(1, Number(d.sort) || 1);
        if (isNew) {
          const nextId = Math.max(0, ...faqs.map((entry) => Number(String(entry.id).match(/(\d+)$/)?.[1]) || 0)) + 1;
          faqs.unshift({ id: `FAQ-${String(nextId).padStart(2, '0')}`, question: d.question, answer: d.answer, mediaType: '图文', status: d.status, sort, updated: data.now });
        } else {
          const item = faqs.find((entry) => entry.id === id);
          if (item) Object.assign(item, { question: d.question, answer: d.answer, status: d.status, sort, updated: data.now });
        }
        data.uomGuide.updated = data.now; persistPublicService(); notify('常见问题已保存并同步至用户端'); state.formKey = ''; go('faq'); return;
      }
      if (key === 'laws' || key === 'news') {
        const kindMap = { laws: '法规', news: '公告' };
        const paragraphs = String(d.body || '').split('\n').map((line) => line.trim()).filter(Boolean);
        const coverKind = d.coverKind === 'video' ? 'video' : 'image';
        const mediaType = coverKind === 'video' ? '视频' : '图文';
        const duration = coverKind === 'video' ? (d.duration || '02:00') : '';
        const effectiveStart = d.effectiveStart || d.effectiveDate || data.now;
        const effectiveEnd = d.effectiveEnd || '';
        const sort = Math.max(1, Number(d.sort) || 1);
        if (isNew) {
          data.articles.unshift({ id: `${key.toUpperCase()}-N${String(data.articles.length + 1).padStart(2, '0')}`, kind: kindMap[key], mediaType, coverKind, duration, cover: 'rule', coverImage: d.coverImage || '', coverName: d.coverName || '', status: d.status, sort, title: d.title, date: data.now, effectiveStart, effectiveEnd, effectiveDate: effectiveStart, summary: d.summary, source: d.source || '鄞州区低空安全服务中心', views: 0, content: paragraphs.length ? paragraphs : [d.summary] });
          notify('内容已发布并同步用户端展示');
        } else {
          const item = data.articles.find((article) => article.id === id);
          if (item) Object.assign(item, { title: d.title, source: d.source || item.source, mediaType, coverKind, duration, coverImage: d.coverImage || item.coverImage || '', coverName: d.coverName || item.coverName || '', status: d.status, sort, summary: d.summary, effectiveStart, effectiveEnd, effectiveDate: effectiveStart, content: paragraphs.length ? paragraphs : item.content, pinned: undefined });
          notify('内容已更新');
        }
        persistPublicService(); state.formKey = ''; go(key); return;
      }
      if (key === 'users') {
        const draftUser = state.userProfileDraft;
        const { province, city, district, addressDetail, emergencyContact, emergencyPhone, ...basic } = draftUser;
        const personalSupplement = data.normalizePersonalSupplement ? data.normalizePersonalSupplement({ province, city, district, addressDetail, emergencyContact, emergencyPhone }) : { province, city, district, addressDetail, emergencyContact, emergencyPhone };
        if (isNew) {
          const next = `USR-${String(data.users.length + 1).padStart(3, '0')}`;
          data.users.unshift({ id: next, ...basic, license: '未上传', licenseFileName: '', status: '正常', supplement: personalSupplement });
        } else {
          const user = data.users.find((entry) => entry.id === id);
          if (user) Object.assign(user, basic);
          if (id === 'USR-001') {
            Object.assign(data.profiles.personal, basic);
            Object.assign(data.profiles.personal.supplement, personalSupplement);
          } else if (user) {
            user.supplement = personalSupplement;
          }
        }
        persistProfile(); notify(isNew ? '用户已新增' : '个人信息已保存，并同步至用户端档案'); state.formKey = ''; go(isNew ? 'users' : `detail/users/${id}`); return;
      }
      if (key === 'companies') {
        const draftCompany = state.companyProfileDraft;
        const { droneUsage, safetyOfficer, safetyPhone, ...basic } = draftCompany;
        if (isNew) {
          const next = `ENT-${String(data.companies.length + 1).padStart(3, '0')}`;
          data.companies.unshift({ id: next, ...basic, accounts: 0, drones: 0, status: '正常', supplement: { droneUsage, safetyOfficer, safetyPhone } });
        } else {
          const company = data.companies.find((entry) => entry.id === id);
          if (company) Object.assign(company, basic);
          if (id === 'ENT-001') {
            Object.assign(data.profiles.company, basic);
            Object.assign(data.profiles.company.supplement, { droneUsage: droneUsage || '', safetyOfficer: safetyOfficer || '', safetyPhone: safetyPhone || '' });
            syncCompany();
          }
        }
        persistProfile(); notify(isNew ? '企业已新增' : '企业信息已保存，并同步至用户端档案'); state.formKey = ''; go(isNew ? 'companies' : `detail/companies/${id}`); return;
      }
      if (key === 'volunteers') {
        if (isNew) {
          const entryMode = d.entryMode === 'manual' ? 'manual' : 'user';
          if (entryMode === 'user' && !d.userId) { notify('请先选择用户'); return; }
          if (!d.name || !d.phone) { notify('请填写姓名与手机号码'); return; }
          if (ledgers.volunteers.some((v) => (v.state || '在册') === '在册' && v.phone === d.phone)) { notify('该手机号已在志愿者名册中'); return; }
          ledgers.volunteers.unshift({
            id: `VOL-${String(ledgers.volunteers.length + 1).padStart(3, '0')}`,
            name: d.name,
            phone: d.phone,
            volunteerType: d.volunteerType || '低空爱好者',
            area: d.area || '',
            confirmedAt: d.confirmedAt || data.now,
            state: '在册',
            userId: entryMode === 'user' ? (d.userId || '') : ''
          });
        } else {
          const item = ledgers.volunteers.find((v) => v.id === id);
          if (item) Object.assign(item, {
            name: d.name,
            phone: d.phone,
            volunteerType: d.volunteerType || item.volunteerType,
            area: d.area || item.area,
            confirmedAt: d.confirmedAt || item.confirmedAt,
            userId: item.userId || d.userId || ''
          });
        }
        notify(isNew ? '志愿者已添加' : '志愿者信息已保存'); state.formKey = ''; go('volunteers'); return;
      }
      if (key === 'blacklist') {
        if (isNew) ledgers.blacklist.unshift({ id: `BL-${String(ledgers.blacklist.length + 1).padStart(3, '0')}`, name: d.name, type: d.type, reason: d.reason, state: d.state || '已拉黑', operatedBy: d.operatedBy || '—', operatedAt: d.operatedAt || '—' });
        else {
          const item = ledgers.blacklist.find((b) => b.id === id);
          if (item) Object.assign(item, { name: d.name, type: d.type, reason: d.reason, state: d.state, operatedBy: d.operatedBy || item.operatedBy || '—', operatedAt: d.operatedAt || item.operatedAt || '—' });
        }
        notify(isNew ? '黑名单已新增' : '黑名单已更新'); state.formKey = ''; go('blacklist'); return;
      }
      if (key === 'verification') {
        const deviceMode = d.deviceMode === 'manual' ? 'manual' : 'ledger';
        const drone = deviceMode === 'ledger' ? data.drones.find((entry) => entry.id === d.droneId) : null;
        if (deviceMode === 'ledger' && !drone) { notify('请先从台账选择设备'); return; }
        const aircraftName = drone ? data.uomValue(drone, 'aircraftName') : String(d.aircraftName || '').trim();
        const serialNumber = drone ? data.uomValue(drone, 'serialNumber') : String(d.serialNumber || '').trim();
        const registrationMark = drone ? data.uomValue(drone, 'registrationMark') : (d.registrationMark || '');
        const ownerType = drone ? (drone.accountRole === 'company' ? '企业' : '个人') : (d.ownerType || '个人');
        if (!aircraftName || !serialNumber || serialNumber === '—') { notify(deviceMode === 'manual' ? '请填写无人机名称和设备序列号' : '所选设备缺少序列号'); return; }
        const result = d.result || '待核查';
        if ((result === '通过' || result === '不通过') && !String(d.suggestion || '').trim()) {
          notify('选择通过或不通过时须填写处理意见');
          return;
        }
        const stateLabel = result === '待核查' ? '待核查' : '已完成';
        const payload = {
          droneId: drone ? drone.id : '',
          name: aircraftName,
          aircraftName,
          serialNumber: serialNumber === '—' ? '' : serialNumber,
          registrationMark: registrationMark === '—' ? '' : registrationMark,
          ownerType,
          checkType: d.checkType || '证照核查',
          checkMethod: d.checkMethod || '材料核验',
          checkPlace: d.checkPlace || '',
          result,
          issueDesc: d.issueDesc || '',
          suggestion: d.suggestion || '',
          followUpDate: d.followUpDate || '',
          operator: '核查员',
          checkDate: data.now,
          time: data.now,
          state: stateLabel,
          detail: d.suggestion || d.issueDesc || ''
        };
        if (isNew) ledgers.verification.unshift({ id: `CHK-${String(ledgers.verification.length + 1).padStart(3, '0')}`, ...payload });
        else {
          const item = ledgers.verification.find((v) => v.id === id);
          if (item) Object.assign(item, payload, { operator: item.operator || '核查员', checkDate: item.checkDate || data.now, time: item.time || data.now });
        }
        state.devicePickerQuery = '';
        state.devicePickerPage = 1;
        notify(isNew ? '核查记录已新增' : '核查记录已保存'); state.formKey = ''; go('verification'); return;
      }
      notify('未识别的表单模块');
    }
    if (action === 'view-enrollments') { go(`detail/activities/${el.dataset.id}`); return; }
    if (action === 'view-enrollment-form') {
      const enrollment = data.enrollments.find((row) => row.id === el.dataset.id);
      state.modal = { type: 'enrollment-form', key: 'enrollments', item: el.dataset.id, activityId: enrollment?.activityId || '' };
      render();
    }
    if (action === 'confirm-activity-enrollments') { state.modal = { type: 'enrollment-batch-confirm', key: 'activities', item: el.dataset.id }; render(); }
    if (action === 'confirm-activity') { state.modal = { type: 'activity-confirm', key: 'activities', item: el.dataset.id }; render(); }
    if (action === 'submit-flight') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const item = data.flights.find((entry) => entry.id === state.modal.item);
      if (item) {
        const draft = state.draft;
        const area = `宁波市鄞州区${draft.street || ''}`;
        const time = draft.startAt && draft.endAt ? `${draft.startAt.replace('T', ' ')}—${draft.endAt.replace('T', ' ').slice(11)}` : item.time;
        Object.assign(item, {
          title: draft.title,
          activityType: draft.activityType,
          missionNature: draft.missionNature,
          controlMode: draft.controlMode,
          flightMode: draft.flightMode,
          startAt: draft.startAt,
          endAt: draft.endAt,
          city: '宁波市鄞州区',
          street: draft.street,
          purpose: draft.missionNature || draft.purpose,
          time,
          area,
          drone: draft.drone,
          operator: draft.operator,
          operatorPhone: draft.operatorPhone,
          maxAltitude: draft.maxAltitude,
          takeoffSite: draft.takeoffSite,
          history: [...(item.history || []), { time: `${data.now} 11:20`, action: '后台修改计划', detail: '公安管理人员调整飞行计划字段' }]
        });
        persistPublicService();
      }
      state.modal = null;
      notify('飞行计划已保存，并同步至用户端台账');
      return;
    }
    if (action === 'submit-enrollment-batch') {
      const activityId = state.modal.item;
      let count = 0;
      data.enrollments.forEach((row) => { if (row.activityId === activityId && row.state === '待确认') { row.state = '已确认'; count += 1; } });
      const activity = data.activities.find((item) => item.id === activityId);
      if (activity) activity.confirmState = '已确认';
      persistPublicService();
      state.modal = null;
      notify(count ? `已一键确认 ${count} 条报名，用户端不可再报名` : '报名确认状态已锁定，用户端不可再报名');
      return;
    }
    if (action === 'submit-activity-confirm') {
      const item = data.activities.find((activity) => activity.id === state.modal.item);
      if (item) item.status = '报名中';
      persistPublicService();
      state.modal = null;
      notify('活动已确认发布，用户端可见并开放报名');
    }
    if (action === 'submit-activity') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const d = state.draft;
      const fields = normalizeEnrollFields(d.fields);
      if (state.modal.type === 'edit') {
        const item = data.activities.find((activity) => activity.id === state.modal.item);
        const richText = String(d.richText || d.summary || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
        const locked = activityHasEnrollments(state.modal.item);
        if (item) {
          Object.assign(item, { title: d.title, startTime: d.startTime, endTime: d.endTime, enrollStart: d.enrollStart, enrollEnd: d.enrollEnd, place: d.place, capacity: Number(d.capacity) || item.capacity, summary: d.summary, organizer: d.organizer, contact: d.contact, richText: richText.length ? richText : [d.summary] });
          if (!locked) item.enrollForm = fields;
        }
        notify(locked ? '活动已更新（报名表单字段因已有报名不可改）' : '活动已更新，报名表单配置已保存');
      } else {
        const richText = String(d.richText || d.summary || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
        data.activities.unshift({ id: `ACT-${String(data.activities.length + 1).padStart(2, '0')}`, title: d.title, cover: 'training', summary: d.summary, richText: richText.length ? richText : [d.summary], startTime: d.startTime, endTime: d.endTime, enrollStart: d.enrollStart, enrollEnd: d.enrollEnd, place: d.place, capacity: Number(d.capacity) || 40, enrolled: 0, organizer: d.organizer || '鄞州区低空安全服务中心', contact: d.contact || '服务咨询 0574-****-8612', status: '报名中', confirmState: '未确认', enrollForm: fields, joined: false });
        notify('活动已创建并进入“报名中”，请由指定账号确认报名名单');
      }
      persistPublicService();
      state.modal = null;
    }
    if (action === 'submit-guide-manual') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const guides = data.uomGuide.guides || (data.uomGuide.guides = []);
      const d = state.draft;
      const sort = Math.max(1, Number(d.sort) || 1);
      if (state.modal.type === 'create') {
        const nextId = Math.max(0, ...guides.map((entry) => Number(String(entry.id).match(/(\d+)$/)?.[1]) || 0)) + 1;
        guides.unshift({ id: `GUIDE-${String(nextId).padStart(2, '0')}`, title: d.title, summary: d.summary, richText: d.body, mediaType: '图文', status: d.status || '已发布', sort, updated: data.now });
        notify('操作手册已创建并同步至用户端');
      } else {
        const guide = guides.find((entry) => entry.id === d.guideId) || guides.find((entry) => entry.id === state.modal.item);
        if (guide) { guide.title = d.title; guide.richText = d.body; guide.summary = d.summary || guide.summary; guide.status = d.status || guide.status; guide.sort = sort; guide.updated = data.now; delete guide.image; }
        notify('操作手册已保存并同步至用户端');
      }
      data.uomGuide.manualTitle = d.title;
      data.uomGuide.manualRichText = d.body;
      data.uomGuide.updated = data.now;
      persistPublicService();
      state.modal = null;
    }
    if (action === 'submit-faq') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const d = state.draft;
      const faqs = data.uomGuide.faqs || (data.uomGuide.faqs = []);
      const sort = Math.max(1, Number(d.sort) || 1);
      const item = state.modal.type === 'edit' ? faqs.find((entry) => entry.id === state.modal.item) : null;
      if (item) Object.assign(item, { question: d.question, answer: d.answer, mediaType: d.mediaType || '图文', status: d.status, sort, updated: data.now });
      else {
        const nextId = Math.max(0, ...faqs.map((entry) => Number(String(entry.id).match(/(\d+)$/)?.[1]) || 0)) + 1;
        faqs.unshift({ id: `FAQ-${String(nextId).padStart(2, '0')}`, question: d.question, answer: d.answer, mediaType: d.mediaType || '图文', status: d.status, sort, updated: data.now });
      }
      data.uomGuide.updated = data.now;
      persistPublicService();
      state.modal = null;
      notify('常见问题已保存并同步至用户端');
    }
    if (action === 'submit-content') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const d = state.draft;
      const kindMap = { laws: '法规', news: '公告', guides: '指引' };
      const paragraphs = (d.body || '').split('\n').map((line) => line.trim()).filter(Boolean);
      if (state.modal.type === 'edit') {
        const item = data.articles.find((article) => article.id === state.modal.item);
        const coverKind = d.coverKind === 'video' ? 'video' : (item?.coverKind || (d.mediaType === '视频' ? 'video' : 'image'));
        const mediaType = coverKind === 'video' ? '视频' : '图文';
        const effectiveStart = d.effectiveStart || d.effectiveDate || item?.effectiveStart || item?.effectiveDate || item?.date;
        const effectiveEnd = d.effectiveEnd || item?.effectiveEnd || '';
        const sort = Math.max(1, Number(d.sort) || Number(item?.sort) || 1);
        if (item) Object.assign(item, { title: d.title, source: d.source || item.source || '鄞州区低空安全服务中心', mediaType, coverKind, duration: coverKind === 'video' ? (d.duration || item.duration || '02:00') : '', cover: d.cover || item.cover || 'rule', coverImage: d.coverImage || item.coverImage || '', coverName: d.coverName || item.coverName || '', status: d.status, sort, summary: d.summary, effectiveStart, effectiveEnd, effectiveDate: effectiveStart, content: paragraphs.length ? paragraphs : item.content, pinned: undefined });
        notify('内容已更新');
      } else if (kindMap[state.modal.key]) {
        const coverKind = d.coverKind === 'video' ? 'video' : 'image';
        const mediaType = coverKind === 'video' ? '视频' : '图文';
        const effectiveStart = d.effectiveStart || d.effectiveDate || data.now;
        const effectiveEnd = d.effectiveEnd || '';
        const sort = Math.max(1, Number(d.sort) || 1);
        data.articles.unshift({ id: `${state.modal.key.toUpperCase()}-N${String(data.articles.length + 1).padStart(2, '0')}`, kind: kindMap[state.modal.key], mediaType, coverKind, duration: coverKind === 'video' ? (d.duration || '02:00') : '', cover: d.cover || 'rule', coverImage: d.coverImage || '', coverName: d.coverName || '', status: d.status, sort, title: d.title, date: data.now, effectiveStart, effectiveEnd, effectiveDate: effectiveStart, summary: d.summary, source: d.source || '鄞州区低空安全服务中心', views: 0, content: paragraphs.length ? paragraphs : [d.summary] });
        notify('内容已发布并同步用户端展示');
      } else {
        notify('常见问题已保存');
      }
      persistPublicService();
      state.modal = null;
      render();
    }
    if (action === 'submit-feedback-form') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const d = state.draft;
      const fields = (d.fields || []).filter((row) => row[0].trim());
      if (state.modal.type === 'edit') {
        const item = data.feedbackForms.find((formItem) => formItem.id === state.modal.item);
        if (item) Object.assign(item, { name: d.name, scene: d.scene, fields, updated: data.now });
        notify('反馈表单已更新');
      } else {
        data.feedbackForms.unshift({ id: `FORM-${String(data.feedbackForms.length + 1).padStart(2, '0')}`, name: d.name, scene: d.scene, fields, state: '已发布', updated: data.now });
        notify('反馈表单已创建并发布');
      }
      persistPublicService();
      state.modal = null;
    }
    if (action === 'toggle-message-template') {
      const item = (data.messageTemplates || []).find((entry) => entry.id === el.dataset.id);
      if (item) {
        item.state = item.state === '已启用' ? '已停用' : '已启用';
        item.updated = data.now;
        persistPublicService();
        notify(item.state === '已启用' ? '消息模板已启用' : '消息模板已停用');
      }
    }
    if (action === 'toggle-feedback-form') {
      const item = data.feedbackForms.find((form) => form.id === el.dataset.id);
      if (item) { item.state = item.state === '已发布' ? '已下架' : '已发布'; item.updated = data.now; persistPublicService(); notify(`反馈表单${item.state === '已发布' ? '已重新发布' : '已下架'}`); }
    }
    if (action === 'volunteer-entry-mode') {
      syncDraftFromDom();
      const mode = el.dataset.value === 'manual' ? 'manual' : 'user';
      state.draft.entryMode = mode;
      state.devicePickerQuery = '';
      state.devicePickerPage = 1;
      if (mode === 'user') {
        state.draft.userId = '';
        state.draft.name = '';
        state.draft.phone = '';
      } else {
        state.draft.userId = '';
      }
      render();
      return;
    }
    if (action === 'volunteer-pick-user') {
      syncDraftFromDom();
      const selected = (data.users || []).find((u) => u.id === el.dataset.id);
      if (!selected) { notify('未找到用户'); return; }
      state.draft.entryMode = 'user';
      state.draft.userId = selected.id;
      state.draft.name = selected.name;
      state.draft.phone = selected.phone;
      state.devicePickerQuery = '';
      state.devicePickerPage = 1;
      render();
      return;
    }
    if (action === 'volunteer-clear-user') {
      syncDraftFromDom();
      state.draft.userId = '';
      state.draft.name = '';
      state.draft.phone = '';
      state.devicePickerQuery = '';
      state.devicePickerPage = 1;
      render();
      return;
    }
    if (action === 'picker-page') {
      const next = Math.max(1, Number(el.dataset.page) || 1);
      state.devicePickerPage = next;
      render();
      return;
    }
    if (action === 'verification-device-mode') {
      syncDraftFromDom();
      const mode = el.dataset.value === 'manual' ? 'manual' : 'ledger';
      state.draft.deviceMode = mode;
      state.devicePickerQuery = '';
      state.devicePickerPage = 1;
      if (mode === 'ledger') {
        state.draft.aircraftName = '';
        state.draft.serialNumber = '';
        state.draft.registrationMark = '';
        state.draft.ownerType = '个人';
        state.draft.droneId = '';
      } else {
        state.draft.droneId = '';
        state.draft.registrationMark = '';
        if (!state.draft.ownerType) state.draft.ownerType = '个人';
      }
      render();
      return;
    }
    if (action === 'verification-pick-drone') {
      syncDraftFromDom();
      const drone = data.drones.find((entry) => entry.id === el.dataset.id);
      if (!drone) { notify('未找到设备'); return; }
      state.draft.deviceMode = 'ledger';
      state.draft.droneId = drone.id;
      state.draft.aircraftName = data.uomValue(drone, 'aircraftName');
      state.draft.serialNumber = data.uomValue(drone, 'serialNumber');
      state.draft.registrationMark = data.uomValue(drone, 'registrationMark');
      state.draft.ownerType = drone.accountRole === 'company' ? '企业' : '个人';
      state.devicePickerQuery = '';
      state.devicePickerPage = 1;
      render();
      return;
    }
    if (action === 'verification-clear-drone') {
      syncDraftFromDom();
      state.draft.droneId = '';
      state.draft.aircraftName = '';
      state.draft.serialNumber = '';
      state.draft.registrationMark = '';
      state.draft.ownerType = '个人';
      state.devicePickerQuery = '';
      state.devicePickerPage = 1;
      render();
      return;
    }
    if (action === 'sort-step') {
      syncDraftFromDom();
      const field = el.dataset.field || 'sort';
      const current = Math.max(1, Number(state.draft[field]) || 1);
      const delta = Number(el.dataset.delta) || 0;
      state.draft[field] = Math.max(1, current + delta);
      render();
    }
    if (action === 'toggle-content-status') {
      const item = data.articles.find((article) => article.id === el.dataset.id);
      if (item) { item.status = item.status === '已发布' ? '已下架' : '已发布'; persistPublicService(); notify(item.status === '已发布' ? '内容已发布并同步用户端' : '内容已下架，用户端不再展示'); }
    }
    if (action === 'request-delete-form') { state.modal = { type: 'form-delete', key: 'feedback-forms', item: el.dataset.id }; render(); }
    if (action === 'submit-form-delete') {
      const index = data.feedbackForms.findIndex((form) => form.id === state.modal.item);
      if (index >= 0) data.feedbackForms.splice(index, 1);
      persistPublicService();
      state.modal = null;
      notify('反馈表单已删除');
    }
    if (action === 'submit-create-light') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const id = state.draft.id || `SL-2026-${String(data.shoulderLights.length + 1).padStart(3, '0')}`;
      if (data.shoulderLights.some((entry) => entry.id === id)) { notify('设备编号已存在'); return; }
      data.shoulderLights.unshift({ id, state: '在库', holder: '—', unit: '—', issuedAt: '—', returnedAt: '—' });
      state.modal = null;
      state.lightTab = 'issue';
      notify('肩带已新增入库');
    }
    if (action === 'submit-issue-light') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const light = data.shoulderLights.find((entry) => entry.id === state.draft.device);
      if (!light || light.state !== '在库') { notify('请选择在库肩灯'); return; }
      Object.assign(light, { state: '已领用', holder: state.draft.holder, unit: state.draft.unit, issuedAt: state.draft.time, returnedAt: '—' });
      state.modal = null;
      notify('配发登记已完成');
    }
    if (action === 'submit-create-rid') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const sn = String(state.draft.sn || '').trim();
      const model = String(state.draft.model || '').trim();
      if (!sn || !model) { notify('请填写设备序列号与设备型号'); return; }
      if (ledgers.ridModules.some((entry) => entry.sn === sn)) { notify('设备序列号已存在'); return; }
      const id = state.draft.id || `RID-YZ-${String(ledgers.ridModules.length + 1).padStart(3, '0')}`;
      ledgers.ridModules.unshift({ id, sn, model, state: '在库', volunteerId: '', volunteerName: '—', area: '—', updatedAt: `${data.now} 10:00` });
      state.modal = null;
      notify('RID 模块已新增入库');
    }
    if (action === 'submit-issue-rid') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const mod = ledgers.ridModules.find((entry) => entry.id === state.draft.device);
      const volunteer = ledgers.volunteers.find((entry) => entry.id === state.draft.volunteerId);
      if (!mod || mod.state !== '在库') { notify('请选择在库 RID 模块'); return; }
      if (!volunteer || volunteer.state !== '在册') { notify('请选择在册志愿者'); return; }
      if (volunteer.ridState === '已配发' && volunteer.ridModule && volunteer.ridModule !== '—') { notify('该志愿者已绑定 RID 模块'); return; }
      Object.assign(mod, { state: '已配发', volunteerId: volunteer.id, volunteerName: volunteer.name, area: volunteer.area || '—', updatedAt: state.draft.time });
      Object.assign(volunteer, { ridModule: mod.id, ridState: '已配发' });
      state.modal = null;
      notify('RID 模块已配发并绑定志愿者');
    }
    if (action === 'submit-maintain-light') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const d = state.draft;
      data.lightMaintenance.unshift({ id: `MT-${String(data.lightMaintenance.length + 1).padStart(3, '0')}`, device: d.device, type: d.type, detail: d.detail, operator: '设备维护组', time: data.now, state: d.state });
      const light = data.shoulderLights.find((entry) => entry.id === d.device);
      if (light && d.state === '维修中') light.state = '维修中';
      state.modal = null;
      state.lightTab = 'maintain';
      notify('维护记录已保存至维护台账');
    }
    if (action === 'finish-maintenance') {
      const record = data.lightMaintenance.find((entry) => entry.id === el.dataset.id);
      if (record) {
        record.state = '已完成';
        const light = data.shoulderLights.find((entry) => entry.id === record.device);
        if (light && light.state === '维修中') { light.state = '在库'; light.holder = '—'; light.unit = '—'; }
        notify('维护已完成，设备状态更新为“在库”');
      }
    }
    if (action === 'submit-add-member') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      data.companyMembers.push({ id: `MEM-${String(data.companyMembers.length + 1).padStart(2, '0')}`, name: state.draft.name, relation: state.draft.relation, phone: state.draft.phone, state: '正常', isAdmin: state.draft.relation === '法定代表人', isPilot: false, license: '未上传', assignedDroneIds: [] });
      persistProfile();
      state.modal = null;
      notify('授权账号已添加，用户端“企业关联用户管理”同步展示');
    }
    if (action === 'toggle-member') {
      const member = data.companyMembers.find((entry) => entry.id === el.dataset.id);
      if (member) { member.state = (member.state || '正常') === '正常' ? '已停用' : '正常'; persistProfile(); notify(`授权账号已${member.state === '正常' ? '启用' : '停用'}`); }
    }
    if (action === 'submit-push-alert') {
      const alert = data.alerts.find((entry) => entry.id === state.modal.item);
      if (alert) (alert.pushes = alert.pushes || []).push({ target: state.draft.target, time: `${data.now} 16:05`, state: '已送达' });
      state.modal = null;
      notify('告警信息已推送至指定终端');
    }
    if (action === 'submit-permission') { state.modal = null; notify('角色权限已保存'); }
    if (action === 'submit-complete-verification') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const item = ledgers.verification.find((entry) => entry.id === state.modal?.item);
      const result = state.draft.result === '不通过' ? '不通过' : '通过';
      const suggestion = String(state.draft.suggestion || '').trim();
      if (!suggestion) { notify('请填写处理意见'); return; }
      if (item) {
        Object.assign(item, {
          result,
          suggestion,
          detail: suggestion,
          state: '已完成',
          checkDate: item.checkDate || data.now,
          time: data.now,
          operator: item.operator || '核查员'
        });
      }
      state.modal = null;
      notify(result === '通过' ? '核查已通过' : '核查已标记为不通过');
      return;
    }
    if (action === 'submit-modal') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      if (state.modal?.type === 'edit' && state.modal.key === 'users') {
        const user = data.users.find((entry) => entry.id === state.modal.item);
        const { province, city, district, addressDetail, emergencyContact, emergencyPhone, ...basic } = state.userProfileDraft;
        if (user) Object.assign(user, basic);
        Object.assign(data.profiles.personal, basic);
        Object.assign(data.profiles.personal.supplement, data.normalizePersonalSupplement ? data.normalizePersonalSupplement({ province, city, district, addressDetail, emergencyContact, emergencyPhone }) : { province, city, district, addressDetail, emergencyContact, emergencyPhone });
        persistProfile();
        state.modal = null;
        notify('个人信息已保存，并同步至用户端档案');
        return;
      }
      if (state.modal?.type === 'edit' && state.modal.key === 'companies') {
        const company = data.companies.find((entry) => entry.id === state.modal.item);
        const { droneUsage, safetyOfficer, safetyPhone, ...basic } = state.companyProfileDraft;
        if (company) Object.assign(company, basic);
        Object.assign(data.profiles.company, basic);
        Object.assign(data.profiles.company.supplement, { droneUsage: droneUsage || '', safetyOfficer: safetyOfficer || '', safetyPhone: safetyPhone || '' });
        syncCompany();
        persistProfile();
        state.modal = null;
        notify('企业信息已保存，并同步至用户端档案');
        return;
      }
      if (state.modal?.type === 'confirm') {
        const { key, item } = state.modal;
        if (key === 'certificates') {
          const certificate = data.certificates.find((entry) => entry.id === item);
          if (certificate) { certificate.state = '已注销'; certificate.registrationStatus = '已注销'; certificate.history = [...(certificate.history || []), { time: `${data.now} 10:30`, action: '后台手动注销', detail: '公安管理人员手动注销登记证' }]; }
          const drone = data.drones.find((entry) => entry.certificate === item);
          if (drone) { drone.status = '已注销'; drone.registrationStatus = '已注销'; }
          persistLedger();
        }
        if (key === 'shoulder-lights') {
          const light = data.shoulderLights.find((entry) => entry.id === item);
          if (light) { Object.assign(light, { state: '在库', holder: '—', unit: '—', returnedAt: `${data.now} 17:30` }); }
          state.modal = null;
          notify('肩灯已归还入库');
          return;
        }
        if (key === 'volunteers') {
          const volunteer = ledgers.volunteers.find((entry) => entry.id === item);
          if (volunteer) {
            if (volunteer.ridModule && volunteer.ridModule !== '—') {
              const mod = ledgers.ridModules.find((entry) => entry.id === volunteer.ridModule);
              if (mod) Object.assign(mod, { state: '在库', volunteerId: '', volunteerName: '—', area: '—', updatedAt: `${data.now} 17:00` });
            }
            Object.assign(volunteer, { state: '已移除', ridModule: '—', ridState: '未配发' });
          }
          state.modal = null;
          notify('志愿者已移除');
          return;
        }
        if (key === 'rid-modules') {
          const mod = ledgers.ridModules.find((entry) => entry.id === item);
          if (mod && mod.state === '已配发') {
            const volunteer = ledgers.volunteers.find((entry) => entry.id === mod.volunteerId);
            if (volunteer) Object.assign(volunteer, { ridModule: '—', ridState: '未配发' });
            Object.assign(mod, { state: '在库', volunteerId: '', volunteerName: '—', area: '—', updatedAt: `${data.now} 17:00` });
          }
          state.modal = null;
          notify('RID 模块已回收，状态更新为“在库”');
          return;
        }
        state.overrides.set(`${key}:${item}`, operationResult(key));
        state.modal = null;
        notify(`${operationLabel(key)}操作成功`);
        return;
      }
      state.modal = null;
      notify('操作已完成');
    }
    if (action === 'detail') go(`detail/${el.dataset.key}/${el.dataset.id}`);
    if (action === 'cancel-drone') { state.modal = { type: 'cancel-drone', item: el.dataset.id }; render(); }
    if (action === 'submit-cancel-drone') {
      const drone = data.drones.find((entry) => entry.id === state.modal.item);
      if (drone) {
        drone.status = '已注销';
        drone.registrationStatus = '已注销';
        const certificate = data.certificates.find((entry) => entry.id === drone.certificate);
        if (certificate) { certificate.state = '已注销'; certificate.registrationStatus = '已注销'; certificate.history = [...(certificate.history || []), { time: `${data.now} 10:40`, action: '后台手动注销无人机', detail: '公安管理人员手动注销无人机台账' }]; }
        persistLedger();
      }
      state.modal = null;
      notify('无人机已手动注销，关联登记证同步更新');
    }
    if (action === 'submit-drone-disable') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const reason = String(state.draft.reason || '').trim();
      if (!reason) { notify('请填写拉黑原因'); return; }
      const item = state.modal.item;
      const drone = data.drones.find((entry) => entry.id === item);
      const aircraftName = drone ? (data.uomValue(drone, 'aircraftName') || drone.aircraftName || drone.drone || item) : item;
      const exists = (ledgers.droneBlacklist || []).some((row) => row.droneId === item && row.state === '已拉黑');
      if (!exists) {
        const maxNum = (ledgers.droneBlacklist || []).reduce((max, row) => Math.max(max, Number(String(row.id || '').replace(/\D/g, '')) || 0), 0);
        ledgers.droneBlacklist.unshift({
          id: `DBL-${String(maxNum + 1).padStart(3, '0')}`,
          droneId: item,
          aircraftName,
          registrationMark: drone ? (drone.registrationMark || data.uomValue(drone, 'registrationMark') || '—') : '—',
          serialNumber: drone ? (drone.serialNumber || data.uomValue(drone, 'serialNumber') || '—') : '—',
          owner: drone?.owner || '—',
          reason,
          state: '已拉黑',
          operatedBy: state.session?.account || 'admin',
          operatedAt: `${data.now} 10:30`
        });
      }
      if (drone) drone.manageState = '已禁用';
      syncDroneBlacklistState();
      state.draft = {};
      state.modal = null;
      notify('设备已加入无人机黑名单');
    }

    if (action === 'submit-blacklist') {
      const form = document.querySelector('#admin-form'); if (form && !form.reportValidity()) return;
      const reason = String(state.draft.reason || '').trim();
      if (!reason) { notify('请填写拉黑原因'); return; }
      const key = state.modal.key;
      const id = state.modal.item;
      const row = (rowsFor(key) || []).find((entry) => entry.id === id);
      const displayName = row?.name || (key === 'users' ? data.profiles.personal.name : data.profiles.company.name);
      if (row) row.status = '已拉黑';
      state.overrides.set(`${key}:${id}`, '已拉黑');
      const exists = ledgers.blacklist.some((entry) => entry.name === displayName && entry.state === '已拉黑');
      if (!exists) {
        ledgers.blacklist.unshift({
          id: `BL-${String(ledgers.blacklist.length + 1).padStart(3, '0')}`,
          name: displayName,
          type: key === 'users' ? '个人用户' : '企业用户',
          reason,
          state: '已拉黑',
          operatedBy: '—',
          operatedAt: '—'
        });
      } else {
        const target = ledgers.blacklist.find((entry) => entry.name === displayName);
        if (target) Object.assign(target, { reason, state: '已拉黑', type: key === 'users' ? '个人用户' : '企业用户' });
      }
      state.modal = null;
      state.draft = {};
      notify(`已拉黑“${displayName}”`);
    }
    if (action === 'submit-unblacklist') {
      const operatedBy = String(state.draft.operatedBy || state.session?.account || '综合管理员').trim();
      const operatedAt = String(state.draft.operatedAtDisplay || state.draft.operatedAt || `${data.now} 09:24`).trim();
      const id = state.modal.item;
      if (state.modal.key === 'drone-blacklist') {
        const list = ledgers.droneBlacklist || [];
        const index = list.findIndex((entry) => entry.id === id);
        const item = index >= 0 ? list[index] : null;
        if (index < 0) {
          state.modal = null;
          state.draft = {};
          notify('未找到可取消的黑名单记录');
          return;
        }
        list.splice(index, 1);
        if (item.droneId) {
          const drone = data.drones.find((entry) => entry.id === item.droneId);
          if (drone) drone.manageState = '正常';
        }
        syncDroneBlacklistState();
        state.modal = null;
        state.draft = {};
        notify(`已取消拉黑“${item.aircraftName || id}”，设备管理状态已恢复为正常`);
        return;
      }
      const item = ledgers.blacklist.find((entry) => entry.id === id);
      if (item) {
        Object.assign(item, { state: '已取消', operatedBy, operatedAt });
        const user = data.users.find((entry) => entry.name === item.name);
        const company = data.companies.find((entry) => entry.name === item.name);
        if (user) { user.status = '正常'; state.overrides.delete(`users:${user.id}`); }
        if (company) { company.status = '正常'; state.overrides.delete(`companies:${company.id}`); }
      }
      state.overrides.set(`blacklist:${id}`, '已取消拉黑');
      state.modal = null;
      state.draft = {};
      notify(`已取消拉黑“${item?.name || id}”`);
    }
    if (action === 'request-delete-content') { state.modal = { type: 'content-delete', key: el.dataset.key, item: el.dataset.id }; render(); }
    if (action === 'submit-content-delete') {
      const key = state.modal.key;
      const id = state.modal.item;
      if (key === 'activities') {
        const index = data.activities.findIndex((item) => item.id === id);
        if (index >= 0) data.activities.splice(index, 1);
        data.enrollments = data.enrollments.filter((item) => item.activityId !== id);
      } else if (key === 'faq') {
        data.uomGuide.faqs = (data.uomGuide.faqs || []).filter((item) => item.id !== id);
      } else if (key === 'guides') {
        data.uomGuide.guides = (data.uomGuide.guides || []).filter((item) => item.id !== id);
      } else {
        data.articles = data.articles.filter((item) => item.id !== id);
      }
      persistPublicService();
      state.modal = null;
      notify('内容已删除');
    }
    if (action === 'request-change') {
      const key = el.dataset.key;
      if (key === 'accounts' || key === 'sys-users') { state.modal = { type: 'permission', key: 'sys-users', item: el.dataset.id }; render(); return; }
      if (key === 'guides') {
        const guide = (data.uomGuide.guides || []).find((entry) => entry.id === el.dataset.id);
        if (guide) { guide.status = guide.status === '已发布' ? '已下架' : '已发布'; guide.updated = data.now; persistPublicService(); notify(guide.status === '已发布' ? '操作手册已上架' : '操作手册已下架'); }
        return;
      }
      if (key === 'users' || key === 'companies') {
        state.draft = { reason: '' };
        state.modal = { type: 'blacklist-confirm', key, item: el.dataset.id, operation: '拉黑' };
        render();
        return;
      }
      if (key === 'blacklist' || key === 'drone-blacklist') {
        const operatedBy = state.session?.account || ledgers.accounts?.find((account) => account.role === '系统管理员')?.name || '综合管理员';
        const now = new Date();
        const operatedAtDisplay = `${data.now} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        state.draft = { operatedBy, operatedAtDisplay };
        state.modal = { type: 'unblacklist-confirm', key, item: el.dataset.id, operation: '取消拉黑' };
        render();
        return;
      }
      if (key === 'drones') {
        state.draft = { reason: '' };
        state.modal = { type: 'drone-disable-confirm', key, item: el.dataset.id, operation: '禁用设备' };
        render();
        return;
      }
      if (key === 'verification') {
        const item = ledgers.verification.find((entry) => entry.id === el.dataset.id);
        if (!item || item.result !== '待核查') { notify('仅待核查记录可完成核查'); return; }
        state.draft = { result: '通过', suggestion: item.suggestion || '' };
        state.modal = { type: 'complete-verification', key, item: el.dataset.id, operation: '完成核查' };
        render();
        return;
      }
      state.modal = { type: 'confirm', key, item: el.dataset.id, operation: operationLabel(key) };
      render();
    }
    if (action === 'sys-toast') notify(el.dataset.toast || '操作已完成');
    if (action === 'sys-search') {
      const root = app;
      state.sysUserFilter = {
        userName: root.querySelector('[data-sys-filter="userName"]')?.value?.trim() || '',
        phone: root.querySelector('[data-sys-filter="phone"]')?.value?.trim() || '',
        status: root.querySelector('[data-sys-filter="status"]')?.value || '',
        start: root.querySelector('[data-sys-filter="start"]')?.value || '',
        end: root.querySelector('[data-sys-filter="end"]')?.value || ''
      };
      render();
    }
    if (action === 'sys-reset') {
      state.sysUserFilter = { userName: '', phone: '', status: '', start: '', end: '' };
      state.sysUserSelected = '';
      render();
    }
    if (action === 'select-sys-user') {
      state.sysUserSelected = state.sysUserSelected === el.dataset.id ? '' : el.dataset.id;
      render();
    }
    if (action === 'toggle-sys-user') {
      const system = window.AdminSystem.ensure(data);
      const user = system.sysUsers.find((row) => row.id === el.dataset.id);
      if (user) {
        user.status = user.status === '正常' ? '停用' : '正常';
        notify(user.status === '正常' ? '用户已启用' : '用户已停用');
      }
      return;
    }
    if (action === 'sys-user-detail') {
      state.modal = { type: 'permission', key: 'sys-users', item: el.dataset.id };
      render();
    }
    if (action === 'role-search') {
      state.roleFilter = {
        roleName: app.querySelector('[data-role-filter="roleName"]')?.value?.trim() || '',
        roleKey: app.querySelector('[data-role-filter="roleKey"]')?.value?.trim() || '',
        status: app.querySelector('[data-role-filter="status"]')?.value || '',
        start: app.querySelector('[data-role-filter="start"]')?.value || '',
        end: app.querySelector('[data-role-filter="end"]')?.value || ''
      };
      render();
    }
    if (action === 'role-reset') {
      state.roleFilter = { roleName: '', roleKey: '', status: '', start: '', end: '' };
      state.roleSelected = '';
      render();
    }
    if (action === 'select-role') {
      state.roleSelected = state.roleSelected === el.dataset.id ? '' : el.dataset.id;
      render();
    }
    if (action === 'toggle-role') {
      const system = window.AdminSystem.ensure(data);
      const role = system.roles.find((row) => row.id === el.dataset.id);
      if (role) {
        role.status = role.status === '正常' ? '停用' : '正常';
        notify(role.status === '正常' ? '角色已启用' : '角色已停用');
      }
      return;
    }
    if (action === 'menu-search') {
      state.menuFilter = {
        name: app.querySelector('[data-menu-filter="name"]')?.value?.trim() || '',
        status: app.querySelector('[data-menu-filter="status"]')?.value || ''
      };
      render();
    }
    if (action === 'menu-reset') {
      state.menuFilter = { name: '', status: '' };
      render();
    }
    if (action === 'toggle-menu-expand') {
      state.menuExpanded = !state.menuExpanded;
      render();
    }
    if (action === 'save-menu-sort') {
      const system = window.AdminSystem.ensure(data);
      app.querySelectorAll('[data-menu-sort]').forEach((input) => {
        const item = system.menus.find((row) => row.id === input.dataset.menuSort);
        if (item) item.order = Number(input.value) || 0;
      });
      notify('菜单排序已保存');
      return;
    }
    if (action === 'dict-search') {
      state.dictFilter = {
        name: app.querySelector('[data-dict-filter="name"]')?.value?.trim() || '',
        type: app.querySelector('[data-dict-filter="type"]')?.value?.trim() || '',
        status: app.querySelector('[data-dict-filter="status"]')?.value || ''
      };
      render();
    }
    if (action === 'dict-reset') {
      state.dictFilter = { name: '', type: '', status: '' };
      render();
    }
    if (action === 'config-search') {
      state.configFilter = {
        name: app.querySelector('[data-config-filter="name"]')?.value?.trim() || '',
        key: app.querySelector('[data-config-filter="key"]')?.value?.trim() || '',
        type: app.querySelector('[data-config-filter="type"]')?.value || ''
      };
      render();
    }
    if (action === 'config-reset') {
      state.configFilter = { name: '', key: '', type: '' };
      render();
    }
    if (action === 'history') notify('已展示关联记录与历史记录');
    if (action === 'export') notify(`${el.dataset.label || '统计报表'}已导出`);
    if (action === 'faq-page') { state.faqPage = Math.max(1, Number(el.dataset.page) || 1); render(); }
    if (action === 'reset-filter') { state.query=''; state.filter='全部'; state.areaFilter='全部'; state.faqPage = 1; render(); }
  });
  document.addEventListener('input', (event) => {
    if (event.target.dataset?.userProfileField !== undefined) { state.userProfileDraft[event.target.dataset.userProfileField] = event.target.value; return; }
    if (event.target.dataset?.companyProfileField !== undefined) { state.companyProfileDraft[event.target.dataset.companyProfileField] = event.target.value; return; }
    if (event.target.dataset?.draftField !== undefined) {
      state.draft[event.target.dataset.draftField] = event.target.value;
      if (event.target.dataset.draftField === 'mediaType') render();
      return;
    }
    if (event.target.dataset?.loginField !== undefined) {
      state.loginDraft[event.target.dataset.loginField] = event.target.value;
      if (state.loginError) { state.loginError = ''; render(); }
      return;
    }
    if (event.target.dataset?.configRow !== undefined) {
      const row = Number(event.target.dataset.configRow);
      const cell = Number(event.target.dataset.configCell);
      if (!state.draft.fields?.[row]) return;
      if (event.target.dataset.configCheckbox === 'required') {
        state.draft.fields[row][cell] = event.target.checked ? '必填' : '选填';
        return;
      }
      state.draft.fields[row][cell] = event.target.value;
      return;
    }
    if (event.target.dataset?.deviceQuery !== undefined) {
      state.devicePickerQuery = event.target.value;
      state.devicePickerPage = 1;
      render();
      const input = document.querySelector('[data-device-query]');
      if (input) { input.focus(); const len = state.devicePickerQuery.length; input.setSelectionRange(len, len); }
      return;
    }
    if (event.target.id === 'search') { state.query = event.target.value; state.faqPage = 1; render(); const input = document.querySelector('#search'); if (input) { input.focus(); input.setSelectionRange(state.query.length,state.query.length); } }
  });
  document.addEventListener('change', (event) => {
    if (event.target.dataset?.areaDate !== undefined) {
      const key = event.target.dataset.areaDate === 'end' ? 'areaCustomEnd' : 'areaCustomStart';
      state[key] = event.target.value;
      state.areaRange = 'custom';
      state.dashboardPick = null;
      patchDashboardArea();
      softToast(`自选时间段已更新为 ${state.areaCustomStart || '—'} 至 ${state.areaCustomEnd || '—'}`);
      return;
    }
    if (event.target.dataset?.companyProfileField !== undefined) { state.companyProfileDraft[event.target.dataset.companyProfileField] = event.target.value; return; }
    if (event.target.dataset?.draftField !== undefined) {
      const field = event.target.dataset.draftField;
      if (field === 'regionPath') {
        const parsed = data.parseResidenceRegionPath ? data.parseResidenceRegionPath(event.target.value) : { province: '', city: '', district: '' };
        state.draft.province = parsed.province || '';
        state.draft.city = parsed.city || '';
        state.draft.district = parsed.district || '';
        return;
      }
      state.draft[field] = event.target.value;
      if (field === 'holder') {
        const officer = (data.policeOfficers || []).find((item) => item.name === event.target.value);
        if (officer) state.draft.unit = officer.unit;
      }
      if (field === 'mediaType') render();
      else if (field === 'holder') render();
      else if (field === 'result' && state.formKey === 'verification') render();
      return;
    }
    if (event.target.dataset?.configRow !== undefined) {
      const row = Number(event.target.dataset.configRow);
      const cell = Number(event.target.dataset.configCell);
      if (!state.draft.fields?.[row]) return;
      if (event.target.dataset.configCheckbox === 'required') {
        state.draft.fields[row][cell] = event.target.checked ? '必填' : '选填';
        return;
      }
      state.draft.fields[row][cell] = event.target.value;
      if (cell === 1) {
        if (state.formKey === 'feedback-forms' && !['单选', '多选'].includes(event.target.value)) {
          state.draft.fields[row][3] = '';
        }
        render();
      }
      return;
    }
    if (event.target.id === 'content-cover-file') {
      const file = event.target.files?.[0];
      if (!file) return;
      const isImage = ['image/png', 'image/jpeg'].includes(file.type);
      const isVideo = ['video/mp4', 'video/webm'].includes(file.type);
      if (!isImage && !isVideo) { notify('封面仅支持 JPG、PNG、MP4、WebM'); return; }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        state.draft.coverImage = typeof reader.result === 'string' ? reader.result : '';
        state.draft.coverKind = isVideo ? 'video' : 'image';
        state.draft.coverName = file.name || '';
        if (isVideo && !state.draft.duration) state.draft.duration = '02:00';
        render();
      });
      reader.readAsDataURL(file);
      return;
    }
    if (event.target.id === 'state-filter') { state.filter = event.target.value; state.faqPage = 1; render(); }
    if (event.target.id === 'area-filter') { state.areaFilter = event.target.value; render(); }
  });
  window.addEventListener('hashchange', () => {
    state.query = '';
    state.filter = '全部';
    state.areaFilter = '全部';
    const r = normalizeRoute(route());
    if (route() !== r) location.hash = `#/${r}`;
    if (!r.startsWith('form/')) { state.formKey = ''; state.formId = ''; state.devicePickerQuery = ''; state.devicePickerPage = 1; }
    ensureTab(r);
    render();
  });
  window.addEventListener('storage', (event) => { if (event.key === ledgerStorageKey || event.key === publicServiceStorageKey || event.key === profileStorageKey) { if (event.key === ledgerStorageKey) hydrateLedger(); else if (event.key === publicServiceStorageKey) hydratePublicService(); else hydrateProfile(); render(); } });
  render();
})();

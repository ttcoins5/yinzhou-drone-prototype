/* 后台独立表单页：各模块新建/编辑 */
(function (global) {
  const UI = () => global.AdminUI;
  const RE = () => global.AdminRichEditor;
  const FP = () => global.AdminFormPage;
  const PICKER_PAGE_SIZE = 5;

  const pickerPager = (total, page) => {
    const totalPages = Math.max(1, Math.ceil(total / PICKER_PAGE_SIZE) || 1);
    const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
    if (!total) return { current, totalPages, start: 0, markup: '' };
    const start = (current - 1) * PICKER_PAGE_SIZE;
    const markup = `<div class="device-picker-pager" aria-label="选择列表分页"><span>共 ${total} 条，第 ${current}/${totalPages} 页 · 每页 ${PICKER_PAGE_SIZE} 条</span><div><button type="button" class="secondary-btn" data-action="picker-page" data-page="${current - 1}"${current <= 1 ? ' disabled' : ''}>上一页</button><button type="button" class="secondary-btn" data-action="picker-page" data-page="${current + 1}"${current >= totalPages ? ' disabled' : ''}>下一页</button></div></div>`;
    return { current, totalPages, start, markup };
  };

  const normalizeField = (row) => (UI()?.normalizeEnrollField ? UI().normalizeEnrollField(row) : [...(Array.isArray(row) ? row : [])]);
  const defaultEnrollFields = () => [
    normalizeField(['报名人', '文本', '必填', '请填写报名人', '']),
    normalizeField(['联系电话', '手机号', '必填', '请填写手机号', '']),
    normalizeField(['备注', '文本', '选填', '选填，可补充说明', ''])
  ];

  const loadDraft = (key, id, data, state) => {
    const isNew = !id || id === 'new';
    if (key === 'activities') {
      const src = isNew ? null : data.activities.find((a) => a.id === id);
      return src
        ? { title: src.title, startTime: src.startTime, endTime: src.endTime, enrollStart: src.enrollStart, enrollEnd: src.enrollEnd, place: src.place, capacity: String(src.capacity), summary: src.summary, organizer: src.organizer || '', contact: src.contact || '', richText: Array.isArray(src.richText) ? src.richText.join('\n') : (src.richText || src.summary || ''), fields: (src.enrollForm || defaultEnrollFields()).map(normalizeField) }
        : { title: '', startTime: '', endTime: '', enrollStart: '', enrollEnd: '', place: '', capacity: '40', summary: '', organizer: '鄞州区低空安全服务中心', contact: '服务咨询 0574-****-8612', richText: '', fields: defaultEnrollFields() };
    }
    if (key === 'feedback-forms') {
      const src = isNew ? null : data.feedbackForms.find((f) => f.id === id);
      const normalize = (row) => (window.AdminUI?.normalizeFeedbackField ? AdminUI.normalizeFeedbackField(row) : [...(Array.isArray(row) ? row : []), '', '', '', ''].slice(0, 4));
      return src
        ? { name: src.name, scene: src.scene, fields: (src.fields || []).map(normalize) }
        : { name: '', scene: '', fields: [['反馈标题', '文本', '必填', ''], ['详细说明', '多行文本', '必填', ''], ['图片附件', '多张图片', '选填', '']] };
    }
    if (key === 'guides') {
      const guides = data.uomGuide.guides || [];
      const guide = isNew ? null : (guides.find((e) => e.id === id) || guides[0]);
      const nextSort = guides.reduce((max, row) => Math.max(max, Number(row.sort) || 0), 0) + 1;
      const sort = Number(guide?.sort) > 0 ? Number(guide.sort) : nextSort;
      return guide
        ? { title: guide.title || '', body: guide.richText || '', summary: guide.summary || '', status: guide.status || '已发布', sort, guideId: guide.id || id }
        : { title: '', body: '', summary: '', status: '已发布', sort: nextSort, guideId: '' };
    }
    if (key === 'faq') {
      const faqs = data.uomGuide.faqs || [];
      const src = isNew ? null : faqs.find((row) => row.id === id);
      const nextSort = faqs.reduce((max, row) => Math.max(max, Number(row.sort) || 0), 0) + 1;
      const sort = Number(src?.sort) > 0 ? Number(src.sort) : nextSort;
      return src
        ? { question: src.question || '', answer: src.answer || '', status: src.status || '已发布', sort }
        : { question: '', answer: '', status: '已发布', sort: nextSort };
    }
    if (key === 'laws' || key === 'news') {
      const rows = key === 'laws' ? data.articles.filter((x) => x.kind === '法规') : data.articles.filter((x) => x.kind === '公告');
      const src = isNew ? null : rows.find((row) => row.id === id);
      const coverKind = src?.coverKind || (src?.mediaType === '视频' ? 'video' : 'image');
      const effectiveStart = src?.effectiveStart || src?.effectiveDate || src?.date || data.now;
      const effectiveEnd = src?.effectiveEnd || '';
      const nextSort = rows.reduce((max, row) => Math.max(max, Number(row.sort) || 0), 0) + 1;
      const sort = Number(src?.sort) > 0 ? Number(src.sort) : (src?.pinned ? 1 : nextSort);
      return src
        ? { title: src.title || '', source: src.source || '鄞州区低空安全服务中心', coverKind, coverImage: src.coverImage || '', coverName: src.coverName || '', status: src.status || '已发布', sort, summary: src.summary || '', effectiveStart, effectiveEnd, body: (src.content || []).join('\n') }
        : { title: '', source: '鄞州区低空安全服务中心', coverKind: 'image', coverImage: '', coverName: '', status: '已发布', sort: nextSort, summary: '', effectiveStart: data.now, effectiveEnd: '', body: '' };
    }
    if (key === 'users') {
      const user = isNew ? null : data.users.find((u) => u.id === id);
      const supplement = (!isNew && id === 'USR-001' ? data.profiles.personal.supplement : user?.supplement) || {};
      const normalized = data.normalizePersonalSupplement ? data.normalizePersonalSupplement(supplement) : supplement;
      return user
        ? { name: user.name || '', idNumber: user.idNumber || '', phone: user.phone || '', address: user.address || '', province: normalized.province || '', city: normalized.city || '', district: normalized.district || '', addressDetail: normalized.addressDetail || '', emergencyContact: normalized.emergencyContact || '', emergencyPhone: normalized.emergencyPhone || '' }
        : { name: '', idNumber: '', phone: '', address: '', province: '', city: '', district: '', addressDetail: '', emergencyContact: '', emergencyPhone: '' };
    }
    if (key === 'companies') {
      const company = isNew ? null : data.companies.find((c) => c.id === id);
      const supplement = (!isNew && id === 'ENT-001' ? data.profiles.company.supplement : company?.supplement) || {};
      return company
        ? { name: company.name || '', creditCode: company.creditCode || '', verified: company.verified || '已认证', contact: company.contact || '', phone: company.phone || '', droneUsage: supplement.droneUsage || '', safetyOfficer: supplement.safetyOfficer || '', safetyPhone: supplement.safetyPhone || '' }
        : { name: '', creditCode: '', verified: '待认证', contact: '', phone: '', droneUsage: '', safetyOfficer: '', safetyPhone: '' };
    }
    if (key === 'volunteers') {
      const src = isNew ? null : data.volunteers.find((v) => v.id === id);
      const mock = (typeof window !== 'undefined' && window.LowAltitudeMock) || {};
      const address = mock.normalizePersonalSupplement
        ? mock.normalizePersonalSupplement({
          province: src?.province,
          city: src?.city,
          district: src?.district,
          addressDetail: src?.addressDetail || src?.street || ''
        })
        : {
          province: src?.province || '浙江省',
          city: src?.city || '宁波市',
          district: src?.district || '',
          addressDetail: src?.addressDetail || src?.street || ''
        };
      return src
        ? {
          name: src.name || '',
          phone: src.phone || '',
          volunteerType: src.volunteerType || '低空爱好者',
          province: address.province || '浙江省',
          city: address.city || '宁波市',
          district: address.district || '',
          addressDetail: address.addressDetail || src?.street || '',
          area: src.area || '',
          confirmedAt: src.confirmedAt || '',
          userId: src.userId || '',
          entryMode: src.userId ? 'user' : 'manual'
        }
        : {
          name: '',
          phone: '',
          volunteerType: '低空爱好者',
          province: '',
          city: '',
          district: '',
          addressDetail: '',
          area: '',
          confirmedAt: '',
          userId: '',
          entryMode: 'user'
        };
    }
    if (key === 'blacklist') {
      const src = isNew ? null : data.blacklist.find((b) => b.id === id);
      return src
        ? { name: src.name || '', type: src.type || '个人用户', reason: src.reason || '', state: src.state === '已取消' ? '已取消' : '已拉黑', operatedBy: src.operatedBy || '', operatedAt: src.operatedAt || '' }
        : { name: '', type: '个人用户', reason: '', state: '已拉黑', operatedBy: '', operatedAt: '' };
    }
    if (key === 'verification') {
      const src = isNew ? null : data.verification.find((v) => v.id === id);
      return src
        ? {
          deviceMode: src.droneId ? 'ledger' : 'manual',
          droneId: src.droneId || '',
          aircraftName: src.aircraftName || src.name || '',
          serialNumber: src.serialNumber || '',
          registrationMark: src.registrationMark || '',
          ownerType: src.ownerType || '个人',
          checkType: src.checkType || '证照核查',
          checkMethod: src.checkMethod || '材料核验',
          checkPlace: src.checkPlace || '',
          result: src.result || '待核查',
          issueDesc: src.issueDesc || '',
          suggestion: src.suggestion || src.detail || '',
          followUpDate: src.followUpDate || ''
        }
        : {
          deviceMode: 'ledger',
          droneId: '',
          aircraftName: '',
          serialNumber: '',
          registrationMark: '',
          ownerType: '个人',
          checkType: '证照核查',
          checkMethod: '材料核验',
          checkPlace: '',
          result: '待核查',
          issueDesc: '',
          suggestion: '',
          followUpDate: ''
        };
    }
    if (key === 'banners') {
      const src = isNew ? null : (data.banners || []).find((row) => row.id === id);
      const type = src?.type || '活动';
      const filled = data.bannerSourceCopy ? data.bannerSourceCopy(type, src?.targetId || '', data) : { targetId: '', title: '', summary: '', targetTitle: '' };
      const nextSort = (data.banners || []).reduce((max, row) => Math.max(max, Number(row.sort) || 0), 0) + 1;
      return src
        ? {
          type,
          targetId: src.targetId || filled.targetId,
          targetTitle: src.targetTitle || filled.targetTitle,
          title: src.title || filled.title,
          summary: src.summary || filled.summary,
          startAt: src.startAt || `${data.now}T00:00`,
          endAt: src.endAt || '',
          state: src.state === '已停用' ? '已停用' : '已启用',
          sort: Number(src.sort) > 0 ? Number(src.sort) : nextSort
        }
        : {
          type,
          targetId: filled.targetId,
          targetTitle: filled.targetTitle,
          title: filled.title,
          summary: filled.summary,
          startAt: `${data.now}T00:00`,
          endAt: `${String(data.now || '2026-07-30').slice(0, 4)}-08-20T23:59`,
          state: '已启用',
          sort: nextSort
        };
    }
    return {};
  };

  const backKey = (key) => (key === 'feedback-forms' ? 'feedback' : key);

  const regionAddressRow = (draft, mock, ui, input, opts = {}) => {
    const cascader = ui?.regionCascader
      ? ui.regionCascader(draft, mock, {
        open: Boolean(opts.regionCascaderOpen),
        active: opts.regionCascaderActive || {},
        useAddressDistricts: Boolean(opts.useAddressDistricts)
      })
      : '';
    return `<div class="region-cascade-row"><div class="region-cascade-side">${cascader}</div><div class="region-cascade-detail">${input('addressDetail', { required: Boolean(opts.requiredDetail), placeholder: '请填写详细地址，如街道、路名门牌号' })}</div></div>`;
  };

  const renderBody = (key, draft, safe, opts = {}) => {
    const rich = RE();
    const ui = UI();
    const input = (field, opts = {}) => `<input ${opts.required ? 'required ' : ''}${opts.type ? `type="${opts.type}" ` : ''}data-draft-field="${field}" value="${safe(draft[field] || '')}" ${opts.placeholder ? `placeholder="${safe(opts.placeholder)}"` : ''} ${opts.min ? `min="${opts.min}"` : ''} />`;
    const textarea = (field, opts = {}) => `<textarea ${opts.required ? 'required ' : ''}data-draft-field="${field}" ${opts.placeholder ? `placeholder="${safe(opts.placeholder)}"` : ''}>${safe(draft[field] || '')}</textarea>`;
    const select = (field, options) => `<select data-draft-field="${field}">${options.map((t) => `<option${(draft[field] || '') === t ? ' selected' : ''}>${safe(t)}</option>`).join('')}</select>`;

    if (key === 'activities') {
      const fieldTable = ui.enrollFieldTable(draft.fields || [], { locked: Boolean(opts.enrollLocked), canSave: Boolean(opts.canSaveEnrollFields) });
      return `<form class="form-stack" id="admin-form"><label>活动名称${input('title', { required: true })}</label><div class="form-grid-2"><label>活动开始时间${input('startTime', { required: true, placeholder: '2026-08-20 09:00' })}</label><label>活动结束时间${input('endTime', { required: true, placeholder: '2026-08-20 11:30' })}</label><label>报名开始时间${input('enrollStart', { required: true })}</label><label>报名截止时间${input('enrollEnd', { required: true })}</label></div><label>活动地点${input('place', { required: true })}</label><label>活动名额${input('capacity', { required: true, type: 'number', min: '1' })}</label><label>主办单位${input('organizer', { required: true })}</label><label>咨询方式${input('contact', { required: true, placeholder: '如 服务咨询 0574-****-8612' })}</label><label>活动简介${textarea('summary', { required: true })}</label><label><span>活动介绍（富文本）</span>${rich.mountMarkup('richText', rich.textToHtml(draft.richText), '请输入活动介绍')}</label><fieldset class="config-fieldset enroll-config-fieldset"><legend>报名表单字段配置</legend>${fieldTable}</fieldset></form>`;
    }
    if (key === 'feedback-forms') {
      return `<form class="form-stack" id="admin-form"><label>反馈类型名称${input('name', { required: true, placeholder: '如 功能建议 / 问题咨询 / 隐患上报' })}</label><label>类型说明${input('scene', { required: true, placeholder: '用户端类型旁展示的简要说明' })}</label><fieldset class="config-fieldset"><legend>表单字段配置</legend>${ui.configRows(draft.fields || [])}</fieldset></form>`;
    }
    if (key === 'guides') {
      return `<form class="form-stack" id="admin-form"><label>流程标题${input('title', { required: true })}</label><label>流程摘要${input('summary', { required: true })}</label><div class="form-grid-2"><label>发布状态${select('status', ['已发布', '已下架'])}</label><label><span>编号排序</span>${ui.sortStepper('sort', draft.sort || 1)}</label></div><label><span>图文说明（富文本）</span>${rich.mountMarkup('body', rich.textToHtml(draft.body), '输入流程说明')}</label></form>`;
    }
    if (key === 'faq') {
      return `<form class="form-stack" id="admin-form"><label>问题${input('question', { required: true, placeholder: '如：飞行区域无法选择怎么办？' })}</label><div class="form-grid-2"><label>发布状态${select('status', ['已发布', '已下架'])}</label><label><span>排序</span>${ui.sortStepper('sort', draft.sort || 1)}</label></div><label><span>图文解答（富文本）</span>${rich.mountMarkup('answer', rich.textToHtml(draft.answer), '输入完整解答')}</label></form>`;
    }
    if (key === 'laws' || key === 'news') {
      const isVideoCover = draft.coverKind === 'video';
      const coverPreview = draft.coverImage
        ? (isVideoCover
          ? `<video class="cover-upload-preview" src="${safe(draft.coverImage)}" muted playsinline controls></video>`
          : (UI()?.zoomableImage
            ? UI().zoomableImage(draft.coverImage, '封面预览', 'zoomable-image--thumb', 'cover-upload-preview')
            : `<img class="cover-upload-preview" src="${safe(draft.coverImage)}" alt="封面预览" />`))
        : `<div class="cover-upload-placeholder"><b>封面预览</b><span>支持图片/视频</span></div>`;
      const coverUpload = ui.uploadField({
        id: 'content-cover-file',
        previewHtml: coverPreview,
        label: '上传封面',
        hint: '支持 JPG、PNG、MP4、WebM',
        accept: 'image/png,image/jpeg,video/mp4,video/webm',
        actionText: '选择文件'
      });
      return `<form class="form-stack" id="admin-form"><label>内容标题${input('title', { required: true })}</label><label>发布单位${input('source', { required: true })}</label><div class="form-grid-2">${key === 'laws' ? `<label>生效开始日期${input('effectiveStart', { required: true, type: 'date' })}</label><label>生效结束日期${input('effectiveEnd', { required: true, type: 'date' })}</label>` : ''}<label>发布状态${select('status', ['已发布', '已下架'])}</label><label><span>排序</span>${ui.sortStepper('sort', draft.sort || 1)}</label></div><label><span>封面</span>${coverUpload}${draft.coverName ? `<small class="record-note">已选：${safe(draft.coverName)}</small>` : ''}</label><label>摘要${textarea('summary', { required: true })}</label><label><span>正文（富文本）</span>${rich.mountMarkup('body', rich.textToHtml(draft.body), '请输入正文')}</label></form>`;
    }
    if (key === 'users') {
      const mock = (typeof window !== 'undefined' && window.LowAltitudeMock) || {};
      const addressField = regionAddressRow(draft, mock, ui, input, {
        regionCascaderOpen: opts.regionCascaderOpen,
        regionCascaderActive: opts.regionCascaderActive
      });
      return `<form class="form-stack" id="admin-form"><fieldset class="config-fieldset"><legend>基本信息</legend><label>姓名${input('name', { required: true })}</label><label>身份证号${input('idNumber', { required: true })}</label><label>手机号码${input('phone', { required: true })}</label><label>地址${textarea('address', { required: true })}</label></fieldset><fieldset class="config-fieldset"><legend>补充信息</legend><label>常住地址${addressField}</label><label>紧急联系人${input('emergencyContact')}</label><label>紧急联系电话${input('emergencyPhone', { type: 'tel' })}</label></fieldset></form>`;
    }
    if (key === 'companies') {
      return `<form class="form-stack" id="admin-form"><fieldset class="config-fieldset"><legend>基本信息</legend><label>企业名称${input('name', { required: true })}</label><label>统一社会信用代码${input('creditCode', { required: true })}</label><label>认证状态${select('verified', ['已认证', '待认证'])}</label><label>授权联系人${input('contact', { required: true })}</label><label>联系电话${input('phone', { required: true })}</label></fieldset><fieldset class="config-fieldset"><legend>补充信息</legend><label>无人机主要用途${input('droneUsage')}</label><label>安全负责人${input('safetyOfficer')}</label><label>安全负责人电话${input('safetyPhone')}</label></fieldset></form>`;
    }
    if (key === 'volunteers') {
      const mock = (typeof window !== 'undefined' && window.LowAltitudeMock) || {};
      const addressField = regionAddressRow(draft, mock, ui, input, {
        regionCascaderOpen: opts.regionCascaderOpen,
        regionCascaderActive: opts.regionCascaderActive,
        useAddressDistricts: true,
        requiredDetail: true
      });
      const isNew = Boolean(opts.isNew);
      const entryMode = isNew ? (draft.entryMode === 'manual' ? 'manual' : 'user') : 'manual';
      const enrolledPhones = new Set((opts.volunteers || []).filter((v) => (v.state || '在册') === '在册').map((v) => v.phone));
      const candidateUsers = (opts.users || []).filter((u) => (u.type || '个人') === '个人' && (u.status || '正常') !== '已拉黑' && (!enrolledPhones.has(u.phone) || u.id === draft.userId));
      const userQuery = String(opts.userQuery || opts.deviceQuery || '').trim().toLowerCase();
      const filteredUsers = candidateUsers.filter((u) => !userQuery || `${u.name || ''}${u.phone || ''}${u.id || ''}`.toLowerCase().includes(userQuery));
      const userPager = pickerPager(filteredUsers.length, opts.pickerPage);
      const pagedUsers = filteredUsers.slice(userPager.start, userPager.start + PICKER_PAGE_SIZE);
      const modeTabs = isNew
        ? `<div class="form-entry-tabs" role="tablist" aria-label="录入方式"><button type="button" class="${entryMode === 'user' ? 'active' : ''}" data-action="volunteer-entry-mode" data-value="user" role="tab" aria-selected="${entryMode === 'user' ? 'true' : 'false'}">从用户选择</button><button type="button" class="${entryMode === 'manual' ? 'active' : ''}" data-action="volunteer-entry-mode" data-value="manual" role="tab" aria-selected="${entryMode === 'manual' ? 'true' : 'false'}">手工录入</button></div>`
        : '';
      const linkedNote = !isNew && draft.userId
        ? `<div class="form-linked-user"><span>关联用户</span><b>${safe(draft.userId)}</b></div>`
        : '';
      const selectedUser = draft.userId
        ? `<div class="device-picker-selected"><div><span>已选用户</span><b>${safe(draft.name || '—')}</b><small>${safe(draft.phone || '—')} · ${safe(draft.userId)}</small></div><button type="button" class="text-btn" data-action="volunteer-clear-user">重选</button></div>`
        : '';
      const userListItems = pagedUsers.length
        ? pagedUsers.map((u) => {
          const active = draft.userId === u.id ? ' is-active' : '';
          return `<button type="button" class="device-picker-item${active}" data-action="volunteer-pick-user" data-id="${safe(u.id)}"><b>${safe(u.name)}</b><span>${safe(u.phone)}</span><small>${safe(u.id)}</small></button>`;
        }).join('')
        : `<div class="device-picker-empty">${candidateUsers.length ? '无匹配用户，请调整姓名或手机号关键词' : '暂无可选用户（已在册对象已过滤）'}</div>`;
      const userBrowse = draft.userId ? '' : `<label class="device-picker-search"><span>搜索用户</span><input data-device-query="1" value="${safe(opts.userQuery || opts.deviceQuery || '')}" placeholder="姓名 / 手机号" autocomplete="off" /></label><div class="device-picker-list" role="listbox" aria-label="用户列表">${userListItems}</div>${userPager.markup}`;
      const userPicker = isNew && entryMode === 'user'
        ? `<fieldset class="config-fieldset device-picker"><legend>选择用户</legend>${selectedUser}${userBrowse}<input type="hidden" data-draft-field="userId" value="${safe(draft.userId || '')}" /><input type="hidden" data-draft-field="name" value="${safe(draft.name || '')}" /><input type="hidden" data-draft-field="phone" value="${safe(draft.phone || '')}" /></fieldset>`
        : '';
      const manualIdentity = !isNew || entryMode === 'manual'
        ? `<label>姓名${input('name', { required: true })}</label><label>手机号码${input('phone', { required: true, placeholder: '如 138****0000' })}</label>`
        : '';
      return `<form class="form-stack" id="admin-form">${modeTabs}${linkedNote}${userPicker}${manualIdentity}<label>志愿者类型${select('volunteerType', ['低空爱好者', '社区网格员'])}</label><label>常住地址${addressField}</label><label>线下确认日期${input('confirmedAt', { required: true, type: 'date' })}</label></form>`;
    }
    if (key === 'blacklist') {
      return `<form class="form-stack" id="admin-form"><label>对象名称${input('name', { required: true })}</label><label>对象类型${select('type', ['个人用户', '企业用户', '授权账号'])}</label><label>拉黑原因${textarea('reason', { required: true })}</label><label>状态${select('state', ['已拉黑', '已取消'])}</label></form>`;
    }
    if (key === 'verification') {
      const mock = global.LowAltitudeMock || global.window?.LowAltitudeMock || {};
      const deviceMode = draft.deviceMode === 'manual' ? 'manual' : 'ledger';
      const query = String(opts.deviceQuery || '').trim().toLowerCase();
      const allDrones = mock.drones || global.window?.LowAltitudeMock?.drones || [];
      const drones = allDrones.filter((drone) => drone.status !== '已注销' && drone.registrationStatus !== '已注销');
      const uomValue = mock.uomValue || global.window?.LowAltitudeMock?.uomValue;
      const filtered = drones.filter((drone) => {
        if (!query) return true;
        const name = String((uomValue ? uomValue(drone, 'aircraftName') : drone.aircraftName) || drone.name || '');
        const serial = String((uomValue ? uomValue(drone, 'serialNumber') : drone.serialNumber) || drone.sn || '');
        const mark = String((uomValue ? uomValue(drone, 'registrationMark') : drone.registrationMark) || '');
        const owner = drone.accountRole === 'company' ? '企业' : '个人';
        return [name, serial, mark, owner, drone.id].join(' ').toLowerCase().includes(query);
      });
      const devicePager = pickerPager(filtered.length, opts.pickerPage);
      const pagedDrones = filtered.slice(devicePager.start, devicePager.start + PICKER_PAGE_SIZE);
      const modeTabs = `<div class="form-entry-tabs" role="tablist" aria-label="设备选择方式"><button type="button" class="${deviceMode === 'ledger' ? 'active' : ''}" data-action="verification-device-mode" data-value="ledger" role="tab" aria-selected="${deviceMode === 'ledger' ? 'true' : 'false'}">从台账选择</button><button type="button" class="${deviceMode === 'manual' ? 'active' : ''}" data-action="verification-device-mode" data-value="manual" role="tab" aria-selected="${deviceMode === 'manual' ? 'true' : 'false'}">临时新增</button></div>`;
      const selectedPanel = draft.droneId
        ? `<div class="device-picker-selected"><div><span>已选设备</span><b>${safe(draft.aircraftName || '—')}</b><small>序列号 ${safe(draft.serialNumber || '—')} · 登记标志 ${safe(draft.registrationMark || '—')} · ${safe(draft.ownerType || '—')}</small></div><button type="button" class="text-btn" data-action="verification-clear-drone">重选</button></div>`
        : '';
      const listItems = pagedDrones.length
        ? pagedDrones.map((drone) => {
          const name = (uomValue ? uomValue(drone, 'aircraftName') : drone.aircraftName) || drone.name || drone.id;
          const serial = (uomValue ? uomValue(drone, 'serialNumber') : drone.serialNumber) || drone.sn || '—';
          const mark = (uomValue ? uomValue(drone, 'registrationMark') : drone.registrationMark) || '—';
          const owner = drone.accountRole === 'company' ? '企业' : '个人';
          return `<button type="button" class="device-picker-item" data-action="verification-pick-drone" data-id="${safe(drone.id)}"><b>${safe(name)}</b><span>${safe(serial)}</span><small>${safe(mark)} · ${owner}</small></button>`;
        }).join('')
        : '<div class="device-picker-empty">无匹配设备，可切换「临时新增」录入</div>';
      const deviceBrowse = draft.droneId ? '' : `<label class="device-picker-search"><span>搜索设备</span><input data-device-query="1" value="${safe(opts.deviceQuery || '')}" placeholder="名称 / 设备序列号 / 登记标志" autocomplete="off" /></label><div class="device-picker-list" role="listbox" aria-label="设备台账">${listItems}</div>${devicePager.markup}`;
      const ledgerPicker = deviceMode === 'ledger'
        ? `<fieldset class="config-fieldset device-picker"><legend>关联设备</legend>${selectedPanel}${deviceBrowse}<input type="hidden" data-draft-field="droneId" value="${safe(draft.droneId || '')}" /></fieldset>`
        : '';
      const manualFields = deviceMode === 'manual'
        ? `<fieldset class="config-fieldset"><legend>临时设备</legend><div class="form-grid-2"><label>无人机名称${input('aircraftName', { required: true, placeholder: '如：云翼 M30' })}</label><label>设备序列号${input('serialNumber', { required: true, placeholder: '如：SN-****-0192' })}</label></div><label>权属${select('ownerType', ['个人', '企业'])}</label><input type="hidden" data-draft-field="droneId" value="" /></fieldset>`
        : '';
      const ledgerHidden = deviceMode === 'ledger'
        ? `<input type="hidden" data-draft-field="aircraftName" value="${safe(draft.aircraftName || '')}" /><input type="hidden" data-draft-field="serialNumber" value="${safe(draft.serialNumber || '')}" /><input type="hidden" data-draft-field="registrationMark" value="${safe(draft.registrationMark || '')}" /><input type="hidden" data-draft-field="ownerType" value="${safe(draft.ownerType || '')}" />`
        : '';
      const result = draft.result || '待核查';
      const suggestionRequired = result === '通过' || result === '不通过';
      return `<form class="form-stack" id="admin-form"><input type="hidden" data-draft-field="deviceMode" value="${deviceMode}" />${modeTabs}${ledgerPicker}${manualFields}${ledgerHidden}<div class="form-grid-2"><label>核查类型${select('checkType', ['证照核查', '现场核查', '抽查复核'])}</label><label>核查方式${select('checkMethod', ['材料核验', '上门核查', '电话复核'])}</label></div><label>核查地点${input('checkPlace', { required: true, placeholder: '如：鄞州区低空服务窗口 / 企业机库 / 远程复核' })}</label><label>核查结果${select('result', ['待核查', '通过', '不通过'])}</label><label>问题描述${textarea('issueDesc', { placeholder: '不通过时可填写发现的问题' })}</label><label>处理意见${textarea('suggestion', { required: suggestionRequired, placeholder: suggestionRequired ? '选择通过/不通过时必填核查结论与处理意见' : '待核查时可留空；完成核查时再填写' })}</label><label>计划跟进日期${input('followUpDate', { type: 'date' })}</label></form>`;
    }
    if (key === 'banners') {
      const mock = global.LowAltitudeMock || {};
      const types = mock.bannerTypes || ['活动', '低空安全普法', '公告'];
      const type = draft.type || types[0];
      const sources = mock.bannerSources ? mock.bannerSources(type, mock) : [];
      const sourceOptions = sources.length
        ? sources.map((item) => `<option value="${safe(item.id)}"${draft.targetId === item.id ? ' selected' : ''}>${safe(item.title)}</option>`).join('')
        : '<option value="">暂无可用内容</option>';
      return `<form class="form-stack" id="admin-form"><input type="hidden" data-draft-field="targetTitle" value="${safe(draft.targetTitle || '')}" /><label>推送类型<select required data-draft-field="type">${types.map((item) => `<option value="${safe(item)}"${type === item ? ' selected' : ''}>${safe(item)}</option>`).join('')}</select></label><label>关联内容<select required data-draft-field="targetId">${sourceOptions}</select></label><label>推送标题${input('title', { required: true, placeholder: '选择内容后自动带入，可继续修改' })}</label><label>推送简介${textarea('summary', { required: true, placeholder: '选择内容后自动带入摘要，可继续编辑推送文案' })}</label><div class="form-grid-2"><label>生效开始时间${input('startAt', { required: true, type: 'datetime-local' })}</label><label>生效结束时间${input('endAt', { required: true, type: 'datetime-local' })}</label></div><div class="form-grid-2"><label>启用状态${select('state', ['已启用', '已停用'])}</label><label><span>排序</span>${ui.sortStepper('sort', draft.sort || 1)}</label></div></form>`;
    }
    return '<div class="empty">未配置的表单模块</div>';
  };

  const titles = {
    activities: ['新建活动', '编辑活动', '创建后进入“报名中”；指定授权账号在报名名单中确认。'],
    'feedback-forms': ['新建反馈类型', '编辑反馈类型', '发布后用户端先选类型，再按本表单字段填写。'],
    guides: ['新建流程指导', '编辑流程指导', '保存后同步用户端操作手册。'],
    faq: ['新建常见问题', '编辑常见问题', '仅已发布内容在用户端可见。'],
    laws: ['新建政策法规', '编辑政策法规', '需填写发布单位与生效起止日期。'],
    news: ['新建新闻公告', '编辑新闻公告', '封面可上传图片或视频。'],
    banners: ['新建 Banner 推送', '编辑 Banner 推送', '选择类型与内容后自动带入标题和简介，可继续修改并设置生效时段。'],
    users: ['新增用户', '编辑个人信息', '保存后同步至用户端个人档案。'],
    companies: ['新增企业', '编辑企业信息', '保存后同步至用户端企业档案。'],
    volunteers: ['添加志愿者', '编辑志愿者', ''],
    blacklist: ['新增黑名单', '编辑黑名单', '可拉黑个人、企业或授权账号。'],
    verification: ['新增核查', '编辑核查记录', '']
  };

  const render = ({ key, id, draft, shell, safe, enrollLocked = false, canSaveEnrollFields = false, users = [], volunteers = [], deviceQuery = '', userQuery = '', pickerPage = 1, regionCascaderOpen = false, regionCascaderActive = {} }) => {
    const isNew = !id || id === 'new';
    const meta = titles[key] || ['新建', '编辑', ''];
    const title = isNew ? meta[0] : meta[1];
    const preview = ['activities', 'laws', 'news', 'guides', 'faq'].includes(key);
    const body = renderBody(key, draft, safe, { enrollLocked, canSaveEnrollFields, isNew, users, volunteers, deviceQuery, userQuery, pickerPage, regionCascaderOpen, regionCascaderActive });
    const page = FP().render({
      title,
      description: meta[2],
      backKey: backKey(key),
      backLabel: '返回列表',
      preview,
      saveAction: 'submit-form-page',
      saveLabel: key === 'verification' ? '保存核查' : (isNew ? (key === 'activities' ? '发布活动' : '保存配置') : '保存配置'),
      body
    });
    return shell(page, backKey(key));
  };

  global.AdminForms = { loadDraft, render, defaultEnrollFields, backKey };
})(typeof globalThis !== 'undefined' ? globalThis : window);

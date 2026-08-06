/* 系统管理：对齐若依风格用户/角色/菜单/字典/参数/日志列表原型 */
(function (global) {
  const seed = {
    sysUsers: [
      { id: '1', userName: 'admin', nickName: '超级管理员', dept: '系统', phone: '138****0001', status: '正常', createdAt: '2026-01-10 09:12:00', role: '系统管理员' },
      { id: '2', userName: 'ops_yz', nickName: '活动运营员', dept: '运营组', phone: '139****1682', status: '正常', createdAt: '2026-03-18 14:26:00', role: '活动运营' },
      { id: '3', userName: 'detect_yz', nickName: '侦测值班员', dept: '侦测组', phone: '137****5026', status: '正常', createdAt: '2026-05-06 10:08:00', role: '侦测值班' },
      { id: '4', userName: 'audit_yz', nickName: '台账核查员', dept: '台账组', phone: '136****8831', status: '停用', createdAt: '2026-06-22 16:40:00', role: '台账核查' }
    ],
    roles: [
      { id: '1', roleName: '超级管理员', roleKey: 'admin', sort: 1, status: '正常', createdAt: '2026-01-10 09:00:00' },
      { id: '2', roleName: '活动运营', roleKey: 'ops', sort: 2, status: '正常', createdAt: '2026-03-18 14:00:00' },
      { id: '3', roleName: '侦测值班', roleKey: 'detect', sort: 3, status: '正常', createdAt: '2026-05-06 10:00:00' },
      { id: '4', roleName: '台账核查', roleKey: 'audit', sort: 4, status: '停用', createdAt: '2026-06-22 16:00:00' }
    ],
    menus: [
      { id: '1', parentId: '0', name: '工作台', type: '菜单', order: 1, perms: 'drone:dashboard:view', component: 'drone/dashboard/index', status: '正常' },
      { id: '2', parentId: '0', name: '用户和企业管理', type: '目录', order: 2, perms: '', component: '', status: '正常' },
      { id: '21', parentId: '2', name: '用户管理', type: '菜单', order: 1, perms: 'drone:user:list', component: 'drone/user/index', status: '正常' },
      { id: '22', parentId: '2', name: '企业管理', type: '菜单', order: 2, perms: 'drone:company:list', component: 'drone/company/index', status: '正常' },
      { id: '23', parentId: '2', name: '黑名单', type: '菜单', order: 3, perms: 'drone:blacklist:list', component: 'drone/blacklist/index', status: '正常' },
      { id: '3', parentId: '0', name: '无人机后台管理', type: '目录', order: 3, perms: '', component: '', status: '正常' },
      { id: '31', parentId: '3', name: 'UOM 登记证', type: '菜单', order: 1, perms: 'drone:cert:list', component: 'drone/cert/index', status: '正常' },
      { id: '32', parentId: '3', name: '无人机管理', type: '菜单', order: 2, perms: 'drone:device:list', component: 'drone/device/index', status: '正常' },
      { id: '33', parentId: '3', name: '设备核查', type: '菜单', order: 3, perms: 'drone:check:list', component: 'drone/check/index', status: '正常' },
      { id: '4', parentId: '0', name: '飞行计划管理', type: '目录', order: 4, perms: '', component: '', status: '正常' },
      { id: '41', parentId: '4', name: '飞行计划', type: '菜单', order: 1, perms: 'drone:flight:list', component: 'drone/flight/index', status: '正常' },
      { id: '5', parentId: '0', name: '活动管理', type: '目录', order: 5, perms: '', component: '', status: '正常' },
      { id: '51', parentId: '5', name: '活动管理', type: '菜单', order: 1, perms: 'drone:activity:list', component: 'drone/activity/index', status: '正常' },
      { id: '6', parentId: '0', name: '宣传科普管理', type: '目录', order: 6, perms: '', component: '', status: '正常' },
      { id: '61', parentId: '6', name: '低空安全普法', type: '菜单', order: 1, perms: 'drone:law:list', component: 'drone/law/index', status: '正常' },
      { id: '62', parentId: '6', name: '新闻公告', type: '菜单', order: 2, perms: 'drone:news:list', component: 'drone/news/index', status: '正常' },
      { id: '7', parentId: '0', name: 'UOM流程指导', type: '目录', order: 7, perms: '', component: '', status: '正常' },
      { id: '71', parentId: '7', name: '操作手册', type: '菜单', order: 1, perms: 'drone:guide:list', component: 'drone/guide/index', status: '正常' },
      { id: '72', parentId: '7', name: '常见问题', type: '菜单', order: 2, perms: 'drone:faq:list', component: 'drone/faq/index', status: '正常' },
      { id: '8', parentId: '0', name: '志愿者管理', type: '目录', order: 8, perms: '', component: '', status: '正常' },
      { id: '81', parentId: '8', name: '志愿者名册', type: '菜单', order: 1, perms: 'drone:volunteer:list', component: 'drone/volunteer/index', status: '正常' },
      { id: '10', parentId: '0', name: '消息管理', type: '目录', order: 10, perms: '', component: '', status: '正常' },
      { id: '101', parentId: '10', name: '消息模板', type: '菜单', order: 1, perms: 'drone:message:list', component: 'drone/message/index', status: '正常' },
      { id: '11', parentId: '0', name: '意见反馈管理', type: '目录', order: 11, perms: '', component: '', status: '正常' },
      { id: '111', parentId: '11', name: '意见反馈', type: '菜单', order: 1, perms: 'drone:feedback:list', component: 'drone/feedback/index', status: '正常' },
      { id: '12', parentId: '0', name: '系统管理', type: '目录', order: 12, perms: '', component: '', status: '正常' },
      { id: '121', parentId: '12', name: '用户管理', type: '菜单', order: 1, perms: 'system:user:list', component: 'system/user/index', status: '正常' },
      { id: '122', parentId: '12', name: '角色管理', type: '菜单', order: 2, perms: 'system:role:list', component: 'system/role/index', status: '正常' },
      { id: '123', parentId: '12', name: '菜单管理', type: '菜单', order: 3, perms: 'system:menu:list', component: 'system/menu/index', status: '正常' },
      { id: '124', parentId: '12', name: '字典管理', type: '菜单', order: 4, perms: 'system:dict:list', component: 'system/dict/index', status: '正常' }
    ],
    dicts: [
      { id: '1', name: '用户性别', type: 'sys_user_sex', status: '正常', remark: '用户性别列表', createdAt: '2026-01-10 09:00:00' },
      { id: '2', name: '菜单状态', type: 'sys_show_hide', status: '正常', remark: '菜单状态列表', createdAt: '2026-01-10 09:00:00' },
      { id: '3', name: '系统开关', type: 'sys_normal_disable', status: '正常', remark: '系统开关列表', createdAt: '2026-01-10 09:00:00' },
      { id: '4', name: '任务状态', type: 'sys_job_status', status: '正常', remark: '任务状态列表', createdAt: '2026-01-10 09:00:00' }
    ],
    configs: [
      { id: '1', name: '主框架页-默认皮肤样式名称', key: 'sys.index.skinName', value: 'skin-blue', type: '是', remark: '蓝色 skin-blue' },
      { id: '2', name: '用户管理-账号初始密码', key: 'sys.user.initPassword', value: '123456', type: '是', remark: '初始化密码' },
      { id: '3', name: '主框架页-侧边栏主题', key: 'sys.index.sideTheme', value: 'theme-dark', type: '是', remark: '深色主题' },
      { id: '4', name: '账号自助-是否开启用户注册功能', key: 'sys.account.registerUser', value: 'false', type: '是', remark: '是否开启注册用户功能' }
    ],
    loginLogs: [
      { id: 'LL-001', userName: 'admin', ip: '10.*.*.12', location: '内网', browser: 'Chrome', os: 'macOS', status: '成功', time: '2026-08-04 09:16:22', msg: '登录成功' },
      { id: 'LL-002', userName: 'ops_yz', ip: '10.*.*.28', location: '内网', browser: 'Edge', os: 'Windows', status: '成功', time: '2026-08-04 08:52:10', msg: '登录成功' },
      { id: 'LL-003', userName: 'detect_yz', ip: '10.*.*.41', location: '内网', browser: 'Chrome', os: 'Windows', status: '失败', time: '2026-08-03 22:11:05', msg: '密码错误' }
    ]
  };

  const ensure = (data) => {
    if (!data.system) data.system = JSON.parse(JSON.stringify(seed));
    Object.keys(seed).forEach((key) => {
      if (!Array.isArray(data.system[key])) data.system[key] = JSON.parse(JSON.stringify(seed[key]));
    });
    if (!data.system.menus.some((item) => item.parentId !== undefined)) {
      data.system.menus = JSON.parse(JSON.stringify(seed.menus));
    } else {
      data.system.menus = data.system.menus.filter((item) => !['参数设置', '操作日志', '登录日志'].includes(item.name));
    }
    return data.system;
  };

  const escape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const statusSwitch = (value, action, id) => {
    const on = value === '正常';
    return `<button type="button" class="sys-switch ${on ? 'is-on' : ''}" data-action="${escape(action)}" data-id="${escape(id)}" aria-pressed="${on}" title="${on ? '正常' : '停用'}"><i></i></button>`;
  };

  const typeBadge = (type) => {
    const map = { 目录: 'dir', 菜单: 'menu', 按钮: 'btn' };
    return `<span class="sys-type ${map[type] || 'menu'}">${escape(type)}</span>`;
  };

  const filterActions = (searchAction = 'sys-search', resetAction = 'sys-reset') => `
    <div class="sys-filter-actions">
      <button type="button" class="sys-btn primary" data-action="${searchAction}">搜索</button>
      <button type="button" class="sys-btn plain" data-action="${resetAction}">重置</button>
    </div>`;

  const userToolbar = (selected = false) => `
    <div class="sys-toolbar">
      <button type="button" class="sys-btn primary" data-action="sys-toast" data-toast="已打开新增用户">＋ 新增</button>
      <button type="button" class="sys-btn success" ${selected ? '' : 'disabled '}data-action="sys-toast" data-toast="请先勾选一条用户后再修改">✎ 修改</button>
      <button type="button" class="sys-btn danger" ${selected ? '' : 'disabled '}data-action="sys-toast" data-toast="请先勾选用户后再删除">🗑 删除</button>
      <button type="button" class="sys-btn info" data-action="sys-toast" data-toast="已选择导入文件">↥ 导入</button>
      <button type="button" class="sys-btn warning" data-action="export" data-label="用户数据">↧ 导出</button>
    </div>`;

  const userFilterBar = (draft = {}) => `
    <div class="sys-filter">
      <label><span>用户名称</span><input data-sys-filter="userName" value="${escape(draft.userName || '')}" placeholder="请输入用户名称" /></label>
      <label><span>手机号码</span><input data-sys-filter="phone" value="${escape(draft.phone || '')}" placeholder="请输入手机号码" /></label>
      <label><span>状态</span><select data-sys-filter="status"><option value="">用户状态</option><option${draft.status === '正常' ? ' selected' : ''}>正常</option><option${draft.status === '停用' ? ' selected' : ''}>停用</option></select></label>
      <label class="sys-date-range"><span>创建时间</span><div><input type="date" data-sys-filter="start" value="${escape(draft.start || '')}" /><i>—</i><input type="date" data-sys-filter="end" value="${escape(draft.end || '')}" /></div></label>
      ${filterActions('sys-search', 'sys-reset')}
    </div>`;

  const usersPage = ({ shell, heading, safe, state, data }) => {
    const system = ensure(data);
    const draft = state.sysUserFilter || { userName: '', phone: '', status: '', start: '', end: '' };
    const selectedId = state.sysUserSelected || '';
    const rows = system.sysUsers.filter((item) => {
      if (draft.userName && !item.userName.includes(draft.userName) && !item.nickName.includes(draft.userName)) return false;
      if (draft.phone && !item.phone.includes(draft.phone)) return false;
      if (draft.status && item.status !== draft.status) return false;
      return true;
    });
    const body = rows.length
      ? `<div class="table-wrap sys-table-wrap"><table class="data-table sys-table"><thead><tr><th class="col-check"></th><th>用户编号</th><th>用户名称</th><th>用户昵称</th><th>手机号码</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>${rows.map((item) => `<tr class="${selectedId === item.id ? 'is-selected' : ''}"><td class="col-check"><input type="checkbox" data-action="select-sys-user" data-id="${safe(item.id)}"${selectedId === item.id ? ' checked' : ''} /></td><td>${safe(item.id)}</td><td><button type="button" class="text-btn" data-action="sys-user-detail" data-id="${safe(item.id)}">${safe(item.userName)}</button></td><td>${safe(item.nickName)}</td><td>${safe(item.phone)}</td><td>${statusSwitch(item.status, 'toggle-sys-user', item.id)}</td><td>${safe(item.createdAt)}</td><td><div class="actions"><button class="text-btn" data-action="modal" data-modal="permission" data-key="sys-users" data-item="${safe(item.id)}">修改</button><button class="text-btn danger" data-action="sys-toast" data-toast="已删除用户">删除</button><button class="text-btn" data-action="sys-toast" data-toast="更多：重置密码 / 分配角色">更多</button></div></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">暂无用户数据</div>';
    return shell(`${heading('用户管理')}${userFilterBar(draft)}${userToolbar(!!selectedId)}${body}<div class="sys-pager"><span>共 ${rows.length} 条</span><span>10条/页</span><span class="sys-pager-pages"><button type="button" disabled>‹</button><em>1</em><button type="button" disabled>›</button></span></div>`, 'sys-users');
  };

  const roleFilterBar = (draft = {}) => `
    <div class="sys-filter">
      <label><span>角色名称</span><input data-role-filter="roleName" value="${escape(draft.roleName || '')}" placeholder="请输入角色名称" /></label>
      <label><span>权限字符</span><input data-role-filter="roleKey" value="${escape(draft.roleKey || '')}" placeholder="请输入权限字符" /></label>
      <label><span>状态</span><select data-role-filter="status"><option value="">角色状态</option><option${draft.status === '正常' ? ' selected' : ''}>正常</option><option${draft.status === '停用' ? ' selected' : ''}>停用</option></select></label>
      <label class="sys-date-range"><span>创建时间</span><div><input type="date" data-role-filter="start" value="${escape(draft.start || '')}" /><i>—</i><input type="date" data-role-filter="end" value="${escape(draft.end || '')}" /></div></label>
      ${filterActions('role-search', 'role-reset')}
    </div>`;

  const roleToolbar = (selected = false) => `
    <div class="sys-toolbar">
      <button type="button" class="sys-btn primary" data-action="sys-toast" data-toast="已打开新增角色">＋ 新增</button>
      <button type="button" class="sys-btn success" ${selected ? '' : 'disabled '}data-action="sys-toast" data-toast="请先勾选一条角色后再修改">✎ 修改</button>
      <button type="button" class="sys-btn danger" ${selected ? '' : 'disabled '}data-action="sys-toast" data-toast="请先勾选角色后再删除">🗑 删除</button>
      <button type="button" class="sys-btn warning" data-action="export" data-label="角色数据">↧ 导出</button>
    </div>`;

  const rolesPage = ({ shell, heading, safe, state, data }) => {
    const system = ensure(data);
    const draft = state.roleFilter || { roleName: '', roleKey: '', status: '', start: '', end: '' };
    const selectedId = state.roleSelected || '';
    const rows = system.roles.filter((item) => {
      if (draft.roleName && !item.roleName.includes(draft.roleName)) return false;
      if (draft.roleKey && !item.roleKey.includes(draft.roleKey)) return false;
      if (draft.status && item.status !== draft.status) return false;
      return true;
    });
    const body = rows.length
      ? `<div class="table-wrap sys-table-wrap"><table class="data-table sys-table"><thead><tr><th class="col-check"></th><th>角色编号</th><th>角色名称</th><th>权限字符</th><th>显示顺序</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>${rows.map((item) => {
        const locked = item.roleKey === 'admin';
        return `<tr class="${selectedId === item.id ? 'is-selected' : ''}"><td class="col-check"><input type="checkbox" data-action="select-role" data-id="${safe(item.id)}"${selectedId === item.id ? ' checked' : ''}${locked ? ' disabled' : ''} /></td><td>${safe(item.id)}</td><td>${safe(item.roleName)}</td><td>${safe(item.roleKey)}</td><td>${item.sort}</td><td>${statusSwitch(item.status, 'toggle-role', item.id)}</td><td>${safe(item.createdAt)}</td><td>${locked ? '<span class="record-note">—</span>' : `<div class="actions"><button class="text-btn" data-action="sys-toast" data-toast="已打开角色编辑">修改</button><button class="text-btn danger" data-action="sys-toast" data-toast="已删除角色">删除</button><button class="text-btn" data-action="sys-toast" data-toast="更多：分配用户">更多</button></div>`}</td></tr>`;
      }).join('')}</tbody></table></div>`
      : '<div class="empty">暂无角色数据</div>';
    return shell(`${heading('角色管理')}${roleFilterBar(draft)}${roleToolbar(!!selectedId)}${body}<div class="sys-pager"><span>共 ${rows.length} 条</span><span>10条/页</span><span class="sys-pager-pages"><button type="button" disabled>‹</button><em>1</em><button type="button" disabled>›</button></span></div>`, 'roles');
  };

  const menuFilterBar = (draft = {}) => `
    <div class="sys-filter">
      <label><span>菜单名称</span><input data-menu-filter="name" value="${escape(draft.name || '')}" placeholder="请输入菜单名称" /></label>
      <label><span>状态</span><select data-menu-filter="status"><option value="">菜单状态</option><option${draft.status === '正常' ? ' selected' : ''}>正常</option><option${draft.status === '停用' ? ' selected' : ''}>停用</option></select></label>
      ${filterActions('menu-search', 'menu-reset')}
    </div>`;

  const menuToolbar = () => `
    <div class="sys-toolbar">
      <button type="button" class="sys-btn outline-primary" data-action="sys-toast" data-toast="已打开新增菜单">＋ 新增</button>
      <button type="button" class="sys-btn outline-warning" data-action="save-menu-sort">✓ 保存排序</button>
      <button type="button" class="sys-btn plain" data-action="toggle-menu-expand">展开/折叠</button>
    </div>`;

  const flattenMenus = (menus, expanded, filter) => {
    const byParent = menus.reduce((map, item) => {
      const key = item.parentId || '0';
      if (!map[key]) map[key] = [];
      map[key].push(item);
      return map;
    }, {});
    Object.values(byParent).forEach((list) => list.sort((a, b) => a.order - b.order));
    const hasFilter = Boolean(filter.name || filter.status);
    const match = (item) => {
      if (filter.name && !item.name.includes(filter.name)) return false;
      if (filter.status && item.status !== filter.status) return false;
      return true;
    };
    const out = [];
    const walk = (parentId, depth, forceShow) => {
      (byParent[parentId] || []).forEach((item) => {
        const children = byParent[item.id] || [];
        const selfMatch = match(item);
        const showChildren = expanded || hasFilter;
        const childVisible = showChildren && children.some((child) => {
          if (match(child)) return true;
          return (byParent[child.id] || []).some((grand) => match(grand));
        });
        if (forceShow || selfMatch || childVisible || (!hasFilter && depth === 0)) {
          out.push({ ...item, depth, hasChildren: children.length > 0 });
          if (showChildren) walk(item.id, depth + 1, hasFilter ? (selfMatch || forceShow) : true);
        }
      });
    };
    walk('0', 0, false);
    return out;
  };

  const menusPage = ({ shell, heading, safe, state, data }) => {
    const system = ensure(data);
    const draft = state.menuFilter || { name: '', status: '' };
    const expanded = Boolean(state.menuExpanded);
    const rows = flattenMenus(system.menus, expanded, draft);
    const body = rows.length
      ? `<div class="table-wrap sys-table-wrap"><table class="data-table sys-table sys-menu-table"><thead><tr><th>菜单名称</th><th>类型</th><th>排序</th><th>权限标识</th><th>组件路径</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map((item) => `<tr><td><div class="sys-menu-name" style="padding-left:${item.depth * 18}px">${item.hasChildren ? `<button type="button" class="sys-tree-toggle ${expanded ? 'is-open' : ''}" data-action="toggle-menu-expand" aria-label="展开或折叠">›</button>` : '<i class="sys-tree-spacer"></i>'}<span>${safe(item.name)}</span></div></td><td>${typeBadge(item.type)}</td><td><input class="sys-sort-input" type="number" min="0" value="${item.order}" data-menu-sort="${safe(item.id)}" /></td><td>${safe(item.perms || '')}</td><td>${safe(item.component || '')}</td><td><span class="sys-status-text">${safe(item.status)}</span></td><td><div class="actions"><button class="text-btn" data-action="sys-toast" data-toast="已打开菜单编辑">修改</button><button class="text-btn" data-action="sys-toast" data-toast="已打开新增子菜单">新增</button><button class="text-btn danger" data-action="sys-toast" data-toast="已删除菜单">删除</button></div></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">暂无菜单数据</div>';
    return shell(`${heading('菜单管理')}${menuFilterBar(draft)}${menuToolbar()}${body}`, 'menus');
  };

  const dictFilterBar = (draft = {}) => `
    <div class="sys-filter">
      <label><span>字典名称</span><input data-dict-filter="name" value="${escape(draft.name || '')}" placeholder="请输入字典名称" /></label>
      <label><span>字典类型</span><input data-dict-filter="type" value="${escape(draft.type || '')}" placeholder="请输入字典类型" /></label>
      <label><span>状态</span><select data-dict-filter="status"><option value="">字典状态</option><option${draft.status === '正常' ? ' selected' : ''}>正常</option><option${draft.status === '停用' ? ' selected' : ''}>停用</option></select></label>
      ${filterActions('dict-search', 'dict-reset')}
    </div>`;

  const dictsPage = ({ shell, heading, safe, status, state, data }) => {
    const system = ensure(data);
    const draft = state.dictFilter || { name: '', type: '', status: '' };
    const rows = system.dicts.filter((item) => {
      if (draft.name && !item.name.includes(draft.name)) return false;
      if (draft.type && !item.type.includes(draft.type)) return false;
      if (draft.status && item.status !== draft.status) return false;
      return true;
    });
    const body = rows.length
      ? `<div class="table-wrap sys-table-wrap"><table class="data-table sys-table"><thead><tr><th class="col-check"></th><th>字典编号</th><th>字典名称</th><th>字典类型</th><th>状态</th><th>备注</th><th>创建时间</th><th>操作</th></tr></thead><tbody>${rows.map((item) => `<tr><td class="col-check"><input type="checkbox" /></td><td>${safe(item.id)}</td><td>${safe(item.name)}</td><td><button type="button" class="text-btn">${safe(item.type)}</button></td><td>${status(item.status)}</td><td>${safe(item.remark)}</td><td>${safe(item.createdAt)}</td><td><div class="actions"><button class="text-btn" data-action="sys-toast" data-toast="已打开字典编辑">修改</button><button class="text-btn danger" data-action="sys-toast" data-toast="已删除字典">删除</button></div></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">暂无字典数据</div>';
    return shell(`${heading('字典管理')}${dictFilterBar(draft)}<div class="sys-toolbar"><button type="button" class="sys-btn primary" data-action="sys-toast" data-toast="已打开新增字典">＋ 新增</button><button type="button" class="sys-btn warning" data-action="export" data-label="字典数据">↧ 导出</button></div>${body}<div class="sys-pager"><span>共 ${rows.length} 条</span><span>10条/页</span></div>`, 'dicts');
  };

  const configFilterBar = (draft = {}) => `
    <div class="sys-filter">
      <label><span>参数名称</span><input data-config-filter="name" value="${escape(draft.name || '')}" placeholder="请输入参数名称" /></label>
      <label><span>参数键名</span><input data-config-filter="key" value="${escape(draft.key || '')}" placeholder="请输入参数键名" /></label>
      <label><span>系统内置</span><select data-config-filter="type"><option value="">系统内置</option><option${draft.type === '是' ? ' selected' : ''}>是</option><option${draft.type === '否' ? ' selected' : ''}>否</option></select></label>
      ${filterActions('config-search', 'config-reset')}
    </div>`;

  const configPage = ({ shell, heading, safe, state, data }) => {
    const system = ensure(data);
    const draft = state.configFilter || { name: '', key: '', type: '' };
    const rows = system.configs.filter((item) => {
      if (draft.name && !item.name.includes(draft.name)) return false;
      if (draft.key && !item.key.includes(draft.key)) return false;
      if (draft.type && item.type !== draft.type) return false;
      return true;
    });
    const body = rows.length
      ? `<div class="table-wrap sys-table-wrap"><table class="data-table sys-table"><thead><tr><th class="col-check"></th><th>参数主键</th><th>参数名称</th><th>参数键名</th><th>参数键值</th><th>系统内置</th><th>备注</th><th>操作</th></tr></thead><tbody>${rows.map((item) => `<tr><td class="col-check"><input type="checkbox" /></td><td>${safe(item.id)}</td><td>${safe(item.name)}</td><td>${safe(item.key)}</td><td>${safe(item.value)}</td><td>${safe(item.type)}</td><td>${safe(item.remark)}</td><td><div class="actions"><button class="text-btn" data-action="sys-toast" data-toast="已打开参数编辑">修改</button><button class="text-btn danger" data-action="sys-toast" data-toast="已删除参数">删除</button></div></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">暂无参数数据</div>';
    return shell(`${heading('参数设置')}${configFilterBar(draft)}<div class="sys-toolbar"><button type="button" class="sys-btn primary" data-action="sys-toast" data-toast="已打开新增参数">＋ 新增</button><button type="button" class="sys-btn warning" data-action="export" data-label="参数数据">↧ 导出</button></div>${body}<div class="sys-pager"><span>共 ${rows.length} 条</span><span>10条/页</span></div>`, 'config');
  };

  const loginLogsPage = ({ shell, heading, safe, status, data }) => {
    const system = ensure(data);
    const rows = system.loginLogs;
    const body = rows.length
      ? `<div class="table-wrap sys-table-wrap"><table class="data-table sys-table"><thead><tr><th class="col-check"></th><th>访问编号</th><th>用户名称</th><th>登录地址</th><th>登录地点</th><th>浏览器</th><th>操作系统</th><th>登录状态</th><th>操作信息</th><th>登录时间</th></tr></thead><tbody>${rows.map((item) => `<tr><td class="col-check"><input type="checkbox" /></td><td>${safe(item.id)}</td><td>${safe(item.userName)}</td><td>${safe(item.ip)}</td><td>${safe(item.location)}</td><td>${safe(item.browser)}</td><td>${safe(item.os)}</td><td>${status(item.status === '成功' ? '正常' : '异常')}</td><td>${safe(item.msg || '')}</td><td>${safe(item.time)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">暂无登录日志</div>';
    return shell(`${heading('登录日志')}<div class="sys-toolbar"><button type="button" class="sys-btn danger" data-action="sys-toast" data-toast="已清空登录日志">🗑 清空</button><button type="button" class="sys-btn warning" data-action="export" data-label="登录日志">↧ 导出</button></div>${body}<div class="sys-pager"><span>共 ${rows.length} 条</span><span>10条/页</span></div>`, 'login-logs');
  };

  global.AdminSystem = {
    ensure,
    usersPage,
    rolesPage,
    menusPage,
    dictsPage,
    configPage,
    loginLogsPage,
    seed
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

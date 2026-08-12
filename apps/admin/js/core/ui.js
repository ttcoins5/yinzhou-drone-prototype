/* 公安后台共用 UI：按钮、状态、上传、动态字段 */
(function (global) {
  const escape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const NO_EDIT = new Set(['certificates', 'drones', 'feedback', 'accounts', 'sys-users', 'roles', 'menus', 'dicts', 'config', 'login-logs', 'flights', 'enrollments', 'audit', 'alerts', 'interface', 'users', 'companies', 'messages']);
  const FORM_MODULES = new Set(['activities', 'laws', 'news', 'guides', 'faq', 'feedback-forms', 'users', 'companies', 'volunteers', 'blacklist', 'verification']);

  const statusKind = (value) => {
    const text = String(value || '');
    if (text === '报名中') return 'warning';
    if (text === '进行中') return 'info';
    if (text === '已结束') return 'muted';
    if (text === '已下架') return 'danger';
    if (text === '在库') return 'info';
    if (text === '已配发' || text === '已领用') return 'success';
    if (text === '通过') return 'success';
    if (text === '不通过') return 'danger';
    if (text === '待核查') return 'warning';
    if (text === '已启用') return 'success';
    if (text === '已停用') return 'muted';
    if (/(已注销|已禁用|已停用|已取消|已移除)/u.test(text)) return 'muted';
    if (/(异常|失败|黑名单|已拉黑)/u.test(text)) return 'danger';
    if (/(待|维修|未接入|未确认|未执行|未配发|未推送)/u.test(text)) return 'warning';
    if (/(正常|有效|已确认|已发布|已同步|在册|在线|合法|已完成|已送达|已记录|已处置|已登记|已推送)/u.test(text)) return 'success';
    return 'info';
  };

  const status = (value) => `<span class="status ${statusKind(value)}">${escape(value)}</span>`;

  const actionBtn = ({ action, go, label, tone = 'text', attrs = {} }) => {
    const className = tone === 'primary' ? 'primary-btn'
      : tone === 'secondary' ? 'secondary-btn'
        : tone === 'danger' ? 'danger-btn'
          : tone === 'text-danger' ? 'text-btn danger'
            : tone === 'text-warning' ? 'text-btn warning'
              : 'text-btn';
    const data = Object.entries(attrs).map(([key, val]) => `data-${key}="${escape(val)}"`).join(' ');
    if (go) return `<button type="button" class="${className}" data-go="${escape(go)}" ${data}>${escape(label)}</button>`;
    return `<button type="button" class="${className}" data-action="${escape(action || '')}" ${data}>${escape(label)}</button>`;
  };

  const normalizeFeedbackField = (row = []) => {
    const [name = '', type = '文本', required = '选填', options = ''] = Array.isArray(row) ? row : [];
    const normalizedType = type === '图片' ? '多张图片' : (type || '文本');
    const needsOptions = normalizedType === '单选' || normalizedType === '多选';
    return [String(name || ''), normalizedType, required === '必填' || required === true ? '必填' : '选填', needsOptions ? String(options || '') : ''];
  };

  const configRows = (fields) => {
    const rows = (fields || []).map(normalizeFeedbackField);
    return `<div class="config-rows">${rows.map((row, index) => {
      const needsOptions = row[1] === '单选' || row[1] === '多选';
      return `<div class="config-row"><input data-config-row="${index}" data-config-cell="0" value="${escape(row[0])}" placeholder="字段名称" /><select data-config-row="${index}" data-config-cell="1">${['文本', '单选', '多选', '电话', '多行文本', '多张图片'].map((t) => `<option${row[1] === t ? ' selected' : ''}>${t}</option>`).join('')}</select><select data-config-row="${index}" data-config-cell="2">${['必填', '选填'].map((t) => `<option${row[2] === t ? ' selected' : ''}>${t}</option>`).join('')}</select><input data-config-row="${index}" data-config-cell="3" value="${escape(row[3])}" placeholder="${needsOptions ? '选项用顿号或逗号分隔' : '仅单选/多选填写'}"${needsOptions ? '' : ' disabled'} /><button type="button" class="text-btn danger" data-action="remove-config-field" data-index="${index}">移除</button></div>`;
    }).join('')}</div><button type="button" class="secondary-btn" data-action="add-config-field">+ 添加表单字段</button>`;
  };

  /** 活动报名表单字段：表格形态；无绑定子表单；支持单独保存与报名后锁定 */
  const enrollUiTypes = ['文本', '下拉框', '手机号'];

  const toEnrollStorageType = (uiType) => {
    if (uiType === '下拉框' || uiType === '单选' || uiType === '多选') return '单选';
    if (uiType === '手机号' || uiType === '电话') return '手机号';
    // 历史「图片」题型已下线，归一为文本
    return '文本';
  };

  const toEnrollUiType = (storageType) => {
    if (storageType === '单选' || storageType === '多选' || storageType === '下拉框') return '下拉框';
    if (storageType === '手机号' || storageType === '电话') return '手机号';
    return '文本';
  };

  const normalizeEnrollField = (row = []) => {
    const [name = '', type = '文本', required = '选填', hint = '', options = ''] = Array.isArray(row) ? row : [];
    return [String(name || ''), toEnrollStorageType(type), required === '必填' || required === true ? '必填' : '选填', String(hint || ''), String(options || '')];
  };

  const enrollFieldTable = (fields, { locked = false, canSave = false } = {}) => {
    const rows = (fields || []).map(normalizeEnrollField);
    const disabled = locked ? ' disabled' : '';
    const body = rows.length
      ? rows.map((row, index) => {
        const [name, type, required, hint, options] = row;
        const uiType = toEnrollUiType(type);
        const optionEnabled = uiType === '下拉框';
        const typeBtns = enrollUiTypes.map((t) => `<button type="button" class="type-chip${uiType === t ? ' active' : ''}" data-action="set-enroll-field-type" data-index="${index}" data-type="${escape(t)}"${locked ? ' disabled' : ''}>${escape(t)}</button>`).join('');
        return `<tr>
          <td class="col-sort">${index + 1}</td>
          <td><input data-config-row="${index}" data-config-cell="0" value="${escape(name)}" placeholder="字段名称"${disabled} /></td>
          <td><div class="type-chip-group">${typeBtns}</div></td>
          <td class="col-check"><input type="checkbox" data-config-row="${index}" data-config-cell="2" data-config-checkbox="required"${required === '必填' ? ' checked' : ''}${disabled} /></td>
          <td><input data-config-row="${index}" data-config-cell="3" value="${escape(hint)}" placeholder="提示文案"${disabled} /></td>
          <td><input data-config-row="${index}" data-config-cell="4" value="${escape(options)}" placeholder="${optionEnabled ? '选项用顿号或逗号分隔' : '仅下拉框填写'}"${locked || !optionEnabled ? ' disabled' : ''} /></td>
          <td><div class="actions field-ops">
            <button type="button" class="text-btn" data-action="move-config-field" data-index="${index}" data-dir="up"${locked || index === 0 ? ' disabled' : ''}>上移</button>
            <button type="button" class="text-btn" data-action="move-config-field" data-index="${index}" data-dir="down"${locked || index === rows.length - 1 ? ' disabled' : ''}>下移</button>
            <button type="button" class="text-btn danger" data-action="remove-config-field" data-index="${index}"${locked ? ' disabled' : ''}>删除</button>
          </div></td>
        </tr>`;
      }).join('')
      : `<tr><td colspan="7" class="empty-cell">暂无字段，请添加</td></tr>`;
    const footer = locked
      ? ''
      : `<div class="enroll-field-actions">
          <button type="button" class="secondary-btn" data-action="add-config-field">+ 添加表单字段</button>
          ${canSave ? '<button type="button" class="primary-btn" data-action="save-enroll-fields">保存字段配置</button>' : ''}
        </div>`;
    return `<div class="enroll-field-config${locked ? ' is-locked' : ''}">
      <div class="table-wrap enroll-field-table-wrap"><table class="data-table enroll-field-table">
        <thead><tr><th>排序</th><th>字段名称</th><th>字段类型</th><th>必填</th><th>提示文案</th><th>下拉选项</th><th>操作</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      ${footer}
    </div>`;
  };

  const uploadField = ({
    id = 'cover-file',
    previewHtml,
    label = '上传封面',
    hint = '支持 JPG、PNG',
    accept = 'image/png,image/jpeg',
    actionText = '选择图片'
  }) => `<div class="cover-upload">${previewHtml}<label class="upload-drop slim" for="${escape(id)}"><input id="${escape(id)}" type="file" accept="${escape(accept)}" /><b>${escape(label)}</b><small>${escape(hint)}</small><em>${escape(actionText)}</em></label></div>`;

  const zoomableImage = (src, alt = '图片预览', className = '', imgClass = '') => {
    if (!src) return '';
    return `<button type="button" class="zoomable-image${className ? ` ${className}` : ''}" data-action="preview-image" data-src="${escape(src)}" data-alt="${escape(alt || '图片预览')}" aria-label="点击放大查看"><img${imgClass ? ` class="${escape(imgClass)}"` : ''} src="${escape(src)}" alt="${escape(alt || '')}" /></button>`;
  };

  const makeImagesZoomable = (html) => String(html || '').replace(/<img\b([^>]*?)\/?>/giu, (full, attrs) => {
    if (/\bdata-no-zoom\b/i.test(attrs) || /\bzoomable-image\b/i.test(full)) return full;
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const src = srcMatch ? (srcMatch[1] || srcMatch[2] || srcMatch[3] || '') : '';
    if (!src) return full;
    const altMatch = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const alt = altMatch ? (altMatch[1] || altMatch[2] || altMatch[3] || '图片预览') : '图片预览';
    const classMatch = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    const imgClass = classMatch ? (classMatch[1] || classMatch[2] || '') : '';
    return zoomableImage(src, alt, 'zoomable-image--inline', imgClass);
  });

  const sortStepper = (field = 'sort', value = 1, { min = 1 } = {}) => {
    const current = Math.max(min, Number(value) || min);
    return `<div class="sort-stepper" role="group" aria-label="排序"><button type="button" class="sort-step-btn" data-action="sort-step" data-field="${escape(field)}" data-delta="-1" aria-label="减小排序">−</button><input required type="number" min="${min}" data-draft-field="${escape(field)}" value="${escape(String(current))}" /><button type="button" class="sort-step-btn" data-action="sort-step" data-field="${escape(field)}" data-delta="1" aria-label="增大排序">+</button></div>`;
  };

  const field = (label, control) => `<label class="form-field"><span>${escape(label)}</span>${control}</label>`;

  global.AdminUI = {
    NO_EDIT,
    FORM_MODULES,
    escape,
    statusKind,
    status,
    actionBtn,
    configRows,
    normalizeFeedbackField,
    normalizeEnrollField,
    toEnrollStorageType,
    toEnrollUiType,
    enrollFieldTable,
    uploadField,
    sortStepper,
    field,
    zoomableImage,
    makeImagesZoomable
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

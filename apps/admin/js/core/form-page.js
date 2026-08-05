/* 公安后台独立表单页壳 */
(function (global) {
  const escape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  /**
   * @param {{ title: string, description?: string, backKey: string, backLabel?: string, preview?: boolean, saveAction: string, saveLabel?: string, body: string }} options
   */
  const render = (options) => {
    const {
      title,
      description = '',
      backKey,
      backLabel = '返回',
      preview = false,
      saveAction,
      saveLabel = '保存配置',
      body
    } = options;
    const actions = [
      `<button type="button" class="secondary-btn" data-go="${escape(backKey)}">${escape(backLabel)}</button>`,
      preview ? '<button type="button" class="secondary-btn" data-action="form-preview">预览</button>' : '',
      `<button type="button" class="primary-btn" data-action="${escape(saveAction)}">${escape(saveLabel)}</button>`
    ].filter(Boolean).join('');
    return `<section class="form-page"><header class="form-page-head"><div><p class="eyebrow">表单编辑</p><h1>${escape(title)}</h1></div><div class="form-page-actions">${actions}</div></header><div class="form-page-body">${body}</div></section>`;
  };

  global.AdminFormPage = { render };
})(typeof globalThis !== 'undefined' ? globalThis : window);

/* 公安后台共用富文本：原生 contenteditable，对齐参考稿工具条 */
(function (global) {
  const TOOLS = [
    { cmd: 'bold', label: 'B', title: '加粗' },
    { cmd: 'italic', label: 'I', title: '斜体' },
    { cmd: 'underline', label: 'U', title: '下划线' },
    { cmd: 'strikeThrough', label: 'S', title: '删除线' },
    { sep: true },
    { cmd: 'formatBlock', value: 'blockquote', label: '“”', title: '引用' },
    { cmd: 'insertHTML', value: '<code>代码</code>', label: '</>', title: '代码' },
    { sep: true },
    { cmd: 'insertUnorderedList', label: '•', title: '无序列表' },
    { cmd: 'insertOrderedList', label: '1.', title: '有序列表' },
    { cmd: 'outdent', label: '⇤', title: '减少缩进' },
    { cmd: 'indent', label: '⇥', title: '增加缩进' },
    { sep: true },
    { type: 'size', title: '字号' },
    { type: 'block', title: '段落样式' },
    { type: 'color', title: '文字颜色' },
    { type: 'hilite', title: '背景色' },
    { sep: true },
    { cmd: 'justifyLeft', label: '左', title: '左对齐' },
    { cmd: 'justifyCenter', label: '中', title: '居中' },
    { cmd: 'justifyRight', label: '右', title: '右对齐' },
    { cmd: 'justifyFull', label: '两端', title: '两端对齐' },
    { sep: true },
    { cmd: 'removeFormat', label: 'T̸', title: '清除格式' },
    { cmd: 'createLink', label: '链', title: '插入链接', prompt: '请输入链接地址' },
    { cmd: 'insertImage', label: '图', title: '插入图片占位', placeholder: true },
    { cmd: 'insertTable', label: '表', title: '插入表格占位', placeholder: true }
  ];

  const escape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const textToHtml = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return '<p><br></p>';
    if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
    return raw.split(/\n+/).map((line) => `<p>${escape(line)}</p>`).join('');
  };

  const htmlToPlain = (html) => String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

  const mountMarkup = (field, html, placeholder) => {
    const toolbar = TOOLS.map((tool) => {
      if (tool.sep) return '<i class="re-sep" aria-hidden="true"></i>';
      if (tool.type === 'size') {
        return `<label class="re-select" title="${tool.title}"><select data-re-size aria-label="字号"><option value="3">14px</option><option value="2">12px</option><option value="4">16px</option><option value="5">18px</option><option value="6">24px</option></select></label>`;
      }
      if (tool.type === 'block') {
        return `<label class="re-select" title="${tool.title}"><select data-re-block aria-label="段落样式"><option value="p">文本</option><option value="h2">标题</option><option value="h3">小标题</option><option value="blockquote">引用</option></select></label>`;
      }
      if (tool.type === 'color') {
        return `<label class="re-color" title="${tool.title}"><span>A</span><input type="color" value="#173154" data-re-color aria-label="文字颜色" /></label>`;
      }
      if (tool.type === 'hilite') {
        return `<label class="re-color" title="${tool.title}"><span>■</span><input type="color" value="#fff59d" data-re-hilite aria-label="背景色" /></label>`;
      }
      return `<button type="button" class="re-btn" data-re-cmd="${tool.cmd}" data-re-value="${escape(tool.value || '')}" data-re-prompt="${escape(tool.prompt || '')}" data-re-placeholder="${tool.placeholder ? '1' : ''}" title="${tool.title}">${tool.label}</button>`;
    }).join('');
    return `<div class="admin-rich-editor" data-rich-field="${escape(field)}"><div class="re-toolbar" role="toolbar" aria-label="富文本工具条">${toolbar}</div><div class="re-surface" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="${escape(placeholder || '请输入正文')}" data-rich-surface="${escape(field)}">${html || '<p><br></p>'}</div></div>`;
  };

  const bind = (root = document) => {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('.admin-rich-editor').forEach((editor) => {
      if (editor.dataset.bound === '1') return;
      editor.dataset.bound = '1';
      const surface = editor.querySelector('[data-rich-surface]');
      const run = (cmd, value) => {
        surface.focus();
        if (cmd === 'insertImage') {
          document.execCommand('insertHTML', false, '<figure class="re-image-slot"><img alt="配图占位" src="../../shared/assets/uom-registration-certificate.svg" /><figcaption>配图占位</figcaption></figure>');
          return;
        }
        if (cmd === 'insertTable') {
          document.execCommand('insertHTML', false, '<table class="re-table"><tr><th>列 1</th><th>列 2</th></tr><tr><td>—</td><td>—</td></tr></table>');
          return;
        }
        if (cmd === 'createLink') {
          const url = window.prompt('请输入链接地址', '');
          if (url) document.execCommand('createLink', false, url);
          return;
        }
        document.execCommand(cmd, false, value || null);
      };
      editor.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-re-cmd]');
        if (!btn || !editor.contains(btn)) return;
        event.preventDefault();
        run(btn.dataset.reCmd, btn.dataset.reValue || undefined);
      });
      editor.querySelector('[data-re-size]')?.addEventListener('change', (event) => {
        run('fontSize', event.target.value);
      });
      editor.querySelector('[data-re-block]')?.addEventListener('change', (event) => {
        run('formatBlock', event.target.value);
      });
      editor.querySelector('[data-re-color]')?.addEventListener('input', (event) => {
        run('foreColor', event.target.value);
      });
      editor.querySelector('[data-re-hilite]')?.addEventListener('input', (event) => {
        run('hiliteColor', event.target.value);
      });
    });
  };

  const getHtml = (field, root = document) => {
    const surface = root.querySelector(`[data-rich-surface="${field}"]`);
    return surface ? surface.innerHTML.trim() : '';
  };

  const getPlain = (field, root = document) => htmlToPlain(getHtml(field, root));

  global.AdminRichEditor = { mountMarkup, bind, getHtml, getPlain, textToHtml, htmlToPlain };
})(typeof globalThis !== 'undefined' ? globalThis : window);

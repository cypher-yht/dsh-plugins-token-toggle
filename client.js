window.__ModuleLoader__.load({
  id: '@local/token-toggle',
  factory(require) {
    var React = require('react');
    var h = React.createElement;

    var NS = 'token-toggle';

    /** The three bundles this switch manages, in display order. */
    var BUNDLES = [
      { key: 'office', name: 'dsh-plugin-office-markdown' },
      { key: 'read', name: 'dsh-read-url' },
      { key: 'mcp', name: 'dsh-mcp-lazy' }
    ];

    var zh = {
      'button': '省 Token',
      'buttonAria': '省 Token 插件快捷开关',
      'panel.title': '省 Token 插件',
      'panel.subtitle': '一键启停，立即作用于当前 profile',
      'panel.loading': '正在读取插件状态…',
      'panel.error': '读取插件状态失败',
      'panel.footer': '切换会写入当前 profile；若提示需重启，请重启 DSH 后生效。',
      'panel.close': '关闭',
      'row.enabled': '已启用',
      'row.disabled': '已停用',
      'row.uninstalled': '未安装',
      'row.busy': '切换中…',
      'b.office.title': '文档转 Markdown',
      'b.office.desc': 'Office/PDF 先转 .md，只把路径交给模型',
      'b.read.title': '网页正文读取',
      'b.read.desc': '抓正文、限长、缓存，避免 HTML 噪声',
      'b.mcp.title': 'MCP 按需加载',
      'b.mcp.desc': '只暴露一个代理工具，工具 schema 用到才加载',
      'applied': '已切换并生效',
      'unchanged': '状态未变化',
      'restart': '已保存，需重启 DSH 生效',
      'overridden': '已保存，但被更高优先级配置覆盖',
      'failed': '切换失败',
      'cancelled': '操作已取消',
      'toggleFailed': '切换失败'
    };

    var en = {
      'button': 'Tokens',
      'buttonAria': 'Token saver plugin switches',
      'panel.title': 'Token Saver Plugins',
      'panel.subtitle': 'Toggle now; changes apply to the current profile',
      'panel.loading': 'Reading plugin state…',
      'panel.error': 'Could not read plugin state',
      'panel.footer': 'Toggles are saved to this profile; restart DSH if a change reports that a restart is required.',
      'panel.close': 'Close',
      'row.enabled': 'On',
      'row.disabled': 'Off',
      'row.uninstalled': 'Not installed',
      'row.busy': 'Switching…',
      'b.office.title': 'Docs → Markdown',
      'b.office.desc': 'Convert Office/PDF to .md and pass only the path',
      'b.read.title': 'Read URL',
      'b.read.desc': 'Clean body text, capped and cached',
      'b.mcp.title': 'Lazy MCP',
      'b.mcp.desc': 'One proxy tool; schemas load on demand',
      'applied': 'Switched and applied',
      'unchanged': 'No change',
      'restart': 'Saved; restart DSH to apply',
      'overridden': 'Saved, but overridden by a higher-priority layer',
      'failed': 'Switch failed',
      'cancelled': 'Cancelled',
      'toggleFailed': 'Switch failed'
    };

    var store = {
      state: {
        open: false,
        anchor: null,
        bundles: [],
        status: 'idle',
        message: '',
        messageKind: 'info',
        busy: null,
        loadedAt: 0
      },
      listeners: [],
      set: function (patch) {
        store.state = Object.assign({}, store.state, patch);
        store.listeners.slice().forEach(function (listener) {
          try {
            listener();
          } catch (error) {
            /* one listener must not break the rest */
          }
        });
      },
      subscribe: function (listener) {
        store.listeners.push(listener);
        return function () {
          var index = store.listeners.indexOf(listener);
          if (index >= 0) store.listeners.splice(index, 1);
        };
      }
    };

    var api = {
      t: function (key) { return key; },
      refresh: function () {},
      toggle: function () {}
    };
    var remote = null;
    var refreshSeq = 0;

    function useStore() {
      var pair = React.useState(store.state);
      var snapshot = pair[0];
      var setSnapshot = pair[1];
      React.useEffect(function () {
        var active = true;
        function sync() {
          if (active) setSnapshot(store.state);
        }
        sync();
        var dispose = store.subscribe(sync);
        return function () {
          active = false;
          dispose();
        };
      }, []);
      return snapshot;
    }

    function LeafIcon(props) {
      var size = props && typeof props.size === 'number' ? props.size : 13;
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: false,
        style: { display: 'block', flexShrink: 0 },
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      },
        h('path', { d: 'M19 5.5C11.5 6 6.5 9.6 5.2 18c4.7-.7 7.9-2.9 9.7-6.6' }),
        h('path', { d: 'M5.6 18c2.6-4.2 5.4-6.9 9.4-8.4' })
      );
    }

    function TokenButton(props) {
      var state = useStore();
      var t = props.t;
      var enabledCount = state.bundles.filter(function (row) {
        return row.installed && row.enabled;
      }).length;
      var loaded = state.status === 'ready';
      var countText = loaded ? enabledCount + '/' + state.bundles.length : '·';

      return h('button', {
        type: 'button',
        'data-token-toggle-button': 'true',
        title: t('buttonAria'),
        'aria-label': t('buttonAria'),
        'aria-haspopup': 'dialog',
        'aria-expanded': state.open ? 'true' : 'false',
        onClick: function (event) {
          event.preventDefault();
          event.stopPropagation();
          var rect = event.currentTarget.getBoundingClientRect();
          var willOpen = !store.state.open;
          store.set({
            open: willOpen,
            anchor: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
          });
          if (willOpen) api.refresh(false);
        },
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 26,
          padding: '0 8px',
          border: '1px solid var(--dsw-alias-border-l1)',
          borderRadius: 7,
          background: state.open ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
          color: 'var(--dsw-alias-label-secondary)',
          cursor: 'pointer',
          font: 'inherit',
          fontSize: 12,
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }
      },
        h(LeafIcon, { size: 13 }),
        h('span', null, t('button')),
        h('span', {
          style: {
            color: enabledCount > 0
              ? 'var(--dsw-alias-state-success-primary)'
              : 'var(--dsw-alias-label-secondary)'
          }
        }, countText)
      );
    }

    function Switch(props) {
      var row = props.row;
      var busy = props.busy;
      var t = props.t;
      var disabled = !row.installed || busy;
      var label = row.title + ' ' + (row.installed
        ? (row.enabled ? t('row.enabled') : t('row.disabled'))
        : t('row.uninstalled'));

      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': row.enabled ? 'true' : 'false',
        'aria-label': label,
        title: label,
        disabled: !!disabled,
        onClick: function (event) {
          event.preventDefault();
          event.stopPropagation();
          api.toggle(row.name);
        },
        style: {
          width: 36,
          height: 20,
          padding: 2,
          border: 'none',
          borderRadius: 10,
          position: 'relative',
          flexShrink: 0,
          cursor: disabled ? 'default' : 'pointer',
          opacity: row.installed ? 1 : 0.45,
          background: row.enabled
            ? 'var(--dsw-alias-brand-primary)'
            : 'var(--dsw-alias-bg-layer-2)',
          transition: 'background 0.15s ease'
        }
      }, h('span', {
        style: {
          display: 'block',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--dsw-alias-bg-base)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
          transform: row.enabled ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 0.15s ease'
        }
      }));
    }

    function TokenPanel(props) {
      var state = useStore();
      var t = props.t;
      var panelRef = React.useRef(null);

      React.useEffect(function () {
        if (!state.open) return undefined;
        function onMouseDown(event) {
          var panel = panelRef.current;
          var target = event.target;
          if (panel && target && panel.contains(target)) return;
          if (target && target.closest && target.closest('[data-token-toggle-button]')) return;
          store.set({ open: false });
        }
        function onKeyDown(event) {
          if (event.key === 'Escape') store.set({ open: false });
        }
        window.addEventListener('mousedown', onMouseDown, true);
        window.addEventListener('keydown', onKeyDown, true);
        return function () {
          window.removeEventListener('mousedown', onMouseDown, true);
          window.removeEventListener('keydown', onKeyDown, true);
        };
      }, [state.open]);

      if (!state.open) return null;

      var anchor = state.anchor || { x: 0, y: 0, width: 0, height: 0 };
      var width = 320;
      var viewportWidth = window.innerWidth;
      var viewportHeight = window.innerHeight;
      var left = Math.max(8, Math.min(anchor.x, viewportWidth - width - 8));
      var bottom = Math.max(8, viewportHeight - anchor.y + 8);
      var maxHeight = Math.max(180, Math.min(360, anchor.y - 16));

      var message = state.message;
      var messageColor = state.messageKind === 'error'
        ? 'var(--dsw-alias-state-error-primary)'
        : 'var(--dsw-alias-state-success-primary)';

      var rows = state.bundles.map(function (row) {
        var statusText = !row.installed
          ? t('row.uninstalled')
          : state.busy === row.name
            ? t('row.busy')
            : row.enabled
              ? t('row.enabled')
              : t('row.disabled');
        var statusColor = !row.installed
          ? 'var(--dsw-alias-state-warn-primary)'
          : row.enabled
            ? 'var(--dsw-alias-state-success-primary)'
            : 'var(--dsw-alias-label-secondary)';

        return h('div', {
          key: row.name,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 10px',
            borderRadius: 8,
            background: 'var(--dsw-alias-bg-layer-2)'
          }
        },
          h('span', {
            'aria-hidden': true,
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: 7,
              flexShrink: 0,
              color: 'var(--dsw-alias-brand-primary)',
              background: 'var(--dsw-alias-bg-base)'
            }
          }, h(LeafIcon, { size: 14 })),
          h('span', {
            style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }
          },
            h('span', {
              style: {
                fontSize: 13,
                lineHeight: '18px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            }, row.title),
            h('span', {
              style: { fontSize: 11, lineHeight: '15px', color: 'var(--dsw-alias-label-secondary)' }
            }, row.desc),
            h('span', {
              style: { fontSize: 11, lineHeight: '15px', color: statusColor }
            }, statusText)
          ),
          h(Switch, { row: row, busy: state.busy, t: t })
        );
      });

      var body = state.status === 'loading' || state.status === 'idle'
        ? h('div', {
          style: {
            padding: '14px 4px',
            fontSize: 12,
            textAlign: 'center',
            color: 'var(--dsw-alias-label-secondary)'
          }
        }, t('panel.loading'))
        : state.status === 'error'
          ? h('div', {
            style: {
              padding: '12px 4px',
              fontSize: 12,
              lineHeight: '18px',
              color: 'var(--dsw-alias-state-error-primary)'
            }
          }, state.message || t('panel.error'))
          : rows;

      return h('div', {
        ref: panelRef,
        role: 'dialog',
        'aria-label': t('panel.title'),
        onContextMenu: function (event) {
          event.preventDefault();
          event.stopPropagation();
        },
        style: {
          position: 'fixed',
          left: left + 'px',
          bottom: bottom + 'px',
          width: width + 'px',
          maxHeight: maxHeight + 'px',
          overflowY: 'auto',
          zIndex: 9999,
          padding: 12,
          borderRadius: 12,
          border: '1px solid var(--dsw-alias-border-l1)',
          background: 'var(--dsw-alias-bg-overlay)',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.24)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'auto'
        }
      },
        h('div', {
          style: { display: 'flex', alignItems: 'flex-start', gap: 8 }
        },
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', {
              style: {
                fontSize: 14,
                lineHeight: '20px',
                fontWeight: 600,
                color: 'var(--dsw-alias-label-primary)'
              }
            }, t('panel.title')),
            h('div', {
              style: { marginTop: 2, fontSize: 11, lineHeight: '15px', color: 'var(--dsw-alias-label-secondary)' }
            }, t('panel.subtitle'))
          ),
          h('button', {
            type: 'button',
            title: t('panel.close'),
            'aria-label': t('panel.close'),
            onClick: function (event) {
              event.preventDefault();
              event.stopPropagation();
              store.set({ open: false });
            },
            style: {
              width: 24,
              height: 24,
              padding: 0,
              border: 'none',
              borderRadius: 6,
              flexShrink: 0,
              background: 'transparent',
              color: 'var(--dsw-alias-label-secondary)',
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 16,
              lineHeight: '20px'
            }
          }, '×')
        ),
        message
          ? h('div', {
            role: 'status',
            style: { fontSize: 11, lineHeight: '16px', color: messageColor }
          }, message)
          : null,
        body,
        h('div', {
          style: {
            paddingTop: 2,
            fontSize: 10,
            lineHeight: '14px',
            color: 'var(--dsw-alias-label-secondary)'
          }
        }, t('panel.footer'))
      );
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.pluginManager'],
      apply: function (ctx) {
        remote = ctx.remote && ctx.remote.pluginManager;
        ctx.effect(function () {
          return ctx.locale.register(NS, { zh: zh, en: en });
        }, 'token-toggle: dictionaries');
        var t = ctx.locale.bind(NS);
        api.t = t;

        function remoteCall(invoke) {
          return Promise.resolve(invoke()).then(function (result) {
            if (result && typeof result === 'object' && typeof result.ok === 'boolean') {
              if (!result.ok) throw result.error || new Error('Remote call failed');
              return result.value;
            }
            return result;
          });
        }

        function describeResult(result) {
          if (!result) return { text: '', kind: 'info' };
          if (result.application === 'restart-required') {
            return { text: t('restart'), kind: 'info' };
          }
          if (result.application === 'overridden') {
            return { text: t('overridden'), kind: 'error' };
          }
          if (result.application === 'failed') {
            var diagnostic = result.error && result.error.diagnostic
              ? ': ' + result.error.diagnostic
              : '';
            return { text: t('failed') + diagnostic, kind: 'error' };
          }
          if (result.application === 'cancelled') {
            return { text: t('cancelled'), kind: 'error' };
          }
          if (result.changed === false) {
            return { text: t('unchanged'), kind: 'info' };
          }
          return { text: t('applied'), kind: 'info' };
        }

        api.refresh = function (force) {
          if (!remote) {
            store.set({ status: 'error', message: t('panel.error') });
            return;
          }
          if (!force && store.state.status === 'ready' && Date.now() - store.state.loadedAt < 15000) {
            return;
          }
          refreshSeq += 1;
          var seq = refreshSeq;
          if (store.state.status !== 'ready') store.set({ status: 'loading' });

          remoteCall(function () {
            return remote.listBundles();
          }).then(function (list) {
            if (seq !== refreshSeq) return;
            if (!Array.isArray(list)) throw new Error('listBundles returned an unexpected value');
            var byName = Object.create(null);
            list.forEach(function (bundle) {
              if (bundle && bundle.name) byName[bundle.name] = bundle;
            });
            var rows = BUNDLES.map(function (meta) {
              var bundle = byName[meta.name] || null;
              return {
                key: meta.key,
                name: meta.name,
                title: t('b.' + meta.key + '.title'),
                desc: t('b.' + meta.key + '.desc'),
                installed: !!(bundle && bundle.installed),
                enabled: !!(bundle && bundle.enabled),
                error: bundle && bundle.error
                  ? String(bundle.error.diagnostic || bundle.error.code || '')
                  : ''
              };
            });
            store.set({
              bundles: rows,
              status: 'ready',
              loadedAt: Date.now()
            });
          }).catch(function (error) {
            if (seq !== refreshSeq) return;
            store.set({
              status: 'error',
              message: t('panel.error') + ': ' + String((error && error.message) || error)
            });
          });
        };

        api.toggle = function (name) {
          if (!remote || store.state.busy) return;
          var row = null;
          for (var index = 0; index < store.state.bundles.length; index += 1) {
            if (store.state.bundles[index].name === name) {
              row = store.state.bundles[index];
              break;
            }
          }
          if (!row || !row.installed) return;

          var next = !row.enabled;
          store.set({ busy: name, message: '', messageKind: 'info' });

          remoteCall(function () {
            return remote.setBundleEnabled(name, next);
          }).then(function (result) {
            var described = describeResult(result);
            store.set({ busy: null, message: described.text, messageKind: described.kind });
            api.refresh(true);
          }).catch(function (error) {
            store.set({
              busy: null,
              message: t('toggleFailed') + ': ' + String((error && error.message) || error),
              messageKind: 'error'
            });
          });
        };

        ctx.effect(function () {
          api.refresh(true);
          var disposers = [];
          try {
            if (ctx.remote && typeof ctx.remote.$on === 'function') {
              disposers.push(ctx.remote.$on('plugin-manager/changed', function () {
                api.refresh(true);
              }));
            }
          } catch (error) {
            /* The invalidation channel is optional; the open action refreshes too. */
          }
          return function () {
            disposers.forEach(function (dispose) {
              try {
                dispose();
              } catch (error) {
                /* already disposed */
              }
            });
          };
        }, 'token-toggle: state');

        ctx.slots.inject('conversation.input.left', function () {
          return ctx.slots.register({
            name: 'conversation.input.left',
            id: 'token-toggle.control',
            order: 40,
            inject: function () {
              return { t: t };
            }
          }, TokenButton);
        });

        ctx.slots.inject('shell.overlay', function () {
          return ctx.slots.register({
            name: 'shell.overlay',
            id: 'token-toggle.panel',
            order: 950,
            inject: function () {
              return { t: t };
            }
          }, TokenPanel);
        });
      }
    };
  }
});

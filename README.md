# 省 Token 快捷开关 (Token Toggle)

在 DSH 输入框「模型选择」左侧加一个「省 Token」按钮，一键启停三个省 token 插件，不用再去插件管理里翻。

> 标准 DSH bundle 插件，装完刷新页面即生效。

## 特性

- **输入框旁快捷按钮**：注册在 `conversation.input.left`，显示「省 Token」和当前启用数（如 `2/3`）；
  状态还没读到时显示 `·`。点击弹出开关面板。
- **面板里三个开关**：
  - **文档转 Markdown**（`dsh-plugin-office-markdown`）：Office/PDF 先转 `.md`，只把路径交给模型；
  - **网页正文读取**（`dsh-read-url`）：抓正文、限长、缓存，避免 HTML 噪声；
  - **MCP 按需加载**（`dsh-mcp-lazy`）：只暴露一个代理工具，工具 schema 用到才加载。
- **实时状态**：通过 `remote.pluginManager.listBundles()` 读取每个 bundle 的安装 / 启用状态；
  未安装的显示「未安装」且开关禁用，切换中显示「切换中…」；面板打开时刷新，并且 15 秒内不重复拉取。
- **切换结果有明确反馈**：`setBundleEnabled()` 后区分
  「已切换并生效 / 状态未变化 / 已保存，需重启 DSH 生效 / 已保存，但被更高优先级配置覆盖 / 切换失败 / 操作已取消」，
  失败或覆盖用红色提示，避免误以为已生效。
- **自动同步**：监听 `plugin-manager/changed` 事件，别处改了插件状态时面板自动刷新。
- **交互细节**：面板显示在按钮上方并按视口收敛；`Esc`、点击面板外、右上角 `×` 都能关闭；
  面板底部提示「切换会写入当前 profile，需要重启时请重启 DSH」。
- **中英文案**：通过 `locale.register` 注册 `zh` / `en` 字典，跟随界面语言切换。

## 前提

本插件只是三个省 token 插件的**快捷开关**，需要先在当前 profile 里安装它们（例如从插件市场安装
`dsh-plugin-office-markdown`、`dsh-read-url`、`dsh-mcp-lazy`），并在 `plugin_manager` 里可用；
未安装的项目会以「未安装」灰显。

## 安装

```powershell
dsh plugin add github:cypher-yht/dsh-plugins-token-toggle
```

本地开发用软链：

```powershell
dsh plugin add link:D:\path\to\token-toggle
```

> 桌面客户端（Electron）读的是 `desktop` profile，请让桌面端会话里的 `plugin_manager` 安装本插件。

装完**重启宿主**，浏览器 `Ctrl+F5` 硬刷新。

## 目录结构

```text
dsh-plugins-token-toggle/
├── index.js            # 宿主半区：空实现，UI 全在 client.js
├── client.js           # 前端：输入框按钮 + 开关面板
├── cordis.patch.yml    # 挂载声明
├── locale/             # 中英文案（zh.json / en.json）
├── icon.svg            # 插件列表图标
└── package.json
```

## 实现要点

- 用 `ctx.remote.pluginManager` 的 `listBundles()` / `setBundleEnabled(name, enabled)`，不直接改配置文件；
  切换写入的是**当前 profile**，所以可能提示需要重启。
- 三个受控 bundle 名字固定在 `client.js` 的 `BUNDLES` 常量里，想增减就在那里改。
- 面板挂在 `shell.overlay`（`order: 950`），按按钮位置向上弹出。

## 许可证

MIT，见 [LICENSE](LICENSE)。

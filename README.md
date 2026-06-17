# migu-noscore

Chrome 浏览器扩展，屏蔽咪咕视频（miguvideo.com）赛事页面的所有比分显示。

由 Justin & opencode+ds v4 pro 开发。

## 使用方式

1. 进入赛程页：**https://www.miguvideo.com/p/schedule/**
2. 选择想看的赛事，点击「集锦/回放」进入直播/回放页面
3. 扩展会自动屏蔽所有比分，视频区自动扩展至全宽

## 功能

| 页面 | 屏蔽内容 |
|------|---------|
| 赛程页 `/p/schedule/` | 比分数字（`.team-score`），保留比赛时间 |
| 直播/回放页 `/p/live/*` | 顶部比分栏 + 右侧面板整体 + 视频自动扩至全宽 |

## 适用范围

目前基于足球赛事（联赛、世界杯等）测试通过。由于咪咕视频各球类赛事使用相同的页面结构和 CSS 类名（`.team-score`、`.titleScores` 等），理论上对其他体育项目同样有效。

## 安装

### 获取插件文件

- **git clone**：`git clone https://github.com/cosmichut/migu-noscore.git`，插件在 `migu-noscore/` 目录下
- **下载 zip**：从 [Releases](https://github.com/cosmichut/migu-noscore/releases) 下载 `migu-noscore.zip` 并解压

### 加载到 Chrome

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `migu-noscore` 目录（或解压后的目录）

> 压缩包由 GitHub Actions 在每次推送到 main 分支时自动生成。

## 技术方案

- **CSS**：`document_start` 阶段注入，第一时间隐藏已知比分元素
- **MutationObserver**：监听动态 DOM 变化，处理 Vue SPA 渲染的内容
- **SPA 路由检测**：拦截 `history.pushState/replaceState` + `popstate`，适配页面内切换
- **定时扫描**：兜底方案，确保遗漏内容也被处理

## 文件结构

```
migu-noscore/
├── manifest.json     # Manifest V3 配置
├── content.js        # 核心逻辑
├── styles.css        # 初始 CSS 隐藏规则
└── icons/            # 图标
```

## 测试

```bash
npm install
npx playwright install chromium
npm test
```

## 许可证

[MIT](../LICENSE)

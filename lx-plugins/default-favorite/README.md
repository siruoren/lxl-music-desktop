# default-favorite（默认收藏）

安装后在歌曲**右键菜单**的「添加到...」上方新增**「收藏」**菜单项：点击直接把歌曲（单曲或多选）加入内置**「我的收藏」**列表，不弹窗、**不创建任何新歌单**。**原有「添加到...」菜单与弹窗逻辑完全不变。**

| 项 | 值 |
| --- | --- |
| 插件 id | `com.siruoren.default-favorite` |
| 端 | `renderer` |
| 应用最低版本 | `>=2.0.0` |
| 入口 | [`index.js`](./index.js) |
| 产物 | `dist/default-favorite-<版本>.lxplugin`（版本 = app 版本） |

## 安装与构建

```bash
node lx-plugins/repo-source-plugins/build.js default-favorite
```

产物是单个文件 `lx-plugins/default-favorite/dist/default-favorite-<版本>.lxplugin`，在客户端侧边栏「插件管理」里上传安装 / 更新；开发期也可用「安装插件目录（本地开发）」直接选本目录。构建与安装的通用说明见 [`../README.md`](../README.md)。

## 行为说明

- **「收藏」菜单**：在线歌曲列表、我的列表、下载列表的右键菜单中，位于「添加到...」上方；点击直接把歌曲加入「我的收藏」（内置固定列表，id `love`），主进程按歌曲 id 去重，重复添加无副作用。
- **原有功能不变**：「添加到...」菜单仍弹出列表选择框，行为与未安装插件时完全一致；插件不创建任何歌单。
- **卸载 / 禁用**：宿主自动撤销注册，「收藏」菜单项随之隐藏。
- 与 `sync-favorites` 插件相互独立、无依赖。

## 实现要点

- 通过宿主 `api.setDefaultFavoriteHandler` 注册「收藏」直加处理器（`src/plugins/defaultFavorite.ts` 注册表 + 响应式显隐；插件卸载/禁用时经 `disposeApi` 自动撤销，菜单项隐藏）。
- 菜单入口在 `src/renderer` 的三处 `useMenu.js`（OnlineList / MusicList / Download）中按 `hasDefaultFavoriteHandler` 动态插入，位于「添加到...（addTo）」上方，文案复用现有 i18n key `list__collect`。
- 歌曲写入走宿主收藏数据桥 `window.lx.plugins.listData` 的 `addMusics('love', ...)`（见 `src/plugins/renderer.ts` 的 `listDataBridge`），最终经 store action 写入 SQLite。
- 零第三方依赖，产物仍是单个 `.lxplugin` 文件。

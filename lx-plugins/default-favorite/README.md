# default-favorite（默认收藏 / 我的喜欢）

安装后在客户端「我的列表」创建（或复用已有的）**「我的喜欢」**列表，并接管客户端所有「收藏」按钮：点击收藏默认把歌曲直接加入「我的喜欢」，**不再弹窗选择列表名称**。

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

- **列表创建规则**：优先按固定 id `mylike` 查找，其次按名称「我的喜欢」查找——**已存在就直接复用**，不重复创建；都不存在才新建。
- **收藏接管范围**：在线歌曲列表（单曲/多选）、我的列表、下载列表、播放栏、播放详情页的收藏入口全部生效；每次点击都会先确保「我的喜欢」存在再添加，主进程按歌曲 id 去重，重复收藏无副作用。
- **卸载 / 禁用**：宿主自动撤销接管，客户端恢复原来的「弹窗选择列表」行为；**「我的喜欢」列表及其内容不会被删除**。
- 与 `sync-favorites` 插件相互独立、无依赖；「我的喜欢」属于「我的列表（歌单）」，如需跨设备备份可另行搭配任意同步/备份方案。

## 实现要点

- 通过宿主 `api.setDefaultFavoriteHandler` 注册收藏处理器（`src/plugins/defaultFavorite.ts` 注册表；插件卸载/禁用时经 `disposeApi` 自动撤销）。
- 列表读写走宿主收藏数据桥 `window.lx.plugins.listData`（`getUserLists` / `createUserList` / `addMusics`，见 `src/plugins/renderer.ts` 的 `listDataBridge`），歌曲最终经 store action 写入 SQLite。
- 零第三方依赖，产物仍是单个 `.lxplugin` 文件。

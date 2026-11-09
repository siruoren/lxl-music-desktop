/**
 * default-favorite —— 默认收藏。
 *
 * 功能：
 *   1. 安装/启用后，客户端在歌曲右键菜单「添加到...」上方显示「收藏」菜单项。
 *   2. 点击「收藏」把歌曲（单曲或多选）直接加入内置「我的收藏」列表（固定 id `love`），
 *      不弹窗、不创建任何新歌单。
 *      原有「添加到...」菜单与弹窗逻辑完全不变。
 *   3. 卸载/禁用插件：宿主自动撤销注册，「收藏」菜单项随之隐藏。
 *
 * 依赖的宿主能力（src/plugins）：
 *   - api.setDefaultFavoriteHandler：「收藏」直加处理器注册（卸载时自动撤销）
 *   - window.lx.plugins.listData：收藏数据桥（addMusics，主进程按歌曲 id 去重）
 *
 * 入口以 CommonJS 导出：
 *   module.exports = { setup, uninstall }
 */
'use strict'

/** 内置「我的收藏」列表 id（客户端固定内置列表，无需创建） */
const LOVE_LIST_ID = 'love'

module.exports = {
  setup(api) {
    const bridge = api.app && api.app.plugins && api.app.plugins.listData
    if (!bridge) throw new Error('宿主未提供收藏数据桥（listData），请升级到含插件系统的客户端版本')
    if (typeof api.setDefaultFavoriteHandler !== 'function') {
      throw new Error('宿主未提供「收藏」直加注册能力（setDefaultFavoriteHandler），请升级客户端版本')
    }

    // 注册「收藏」直加处理器：点击后把歌曲直接加入内置「我的收藏」列表。
    // 主进程按歌曲 id 去重，重复添加无副作用。
    api.setDefaultFavoriteHandler((musicInfos) => {
      Promise.resolve()
        .then(() => bridge.addMusics(LOVE_LIST_ID, musicInfos))
        .catch(err => api.logger.error('default-favorite 添加到「我的收藏」失败：', err))
    })
  },

  /** 卸载回调：宿主会先调用本函数再撤销 api 上注册的资源（含「收藏」菜单项），无需清理 */
  uninstall() {},
}

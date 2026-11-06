/**
 * default-favorite —— 默认收藏（我的喜欢）。
 *
 * 功能：
 *   1. 安装/启用后，确保客户端「我的列表」中存在名为「我的喜欢」的列表：
 *      - 已存在同名或同 id（mylike）的列表 → 直接复用，不重复创建；
 *      - 不存在 → 以固定 id `mylike` 创建。
 *   2. 注册「喜欢」处理器（api.setDefaultFavoriteHandler）：
 *      客户端在歌曲右键菜单「收藏」上方显示「喜欢」菜单项，点击后把歌曲
 *      （单曲或多选）直接加入「我的喜欢」，不弹窗。
 *      原有「收藏」菜单与弹窗逻辑完全不变。
 *   3. 卸载/禁用插件：宿主自动撤销注册，「喜欢」菜单项随之隐藏；
 *      「我的喜欢」列表及其歌曲**不会被删除**。
 *
 * 依赖的宿主能力（src/plugins）：
 *   - api.setDefaultFavoriteHandler：「喜欢」菜单处理器注册（卸载时自动撤销）
 *   - window.lx.plugins.listData：收藏数据桥（getUserLists / createUserList / addMusics）
 *
 * 入口以 CommonJS 导出：
 *   module.exports = { setup, uninstall }
 */
'use strict'

/** 「我的喜欢」列表的固定 id */
const LIKE_LIST_ID = 'mylike'
/** 「我的喜欢」列表名称（按名称匹配已存在的列表，实现"已存在则复用"） */
const LIKE_LIST_NAME = '我的喜欢'

/**
 * 确保「我的喜欢」列表存在，返回其列表 id。
 * 优先按固定 id 匹配，其次按名称匹配（复用用户已创建的同名列表），
 * 都不存在时以固定 id 新建。
 */
async function ensureLikeList(bridge) {
  const lists = await bridge.getUserLists()
  const exists = lists.find(l => l.id === LIKE_LIST_ID) || lists.find(l => l.name === LIKE_LIST_NAME)
  if (exists) return exists.id
  await bridge.createUserList({ id: LIKE_LIST_ID, name: LIKE_LIST_NAME })
  return LIKE_LIST_ID
}

module.exports = {
  setup(api) {
    const bridge = api.app && api.app.plugins && api.app.plugins.listData
    if (!bridge) throw new Error('宿主未提供收藏数据桥（listData），请升级到含插件系统的客户端版本')
    if (typeof api.setDefaultFavoriteHandler !== 'function') {
      throw new Error('宿主未提供「喜欢」菜单注册能力（setDefaultFavoriteHandler），请升级客户端版本')
    }

    // 注册「喜欢」菜单处理器：点击后先确保「我的喜欢」存在（复用已有列表），再把歌曲加进去。
    // 每次都重新确保，用户中途删除列表也能自愈；主进程按歌曲 id 去重，重复添加无副作用。
    api.setDefaultFavoriteHandler((musicInfos) => {
      Promise.resolve()
        .then(() => ensureLikeList(bridge))
        .then(listId => bridge.addMusics(listId, musicInfos))
        .catch(err => api.logger.error('default-favorite 添加到「我的喜欢」失败：', err))
    })

    // 安装/启用后立即确保「我的喜欢」列表存在（幂等，已存在则复用）
    Promise.resolve()
      .then(() => ensureLikeList(bridge))
      .catch(err => api.logger.error('default-favorite 创建「我的喜欢」列表失败：', err))
  },

  /**
   * 卸载回调：宿主会先调用本函数再撤销 api 上注册的资源（含「喜欢」菜单处理器）。
   * 按需求，卸载插件**不删除**「我的喜欢」列表及其内容，因此这里无需任何清理。
   */
  uninstall() {},
}

/**
 * cached-music —— 缓存音乐列表（离线化播放）。
 *
 * 功能：
 *   1. 安装/启用后，在「我的列表」最上方创建名为「缓存列表」的列表：
 *      - 已存在同名或同 id（cached）的列表 → 直接复用，并移到所有列表最上面；
 *      - 不存在 → 以固定 id `cached` 创建在所有列表最上面（position: 0）。
 *   2. 列表内容 = 所有「已缓存完成」的歌曲。基于软件自身的缓存机制：
 *      在线歌曲完整播放结束后，音频已被软件缓存（资源缓存 + 播放地址缓存），
 *      此时登记为已缓存完成；软件缓存状态变化（缓存完成 / 设置中清理缓存）
 *      时自动通知本插件（api.setCachedMusicUpdateHandler），同步「缓存列表」。
 *   3. 可在插件设置面板配置定时更新（定时全量核对登记表与列表内容），
 *      也可手动「立即同步」。
 *   4. 播放「缓存列表」或其中歌曲时，由软件原有机制自动优先使用已缓存内容
 *      （播放地址命中地址缓存、音频命中资源缓存），无需请求网络，离线可播。
 *   5. 卸载/禁用插件：宿主自动撤销事件注册与定时器；同时移除「缓存列表」的列表名
 *      （已缓存歌曲登记保留，重新安装插件后列表会重建并自动恢复内容）。
 *      注意：用户手动创建的其它列表不受影响。
 *
 * 依赖的宿主能力（src/plugins）：
 *   - api.setCachedMusicUpdateHandler：缓存状态变化通知（卸载时自动撤销）
 *   - window.lx.plugins.musicCache：音乐缓存桥（list 读取已缓存歌曲登记表）
 *   - window.lx.plugins.listData：列表数据桥（getUserLists / createUserList /
 *     getListMusics / overwriteListMusics / moveUserList / removeUserList）
 *
 * 入口以 CommonJS 导出：
 *   module.exports = { setup, onConfigChange, onSettingsAction, uninstall }
 */
'use strict'

/** 「缓存列表」的固定 id */
const CACHE_LIST_ID = 'cached'
/** 「缓存列表」名称（按名称匹配已存在的列表，实现"已存在则复用"） */
const CACHE_LIST_NAME = '缓存列表'

/** 定时更新间隔默认值（分钟） */
const DEFAULT_INTERVAL_MINUTES = 30

/** 缓存完成事件防抖（连续播放多首歌时合并为一次同步） */
const SYNC_DEBOUNCE_MS = 3000

/** @type {{ listData: any, musicCache: any, logger: any, getConfig: Function, setInterval: Function, clearInterval: Function, setCachedMusicUpdateHandler: Function } | null} */
let host = null
/** 定时同步的定时器句柄 */
let syncTimer = null
/** 防抖定时器句柄 */
let debounceTimer = null
/** 是否正在同步（防止重入） */
let syncing = false
/** 同步期间又有新的更新请求时置位，同步结束后补一次 */
let pendingSync = false

function getConfig() {
  return (host && host.getConfig) ? host.getConfig() : {}
}

/**
 * 确保「缓存列表」存在，返回其列表 id。
 * 优先按固定 id 匹配，其次按名称匹配（复用用户已创建的同名列表），
 * 都不存在时以固定 id 新建并置于所有列表最上面（position: 0）。
 */
async function ensureCacheList() {
  const lists = await host.listData.getUserLists()
  const exists = lists.find(l => l.id === CACHE_LIST_ID) || lists.find(l => l.name === CACHE_LIST_NAME)
  if (exists) return exists.id
  await host.listData.createUserList({ id: CACHE_LIST_ID, name: CACHE_LIST_NAME, position: 0 })
  return CACHE_LIST_ID
}

/**
 * 把「已缓存歌曲」登记表同步到「缓存列表」：
 * 每次同步都先确保列表存在（用户中途删除列表也能自愈），
 * 再与列表当前内容按 id 对比，有变化才整体写回。
 */
async function sync() {
  if (syncing) {
    pendingSync = true
    return
  }
  syncing = true
  try {
    const listId = await ensureCacheList()
    const cachedSongs = await host.musicCache.list()
    const target = cachedSongs.map(s => s.musicInfo).filter(Boolean)
    const current = await host.listData.getListMusics(listId)
    const isSame = Array.isArray(current) && current.length === target.length &&
      current.every((m, i) => m && m.id === target[i].id)
    if (!isSame) await host.listData.overwriteListMusics(listId, target)
  } catch (err) {
    if (host && host.logger) host.logger.error('cached-music 同步「缓存列表」失败：', err)
  } finally {
    syncing = false
    if (pendingSync) {
      pendingSync = false
      host.setImmediate?.(sync)
    }
  }
}

/** 防抖触发同步（缓存完成事件可能短时间连续多次） */
function scheduleSync() {
  if (debounceTimer) host.clearTimeout(debounceTimer)
  debounceTimer = host.setTimeout(() => {
    debounceTimer = null
    void sync()
  }, SYNC_DEBOUNCE_MS)
}

/**
 * 确保「缓存列表」位于「我的列表」最上面（position 0）。
 * 旧版本安装时建在末尾的列表也会被移到顶部；每次启动时执行一次，
 * 不在每次同步时强制置顶，避免覆盖用户对列表顺序的手动调整。
 */
async function ensureTop() {
  const lists = await host.listData.getUserLists()
  const target = lists.find(l => l.id === CACHE_LIST_ID) || lists.find(l => l.name === CACHE_LIST_NAME)
  if (!target) return
  if (lists[0]?.id == target.id) return
  // moveUserList 为新版客户端新增接口；旧客户端缺少该接口时仅提示，不影响其它功能
  if (typeof host.listData.moveUserList != 'function') {
    if (host.logger) host.logger.warn('cached-music：当前客户端版本不含列表置顶接口，请更新客户端')
    return
  }
  await host.listData.moveUserList(target.id, 0)
}

/** 按当前配置重建定时更新（先清掉旧定时器） */
function setupTimer() {
  if (!host) return
  if (syncTimer) {
    host.clearInterval(syncTimer)
    syncTimer = null
  }
  const config = getConfig()
  if (config.autoUpdate === false) return
  const minutes = Math.max(1, parseInt(config.intervalMinutes, 10) || DEFAULT_INTERVAL_MINUTES)
  syncTimer = host.setInterval(() => {
    void sync()
  }, minutes * 60 * 1000)
}

module.exports = {
  setup(api) {
    const listData = api.app && api.app.plugins && api.app.plugins.listData
    const musicCache = api.app && api.app.plugins && api.app.plugins.musicCache
    if (!listData || !musicCache) {
      throw new Error('宿主未提供列表数据桥（listData）或音乐缓存桥（musicCache），请升级到含插件系统的客户端版本')
    }
    if (typeof api.setCachedMusicUpdateHandler !== 'function') {
      throw new Error('宿主未提供「缓存更新」注册能力（setCachedMusicUpdateHandler），请升级客户端版本')
    }

    host = {
      listData,
      musicCache,
      logger: api.logger,
      getConfig: () => api.getConfig(),
      setInterval: (fn, ms) => api.setInterval(fn, ms),
      clearInterval: (h) => api.clearInterval(h),
      setTimeout: (fn, ms) => api.setTimeout(fn, ms),
      clearTimeout: (h) => api.clearTimeout(h),
      setImmediate: (fn) => api.setTimeout(fn, 0),
    }

    // 缓存状态变化（歌曲缓存完成 / 设置中清理缓存）→ 防抖同步列表
    api.setCachedMusicUpdateHandler(scheduleSync)

    // 设置面板：定时更新开关 / 间隔 / 立即同步
    api.registerSettings({
      title: '缓存音乐列表',
      fields: [
        {
          type: 'switch',
          key: 'autoUpdate',
          label: '自动更新缓存列表',
          tip: '歌曲缓存完成或清理缓存后自动同步「缓存列表」',
          default: true,
        },
        {
          type: 'number',
          key: 'intervalMinutes',
          label: '定时更新间隔（分钟）',
          tip: '定时全量核对已缓存歌曲与「缓存列表」内容，最小 1 分钟',
          default: DEFAULT_INTERVAL_MINUTES,
        },
        {
          type: 'info',
          text: () => {
            const config = getConfig()
            return config.autoUpdate === false ? '定时更新已关闭' : '「缓存列表」将保持与软件已缓存歌曲一致'
          },
        },
        {
          type: 'buttons',
          buttons: [
            { label: '立即同步', action: 'syncNow' },
          ],
        },
      ],
    })

    // 安装/启用后：确保列表存在并同步一次，启动定时更新；
    // 置顶独立执行（失败不影响同步与定时器），每次启动都会校正一次
    Promise.resolve()
      .then(() => sync())
      .then(() => setupTimer())
      .catch(err => api.logger.error('cached-music 初始化失败：', err))
    Promise.resolve()
      .then(() => ensureTop())
      .catch(err => api.logger.warn('cached-music 置顶「缓存列表」失败：', err))
  },

  /** 配置变更：重建定时更新 */
  onConfigChange() {
    setupTimer()
  },

  /** 设置面板动作：立即同步 */
  onSettingsAction(action) {
    if (action === 'syncNow') void sync()
  },

  /**
   * 卸载回调：宿主会先调用本函数再撤销 api 上注册的资源（含缓存更新监听与定时器）。
   * 按需求：卸载插件只移除「缓存列表」的列表名（列表条目本身），
   * 已缓存歌曲登记保留——重新安装插件后列表重建并自动恢复内容。
   * 用户手动创建的其它列表不受影响。
   */
  async uninstall() {
    try {
      if (!host) return
      const lists = await host.listData.getUserLists()
      const target = lists.find(l => l.id === CACHE_LIST_ID) || lists.find(l => l.name === CACHE_LIST_NAME)
      if (target) await host.listData.removeUserList(target.id)
    } catch (err) {
      if (host && host.logger) host.logger.error('cached-music 卸载清理「缓存列表」失败：', err)
    } finally {
      host = null
      syncTimer = null
      debounceTimer = null
    }
  },
}

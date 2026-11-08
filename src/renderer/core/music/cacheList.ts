/**
 * 已缓存歌曲登记表（基于软件自身的缓存机制）。
 *
 * 软件在线播放歌曲时，音频由原缓存机制（资源缓存 + 播放地址缓存）自动缓存，
 * 无需额外下载。这里只负责「登记」：
 *  1. 在线歌曲完整播放结束（音频已完整进入资源缓存）时登记为「已缓存完成」，
 *     同时记录本次播放使用的音频地址（用于离线时的地址回退，见 getFallbackMusicUrl），
 *     并通知插件扩展点（src/plugins/cacheMusic，供 cached-music 插件同步「缓存列表」）。
 *  2. 用户在设置中清理资源缓存后清空登记表，同样通知插件（列表随之清空）。
 *  3. 「缓存列表」内可右键「移除缓存」移除指定歌曲的登记（removeCachedMusic）。
 *  4. 登记表持久化到数据文件（DATA_KEYS.musicCacheSongs），重启不丢失。
 *
 * 离线播放：已播放过的歌曲再次播放时，播放地址命中地址缓存、音频命中资源缓存，
 * 软件原有机制即自动完成「优先播放已缓存的音乐」；当地址缓存缺失/过期需要联网取地址
 * 而网络超时（播放层 2 秒）时，用 getFallbackMusicUrl 返回登记的地址——
 * 该地址对应的音频已在资源缓存中，Chromium 会直接从缓存读取，实现离线播放。
 */
import { handleCachedMusicUpdate } from '../../../plugins/cacheMusic'
import { getMusicCacheSongs, saveMusicCacheSongs } from '@renderer/utils/ipc'

/** 「缓存列表」的固定 id（由 cached-music 插件以此 id 创建/复用；右键「移除缓存」仅在该列表内显示） */
export const CACHE_LIST_ID = 'cached'

export interface MusicCacheSong {
  /** 歌曲 id（LX.Music.MusicInfo.id，形如 kw_xxx） */
  id: string
  /** 歌曲信息（供插件展示/同步到列表） */
  musicInfo: LX.Music.MusicInfoOnline
  /** 缓存完成时间戳 */
  cachedAt: number
  /** 最近一次完整播放使用的音频地址（音频已随该地址进入资源缓存；离线回退用） */
  url: string
}

const songs = new Map<string, MusicCacheSong>()
let initing: Promise<void> | null = null

/** 当前正在播放的歌曲使用的音频地址（id → url），播放结束登记时取用 */
const currentUrls = new Map<string, string>()

/** 懒初始化：从数据文件加载登记表 */
async function ensureInit(): Promise<void> {
  initing ??= getMusicCacheSongs().then((list) => {
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && typeof item.id === 'string' && item.musicInfo) songs.set(item.id, item)
      }
    }
  }).catch((err) => {
    console.error('[musicCache] 加载已缓存歌曲登记表失败：', err)
  })
  await initing
}

function persist(): void {
  saveMusicCacheSongs(Array.from(songs.values()))
}

/**
 * 记录某歌曲本次播放使用的音频地址（播放地址解析成功后由播放层调用）。
 * 播放结束登记「已缓存完成」时取该地址写入登记表。
 */
export const setCurrentMusicUrl = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem | null, url: string): void => {
  if (!musicInfo || 'progress' in musicInfo || musicInfo.source == 'local') return
  currentUrls.set(musicInfo.id, url)
}

/**
 * 登记一首已缓存完成的歌曲（在线歌曲完整播放结束时由播放器调用）。
 * 按 id 幂等；重复登记不重复通知插件（地址有变化时更新地址并通知）。
 */
export const addCachedMusic = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem | null): Promise<void> => {
  if (!musicInfo || 'progress' in musicInfo || musicInfo.source == 'local') return
  await ensureInit()
  const url = currentUrls.get(musicInfo.id) ?? ''
  const existing = songs.get(musicInfo.id)
  if (existing) {
    // 已登记过：地址变化时更新（下次离线回退用新地址），否则无需处理
    if (url && existing.url != url) {
      existing.url = url
      persist()
    }
    return
  }
  songs.set(musicInfo.id, {
    id: musicInfo.id,
    musicInfo,
    cachedAt: Date.now(),
    url,
  })
  currentUrls.delete(musicInfo.id)
  persist()
  handleCachedMusicUpdate()
}

/**
 * 移除指定歌曲的缓存登记（「缓存列表」右键「移除缓存」时调用）：
 * 删除登记并通知插件同步列表；地址缓存随之失效（下次播放重新取地址）。
 */
export const removeCachedMusic = async(musicInfo: LX.Music.MusicInfo): Promise<void> => {
  await ensureInit()
  if (!songs.delete(musicInfo.id)) return
  currentUrls.delete(musicInfo.id)
  persist()
  handleCachedMusicUpdate()
}

/**
 * 清空登记表（用户在设置中清理资源缓存后调用：音频已随缓存被清理，
 * 登记表同步清空并通知插件更新「缓存列表」）。
 */
export const clearCachedMusics = async(): Promise<void> => {
  await ensureInit()
  if (!songs.size) return
  songs.clear()
  currentUrls.clear()
  persist()
  handleCachedMusicUpdate()
}

/**
 * 离线回退：获取某歌曲登记的音频地址（该地址对应的音频已完整进入资源缓存）。
 * 播放层在取播放地址网络超时/失败时用它继续播放，实现离线播放。
 * 无登记或未记录地址时返回 ''。
 */
export const getFallbackMusicUrl = async(musicInfo: LX.Music.MusicInfo): Promise<string> => {
  await ensureInit()
  return songs.get(musicInfo.id)?.url ?? ''
}

/** 获取全部已缓存歌曲（按缓存完成顺序），供插件同步「缓存列表」 */
export const getCachedMusics = async(): Promise<MusicCacheSong[]> => {
  await ensureInit()
  return Array.from(songs.values()).map(s => ({ ...s }))
}

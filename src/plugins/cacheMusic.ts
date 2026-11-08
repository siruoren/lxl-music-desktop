/**
 * 「缓存音乐」扩展点：软件缓存完成一首歌曲时的通知注册表。
 *
 * 软件在在线播放时会自动把音频缓存为本地文件（src/renderer/core/music/cache.ts），
 * 每当一首歌曲缓存完成，宿主调用 handleCachedMusicUpdate 通知所有注册了
 * 处理器的插件（如 cached-music 插件同步「缓存列表」）。
 *
 * 处理器按插件 id 隔离：插件卸载/禁用时宿主自动撤销（disposeApi）。
 */
const handlers = new Map<string, () => void>()

/** 注册/覆盖某插件的「缓存更新」处理器；传 null 撤销该插件的处理器 */
export function setCachedMusicUpdateHandler(pluginId: string, handler: (() => void) | null): void {
  if (handler) handlers.set(pluginId, handler)
  else handlers.delete(pluginId)
}

/** 通知所有插件：有歌曲缓存完成（单个处理器异常不影响其它插件） */
export function handleCachedMusicUpdate(): void {
  for (const handler of handlers.values()) {
    try {
      handler()
    } catch (err) {
      console.error('[plugin] 「缓存更新」处理器执行失败：', err)
    }
  }
}

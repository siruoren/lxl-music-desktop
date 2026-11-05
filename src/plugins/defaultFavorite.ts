/**
 * 「默认收藏」扩展点：renderer 端收藏按钮的接管注册表。
 *
 * 插件（如 default-favorite）通过 api.setDefaultFavoriteHandler 注册处理器；
 * 客户端所有「收藏」入口在弹窗前先调用 handleDefaultFavorite：
 *  - 有插件接管 → 歌曲直接交给插件处理（默认加入「我的喜欢」，不弹窗），返回 true；
 *  - 无插件接管 → 返回 false，客户端按原逻辑弹出列表选择框。
 *
 * 处理器按插件 id 隔离：插件卸载/禁用时宿主自动撤销（disposeApi），
 * 「我的喜欢」列表本身由插件负责创建，卸载插件不会删除列表及其内容。
 */
import type { DefaultFavoriteHandler } from './types'

const handlers = new Map<string, DefaultFavoriteHandler>()

/** 注册/覆盖某插件的默认收藏处理器；传 null 撤销该插件的处理器 */
export function setDefaultFavoriteHandler(pluginId: string, handler: DefaultFavoriteHandler | null): void {
  if (handler) handlers.set(pluginId, handler)
  else handlers.delete(pluginId)
}

/**
 * 把歌曲交给默认收藏处理器（若有插件接管）
 * @returns true=已接管（调用方不应再弹窗）；false=未接管
 */
export function handleDefaultFavorite(musicInfos: LX.Music.MusicInfo[]): boolean {
  const handler = handlers.values().next().value
  if (!handler) return false
  try {
    handler(musicInfos ?? [])
  } catch (err) {
    console.error('[plugin] 默认收藏处理器执行失败：', err)
  }
  return true
}

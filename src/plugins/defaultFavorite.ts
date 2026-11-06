/**
 * 「默认收藏」扩展点：客户端「喜欢」入口的注册表。
 *
 * 插件（如 default-favorite）通过 api.setDefaultFavoriteHandler 注册处理器；
 * 客户端在歌曲右键菜单「收藏」上方显示「喜欢」菜单项（仅当有插件注册时显示），
 * 点击后把歌曲（单曲或多选）直接交给插件处理（默认加入「我的喜欢」，不弹窗）。
 * 原有「收藏」菜单与弹窗逻辑完全不受影响。
 *
 * 处理器按插件 id 隔离：插件卸载/禁用时宿主自动撤销（disposeApi），
 * 「我的喜欢」列表本身由插件负责创建，卸载插件不会删除列表及其内容。
 */
import { computed, ref } from '@common/utils/vueTools'
import type { DefaultFavoriteHandler } from './types'

const handlers = new Map<string, DefaultFavoriteHandler>()
const handlerCount = ref(handlers.size)

/** 是否有插件注册了「喜欢」处理器（响应式，用于右键菜单显隐） */
export const hasDefaultFavoriteHandler = computed(() => handlerCount.value > 0)

/** 注册/覆盖某插件的「喜欢」处理器；传 null 撤销该插件的处理器 */
export function setDefaultFavoriteHandler(pluginId: string, handler: DefaultFavoriteHandler | null): void {
  if (handler) handlers.set(pluginId, handler)
  else handlers.delete(pluginId)
  handlerCount.value = handlers.size
}

/**
 * 把歌曲交给「喜欢」处理器（若有插件注册）
 * @returns true=已交给插件处理；false=未注册处理器（调用方自行处理）
 */
export function handleDefaultFavorite(musicInfos: LX.Music.MusicInfo[]): boolean {
  const handler = handlers.values().next().value
  if (!handler) return false
  try {
    handler(musicInfos ?? [])
  } catch (err) {
    console.error('[plugin] 「喜欢」处理器执行失败：', err)
  }
  return true
}

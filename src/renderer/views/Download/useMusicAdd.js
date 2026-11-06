import { ref, shallowRef, nextTick, markRaw } from '@common/utils/vueTools'
import { handleDefaultFavorite } from '@root/plugins/defaultFavorite'

export default ({ selectedList, list }) => {
  const isShowListAdd = ref(false)
  const isShowListAddMultiple = ref(false)
  const selectedAddMusicInfo = shallowRef(null)

  const handleShowMusicAddModal = (index, single) => {
    if (selectedList.value.length && !single) {
      isShowListAddMultiple.value = true
    } else {
      selectedAddMusicInfo.value = markRaw(list.value[index].metadata.musicInfo)
      nextTick(() => {
        isShowListAdd.value = true
      })
    }
  }

  // 「喜欢」菜单（由「默认收藏」插件注册显示）：直接添加到「我的喜欢」，不弹窗
  const handleLikeMusic = (index, single) => {
    if (selectedList.value.length && !single) {
      // 下载项为带 progress 的包装对象，宿主 addMusics 内部会解包
      handleDefaultFavorite(selectedList.value)
      selectedList.value = []
    } else {
      handleDefaultFavorite([list.value[index].metadata.musicInfo])
    }
  }

  return {
    isShowListAdd,
    isShowListAddMultiple,
    selectedAddMusicInfo,
    handleShowMusicAddModal,
    handleLikeMusic,
  }
}

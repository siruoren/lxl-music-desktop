import { ref, shallowRef, nextTick, markRaw } from '@common/utils/vueTools'
import { handleDefaultFavorite } from '@root/plugins/defaultFavorite'

export default ({ selectedList, list }) => {
  const isShowListAdd = ref(false)
  const isShowListAddMultiple = ref(false)
  const selectedAddMusicInfo = shallowRef(null)

  const handleShowMusicAddModal = (index, single) => {
    let musicInfos
    let isMultiple = false
    if (selectedList.value.length && !single) {
      musicInfos = selectedList.value
      isMultiple = true
    } else {
      musicInfos = [list.value[index].metadata.musicInfo]
    }
    // 安装「默认收藏」插件后直接添加到「我的喜欢」，不再弹窗选择列表
    if (handleDefaultFavorite(musicInfos)) {
      if (isMultiple) selectedList.value = []
      return
    }
    if (isMultiple) {
      isShowListAddMultiple.value = true
    } else {
      selectedAddMusicInfo.value = markRaw(list.value[index].metadata.musicInfo)
      nextTick(() => {
        isShowListAdd.value = true
      })
    }
  }

  return {
    isShowListAdd,
    isShowListAddMultiple,
    selectedAddMusicInfo,
    handleShowMusicAddModal,
  }
}

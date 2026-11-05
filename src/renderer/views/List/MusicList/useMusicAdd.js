import { ref, nextTick } from '@common/utils/vueTools'
import { handleDefaultFavorite } from '@root/plugins/defaultFavorite'

export default ({ selectedList, list }) => {
  const isShowListAdd = ref(false)
  const isMove = ref(false)
  const isMoveMultiple = ref(false)
  const isShowListAddMultiple = ref(false)
  const selectedAddMusicInfo = ref(null)

  const handleShowMusicAddModal = (index, single) => {
    let musicInfos
    let isMultiple = false
    if (selectedList.value.length && !single) {
      musicInfos = selectedList.value
      isMultiple = true
    } else {
      musicInfos = [list.value[index]]
    }
    // 安装「默认收藏」插件后直接添加到「我的喜欢」，不再弹窗选择列表
    if (handleDefaultFavorite(musicInfos)) {
      if (isMultiple) selectedList.value = []
      return
    }
    if (isMultiple) {
      isMoveMultiple.value = false
      isShowListAddMultiple.value = true
    } else {
      isMove.value = false
      selectedAddMusicInfo.value = list.value[index]
      nextTick(() => {
        isShowListAdd.value = true
      })
    }
  }

  const handleShowMusicMoveModal = (index, single) => {
    if (selectedList.value.length && !single) {
      isMoveMultiple.value = true
      isShowListAddMultiple.value = true
    } else {
      isMove.value = true
      selectedAddMusicInfo.value = list.value[index]
      nextTick(() => {
        isShowListAdd.value = true
      })
    }
  }

  return {
    isShowListAdd,
    isMove,
    isMoveMultiple,
    isShowListAddMultiple,
    selectedAddMusicInfo,
    handleShowMusicAddModal,
    handleShowMusicMoveModal,
  }
}

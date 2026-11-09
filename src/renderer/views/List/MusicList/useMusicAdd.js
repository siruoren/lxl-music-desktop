import { ref, nextTick } from '@common/utils/vueTools'
import { handleDefaultFavorite } from '@root/plugins/defaultFavorite'

export default ({ selectedList, list }) => {
  const isShowListAdd = ref(false)
  const isMove = ref(false)
  const isMoveMultiple = ref(false)
  const isShowListAddMultiple = ref(false)
  const selectedAddMusicInfo = ref(null)

  const handleShowMusicAddModal = (index, single) => {
    if (selectedList.value.length && !single) {
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

  // 「收藏」直加菜单（由「默认收藏」插件注册显示）：直接添加到「我的收藏」，不弹窗
  const handleLikeMusic = (index, single) => {
    if (selectedList.value.length && !single) {
      handleDefaultFavorite(selectedList.value)
      selectedList.value = []
    } else {
      handleDefaultFavorite([list.value[index]])
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
    handleLikeMusic,
  }
}

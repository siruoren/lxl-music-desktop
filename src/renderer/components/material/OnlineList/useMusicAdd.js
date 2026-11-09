import { ref, nextTick } from '@common/utils/vueTools'
import { handleDefaultFavorite } from '@root/plugins/defaultFavorite'

export default ({ selectedList, props }) => {
  const isShowListAdd = ref(false)
  const isShowListAddMultiple = ref(false)
  const selectedAddMusicInfo = ref(null)

  const handleShowMusicAddModal = (index, single) => {
    if (selectedList.value.length && !single) {
      isShowListAddMultiple.value = true
    } else {
      selectedAddMusicInfo.value = props.list[index]
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
      handleDefaultFavorite([props.list[index]])
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

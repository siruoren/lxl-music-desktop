import { ref, nextTick } from '@common/utils/vueTools'
import { handleDefaultFavorite } from '@root/plugins/defaultFavorite'

export default ({ selectedList, props }) => {
  const isShowListAdd = ref(false)
  const isShowListAddMultiple = ref(false)
  const selectedAddMusicInfo = ref(null)

  const handleShowMusicAddModal = (index, single) => {
    let musicInfos
    let isMultiple = false
    if (selectedList.value.length && !single) {
      musicInfos = selectedList.value
      isMultiple = true
    } else {
      musicInfos = [props.list[index]]
    }
    // 安装「默认收藏」插件后直接添加到「我的喜欢」，不再弹窗选择列表
    if (handleDefaultFavorite(musicInfos)) {
      if (isMultiple) selectedList.value = []
      return
    }
    if (isMultiple) {
      isShowListAddMultiple.value = true
    } else {
      selectedAddMusicInfo.value = props.list[index]
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

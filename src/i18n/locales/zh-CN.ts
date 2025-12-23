export default {
  // Header
  header: {
    subtitle: '快速查看并管理当前标签页的存储',
    loading: '加载中…',
    switchLang: '切换语言',
  },

  // Settings
  settings: {
    copyMode: '复制模式',
    copyModeJs: 'JS',
    copyModeValue: '值',
    copyModeTooltip: 'JS 模式复制为 storage.setItem(key, value)',
    clearAll: '清除全部',
    clearing: '清除中…',
    sync: '同步',
    syncing: '…',
    syncTooltip: '读取指定页面的 storage 并同步到当前页面',
    addUrlPlaceholder: '添加新的同步 URL',
    add: '添加',
    adding: '…',
    noSavedUrl: '暂无保存的 URL',
  },

  // Table / ContentList
  table: {
    key: '键',
    value: '值',
    actions: '操作',
    keyPlaceholder: '键名',
    valuePlaceholder: '值',
    searchPlaceholder: '搜索键名...',
    add: '添加',
    adding: '…',
    noMatch: '没有匹配的键名',
    noData: '暂无数据',
    help: '点击选中 · 再点编辑 · ↑↓ 导航 · ⌘C 复制',
  },

  // Dialog
  dialog: {
    confirm: '确认',
    cancel: '取消',
    close: '关闭',
    clear: '清除',
    clearTitle: '确认清除全部？',
    clearDescription: '将清空当前页面的 localStorage 与 sessionStorage，此操作不可恢复',
    deleteTitle: '确认删除 {name}？',
    deleteDefaultTitle: '确认删除？',
    deleteDescription: '删除后不可恢复',
  },

  // Messages
  message: {
    // Status
    syncing: '正在同步...',
    clearingStatus: '正在清除...',

    // Success
    syncComplete: '同步完成',
    cleared: '已清除全部',
    configSaved: '配置已保存',
    configDeleted: '已删除配置',
    added: '已添加 {name}',
    updated: '已更新 {name}',
    deleted: '已删除 {name}',
    copiedJs: '已复制 {code}',
    copiedValue: '值已复制',

    // Error
    loadTimeout: '加载超时',
    envNotSupported: '当前环境不支持同步',
    envNotSupportedClear: '当前环境不支持清理',
    envNotSupportedSave: '当前环境不支持保存',
    envNotSupportedDelete: '当前环境不支持删除',
    invalidUrl: '请输入有效的 URL',
    tabNotFound: '未找到当前标签页',
    pageNotOpened: '无法打开指定页面',
    remoteDataNotFound: '未读取到远程数据',
    syncFailed: '同步失败，请检查 URL 或权限',
    clearFailed: '清除失败，请重试',
    saveFailed: '保存失败，请重试',
    deleteFailed: '删除失败，请重试',
    copyFailed: '复制失败，请重试',
    pageNotRecognized: '未识别当前页面',
    enterUrl: '请输入URL',
    urlExists: 'URL已存在',
    urlNotExists: 'URL不存在',
    selectUrlToDelete: '请选择要删除的URL',
    enterKeyName: '请输入键名',
    indexedDbNotSupported: '暂不支持删除 IndexedDB 数据',
  },
}

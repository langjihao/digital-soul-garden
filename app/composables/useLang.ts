const dict = {
  zh: {
    posts: '文章', tweets: '碎念', media: '媒体', about: '关于',
    signin: '登录', search: '搜索',
    latestPosts: '最新文章', latestTweets: '最近碎念',
    readPosts: '阅读文章', talkToTwin: '与孪生对话',
    minutes: '分钟阅读', allPosts: '全部文章', backToPosts: '返回文章列表',
    tagline: '一座被索引、可检索的数字花园。',
    taglinePre: '一座被索引、', taglineHi: '可检索', taglinePost: '的数字花园。',
    heroBody: '长文、碎念与媒体全部生长在同一座仓库里。内容即代码：git push 即发布，全站可检索，右下角可与懂我口吻的孪生对话。',
    twinTitle: '向我曾写下的一切提问。',
    twinBody: '孪生会基于花园里的每一篇文章、每一条碎念，用我的口吻流式回答。点击右下角的机器人图标。',
    footer: '公开构建 · 内容即代码 · 按 ⌘K 开始',
    tocTitle: '本页目录', published: '发布于', updated: '更新于',
    prevPost: '上一篇', nextPost: '下一篇', relatedPosts: '相关文章',
  },
  en: {
    posts: 'Posts', tweets: 'Notes', media: 'Media', about: 'About',
    signin: 'Sign in', search: 'Search',
    latestPosts: 'Latest posts', latestTweets: 'Recent notes',
    readPosts: 'Read posts', talkToTwin: 'Talk to the twin',
    minutes: 'min read', allPosts: 'All posts', backToPosts: 'Back to posts',
    tagline: 'An indexed, searchable digital garden.',
    taglinePre: 'An indexed, ', taglineHi: 'searchable', taglinePost: ' digital garden.',
    heroBody: 'Essays, notes and media all grow in one repo. Content as code: git push to publish, search everything, or chat with a twin that speaks in my voice.',
    twinTitle: 'Ask anything I have ever written.',
    twinBody: 'The twin answers in my voice via streaming RAG over every post and note in this garden. Click the bot icon at bottom right.',
    footer: 'Built in public · Content as code · Press ⌘K',
    tocTitle: 'On this page', published: 'Published', updated: 'Updated',
    prevPost: 'Previous', nextPost: 'Next', relatedPosts: 'Related posts',
  },
} as const

export type UiLang = keyof typeof dict

export function useLang() {
  const lang = useCookie<UiLang>('garden-lang', { default: () => 'zh' })
  const t = computed(() => dict[lang.value] ?? dict.zh)
  function toggle() {
    lang.value = lang.value === 'zh' ? 'en' : 'zh'
  }
  return { lang, t, toggle }
}

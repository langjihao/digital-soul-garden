export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "EN",
};

export const translations = {
  zh: {
    site: {
      title: "~/garden — 数字花园",
      description:
        "存放在 GitHub 私有仓库里的长文、短想法与媒体，统一索引、可被混合检索，并附带一个能与之对话的数字孪生。",
      brand: "~/garden",
    },
    nav: {
      posts: "文章",
      tweets: "碎念",
      media: "媒体",
      about: "关于",
    },
    footer: "公开构建 · 内容托管于 GitHub · 按 ⌘K 开始",
    common: {
      readPosts: "阅读文章",
      askTwin: "与孪生对话",
      cd: "cd",
      sourceOnGithub: "源码 · GitHub",
      goHome: "回到首页",
      tryAgain: "重试",
    },
    home: {
      whoami: "$ whoami",
      h1Pre: "一座被索引、可",
      h1Highlight: "检索",
      h1Post: "的数字花园。",
      intro:
        "所有内容都存放在一个 GitHub 私有仓库里。CI 流水线会自动摘要、向量化，并写入 Postgres。可以分区浏览、按",
      introKbd: "⌘K",
      introSearch: "全站检索，或在右下角与孪生对话。",
      recentPosts: "最新文章",
      latestTweets: "最近碎念",
      twinTitle: "向我曾写下的一切提问。",
      twinDesc:
        "孪生会基于花园里的每一篇文章、每一条碎念与每段语音笔记，用我的口吻通过 RAG 流式回答。点击右下角的机器人图标。",
      twinCmd: "$ ./digital_twin --rag",
    },
    posts: {
      cmd: "$ ls posts/",
      title: "文章",
      desc: "以 MDX 写作、推送到 GitHub，由 CI 摘要并索引。",
      descKbd: "⌘K",
      descTail: "背后的混合检索覆盖下方所有内容。",
    },
    tweets: {
      cmd: "$ git log --label tweet",
      title: "碎念",
      desc1: "每条碎念是一个被打上",
      label: "tweet",
      desc2: "标签的 GitHub Issue。使用 GitHub 登录即可评论或反应。",
    },
    media: {
      cmd: "$ open media/",
      title: "媒体",
      desc: "照片签到与短语音笔记。alt 文本与说明会与文章一同被索引，因此也会出现在混合检索结果里。",
    },
    about: {
      cmd: "$ cat about.md",
      title: "关于",
      p1: "这座花园是对平台化的有意反向：长文、碎念与媒体全部活在一个 GitHub 私有仓库里。CI 流水线 diff 新内容、用 LLM 摘要、向量化后写入 Postgres，摘要与向量并存。",
      p2Pre: "前端是跑在 Cloudflare Workers 上的",
      p2Tanstack: "TanStack Start",
      p2Mid: "，从同一个 Postgres 读数据。",
      p2Cmd: "⌘K",
      p2Tail:
        " 调起的命令面板做混合检索（BM25 + 余弦）。右下角的浮窗是一个 RAG agent，会先取 top-k 片段，再以我的口吻作答。",
      p3: "Phase 1（即此页）是带 mock 数据的静态外壳。Phase 2-4 将依次接入 GitHub、向量化流水线与流式 AI 对话。",
    },
    cmdk: {
      placeholder: "搜索文章、碎念，或向孪生提问…",
      empty: '没有匹配 "{q}" 的结果。试试主题或 slug。',
      groupAsk: "提问",
      groupNav: "导航",
      groupPosts: "文章",
      groupTweets: "碎念",
      askPrefix: "向孪生提问：",
      enter: "回车 ↵",
      home: "首页",
      footerLeft: "混合检索 · mock",
      footerRight: "↑ ↓ 选择 · ↵ 确定",
    },
    chat: {
      open: "打开与数字孪生的对话",
      greeting:
        "嗨——我是数字孪生。我读过这座花园里的一切：文章、碎念、语音笔记。问我任何问题，或者从 ⌘K 选个话题。",
      stub:
        "Phase 4 接入 RAG 后我会用自己的口吻在这里回答。当前还是静态外壳。",
      placeholder: "问我点什么…",
      send: "发送",
    },
    notFound: {
      title: "页面不存在",
      desc: "你要找的页面不存在，或者已经被移走了。",
    },
    error: {
      title: "页面加载失败",
      desc: "出了点小问题。可以重试，或回到首页。",
    },
    units: {
      readingTime: "分钟阅读",
      justNow: "刚刚",
      minutesAgo: "分钟前",
      hoursAgo: "小时前",
      daysAgo: "天前",
      issue: "issue",
    },
    locale: { switch: "Language" },
  },
  en: {
    site: {
      title: "~/garden — a digital garden",
      description:
        "Posts, tweets, and media from a private GitHub repo, indexed for hybrid search and a digital twin you can talk to.",
      brand: "~/garden",
    },
    nav: {
      posts: "posts",
      tweets: "tweets",
      media: "media",
      about: "about",
    },
    footer: "built in public · content lives in github · press ⌘K",
    common: {
      readPosts: "Read the posts",
      askTwin: "Ask the twin",
      cd: "cd",
      sourceOnGithub: "source on github",
      goHome: "Go home",
      tryAgain: "Try again",
    },
    home: {
      whoami: "$ whoami",
      h1Pre: "A digital garden, indexed and ",
      h1Highlight: "searchable",
      h1Post: ".",
      intro:
        "Everything here lives in a private GitHub repo. A CI pipeline summarises it, embeds it, and stores it in Postgres. Browse by section, hit ",
      introKbd: "⌘K",
      introSearch: " to search across all of it, or ask the twin in the corner.",
      recentPosts: "Recent posts",
      latestTweets: "Latest tweets",
      twinTitle: "Ask anything I've ever written.",
      twinDesc:
        "The twin answers in my voice using a RAG pipeline over every post, tweet, and voice note in this garden. Hit the bot icon in the corner.",
      twinCmd: "$ ./digital_twin --rag",
    },
    posts: {
      cmd: "$ ls posts/",
      title: "Posts",
      desc: "Written in MDX, pushed to GitHub, summarised and indexed by CI. The hybrid search behind ",
      descKbd: "⌘K",
      descTail: " covers everything below.",
    },
    tweets: {
      cmd: "$ git log --label tweet",
      title: "Tweets",
      desc1: "Each entry is a GitHub Issue labelled ",
      label: "tweet",
      desc2: ". Sign in with GitHub to comment or react.",
    },
    media: {
      cmd: "$ open media/",
      title: "Media",
      desc: "Photo check-ins and short voice notes. Each item's alt text and caption are indexed alongside the posts, so they show up in hybrid search.",
    },
    about: {
      cmd: "$ cat about.md",
      title: "About",
      p1: "This garden is a deliberate counter-weight to platforms. Long writing, short notes, and media all live in a private GitHub repo. A CI pipeline diffs new content, summarises it with an LLM, embeds it, and pushes both the summary and the vectors into Postgres.",
      p2Pre: "The frontend is ",
      p2Tanstack: "TanStack Start",
      p2Mid: " on Cloudflare Workers, reading from that Postgres layer. The ",
      p2Cmd: "⌘K",
      p2Tail:
        " palette runs a hybrid search (BM25 + cosine) against the same store. The floating chat is a RAG agent that pulls the top-k chunks before answering in my voice.",
      p3: "Phase 1 (you are here) is the static shell with mock data. Phases 2-4 wire in GitHub, the embedding pipeline, and the streaming AI chat.",
    },
    cmdk: {
      placeholder: "Search posts, tweets, or ask the twin…",
      empty: 'Nothing matches "{q}". Try a topic or a slug.',
      groupAsk: "Ask",
      groupNav: "Navigate",
      groupPosts: "Posts",
      groupTweets: "Tweets",
      askPrefix: "Ask the twin: ",
      enter: "enter ↵",
      home: "Home",
      footerLeft: "Hybrid search · mock",
      footerRight: "↑ ↓ navigate · ↵ select",
    },
    chat: {
      open: "Open chat with the digital twin",
      greeting:
        "Hi — I'm the digital twin. I read everything in this garden: posts, tweets, voice notes. Ask me anything, or pick a topic from ⌘K.",
      stub:
        "I'd answer in my own voice here once the RAG pipeline is wired in Phase 4. For now this is a static shell.",
      placeholder: "Ask me something…",
      send: "Send",
    },
    notFound: {
      title: "Page not found",
      desc: "The page you're looking for doesn't exist or has been moved.",
    },
    error: {
      title: "This page didn't load",
      desc: "Something went wrong on our end. You can try refreshing or head back home.",
    },
    units: {
      readingTime: "min read",
      justNow: "just now",
      minutesAgo: "min ago",
      hoursAgo: "h ago",
      daysAgo: "d ago",
      issue: "issue",
    },
    locale: { switch: "语言" },
  },
} as const;

export type Dict = typeof translations.zh;
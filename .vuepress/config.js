module.exports = {
  base: '/',
  locales: {
    '/': {
      lang: 'zh-CN'
    }
  },
  title: 'Tuarus',
  description: '枕上诗词闲处好，门前风景雨来佳。终日向人多酝藉，木樨花',
  dest: 'public',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'viewport', content: 'width=device-width,initial-scale=1,user-scalable=no' }]
  ],
  theme: 'reco',
  themeConfig: {
    author: 'tuarus',
    nav: [
      { text: '主页', link: '/', icon: 'reco-home' },
      { text: '时间轴', link: '/timeline/', icon: 'reco-date' },
      { text: '工具推荐', 
        icon: 'reco-message',
        items: [
          { text: '结构化视图', link: 'https://www.cs.usfca.edu/~galles/visualization/Algorithms.html',icon: 'reco-coding' },
          { text: '正则表达式手册', link: 'https://tool.oschina.net/uploads/apidocs/jquery/regexp.html', icon: 'reco-coding' }
        ]
      },
      { text: '关于', 
        icon: 'reco-message',
        items: [
          { text: 'GitHub', link: 'https://github.com/avriesl', icon: 'reco-github' },
          { text: '码云', link: 'https://gitee.com/avriesl', icon: 'reco-mayun' },
        ]
      }
    ],
    sidebar: {
      '/docs/theme-reco/': [
        '',
        'theme',
        'plugin',
        'api'
      ]
    },  
    type: 'blog',
    // 博客设置
    blogConfig: {
      category: {
        location: 2, // 在导航栏菜单中所占的位置，默认2
        text: '分类' // 默认 “分类”
      },
      tag: {
        location: 3, // 在导航栏菜单中所占的位置，默认3
        text: '标签' // 默认 “标签”
      }
    },
    friendLink: [
      {
        title: '午后南杂',
        desc: 'Enjoy when you can, and endure when you must.',
        email: '1156743527@qq.com',
        link: 'https://www.recoluan.com'
      },
      {
        title: 'Avriesl',
        desc: '',
        avatar: "https://vuepress-theme-reco.recoluan.com/icon_vuepress_reco.png",
        link: 'https://avriesl.gitee.io/'
      },
    ],
    logo: '/logo.png',
    // 搜索设置
    search: true,
    searchMaxSuggestions: 10,
    // 自动形成侧边导航
    // sidebar: 'auto',
    // 最后更新时间
    lastUpdated: '最后更新时间',
    // 作者
    author: 'tuarus',
    // 作者头像
    authorAvatar: '/head.jpg',
    // 备案号
    record: ' tuarus',
    // 项目开始时间
    startYear: '20ww',
    /**
     * 密钥 (if your blog is private)
     */

    // keyPage: {
    //   keys: ['your password'],
    //   color: '#42b983',
    //   lineColor: '#42b983'
    // },

    /**
     * valine 设置 (if you need valine comment )
     */

    // valineConfig: {
    //   appId: 'uVX1RdW5NvC6zEnfjERU7mAb-gzGzoHsz',// your appId
    //   appKey: 'DzzpF7cokBfNP107e5OjMKtQ', // your appKey
    // }
  },
  markdown: {
    lineNumbers: true
  },
  plugins: [
    [
      //先安装在配置， npm install @vuepress-reco/vuepress-plugin-kan-ban-niang --save
      "@vuepress-reco/vuepress-plugin-kan-ban-niang",
      {
        theme: ['blackCat', 'whiteCat', 'haru1', 'haru2', 'haruto', 'koharu', 'izumi', 'shizuku', 'wanko', 'miku', 'z16'],
        clean: false,
        messages: {
          welcome: '我是lookroot欢迎你的关注 ',
          home: '心里的花，我想要带你回家。',
          theme: '好吧，希望你能喜欢我的其他小伙伴。',
          close: '再见哦'
        },
        width: 240,
        height: 352
      }
    ],
    [
      //鼠标点击特效 先安装在配置， npm install vuepress-plugin-cursor-effects --save
      "cursor-effects",
      {
        size: 3,                    // size of the particle, default: 2
        shape: ['circle'],  // shape of the particle, default: 'star'
        zIndex: 999999999           // z-index property of the canvas, default: 999999999
      }
    ],
    [
      //动态标题 先安装在配置， npm install vuepress-plugin-dynamic-title --save
      "dynamic-title",
      {
        showIcon: "/favicon.ico",
        showText: "(/≧▽≦/)咦！又好了！",
        hideIcon: "/failure.ico",
        hideText: "(●—●)喔哟，崩溃啦！",
        recoverTime: 2000
      }
    ],
    [
     //插件广场的流程图插件 先安装在配置 npm install vuepress-plugin-flowchart --save
      'flowchart'
    ],
    [
      //插件广场的sitemap插件 先安装在配置 npm install vuepress-plugin-sitemap --save
      'sitemap', {
        hostname: 'https://avriesl.gitee.io'
      }
    ]
  ]
}  

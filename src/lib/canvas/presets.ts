export type CanvasPreset = {
  id: string;
  group: string;
  label: string;
  width: number;
  height: number;
  note?: string;
};

export const canvasPresets: CanvasPreset[] = [
  { id: "xhs-avatar", group: "小红书", label: "头像", width: 400, height: 400, note: "1:1" },
  { id: "xhs-profile-bg", group: "小红书", label: "个人背景图", width: 1000, height: 800 },
  { id: "xhs-article-portrait", group: "小红书", label: "图文封面 竖版", width: 1242, height: 1660, note: "3:4" },
  { id: "xhs-square", group: "小红书", label: "图文封面 方版", width: 1080, height: 1080, note: "1:1" },
  { id: "xhs-article-landscape", group: "小红书", label: "图文封面 横版", width: 2560, height: 1440, note: "16:9" },
  { id: "xhs-video-portrait", group: "小红书", label: "视频封面 竖版", width: 1080, height: 1440, note: "3:4" },
  { id: "xhs-video-landscape", group: "小红书", label: "视频封面 横版", width: 1440, height: 1080, note: "4:3" },
  { id: "xhs-hd", group: "小红书", label: "横版高清", width: 1920, height: 1080, note: "16:9" },
  { id: "douyin-avatar", group: "抖音", label: "头像", width: 400, height: 400, note: "1:1" },
  { id: "douyin-profile-bg", group: "抖音", label: "个人背景图", width: 1125, height: 633 },
  { id: "douyin-cover-portrait", group: "抖音", label: "封面 竖版", width: 1242, height: 1660, note: "3:4" },
  { id: "douyin-story", group: "抖音", label: "竖屏封面", width: 1080, height: 1920, note: "9:16" },
  { id: "douyin-cover-landscape", group: "抖音", label: "封面 横版", width: 1080, height: 608, note: "16:9" },
  { id: "wechat-avatar", group: "微信", label: "公众号头像", width: 240, height: 240, note: "1:1" },
  { id: "wechat-cover", group: "微信", label: "公众号封面", width: 900, height: 383 },
  { id: "wechat-thumb", group: "微信", label: "公众号小图", width: 200, height: 200, note: "1:1" },
  { id: "wechat-card", group: "微信", label: "二维码名片", width: 600, height: 600, note: "1:1" },
  { id: "wechat-guide", group: "微信", label: "内容引导图", width: 1080, height: 300 },
  { id: "wechat-channel-portrait", group: "微信", label: "视频号封面 竖版", width: 1080, height: 1260, note: "6:7" },
  { id: "wechat-channel-landscape", group: "微信", label: "视频号封面 横版", width: 1080, height: 608, note: "16:9" },
  { id: "wechat-mini", group: "微信", label: "小程序封面", width: 520, height: 416 },
  { id: "wechat-moments", group: "微信", label: "朋友圈封面", width: 1280, height: 1184 },
  { id: "weibo-home", group: "微博", label: "主页封面", width: 980, height: 300 },
  { id: "weibo-header", group: "微博", label: "头条封面", width: 980, height: 560 },
  { id: "weibo-focus", group: "微博", label: "焦点图片", width: 540, height: 260 },
  { id: "weibo-long", group: "微博", label: "微博长图", width: 800, height: 2000 },
  { id: "bilibili-vertical-video", group: "B站", label: "竖屏视频", width: 1080, height: 1920, note: "9:16" },
  { id: "bilibili-cover", group: "B站", label: "横版封面图", width: 1440, height: 1080, note: "4:3" },
  { id: "bilibili-landscape-video", group: "B站", label: "横屏视频", width: 1920, height: 1080, note: "16:9" },
  { id: "common-square", group: "常用比例", label: "方图", width: 1080, height: 1080, note: "1:1" },
  { id: "common-portrait", group: "常用比例", label: "竖版海报", width: 1080, height: 1440, note: "3:4" },
  { id: "common-landscape", group: "常用比例", label: "横版海报", width: 1440, height: 1080, note: "4:3" },
  { id: "common-story", group: "常用比例", label: "手机竖屏", width: 1080, height: 1920, note: "9:16" },
  { id: "common-hd", group: "常用比例", label: "高清视频", width: 1920, height: 1080, note: "16:9" },
  { id: "common-mobile-poster", group: "常用比例", label: "手机海报", width: 1242, height: 2208 },
  { id: "common-mobile-ad", group: "常用比例", label: "手机广告", width: 720, height: 390 },
  { id: "common-commerce", group: "常用比例", label: "电商全屏海报", width: 1920, height: 900 },
  { id: "common-tall-poster", group: "常用比例", label: "长版海报", width: 1200, height: 1920 },
];

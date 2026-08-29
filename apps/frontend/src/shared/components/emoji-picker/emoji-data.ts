/**
 * 内置表情数据集（精选常用集，非完整 Unicode 表）。
 * keywords 支持中英文搜索；frequently used 由 EmojiPicker 持久化在 localStorage。
 */

export interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
}

export interface EmojiCategory {
  id: string;
  /** i18n key（emojiPicker.category.*） */
  labelKey: string;
  emojis: EmojiItem[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    labelKey: 'emojiPicker.category.smileys',
    emojis: [
      { emoji: '😀', name: 'grinning', keywords: ['开心', '笑', 'happy'] },
      { emoji: '😃', name: 'smiley', keywords: ['开心', 'happy'] },
      { emoji: '😄', name: 'smile', keywords: ['笑', 'happy'] },
      { emoji: '😁', name: 'grin', keywords: ['咧嘴笑'] },
      { emoji: '😆', name: 'laughing', keywords: ['大笑', '哈哈'] },
      { emoji: '😅', name: 'sweat smile', keywords: ['尴尬', '汗'] },
      { emoji: '🤣', name: 'rofl', keywords: ['笑死', '翻滚'] },
      { emoji: '😂', name: 'joy', keywords: ['笑哭', '泪'] },
      { emoji: '🙂', name: 'slight smile', keywords: ['微笑'] },
      { emoji: '😉', name: 'wink', keywords: ['眨眼'] },
      { emoji: '😊', name: 'blush', keywords: ['脸红', '羞'] },
      { emoji: '😍', name: 'heart eyes', keywords: ['爱', '喜欢'] },
      { emoji: '🥰', name: 'smiling face with hearts', keywords: ['爱'] },
      { emoji: '😘', name: 'kiss', keywords: ['亲'] },
      { emoji: '😜', name: 'winking tongue', keywords: ['调皮'] },
      { emoji: '🤪', name: 'zany', keywords: ['疯狂'] },
      { emoji: '🤨', name: 'raised eyebrow', keywords: ['怀疑'] },
      { emoji: '🧐', name: 'monocle', keywords: ['审视'] },
      { emoji: '😎', name: 'cool', keywords: ['酷', '墨镜'] },
      { emoji: '🤩', name: 'star struck', keywords: ['崇拜', '星星眼'] },
      { emoji: '🥳', name: 'partying', keywords: ['庆祝', '派对'] },
      { emoji: '😏', name: 'smirk', keywords: ['得意'] },
      { emoji: '😒', name: 'unamused', keywords: ['无语'] },
      { emoji: '😞', name: 'disappointed', keywords: ['失望'] },
      { emoji: '😔', name: 'pensive', keywords: ['沮丧'] },
      { emoji: '😢', name: 'crying', keywords: ['哭'] },
      { emoji: '😭', name: 'sob', keywords: ['大哭'] },
      { emoji: '😤', name: 'triumph', keywords: ['气', '哼'] },
      { emoji: '😠', name: 'angry', keywords: ['生气'] },
      { emoji: '😡', name: 'rage', keywords: ['暴怒'] },
      { emoji: '🤬', name: 'cursing', keywords: ['骂'] },
      { emoji: '🤯', name: 'exploding head', keywords: ['爆炸', '震惊'] },
      { emoji: '😳', name: 'flushed', keywords: ['脸红'] },
      { emoji: '🥵', name: 'hot', keywords: ['热'] },
      { emoji: '🥶', name: 'cold', keywords: ['冷'] },
      { emoji: '😱', name: 'scream', keywords: ['惊恐'] },
      { emoji: '😨', name: 'fearful', keywords: ['害怕'] },
      { emoji: '🤔', name: 'thinking', keywords: ['思考', '想想'] },
      { emoji: '🤫', name: 'shush', keywords: ['嘘'] },
      { emoji: '🤭', name: 'giggle', keywords: ['偷笑'] },
      { emoji: '😴', name: 'sleeping', keywords: ['睡'] },
      { emoji: '🤒', name: 'sick', keywords: ['生病'] },
      { emoji: '🤕', name: 'hurt', keywords: ['受伤'] },
      { emoji: '🥺', name: 'pleading', keywords: ['求', '可怜'] },
      { emoji: '😇', name: 'innocent', keywords: ['天使'] },
    ],
  },
  {
    id: 'gestures',
    labelKey: 'emojiPicker.category.gestures',
    emojis: [
      { emoji: '👍', name: 'thumbs up', keywords: ['赞', '好', 'like'] },
      { emoji: '👎', name: 'thumbs down', keywords: ['踩', '差'] },
      { emoji: '👌', name: 'ok', keywords: ['好的'] },
      { emoji: '🤌', name: 'pinched fingers', keywords: ['捏'] },
      { emoji: '✌️', name: 'victory', keywords: ['耶', '胜利'] },
      { emoji: '🤞', name: 'crossed fingers', keywords: ['祈祷', '运气'] },
      { emoji: '🤟', name: 'love you', keywords: ['爱你'] },
      { emoji: '🤘', name: 'rock', keywords: ['摇滚'] },
      { emoji: '👈', name: 'point left', keywords: ['左'] },
      { emoji: '👉', name: 'point right', keywords: ['右', '这个'] },
      { emoji: '👆', name: 'point up', keywords: ['上'] },
      { emoji: '👇', name: 'point down', keywords: ['下'] },
      { emoji: '✋', name: 'raised hand', keywords: ['手', '停'] },
      { emoji: '🖐️', name: 'hand', keywords: ['手掌'] },
      { emoji: '🖖', name: 'vulcan', keywords: ['瓦肯'] },
      { emoji: '👋', name: 'wave', keywords: ['挥手', '嗨', '拜'] },
      { emoji: '🤝', name: 'handshake', keywords: ['合作', '握手'] },
      { emoji: '🙏', name: 'pray', keywords: ['感谢', '拜托', '祈祷'] },
      { emoji: '✍️', name: 'writing', keywords: ['写'] },
      { emoji: '💪', name: 'muscle', keywords: ['加油', '强'] },
      { emoji: '🦾', name: 'mechanical arm', keywords: ['机械臂'] },
      { emoji: '👏', name: 'clap', keywords: ['鼓掌'] },
      { emoji: '🙌', name: 'raised hands', keywords: ['欢呼'] },
      { emoji: '🤙', name: 'call me', keywords: ['打电话'] },
      { emoji: '👀', name: 'eyes', keywords: ['看', '观察'] },
      { emoji: '🧠', name: 'brain', keywords: ['大脑', '智能'] },
      { emoji: '🫡', name: 'salute', keywords: ['敬礼'] },
      { emoji: '🫶', name: 'heart hands', keywords: ['比心'] },
    ],
  },
  {
    id: 'animals',
    labelKey: 'emojiPicker.category.animals',
    emojis: [
      { emoji: '🐶', name: 'dog', keywords: ['狗'] },
      { emoji: '🐱', name: 'cat', keywords: ['猫'] },
      { emoji: '🐭', name: 'mouse', keywords: ['老鼠'] },
      { emoji: '🐹', name: 'hamster', keywords: ['仓鼠'] },
      { emoji: '🐰', name: 'rabbit', keywords: ['兔子'] },
      { emoji: '🦊', name: 'fox', keywords: ['狐狸'] },
      { emoji: '🐻', name: 'bear', keywords: ['熊'] },
      { emoji: '🐼', name: 'panda', keywords: ['熊猫'] },
      { emoji: '🐨', name: 'koala', keywords: ['考拉'] },
      { emoji: '🐯', name: 'tiger', keywords: ['老虎'] },
      { emoji: '🦁', name: 'lion', keywords: ['狮子'] },
      { emoji: '🐮', name: 'cow', keywords: ['牛'] },
      { emoji: '🐷', name: 'pig', keywords: ['猪'] },
      { emoji: '🐸', name: 'frog', keywords: ['青蛙'] },
      { emoji: '🐵', name: 'monkey', keywords: ['猴子'] },
      { emoji: '🐔', name: 'chicken', keywords: ['鸡'] },
      { emoji: '🐧', name: 'penguin', keywords: ['企鹅'] },
      { emoji: '🐦', name: 'bird', keywords: ['鸟'] },
      { emoji: '🦆', name: 'duck', keywords: ['鸭'] },
      { emoji: '🦉', name: 'owl', keywords: ['猫头鹰'] },
      { emoji: '🦄', name: 'unicorn', keywords: ['独角兽'] },
      { emoji: '🐝', name: 'bee', keywords: ['蜜蜂'] },
      { emoji: '🦋', name: 'butterfly', keywords: ['蝴蝶'] },
      { emoji: '🐌', name: 'snail', keywords: ['蜗牛'] },
      { emoji: '🐜', name: 'ant', keywords: ['蚂蚁'] },
      { emoji: '🕷️', name: 'spider', keywords: ['蜘蛛', 'bug'] },
      { emoji: '🐞', name: 'ladybug', keywords: ['瓢虫', 'bug'] },
      { emoji: '🐢', name: 'turtle', keywords: ['乌龟'] },
      { emoji: '🐍', name: 'snake', keywords: ['蛇', 'python'] },
      { emoji: '🐙', name: 'octopus', keywords: ['章鱼'] },
      { emoji: '🦀', name: 'crab', keywords: ['螃蟹', 'rust'] },
      { emoji: '🐬', name: 'dolphin', keywords: ['海豚'] },
      { emoji: '🐳', name: 'whale', keywords: ['鲸鱼', 'docker'] },
      { emoji: '🦈', name: 'shark', keywords: ['鲨鱼'] },
      { emoji: '🌵', name: 'cactus', keywords: ['仙人掌'] },
      { emoji: '🌲', name: 'evergreen', keywords: ['树'] },
      { emoji: '🌸', name: 'cherry blossom', keywords: ['花'] },
      { emoji: '🌻', name: 'sunflower', keywords: ['向日葵'] },
      { emoji: '🍀', name: 'clover', keywords: ['幸运草'] },
      { emoji: '🔥', name: 'fire', keywords: ['火', '热', '燃'] },
      { emoji: '⭐', name: 'star', keywords: ['星'] },
      { emoji: '🌙', name: 'moon', keywords: ['月亮'] },
      { emoji: '☀️', name: 'sun', keywords: ['太阳'] },
      { emoji: '⛅', name: 'cloudy', keywords: ['多云'] },
      { emoji: '🌈', name: 'rainbow', keywords: ['彩虹'] },
      { emoji: '⚡', name: 'lightning', keywords: ['闪电', '快'] },
      { emoji: '❄️', name: 'snowflake', keywords: ['雪'] },
    ],
  },
  {
    id: 'food',
    labelKey: 'emojiPicker.category.food',
    emojis: [
      { emoji: '🍏', name: 'green apple', keywords: ['苹果'] },
      { emoji: '🍎', name: 'apple', keywords: ['苹果'] },
      { emoji: '🍐', name: 'pear', keywords: ['梨'] },
      { emoji: '🍊', name: 'orange', keywords: ['橘子'] },
      { emoji: '🍋', name: 'lemon', keywords: ['柠檬'] },
      { emoji: '🍌', name: 'banana', keywords: ['香蕉'] },
      { emoji: '🍉', name: 'watermelon', keywords: ['西瓜'] },
      { emoji: '🍇', name: 'grapes', keywords: ['葡萄'] },
      { emoji: '🍓', name: 'strawberry', keywords: ['草莓'] },
      { emoji: '🫐', name: 'blueberry', keywords: ['蓝莓'] },
      { emoji: '🍒', name: 'cherries', keywords: ['樱桃'] },
      { emoji: '🍑', name: 'peach', keywords: ['桃'] },
      { emoji: '🥭', name: 'mango', keywords: ['芒果'] },
      { emoji: '🍍', name: 'pineapple', keywords: ['菠萝'] },
      { emoji: '🥑', name: 'avocado', keywords: ['牛油果'] },
      { emoji: '🌽', name: 'corn', keywords: ['玉米'] },
      { emoji: '🌶️', name: 'hot pepper', keywords: ['辣椒'] },
      { emoji: '🍕', name: 'pizza', keywords: ['披萨'] },
      { emoji: '🍔', name: 'burger', keywords: ['汉堡'] },
      { emoji: '🌮', name: 'taco', keywords: ['塔可'] },
      { emoji: '🍜', name: 'noodles', keywords: ['面条', '拉面'] },
      { emoji: '🍣', name: 'sushi', keywords: ['寿司'] },
      { emoji: '🍩', name: 'doughnut', keywords: ['甜甜圈'] },
      { emoji: '🍪', name: 'cookie', keywords: ['饼干', 'cookie'] },
      { emoji: '🎂', name: 'birthday cake', keywords: ['生日蛋糕'] },
      { emoji: '🍰', name: 'cake', keywords: ['蛋糕'] },
      { emoji: '☕', name: 'coffee', keywords: ['咖啡'] },
      { emoji: '🍵', name: 'tea', keywords: ['茶'] },
      { emoji: '🧋', name: 'bubble tea', keywords: ['奶茶'] },
      { emoji: '🍺', name: 'beer', keywords: ['啤酒'] },
      { emoji: '🥂', name: 'champagne', keywords: ['干杯', '庆祝'] },
      { emoji: '🥤', name: 'cup with straw', keywords: ['饮料'] },
    ],
  },
  {
    id: 'activities',
    labelKey: 'emojiPicker.category.activities',
    emojis: [
      { emoji: '⚽', name: 'soccer', keywords: ['足球'] },
      { emoji: '🏀', name: 'basketball', keywords: ['篮球'] },
      { emoji: '🏈', name: 'football', keywords: ['橄榄球'] },
      { emoji: '⚾', name: 'baseball', keywords: ['棒球'] },
      { emoji: '🎾', name: 'tennis', keywords: ['网球'] },
      { emoji: '🏐', name: 'volleyball', keywords: ['排球'] },
      { emoji: '🏓', name: 'ping pong', keywords: ['乒乓球'] },
      { emoji: '🏸', name: 'badminton', keywords: ['羽毛球'] },
      { emoji: '🎮', name: 'game', keywords: ['游戏'] },
      { emoji: '🎲', name: 'dice', keywords: ['骰子'] },
      { emoji: '🎯', name: 'dart', keywords: ['目标', '靶心'] },
      { emoji: '🏆', name: 'trophy', keywords: ['奖杯', '冠军'] },
      { emoji: '🥇', name: 'gold medal', keywords: ['金牌'] },
      { emoji: '🎉', name: 'party popper', keywords: ['庆祝', '派对'] },
      { emoji: '🎊', name: 'confetti', keywords: ['撒花'] },
      { emoji: '🚀', name: 'rocket', keywords: ['火箭', '发布', '上线'] },
      { emoji: '✈️', name: 'plane', keywords: ['飞机'] },
      { emoji: '🚗', name: 'car', keywords: ['汽车'] },
      { emoji: '🚲', name: 'bike', keywords: ['自行车'] },
      { emoji: '⛵', name: 'sailboat', keywords: ['帆船'] },
      { emoji: '🎸', name: 'guitar', keywords: ['吉他'] },
      { emoji: '🎵', name: 'note', keywords: ['音乐'] },
      { emoji: '🎤', name: 'microphone', keywords: ['麦克风', '唱歌'] },
      { emoji: '🎨', name: 'art', keywords: ['艺术', '设计'] },
      { emoji: '🎬', name: 'clapper', keywords: ['电影'] },
      { emoji: '📈', name: 'chart up', keywords: ['增长', '上升'] },
      { emoji: '📉', name: 'chart down', keywords: ['下降'] },
      { emoji: '🏃', name: 'running', keywords: ['跑步'] },
    ],
  },
  {
    id: 'objects',
    labelKey: 'emojiPicker.category.objects',
    emojis: [
      { emoji: '❤️', name: 'red heart', keywords: ['红心', '爱', '喜欢'] },
      { emoji: '🧡', name: 'orange heart', keywords: ['橙心'] },
      { emoji: '💛', name: 'yellow heart', keywords: ['黄心'] },
      { emoji: '💚', name: 'green heart', keywords: ['绿心'] },
      { emoji: '💙', name: 'blue heart', keywords: ['蓝心'] },
      { emoji: '💜', name: 'purple heart', keywords: ['紫心'] },
      { emoji: '🖤', name: 'black heart', keywords: ['黑心'] },
      { emoji: '🤍', name: 'white heart', keywords: ['白心'] },
      { emoji: '💔', name: 'broken heart', keywords: ['心碎'] },
      { emoji: '💯', name: 'hundred', keywords: ['满分', '100'] },
      { emoji: '💥', name: 'collision', keywords: ['爆炸'] },
      { emoji: '💤', name: 'zzz', keywords: ['睡觉'] },
      { emoji: '💡', name: 'idea', keywords: ['想法', '点子'] },
      { emoji: '🔍', name: 'search', keywords: ['搜索', '查找'] },
      { emoji: '🔒', name: 'lock', keywords: ['锁定'] },
      { emoji: '🔑', name: 'key', keywords: ['钥匙'] },
      { emoji: '📌', name: 'pushpin', keywords: ['置顶', '图钉'] },
      { emoji: '📎', name: 'paperclip', keywords: ['附件'] },
      { emoji: '📝', name: 'memo', keywords: ['笔记', '记录'] },
      { emoji: '📄', name: 'page', keywords: ['文档'] },
      { emoji: '📊', name: 'bar chart', keywords: ['图表', '统计'] },
      { emoji: '📦', name: 'package', keywords: ['包裹', '包'] },
      { emoji: '🕐', name: 'clock', keywords: ['时间', '钟'] },
      { emoji: '⏰', name: 'alarm', keywords: ['闹钟', '提醒'] },
      { emoji: '⌛', name: 'hourglass', keywords: ['沙漏', '等待'] },
      { emoji: '🔔', name: 'bell', keywords: ['铃铛', '通知'] },
      { emoji: '🔕', name: 'bell off', keywords: ['静音'] },
      { emoji: '💾', name: 'floppy', keywords: ['保存'] },
      { emoji: '🖥️', name: 'desktop', keywords: ['电脑'] },
      { emoji: '💻', name: 'laptop', keywords: ['笔记本'] },
      { emoji: '📱', name: 'phone', keywords: ['手机'] },
      { emoji: '⌨️', name: 'keyboard', keywords: ['键盘'] },
      { emoji: '🖱️', name: 'mouse', keywords: ['鼠标'] },
      { emoji: '🔌', name: 'plug', keywords: ['插头'] },
      { emoji: '🧪', name: 'test tube', keywords: ['实验', '测试'] },
      { emoji: '🛠️', name: 'tools', keywords: ['工具', '修复'] },
      { emoji: '⚙️', name: 'gear', keywords: ['设置', '齿轮'] },
      { emoji: '🧲', name: 'magnet', keywords: ['磁铁'] },
      { emoji: '💰', name: 'money bag', keywords: ['钱', '成本'] },
      { emoji: '🎁', name: 'gift', keywords: ['礼物'] },
    ],
  },
  {
    id: 'symbols',
    labelKey: 'emojiPicker.category.symbols',
    emojis: [
      { emoji: '✅', name: 'check', keywords: ['完成', '通过', '对'] },
      { emoji: '❌', name: 'cross', keywords: ['错误', '失败', '叉'] },
      { emoji: '⚠️', name: 'warning', keywords: ['警告', '注意'] },
      { emoji: '🚫', name: 'prohibited', keywords: ['禁止'] },
      { emoji: '♻️', name: 'recycle', keywords: ['循环'] },
      { emoji: '🔧', name: 'wrench', keywords: ['修', '扳手'] },
      { emoji: '🩹', name: 'bandage', keywords: ['补丁', 'hotfix'] },
      { emoji: '➕', name: 'plus', keywords: ['加', '新增'] },
      { emoji: '➖', name: 'minus', keywords: ['减', '移除'] },
      { emoji: '❓', name: 'question', keywords: ['问题', '疑问'] },
      { emoji: '❗', name: 'exclamation', keywords: ['感叹', '重要'] },
      { emoji: '✨', name: 'sparkles', keywords: ['闪亮', '新功能'] },
      { emoji: '🔴', name: 'red circle', keywords: ['红', '紧急'] },
      { emoji: '🟠', name: 'orange circle', keywords: ['橙'] },
      { emoji: '🟡', name: 'yellow circle', keywords: ['黄'] },
      { emoji: '🟢', name: 'green circle', keywords: ['绿', '正常'] },
      { emoji: '🔵', name: 'blue circle', keywords: ['蓝'] },
      { emoji: '🟣', name: 'purple circle', keywords: ['紫'] },
      { emoji: '⬆️', name: 'up', keywords: ['上升', '升级'] },
      { emoji: '⬇️', name: 'down', keywords: ['下降', '降级'] },
      { emoji: '🔺', name: 'up triangle', keywords: ['升'] },
      { emoji: '🔻', name: 'down triangle', keywords: ['降'] },
      { emoji: '🆗', name: 'ok button', keywords: ['好的'] },
      { emoji: '🆕', name: 'new', keywords: ['新'] },
      { emoji: '🔝', name: 'top', keywords: ['顶'] },
      { emoji: '🈶', name: 'have', keywords: ['有'] },
      { emoji: '🈚', name: 'not have', keywords: ['无'] },
    ],
  },
];

const FREQUENTLY_USED_KEY = 'emoji-picker:frequently-used';
const FREQUENTLY_USED_MAX = 16;

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getFrequentlyUsedEmojis(): string[] {
  const storage = safeLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(FREQUENTLY_USED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === 'string') : [];
  } catch {
    return [];
  }
}

export function recordFrequentlyUsedEmoji(emoji: string): string[] {
  const storage = safeLocalStorage();
  const next = [emoji, ...getFrequentlyUsedEmojis().filter((e) => e !== emoji)].slice(
    0,
    FREQUENTLY_USED_MAX,
  );
  if (storage) {
    try {
      storage.setItem(FREQUENTLY_USED_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  }
  return next;
}

export function searchEmojis(query: string): EmojiItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const results: EmojiItem[] = [];
  for (const category of EMOJI_CATEGORIES) {
    for (const item of category.emojis) {
      if (seen.has(item.emoji)) continue;
      if (
        item.name.toLowerCase().includes(q) ||
        item.keywords.some((keyword) => keyword.toLowerCase().includes(q))
      ) {
        seen.add(item.emoji);
        results.push(item);
      }
    }
  }
  return results;
}

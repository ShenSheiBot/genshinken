export interface ContributorLink {
  label: string;
  href: string;
}

export interface Contributor {
  /** Stable, URL-safe identity. Never derive links from a display name. */
  id: string;
  displayName: string;
  /** Historical spellings, romanizations and bylines accepted in old front matter. */
  aliases: readonly string[];
  /** Team membership is opt-in; publishing a contribution does not imply membership. */
  teamMember: boolean;
  entityType?: "person" | "organization";
  teamTitle?: string;
  teamOrder?: number;
  bio?: string;
  links?: readonly ContributorLink[];
}

/**
 * Public contributor identities used by published content.
 *
 * Keep `id` stable when a display name changes. Every authoring, translation,
 * editing or proofreading byline must resolve to one of these records before a
 * post can be built. Team data deliberately defaults to false until a person
 * has explicitly agreed to be listed on the About page.
 */
export const CONTRIBUTORS = [
  {
    id: "roof-genshiken",
    displayName: "屋顶现视研",
    aliases: [],
    teamMember: false,
    entityType: "organization",
  },
  {
    id: "azuma-hiroki",
    displayName: "东浩纪",
    aliases: ["東浩紀", "Hiroki Azuma"],
    teamMember: false,
  },
  {
    id: "red-tea-seaweed",
    displayName: "红茶泡海苔",
    aliases: [],
    teamMember: false,
  },
  {
    id: "uno-tsunehiro",
    displayName: "宇野常宽",
    aliases: ["宇野常寛", "Tsunehiro Uno"],
    teamMember: false,
  },
  {
    id: "hood",
    displayName: "hood",
    aliases: ["HMS Hood"],
    teamMember: false,
  },
  {
    id: "harusaki-misora",
    displayName: "春埼美空",
    aliases: [],
    teamMember: false,
  },
  {
    id: "you-fisherman",
    displayName: "侑",
    aliases: ["fisherman"],
    teamMember: false,
  },
  { id: "gi", displayName: "Gi", aliases: [], teamMember: false },
  { id: "ian-condry", displayName: "伊恩·康德利", aliases: ["Ian Condry"], teamMember: false },
  { id: "ying-fan-kuli-bot01", displayName: "英翻苦力bot01", aliases: [], teamMember: false },
  { id: "wei-mu", displayName: "帷·幕", aliases: [], teamMember: false },
  { id: "hirooooo", displayName: "hirooooo", aliases: [], teamMember: false },
  { id: "electric-fan-huhu", displayName: "电扇呼呼", aliases: [], teamMember: false },
  { id: "wjk", displayName: "wjk", aliases: [], teamMember: false },
  { id: "shan-alter", displayName: "シャン[オルタ]", aliases: [], teamMember: false },
  { id: "san-mei-qie-zi", displayName: "三昧茄子", aliases: [], teamMember: false },
  { id: "panda-pai", displayName: "熊猫派", aliases: [], teamMember: false },
  { id: "fuqi-xue", displayName: "富崎 学", aliases: ["富崎学"], teamMember: false },
  { id: "yuan-yue", displayName: "远月", aliases: [], teamMember: false },
  { id: "qian-shen", displayName: "浅神", aliases: [], teamMember: false },
  { id: "t-jun", displayName: "T君", aliases: ["T君"], teamMember: false },
  { id: "da-ping-mao", displayName: "大平猫", aliases: [], teamMember: false },
  { id: "august-rush", displayName: "唯一指定真实August_Rush", aliases: [], teamMember: false },
  { id: "san-yi-jun", displayName: "三翼菌", aliases: [], teamMember: false },
  { id: "leontopodium-edelweiss", displayName: "Leontopodium Edelweiss", aliases: [], teamMember: false },
  { id: "shi-zai-gou-zi", displayName: "实在狗子", aliases: ["潜在狗子"], teamMember: false },
  { id: "sung-ho-kim", displayName: "Sung Ho Kim", aliases: [], teamMember: false },
  { id: "jeremiah", displayName: "Jeremiah", aliases: [], teamMember: false },
  { id: "chai-lairen", displayName: "柴来人", aliases: [], teamMember: false },
  { id: "yi-tiao", displayName: "一条", aliases: [], teamMember: false },
  { id: "jing-xi", displayName: "静希", aliases: [], teamMember: false },
  { id: "zhong-zi-mo", displayName: "钟子默", aliases: ["钟老师"], teamMember: false },
  { id: "zi-hou", displayName: "子厚", aliases: [], teamMember: false },
  { id: "lun-bo-lang", displayName: "伦勃朗", aliases: [], teamMember: false },
  { id: "circled-nine-sefu", displayName: "⑨瑟夫", aliases: [], teamMember: false },
  { id: "hephaestus", displayName: "hephaestus", aliases: ["hep"], teamMember: false },
  { id: "yan-ji-shi", displayName: "言几时", aliases: [], teamMember: false },
  { id: "su-yin", displayName: "速音", aliases: [], teamMember: false },
  { id: "austoria", displayName: "Austoria", aliases: ["AUS"], teamMember: false },
  { id: "suetonius", displayName: "Suetonius", aliases: [], teamMember: false },
  { id: "dusty-sky", displayName: "Dusty Sky", aliases: [], teamMember: false },
  { id: "yu-ban", displayName: "鱼板", aliases: ["🐟"], teamMember: false },
  { id: "chuang-zi", displayName: "窗子", aliases: [], teamMember: false },
  { id: "li-luo-hu-deng", displayName: "篱落呼灯", aliases: [], teamMember: false },
  { id: "yu-xiao-xing", displayName: "玉小兴", aliases: [], teamMember: false },
  {
    id: "ta-ta-jun-minkun",
    displayName: "塔塔君 Minkun",
    aliases: ["塔塔君"],
    teamMember: false,
  },
  { id: "yi-zhi-fei-ling-de-ling", displayName: "一只非0的O", aliases: ["一只非0的0"], teamMember: false },
  { id: "jing-xi-cao-shi-lang", displayName: "静希草十郎", aliases: [], teamMember: false },
  { id: "li-pao-pao", displayName: "李抛抛", aliases: [], teamMember: false },
  { id: "kvin", displayName: "kViN", aliases: [], teamMember: false },
  { id: "wo-you-yue-jia-san-qian", displayName: "我有越甲三千", aliases: [], teamMember: false },
  { id: "yu-zhou-shen-niu", displayName: "宇宙神牛", aliases: [], teamMember: false },
  { id: "san-hao-wen-xiong", displayName: "三好文雄", aliases: [], teamMember: false },
  { id: "bjorn-ole-kamm", displayName: "Björn-Ole Kamm", aliases: [], teamMember: false },
  { id: "wang-han", displayName: "王晗", aliases: [], teamMember: false },
  { id: "shen-de-yi-shi-xing-tai", displayName: "神的意识形态", aliases: [], teamMember: false },
  { id: "wu-you-zhi-ren", displayName: "乌有之人", aliases: [], teamMember: false },
  { id: "ivauke", displayName: "ivauke", aliases: [], teamMember: false },
  { id: "kong", displayName: "空", aliases: [], teamMember: false },
  { id: "yuan-da-nan", displayName: "元达南", aliases: [], teamMember: false },
  { id: "miyadai-shinji", displayName: "宫台真司", aliases: [], teamMember: false },
  { id: "rakugo-mimori", displayName: "落語三森", aliases: [], teamMember: false },
  { id: "ben-ti-shi-bao", displayName: "本体是包", aliases: [], teamMember: false },
  { id: "jie-luo-qi-bei-lin", displayName: "杰洛·齐贝林", aliases: [], teamMember: false },
  { id: "liu-shen", displayName: "六神", aliases: [], teamMember: false },
  { id: "shi-wen-zi", displayName: "十文字", aliases: [], teamMember: false },
  { id: "ludwigsama", displayName: "Ludwigsama", aliases: [], teamMember: false },
  { id: "mi-ze-wei-hua", displayName: "秘则为花", aliases: ["喵哥"], teamMember: false },
  { id: "njjgnuoy", displayName: "njjgnuoy", aliases: [], teamMember: false },
  { id: "jumbohard", displayName: "Jumbohard", aliases: [], teamMember: false },
  { id: "wei-yi-zhen-shi", displayName: "唯一真实", aliases: [], teamMember: false },
  {
    id: "fang-cao",
    displayName: "芳草",
    aliases: ["芳草进大门", "神圣芳草"],
    teamMember: false,
  },
  { id: "ophelia", displayName: "Ophelia", aliases: [], teamMember: false },
  {
    id: "zuo-zhe-jun-hou-yuan-hui-hui-zhang",
    displayName: "作者君的后援会会长",
    aliases: [],
    teamMember: false,
  },
  { id: "zhang-wu-ji", displayName: "张无忌", aliases: [], teamMember: false },
  { id: "ishida-miki", displayName: "石田美纪", aliases: [], teamMember: false },
  { id: "go-dai-yu-suke", displayName: "五代雄介", aliases: [], teamMember: false },
  { id: "yuan-qing-ri-yue-lang", displayName: "袁青日月郎", aliases: [], teamMember: false },
  { id: "pendulum-man", displayName: "pendulum man", aliases: [], teamMember: false },
  { id: "wyn", displayName: "wyn", aliases: [], teamMember: false },
  {
    id: "xian-nai-bing-gan",
    displayName: "鲜奶饼干",
    aliases: ["饼干", "cyclotron"],
    teamMember: false,
  },
  { id: "bie-ya-kuang", displayName: "别牙狂", aliases: [], teamMember: false },
  { id: "matsui-hiroshi", displayName: "松井广志", aliases: [], teamMember: false },
  { id: "mefls", displayName: "Mefls", aliases: [], teamMember: false },
  {
    id: "yi-ge-qu-wei-di-su-de-ren",
    displayName: "一个趣味低俗的人",
    aliases: [],
    teamMember: false,
  },
  { id: "jack-cade", displayName: "Jack Cade", aliases: [], teamMember: false },
  { id: "xin-su-sen-lin", displayName: "新宿森林", aliases: [], teamMember: false },
  { id: "shen-shui", displayName: "甚谁", aliases: [], teamMember: false },
  { id: "lin-pei-ying", displayName: "林沛颖", aliases: [], teamMember: false },
  { id: "hisui", displayName: "Hisui", aliases: [], teamMember: false },
  { id: "ako-de-hong", displayName: "Ako的红", aliases: [], teamMember: false },
  { id: "karatani-kojin", displayName: "柄谷行人", aliases: [], teamMember: false },
  { id: "ju-zi", displayName: "橘子", aliases: [], teamMember: false },
  { id: "mikan", displayName: "みかん", aliases: [], teamMember: false },
  { id: "kong-bu-ru-si", displayName: "恐怖如斯", aliases: [], teamMember: false },
  { id: "phaedo", displayName: "Phaedo", aliases: [], teamMember: false },
  { id: "phaedrus", displayName: "Phaedrus", aliases: [], teamMember: false },
  { id: "kafak", displayName: "KAFAK", aliases: [], teamMember: false },
  { id: "jia-su-qi", displayName: "加速器", aliases: [], teamMember: false },
  { id: "snoper-zhuo-er", displayName: "snoper卓尔", aliases: [], teamMember: false },
  { id: "chai-zhen-tan", displayName: "柴侦探", aliases: [], teamMember: false },
  { id: "uekita-chiaki", displayName: "上北千明", aliases: [], teamMember: false },
  { id: "wen-tian", displayName: "问天", aliases: [], teamMember: false },
  { id: "ye-cai-yi-ri-fen", displayName: "野菜一日分", aliases: [], teamMember: false },
  { id: "gong-jiu-ji", displayName: "宫酒姬", aliases: [], teamMember: false },
  { id: "adam-lowenstein", displayName: "Adam Lowenstein", aliases: [], teamMember: false },
  { id: "will", displayName: "will", aliases: [], teamMember: false },
  { id: "pause-and-select", displayName: "pause and select", aliases: [], teamMember: false },
  {
    id: "qun-qing-qi-hao-lou",
    displayName: "群青七号楼",
    aliases: [],
    teamMember: false,
    entityType: "organization",
  },
  { id: "achamoth", displayName: "Achamoth", aliases: [], teamMember: false },
  { id: "elmy", displayName: "ElMY", aliases: [], teamMember: false },
  {
    id: "espen-aarseth",
    displayName: "Espen Aarseth",
    aliases: ["Espen J. Aarseth"],
    teamMember: false,
  },
  { id: "alexander-bird", displayName: "Alexander Bird", aliases: [], teamMember: false },
  { id: "emma-tobin", displayName: "Emma Tobin", aliases: [], teamMember: false },
  { id: "teki", displayName: "Teki", aliases: [], teamMember: false },
  { id: "wang-xue-chuan", displayName: "王雪川", aliases: [], teamMember: false },
  { id: "genki-desu-ka", displayName: "元気ですか", aliases: [], teamMember: false },
  { id: "daniel-smith", displayName: "Daniel Smith", aliases: [], teamMember: false },
  { id: "john-protevi", displayName: "John Protevi", aliases: [], teamMember: false },
  { id: "lie-huo", displayName: "裂火", aliases: [], teamMember: false },
  { id: "a-ben-xi", displayName: "阿本希", aliases: [], teamMember: false },
  { id: "shui-jiao-de-aho", displayName: "睡觉的Aho", aliases: [], teamMember: false },
  { id: "daniel-stoljar", displayName: "Daniel Stoljar", aliases: [], teamMember: false },
  { id: "nic-damnjanovic", displayName: "Nic Damnjanovic", aliases: [], teamMember: false },
  { id: "luanzhao", displayName: "luanzhao", aliases: [], teamMember: false },
  { id: "yiban-tongguo-anima", displayName: "一般通过ANIMA", aliases: [], teamMember: false },
  { id: "qiguai-de-a-fa-nan-yuan", displayName: "奇怪的阿法南猿", aliases: [], teamMember: false },
  { id: "aho", displayName: "aho", aliases: [], teamMember: false },
  { id: "ban-jiu", displayName: "斑鸠", aliases: [], teamMember: false },
  {
    id: "you-hen-duo-mei-yong-de-shu-de-xue-wen-shao-nian",
    displayName: "有很多没用的书的学文少年",
    aliases: [],
    teamMember: false,
  },
  { id: "va-11-hall-a", displayName: "Va-11 Hall-A", aliases: [], teamMember: false },
  { id: "yun-he-you-quan", displayName: "運河遊犬", aliases: [], teamMember: false },
  { id: "linda-zagzebski", displayName: "Linda Zagzebski", aliases: [], teamMember: false },
  { id: "mao-da-meng", displayName: "猫大猛", aliases: [], teamMember: false },
  { id: "ji", displayName: "吉", aliases: [], teamMember: false },
  { id: "zhi-bu-shao", displayName: "治部少", aliases: [], teamMember: false },
  { id: "crossroad", displayName: "crossroad", aliases: [], teamMember: false },
  { id: "wan-zhong-song-bie-ci-ri", displayName: "晚钟送别此日", aliases: [], teamMember: false },
  { id: "theo-m-v-janssen", displayName: "Theo M. V. Janssen", aliases: [], teamMember: false },
  { id: "cjy", displayName: "cjy", aliases: [], teamMember: false },
  { id: "zoltan-gendler-szabo", displayName: "Zoltán Gendler Szabó", aliases: [], teamMember: false },
  { id: "zz", displayName: "zz", aliases: [], teamMember: false },
  { id: "zhe-kou", displayName: "折口", aliases: [], teamMember: false },
  { id: "oliver-perez-latorre", displayName: "Óliver Pérez-Latorre", aliases: [], teamMember: false },
  { id: "zhe-ge", displayName: "哲哥", aliases: [], teamMember: false },
  { id: "stephen-houlgate", displayName: "Stephen Houlgate", aliases: [], teamMember: false },
  { id: "you-dian-pai-pai", displayName: "有电拍拍", aliases: [], teamMember: false },
  { id: "an-hei-han-bing", displayName: "暗黑寒冰", aliases: [], teamMember: false },
  { id: "ayanami-rei", displayName: "绫波丽", aliases: [], teamMember: false },
  { id: "hannes-leitgeb", displayName: "Hannes Leitgeb", aliases: [], teamMember: false },
  { id: "andre-carus", displayName: "André Carus", aliases: [], teamMember: false },
  { id: "meowth", displayName: "Meowth", aliases: [], teamMember: false },
  { id: "shui-xiao-gui-koni", displayName: "水小鬼koni", aliases: [], teamMember: false },
  { id: "lin-chuan-deng-luo", displayName: "林川登罗", aliases: [], teamMember: false },
  { id: "andrew-bowie", displayName: "Andrew Bowie", aliases: [], teamMember: false },
  { id: "he-xiao-feng", displayName: "何啸风", aliases: [], teamMember: false },
  { id: "yan-guang", displayName: "艳光", aliases: [], teamMember: false },
  { id: "dan-zahavi", displayName: "Dan Zahavi", aliases: [], teamMember: false },
  { id: "fei-fei", displayName: "飞飞", aliases: [], teamMember: false },
  { id: "a-xi", displayName: "阿惜", aliases: [], teamMember: false },
  { id: "wo-da-xiao-san-sheng-ha-ha-ha", displayName: "我大笑三声哈哈哈", aliases: [], teamMember: false },
  { id: "wasted", displayName: "Wasted.", aliases: [], teamMember: false },
  { id: "zhen-hong", displayName: "真红", aliases: [], teamMember: false },
  { id: "xi-wen", displayName: "希文", aliases: [], teamMember: false },
  { id: "s-c", displayName: "S.C.", aliases: [], teamMember: false },
  { id: "raymond", displayName: "Raymond", aliases: [], teamMember: false },
  { id: "sasaki-shinsaku", displayName: "笹木信作", aliases: [], teamMember: false },
  { id: "daicon", displayName: "daicon", aliases: [], teamMember: false },
  { id: "scout", displayName: "スカウト", aliases: [], teamMember: false },
  { id: "a-ya", displayName: "啊呀", aliases: [], teamMember: false },
  { id: "sasaki-atsushi", displayName: "佐佐木敦", aliases: [], teamMember: false },
  { id: "mi-gang", displayName: "米岡", aliases: [], teamMember: false },
  { id: "ren-ji-er-lang", displayName: "人吉尔朗", aliases: [], teamMember: false },
  { id: "de-ye-you-wo", displayName: "德野悠我", aliases: [], teamMember: false },
  { id: "guo-ke-li-de-mo-mo", displayName: "果壳里的墨墨", aliases: [], teamMember: false },
  { id: "qing-jin-metalh", displayName: "氢金_MetalH", aliases: [], teamMember: false },
  { id: "rocefactor", displayName: "rocefactor", aliases: [], teamMember: false },
  { id: "a-qi", displayName: "阿栖", aliases: [], teamMember: false },
  { id: "mou-bu-ke-xue-de-dou-bi", displayName: "某不科学的逗比", aliases: [], teamMember: false },
  { id: "brian-epstein", displayName: "Brian Epstein", aliases: [], teamMember: false },
  { id: "hufflepuff-piggy", displayName: "Hufflepuff piggy", aliases: [], teamMember: false },
] as const satisfies readonly Contributor[];

export type ContributorId = (typeof CONTRIBUTORS)[number]["id"];

const ASCII_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const contributorById = new Map<ContributorId, (typeof CONTRIBUTORS)[number]>();
const contributorByName = new Map<string, (typeof CONTRIBUTORS)[number]>();

function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("zh-CN");
}

for (const contributor of CONTRIBUTORS) {
  if (!ASCII_ID_RE.test(contributor.id)) {
    throw new Error(`Contributor id must be lowercase ASCII kebab-case: ${contributor.id}`);
  }
  if (contributorById.has(contributor.id)) {
    throw new Error(`Duplicate contributor id: ${contributor.id}`);
  }
  contributorById.set(contributor.id, contributor);

  for (const name of [contributor.displayName, ...contributor.aliases]) {
    const normalized = normalizeName(name);
    const existing = contributorByName.get(normalized);
    if (existing && existing.id !== contributor.id) {
      throw new Error(`Contributor name or alias is ambiguous: ${name}`);
    }
    contributorByName.set(normalized, contributor);
  }
}

export function isContributorId(value: string): value is ContributorId {
  return contributorById.has(value as ContributorId);
}

export function getContributor(id: ContributorId): (typeof CONTRIBUTORS)[number] {
  const contributor = contributorById.get(id);
  if (!contributor) throw new Error(`Unknown contributor id: ${id}`);
  return contributor;
}

export function findContributor(id: string): (typeof CONTRIBUTORS)[number] | null {
  return contributorById.get(id as ContributorId) ?? null;
}

export function findContributorByName(name: string): (typeof CONTRIBUTORS)[number] | null {
  return contributorByName.get(normalizeName(name)) ?? null;
}

export function contributorEntityType(id: string): "person" | "organization" {
  const contributor = contributorById.get(id as ContributorId) as Contributor | undefined;
  return contributor?.entityType ?? "person";
}

export function getTeamMembers(): Contributor[] {
  return (CONTRIBUTORS as readonly Contributor[]).filter((contributor) => contributor.teamMember).sort(
    (a, b) => (a.teamOrder ?? Number.MAX_SAFE_INTEGER) - (b.teamOrder ?? Number.MAX_SAFE_INTEGER)
  );
}

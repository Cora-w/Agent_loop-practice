import type { CaseData } from "../types";

// =====================================================================
// 案件一：深夜实验室谜案
// =====================================================================
const labCase: CaseData = {
  id: "lab-night",
  title: "深夜实验室谜案",
  icon: "验",
  difficulty: "★★☆",
  tagline: "凌晨两点，生物楼三层的灯还亮着，有人再也没能走出来。",
  brief:
    "凌晨 2:17，值班管理员报警：大三学生李明倒在生物实验楼 305 实验室门口，头部遭钝器重击，送医途中不治身亡。当晚实验楼内只有少数人员出入，与李明有交集的四个人都成了嫌疑人。",
  time: "凌晨 2:17（报警时间）",
  location: "生物实验楼三层 305 实验室门口",
  suspects: [
    { id: "zhangwei", name: "张薇", role: "实验室管理员 / 当晚值班", info: "34 岁，负责三楼设备与安全巡查，第一个发现李明倒地并报警的人。" },
    { id: "chenhao", name: "陈浩", role: "研究生师兄", info: "26 岁，博士二年级，与李明同一课题组，两人正合作一篇即将投稿的论文。" },
    { id: "wanglin", name: "王琳", role: "死者女友", info: "21 岁，生物系学生，与李明交往一年，自称当晚在图书馆等他。" },
    { id: "zhaoqiang", name: "赵强", role: "外校访问学生", info: "23 岁，这一周在 305 协助李明处理实验数据，住在学校招待所。" },
  ],
  neutralCards: [
    {
      id: "lab-n-autopsy",
      kind: "evidence",
      title: "法医初步结论",
      content: "李明死于后脑钝器重击，死亡时间在 02:05 至 02:15 之间。现场没有搏斗痕迹，凶手很可能是从背后突然袭击。",
      suspectIds: [],
    },
    {
      id: "lab-n-weapon",
      kind: "evidence",
      title: "凶器：干燥箱扳手",
      content: "凶器是 305 工具墙上的大号干燥箱扳手，被擦拭后藏在三楼东侧楼梯间的消防栓箱背后，没有提取到清晰指纹。",
      suspectIds: [],
    },
    {
      id: "lab-n-cctv",
      kind: "evidence",
      title: "走廊监控片段",
      content: "02:08 一个戴鸭舌帽、穿深色外套的人从东侧楼梯间走向 305，手里垂着一根长条状物体；02:12 快步返回楼梯间。画面模糊，看不清脸。",
      suspectIds: [],
    },
    {
      id: "lab-s-zhangwei",
      kind: "plot",
      title: "张薇的证词",
      content: "「1 点 50 分我巡查了一遍三楼，305 的灯还亮着，我没进去。之后我一直在值班室核对登记表，2 点 15 分出来上洗手间，就看到李明倒在门口。」",
      suspectIds: ["zhangwei"],
    },
    {
      id: "lab-s-chenhao",
      kind: "plot",
      title: "陈浩的证词",
      content: "「我整晚在隔壁 306 做细胞培养，1 点 40 分左右做完就走了，经过 305 门口时门关着。论文署名的事我们有分歧，但只是学术讨论。」",
      suspectIds: ["chenhao"],
    },
    {
      id: "lab-s-wanglin",
      kind: "plot",
      title: "王琳的证词",
      content: "「我们约好 11 点在图书馆自习室一起复习，我从 10 点半一直等到 2 点多，他都没来，消息也不回。我中途没有离开过。」",
      suspectIds: ["wanglin"],
    },
    {
      id: "lab-s-zhaoqiang",
      kind: "plot",
      title: "赵强的证词",
      content: "「我晚上在 305 帮李明整理数据，9 点左右就走了，回招待所写报告，之后一直在房间里。我和李明只是合作关系，处得很好。」",
      suspectIds: ["zhaoqiang"],
    },
  ],
  kits: [
    {
      suspectId: "zhangwei",
      suspicion: [
        {
          id: "lab-zw-s1",
          kind: "plot",
          title: "张薇与李明的旧怨",
          content: "上个月李明向学院举报张薇私自把实验设备借给校外公司牟利，张薇因此被扣了半年绩效，正面临调岗。",
          suspectIds: ["zhangwei"],
        },
        {
          id: "lab-zw-s2",
          kind: "evidence",
          title: "值班登记的空白",
          content: "值班登记本上张薇平时每 15 分钟记录一次，但 01:56 到 02:15 之间没有任何记录。",
          suspectIds: ["zhangwei"],
        },
      ],
      proof: [
        {
          id: "lab-zw-p1",
          kind: "evidence",
          title: "被遮挡的值班室监控",
          content: "值班室门口的摄像头在 02:05 至 02:14 被一件外套挡住，之后外套被取走。画面边缘露出的手腕上戴着张薇的工作手环。",
          suspectIds: ["zhangwei"],
        },
        {
          id: "lab-zw-p2",
          kind: "evidence",
          title: "张薇柜子里的外套",
          content: "张薇值班室柜子里的深色外套袖口检出李明的血迹，口袋里塞着一顶鸭舌帽。",
          suspectIds: ["zhangwei"],
        },
        {
          id: "lab-zw-p3",
          kind: "evidence",
          title: "工具借用登记",
          content: "305 工具墙的借用登记上，干燥箱扳手最后一条记录是张薇 01:50 的签名，事由写着「设备检修」，此后没有归还记录。",
          suspectIds: ["zhangwei"],
        },
      ],
    },
    {
      suspectId: "chenhao",
      suspicion: [
        {
          id: "lab-ch-s1",
          kind: "plot",
          title: "论文署名之争",
          content: "陈浩多次要求李明撤回投稿、改由他做第一作者，被李明拒绝。组里的人都知道两人关系很僵。",
          suspectIds: ["chenhao"],
        },
        {
          id: "lab-ch-s2",
          kind: "plot",
          title: "陈浩打听李明行踪",
          content: "当晚 21:15，陈浩给赵强发消息：「李明今晚是不是一个人在 305？」",
          suspectIds: ["chenhao", "zhaoqiang"],
        },
      ],
      proof: [
        {
          id: "lab-ch-p1",
          kind: "evidence",
          title: "305 与大楼门禁记录",
          content: "陈浩 23:42 刷卡进入的是 305 而不是 306，01:43 离开 305；306 当晚没有任何刷卡记录。大楼门禁显示陈浩直到 02:24 才从侧门出楼。",
          suspectIds: ["chenhao"],
        },
        {
          id: "lab-ch-p2",
          kind: "evidence",
          title: "李明手机最后一条消息",
          content: "01:58 李明给陈浩发消息：「论文的事我来处理，明天我直接找导师说清楚。」陈浩 02:01 已读，没有回复。",
          suspectIds: ["chenhao"],
        },
        {
          id: "lab-ch-p3",
          kind: "evidence",
          title: "陈浩宿舍的外套",
          content: "陈浩宿舍里一件深灰色连帽外套的袖口检出李明的血迹，衣柜里有一顶鸭舌帽。",
          suspectIds: ["chenhao"],
        },
      ],
    },
    {
      suspectId: "wanglin",
      suspicion: [
        {
          id: "lab-wl-s1",
          kind: "plot",
          title: "李明提出分手",
          content: "王琳的室友说，李明前两天提出分手，王琳当晚在宿舍楼下哭着说：「他别想就这么甩了我。」",
          suspectIds: ["wanglin"],
        },
        {
          id: "lab-wl-s2",
          kind: "plot",
          title: "王琳熟悉 305",
          content: "王琳大二时在 305 做过半年实验助理，知道工具墙上每件工具放在哪里。",
          suspectIds: ["wanglin"],
        },
      ],
      proof: [
        {
          id: "lab-wl-p1",
          kind: "evidence",
          title: "图书馆自习室刷卡记录",
          content: "王琳 01:52 刷卡离开自习室，02:21 才刷卡回来，并非她所说的整晚没有离开。图书馆到实验楼步行约 6 分钟。",
          suspectIds: ["wanglin"],
        },
        {
          id: "lab-wl-p2",
          kind: "evidence",
          title: "实验楼东侧门门禁",
          content: "02:04 王琳的校园卡在实验楼东侧门刷卡进入，东侧门紧挨着东侧楼梯间；02:14 再次刷卡离开。",
          suspectIds: ["wanglin"],
        },
        {
          id: "lab-wl-p3",
          kind: "evidence",
          title: "图书馆储物柜",
          content: "王琳的图书馆储物柜里搜出一顶鸭舌帽和一件深色外套，外套袖口有李明的血迹。",
          suspectIds: ["wanglin"],
        },
      ],
    },
    {
      suspectId: "zhaoqiang",
      suspicion: [
        {
          id: "lab-zq-s1",
          kind: "plot",
          title: "数据造假的把柄",
          content: "李明发现赵强在合作数据里篡改过荧光定量结果，打算周一告诉赵强的导师，这可能让赵强失去保研资格。",
          suspectIds: ["zhaoqiang"],
        },
        {
          id: "lab-zq-s2",
          kind: "plot",
          title: "赵强常用那把扳手",
          content: "这一周赵强每天都在 305 帮忙，多次用工具墙上的干燥箱扳手拧过干燥箱螺栓。",
          suspectIds: ["zhaoqiang"],
        },
      ],
      proof: [
        {
          id: "lab-zq-p1",
          kind: "evidence",
          title: "招待所前台记录",
          content: "赵强 21:20 入住招待所后，01:45 又外出，02:30 才回来。前台值班员记得他戴着一顶鸭舌帽。",
          suspectIds: ["zhaoqiang"],
        },
        {
          id: "lab-zq-p2",
          kind: "evidence",
          title: "赵强的手机定位",
          content: "赵强手机在 02:03 至 02:15 的定位显示在生物实验楼附近，而不是招待所。",
          suspectIds: ["zhaoqiang"],
        },
        {
          id: "lab-zq-p3",
          kind: "evidence",
          title: "楼梯间鞋印",
          content: "东侧楼梯间留下一串 43 码运动鞋鞋印，鞋底花纹与赵强当晚穿的鞋完全一致，鞋印边缘沾有血迹。",
          suspectIds: ["zhaoqiang"],
        },
      ],
    },
  ],
};

// =====================================================================
// 案件二：消失的配方
// =====================================================================
const recipeCase: CaseData = {
  id: "lost-recipe",
  title: "消失的配方",
  icon: "方",
  difficulty: "★★★",
  tagline: "新品发布前夜，保险柜完好无损，配方却不翼而飞。",
  brief:
    "茶饮品牌「青岚」计划次日举办新品发布会，主打产品「雾山白桃乌龙」的配方原件存放在研发部保险柜中。发布会前夜 21:30，研发助理发现配方原件不见了，保险柜没有任何撬动痕迹。同一时间，竞品「茗悦」被曝下周将上线一款口味高度相似的新品。",
  time: "发布会前夜 19:00 至 21:30",
  location: "青岚茶饮总部 五层研发部",
  suspects: [
    { id: "linfang", name: "林芳", role: "研发总监 / 配方原创者", info: "38 岁，带团队花两年研发出这款配方，掌握保险柜的密码。" },
    { id: "zhouming", name: "周明", role: "市场经理", info: "32 岁，负责本次发布会筹备，当天下午起在三楼会议室与广告公司开会。" },
    { id: "suyu", name: "苏雨", role: "研发助理", info: "25 岁，入职一年，保管研发室钥匙，知道保险柜日常密码。" },
    { id: "chenzong", name: "陈总", role: "公司 CEO", info: "45 岁，公司创始人，当天在外地出差，掌握保险柜备用密码。" },
  ],
  neutralCards: [
    {
      id: "rc-n-safe",
      kind: "evidence",
      title: "保险柜开启日志",
      content: "18:02 保险柜被锁上；19:12 被打开，19:14 再次锁上；21:32 苏雨打开时发现配方不见了。保险柜没有任何撬动痕迹。",
      suspectIds: [],
    },
    {
      id: "rc-n-cctv",
      kind: "evidence",
      title: "研发部走廊监控片段",
      content: "19:12 一个戴口罩和帽子的人进入研发室，19:15 拿着一个牛皮纸文件袋离开。画面角度不好，看不清体貌。",
      suspectIds: [],
    },
    {
      id: "rc-n-rival",
      kind: "plot",
      title: "竞品的动向",
      content: "茗悦茶饮下周将上线一款名为「白桃雾乌龙」的新品，业内人士称口味与青岚的新品几乎一样。",
      suspectIds: [],
    },
    {
      id: "rc-s-linfang",
      kind: "plot",
      title: "林芳的证词",
      content: "「傍晚 6 点左右我把配方放回保险柜锁好就回家了，一直在家准备明天的讲稿。保险柜的备用密码只有我和陈总知道。」",
      suspectIds: ["linfang"],
    },
    {
      id: "rc-s-zhouming",
      kind: "plot",
      title: "周明的证词",
      content: "「我从下午 1 点到晚上 9 点都在三楼会议室跟广告公司开会，中途只出去接过一次热水，不到五分钟。研发部在五楼，我今天没上去过。」",
      suspectIds: ["zhouming"],
    },
    {
      id: "rc-s-suyu",
      kind: "plot",
      title: "苏雨的证词",
      content: "「我加班整理资料，7 点 40 分左右锁门离开。9 点半回来拿东西，才发现配方没了。我只知道日常密码，不知道备用密码。」",
      suspectIds: ["suyu"],
    },
    {
      id: "rc-s-chenzong",
      kind: "plot",
      title: "陈总的证词",
      content: "「我今天一整天都在杭州谈合作，晚上 9 点多的航班才落地，直接回家了，根本没回公司。配方丢了对我打击最大。」",
      suspectIds: ["chenzong"],
    },
  ],
  kits: [
    {
      suspectId: "linfang",
      suspicion: [
        {
          id: "rc-lf-s1",
          kind: "plot",
          title: "林芳将被调岗",
          content: "公司计划在发布会后把配方交给外部代工厂，林芳将被调离研发总监岗位。她在内部邮件里写过：「这是我的配方，我不会让它就这样被拿走。」",
          suspectIds: ["linfang"],
        },
        {
          id: "rc-lf-s2",
          kind: "plot",
          title: "林芳掌握所有密码",
          content: "保险柜的日常密码由林芳设定，备用密码也只有她和陈总知道，她是最熟悉这台保险柜的人。",
          suspectIds: ["linfang"],
        },
      ],
      proof: [
        {
          id: "rc-lf-p1",
          kind: "evidence",
          title: "地下车库记录",
          content: "林芳的车 18:06 驶离车库后，19:05 又开了回来，19:20 再次离开。她说自己 6 点后一直在家。",
          suspectIds: ["linfang"],
        },
        {
          id: "rc-lf-p2",
          kind: "evidence",
          title: "林芳的员工卡",
          content: "19:09 林芳的员工卡刷开了五楼研发部的侧门，19:16 再次刷卡离开。",
          suspectIds: ["linfang"],
        },
        {
          id: "rc-lf-p3",
          kind: "evidence",
          title: "林芳与茗悦的邮件",
          content: "林芳的私人邮箱里有与茗悦人事总监的往来：「带着雾山白桃乌龙的配方入职，年薪翻倍，下周一报到。」",
          suspectIds: ["linfang"],
        },
      ],
    },
    {
      suspectId: "zhouming",
      suspicion: [
        {
          id: "rc-zm-s1",
          kind: "plot",
          title: "周明的业绩压力",
          content: "周明负责的上季度营销项目严重超支，财务正在追责，他私下说过「这份工作快保不住了」。",
          suspectIds: ["zhouming"],
        },
        {
          id: "rc-zm-s2",
          kind: "plot",
          title: "周明中途离席",
          content: "广告公司的人回忆，周明大约 19:05 离开会议室，过了十几分钟才回来，说是去接热水。",
          suspectIds: ["zhouming"],
        },
      ],
      proof: [
        {
          id: "rc-zm-p1",
          kind: "evidence",
          title: "消防通道门禁",
          content: "19:10 周明的员工卡刷开了五楼研发部的消防通道门，19:16 从同一扇门离开。",
          suspectIds: ["zhouming"],
        },
        {
          id: "rc-zm-p2",
          kind: "evidence",
          title: "周明的手机相册",
          content: "周明手机里有一张保险柜日常密码便签的照片，拍摄于三周前，拍摄地点是苏雨的工位；还有一张研发室钥匙的特写照片。",
          suspectIds: ["zhouming", "suyu"],
        },
        {
          id: "rc-zm-p3",
          kind: "evidence",
          title: "周明的入账",
          content: "当晚 20:30，周明的私人账户收到一笔来自茗悦关联公司的 30 万元转账，备注「咨询费」。",
          suspectIds: ["zhouming"],
        },
      ],
    },
    {
      suspectId: "suyu",
      suspicion: [
        {
          id: "rc-sy-s1",
          kind: "plot",
          title: "苏雨的债务",
          content: "苏雨的信用卡已逾期近 8 万元，同事说她最近常接到催收电话，躲在楼梯间里哭。",
          suspectIds: ["suyu"],
        },
        {
          id: "rc-sy-s2",
          kind: "evidence",
          title: "工位上的纸条",
          content: "苏雨工位的键盘下发现一张纸条：「配方已到手，周五老地方交接，尾款照旧。」",
          suspectIds: ["suyu"],
        },
      ],
      proof: [
        {
          id: "rc-sy-p1",
          kind: "evidence",
          title: "笔迹鉴定",
          content: "纸条上的笔迹与苏雨日常工作记录的笔迹一致，纸条上还提取到了苏雨的指纹。",
          suspectIds: ["suyu"],
        },
        {
          id: "rc-sy-p2",
          kind: "evidence",
          title: "苏雨的聊天记录",
          content: "苏雨手机里与茗悦采购经理的聊天：「今晚七点后人都走了我就拿，周五交接。」对方回复：「尾款按约定给。」",
          suspectIds: ["suyu"],
        },
        {
          id: "rc-sy-p3",
          kind: "evidence",
          title: "苏雨出租屋的文件袋",
          content: "在苏雨出租屋的衣柜里找到一个牛皮纸文件袋，里面正是「雾山白桃乌龙」的配方原件。",
          suspectIds: ["suyu"],
        },
      ],
    },
    {
      suspectId: "chenzong",
      suspicion: [
        {
          id: "rc-cz-s1",
          kind: "plot",
          title: "公司资金链告急",
          content: "公司融资受阻，账上的钱只够撑两个月，陈总个人还为公司贷款做了大额担保。",
          suspectIds: ["chenzong"],
        },
        {
          id: "rc-cz-s2",
          kind: "plot",
          title: "陈总与茗悦的交情",
          content: "茗悦副总裁李某是陈总的大学同学，上个月有人在饭局上看到两人单独离席谈了很久。",
          suspectIds: ["chenzong"],
        },
      ],
      proof: [
        {
          id: "rc-cz-p1",
          kind: "evidence",
          title: "航班与电梯卡记录",
          content: "陈总的航班 16:40 就已落地，而不是他说的晚上 9 点。19:09 他的 CEO 电梯卡在地下车库启用，19:10 电梯停在五楼研发部。",
          suspectIds: ["chenzong"],
        },
        {
          id: "rc-cz-p2",
          kind: "evidence",
          title: "陈总的短信",
          content: "18:55 茗悦副总裁发来短信：「东西准备好了吗？」陈总回复：「半小时后，老地方。」20:30 他收到一笔境外到账。",
          suspectIds: ["chenzong"],
        },
        {
          id: "rc-cz-p3",
          kind: "evidence",
          title: "备用密码记录",
          content: "保险柜后台显示 19:12 是用备用密码打开的。备用密码只有陈总和林芳知道，而林芳 18:06 离开大楼后再没有回来。",
          suspectIds: ["chenzong", "linfang"],
        },
      ],
    },
  ],
};

// =====================================================================
// 案件三：剧场的最后一幕
// =====================================================================
const theaterCase: CaseData = {
  id: "final-act",
  title: "剧场的最后一幕",
  icon: "幕",
  difficulty: "★★★",
  tagline: "掌声还未响起，女主角已在聚光灯下倒下。",
  brief:
    "话剧《雾港》首演当晚，第三幕进行到一半时，女主角宋雪在饮下道具红酒后不久抽搐倒地，送医后确认死于乌头碱中毒。现场 600 名观众目睹了这一幕。剧组里与宋雪关系密切的四个人成了嫌疑人。",
  time: "首演当晚 20:52（宋雪倒地）",
  location: "城南大剧院 主舞台",
  suspects: [
    { id: "fangyuan", name: "方远", role: "导演", info: "47 岁，《雾港》导演，案发时说自己在右侧台盯换场。" },
    { id: "liuxin", name: "刘鑫", role: "男主角", info: "31 岁，第三幕全程在台上，宋雪倒下时离她只有两米。" },
    { id: "xiaolu", name: "小鹿", role: "道具师", info: "24 岁，第三幕的红酒是她倒的，酒杯也是她摆上台的。" },
    { id: "zhaowen", name: "赵雯", role: "女主角替补", info: "27 岁，当晚没有上台任务，自称一直坐在观众席。" },
  ],
  neutralCards: [
    {
      id: "th-n-poison",
      kind: "evidence",
      title: "毒物检测",
      content: "宋雪死于乌头碱中毒，毒物在第三幕道具红酒杯的残液中检出。乌头碱无色无味，混入酒里无法察觉。杯身只有小鹿和宋雪的指纹。",
      suspectIds: [],
    },
    {
      id: "th-n-blackout",
      kind: "evidence",
      title: "换场黑灯",
      content: "20:39 换场时舞台意外全黑约 12 秒（按脚本只该暗 3 秒）。红外画面里能看到有人靠近放酒杯的小圆桌停留了几秒，但看不清是谁。20:45 宋雪喝下杯中的酒。",
      suspectIds: [],
    },
    {
      id: "th-s-fangyuan",
      kind: "plot",
      title: "方远的证词",
      content: "「第三幕前后我一直在右侧台盯换场，提词员老周就在我旁边。灯突然黑了十几秒，我还以为是电闸出了问题。」",
      suspectIds: ["fangyuan"],
    },
    {
      id: "th-s-liuxin",
      kind: "plot",
      title: "刘鑫的证词",
      content: "「黑灯那十几秒我一直站在自己的地标上，黑暗里好像听见左边有很轻的脚步声。20 点 52 分她突然发抖倒下，我第一个冲过去扶她。」",
      suspectIds: ["liuxin"],
    },
    {
      id: "th-s-xiaolu",
      kind: "plot",
      title: "小鹿的证词",
      content: "「酒是我 20 点 30 分在道具间倒的，34 分端上去放在小圆桌上，之后我去右侧台准备下一幕的道具，再没碰过那个杯子。」",
      suspectIds: ["xiaolu"],
    },
    {
      id: "th-s-zhaowen",
      kind: "plot",
      title: "赵雯的证词",
      content: "「我今晚只是替补，没有上台任务，从开场起就坐在观众席第七排，一次都没离开过。宋雪姐倒下时我也吓坏了。」",
      suspectIds: ["zhaowen"],
    },
  ],
  kits: [
    {
      suspectId: "fangyuan",
      suspicion: [
        {
          id: "th-fy-s1",
          kind: "plot",
          title: "导演与女主角的争吵",
          content: "排练期间方远和宋雪多次为剧本改动激烈争吵，宋雪扬言首演后就找投资方换掉导演。",
          suspectIds: ["fangyuan"],
        },
        {
          id: "th-fy-s2",
          kind: "evidence",
          title: "方远的日记",
          content: "导演室抽屉里方远的日记写着：「她必须从这部戏里消失，我受够了。」落款日期是本月。",
          suspectIds: ["fangyuan"],
        },
      ],
      proof: [
        {
          id: "th-fy-p1",
          kind: "plot",
          title: "提词员改口",
          content: "提词员老周承认，20:38 到 20:41 方远并不在右侧台，「他说要去左边看看灯」。",
          suspectIds: ["fangyuan"],
        },
        {
          id: "th-fy-p2",
          kind: "evidence",
          title: "方远口袋里的手套",
          content: "方远外套口袋里有一副黑色薄手套，内侧检出乌头碱残留。",
          suspectIds: ["fangyuan"],
        },
        {
          id: "th-fy-p3",
          kind: "evidence",
          title: "方远的网购记录",
          content: "方远的网购记录显示，20 天前他购买了一瓶「草乌提取液」，收货地址填的是自己家。",
          suspectIds: ["fangyuan"],
        },
      ],
    },
    {
      suspectId: "liuxin",
      suspicion: [
        {
          id: "th-lx-s1",
          kind: "plot",
          title: "旧情人的怨恨",
          content: "刘鑫和宋雪曾是恋人，宋雪半年前提出分手并公开了新恋情。刘鑫在朋友圈写过：「你会后悔的。」",
          suspectIds: ["liuxin"],
        },
        {
          id: "th-lx-s2",
          kind: "plot",
          title: "离酒杯最近的人",
          content: "按第三幕的调度，刘鑫站的位置离小圆桌只有一步之遥，是台上离那杯酒最近的人。",
          suspectIds: ["liuxin"],
        },
      ],
      proof: [
        {
          id: "th-lx-p1",
          kind: "evidence",
          title: "红外画面还原",
          content: "技术还原黑灯时的红外画面后发现，靠近小圆桌的人影是从舞台中央方向移过去的，并不是从侧台进来，身高与刘鑫一致。",
          suspectIds: ["liuxin"],
        },
        {
          id: "th-lx-p2",
          kind: "evidence",
          title: "戏服内袋的滴管瓶",
          content: "刘鑫戏服内袋里有一个空的小滴管瓶，瓶内残留乌头碱。",
          suspectIds: ["liuxin"],
        },
        {
          id: "th-lx-p3",
          kind: "evidence",
          title: "定时断电插座",
          content: "左侧台工作灯总闸上被人加装了一个定时断电插座，设定在 20:39 断电 12 秒。购买记录显示是刘鑫一周前买的。",
          suspectIds: ["liuxin"],
        },
      ],
    },
    {
      suspectId: "xiaolu",
      suspicion: [
        {
          id: "th-xl-s1",
          kind: "plot",
          title: "被当众羞辱的道具师",
          content: "上周宋雪当众把小鹿准备的道具摔在地上，要求剧组开除她。小鹿哭着对同事说：「总有一天让她好看。」",
          suspectIds: ["xiaolu"],
        },
        {
          id: "th-xl-s2",
          kind: "plot",
          title: "只有她碰过那杯酒",
          content: "那杯酒从倒酒到上台全程由小鹿经手，酒杯上除了宋雪只有小鹿的指纹。",
          suspectIds: ["xiaolu"],
        },
      ],
      proof: [
        {
          id: "th-xl-p1",
          kind: "evidence",
          title: "道具间垃圾桶",
          content: "道具间垃圾桶里找到一个滴管小瓶，瓶内残留乌头碱，瓶身上有小鹿的指纹。",
          suspectIds: ["xiaolu"],
        },
        {
          id: "th-xl-p2",
          kind: "plot",
          title: "舞台监督改口",
          content: "舞台监督承认，黑灯那十几秒里小鹿并不在右侧台，灯亮后才看到她从左侧台绕回来，她说是「去拿道具」。",
          suspectIds: ["xiaolu"],
        },
        {
          id: "th-xl-p3",
          kind: "evidence",
          title: "小鹿的手机",
          content: "小鹿手机里搜索过「乌头碱 致死量」，两周前网购过「草乌提取液」，收货人是她本人。",
          suspectIds: ["xiaolu"],
        },
      ],
    },
    {
      suspectId: "zhaowen",
      suspicion: [
        {
          id: "th-zw-s1",
          kind: "plot",
          title: "替补的野心",
          content: "赵雯是女主角的替补。只要宋雪无法演出，接下来的全部场次都会由她来演主角。",
          suspectIds: ["zhaowen"],
        },
        {
          id: "th-zw-s2",
          kind: "evidence",
          title: "日记的照片",
          content: "赵雯手机相册里有一张方远日记某一页的照片，拍摄于 9 天前。",
          suspectIds: ["zhaowen", "fangyuan"],
        },
      ],
      proof: [
        {
          id: "th-zw-p1",
          kind: "evidence",
          title: "后台签到表",
          content: "后台登记表显示赵雯 20:36 签入后台、20:42 签出，正好覆盖 20:39 的黑灯。两处签名的笔迹和她平时的签名明显不同。",
          suspectIds: ["zhaowen"],
        },
        {
          id: "th-zw-p2",
          kind: "evidence",
          title: "赵雯的搜索与备忘录",
          content: "赵雯手机里有「乌头碱 致死量」的搜索记录，16 天前网购过草乌提取液，备忘录里写着：「首演那天，第三幕，换场。」",
          suspectIds: ["zhaowen"],
        },
        {
          id: "th-zw-p3",
          kind: "evidence",
          title: "总闸上的香水",
          content: "左侧台工作灯总闸的把手上检出栀子花香水残留。剧组里只有赵雯用这个牌子的香水。",
          suspectIds: ["zhaowen"],
        },
      ],
    },
  ],
};

export const CASES: CaseData[] = [labCase, recipeCase, theaterCase];

export function getCaseById(id: string): CaseData | undefined {
  return CASES.find((c) => c.id === id);
}

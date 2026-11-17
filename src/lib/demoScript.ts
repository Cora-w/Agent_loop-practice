import type { Action } from "../types";

export interface DemoStep {
  thinking: string;
  action: Action;
}

// =====================================================================
// 案件一：深夜实验室谜案
// =====================================================================
const labScript: DemoStep[] = [
  {
    thinking:
      "凌晨两点的实验楼，人不会太多。先把案件全貌和所有在场人员摸清楚，再决定从谁入手。",
    action: { tool: "getCaseOverview", input: {} },
  },
  {
    thinking:
      "四名嫌疑人。张薇是第一发现人，也是唯一整晚在楼里值班的人，第一发现人往往掌握最关键的时间点，先从她开始。",
    action: { tool: "interrogateWitness", input: { name: "张薇" } },
  },
  {
    thinking:
      "张薇给出了非常精确的时间：1:50 巡查、1:56 回值班室、2:15 发现尸体，还主动提到值班室门口有摄像头，这种底气通常说明她不怕被查。接下来是与死者有论文署名冲突的师兄陈浩。",
    action: { tool: "interrogateWitness", input: { name: "陈浩" } },
  },
  {
    thinking:
      "陈浩说自己在 306 做实验，1:40 离开时只是「经过」305。他刻意强调「门是关着的、没看到任何人」，像是在提前把自己和 305 撇开。记下这一点，再听听女友王琳怎么说。",
    action: { tool: "interrogateWitness", input: { name: "王琳" } },
  },
  {
    thinking:
      "王琳提供了一个重要信息：李明说过师兄逼他让出一作，「不然就让他在组里待不下去」。这和陈浩口中的「正常学术讨论」差别很大。最后审问访问学生赵强。",
    action: { tool: "interrogateWitness", input: { name: "赵强" } },
  },
  {
    thinking:
      "赵强说 9 点就走了，还顺口提到「师兄晚点会过来对数据」——这和陈浩说自己一直在 306 直接冲突。四份证词收齐，现在看看手上有哪些物证。",
    action: { tool: "listAllEvidence", input: {} },
  },
  {
    thinking:
      "五件物证。门禁记录能直接检验每个人说的进出时间，是验证证词最硬的依据，先查它。",
    action: { tool: "examineEvidence", input: { evidenceName: "门禁记录" } },
  },
  {
    thinking:
      "问题出现了：陈浩 23:42 刷卡进入的是 305，不是 306，而且 306 当晚根本没有刷卡记录；他 01:43 才离开 305，大门记录显示 02:24 才出楼。他所谓的「经过」实际上是在 305 待了两个小时。再看走廊监控，确认 2 点前后发生了什么。",
    action: { tool: "examineEvidence", input: { evidenceName: "走廊监控" } },
  },
  {
    thinking:
      "02:08 一个戴帽人影拿着长条物从东侧楼梯间走向 305，02:12 快步返回；而张薇 01:56 到 02:15 一直没出值班室，她的证词被监控完全证实。那根「长条物」很可能就是凶器，检查扳手。",
    action: { tool: "examineEvidence", input: { evidenceName: "干燥箱扳手" } },
  },
  {
    thinking:
      "扳手原本挂在 305 的工具墙上，外人几乎不知道位置，被擦拭后藏在东侧楼梯间——正是人影往返的方向，也是陈浩 01:43 走去的方向。机会和凶器都指向他，接下来确认动机，看李明的手机。",
    action: { tool: "examineEvidence", input: { evidenceName: "李明手机" } },
  },
  {
    thinking:
      "01:58 李明给陈浩发了「明天我直接找导师说清楚」，陈浩 02:01 已读，七分钟后戴帽人影就出现了。时间链太紧密了。最后看实验记录本，确认两人冲突的具体内容。",
    action: { tool: "examineEvidence", input: { evidenceName: "实验记录本" } },
  },
  {
    thinking:
      "便签写明当晚陈浩逼李明撤回投稿、以他为一作重投，李明拒绝了。动机、机会、凶器都已经指向同一个人。做一次系统的交叉比对，确认没有遗漏的矛盾。",
    action: { tool: "crossCheckStatements", input: {} },
  },
  {
    thinking:
      "比对结果和我的判断一致，张薇、王琳、赵强都有可靠的不在场证明。指认前再完整回顾一遍线索，确保推理链没有缺口。",
    action: { tool: "reviewClues", input: {} },
  },
  {
    thinking: "证据链完整：动机、机会、凶器、撒谎、排除他人，全部闭合。可以指认了。",
    action: {
      tool: "makeAccusation",
      input: {
        suspect: "陈浩",
        reasoning:
          "动机：陈浩逼李明让出论文一作被拒，01:58 李明发消息要找导师说清楚，陈浩 02:01 已读，面临学术不端被揭发。机会：门禁证明他 23:42 进入 305 待到 01:43，并非证词中的「在 306、只是经过」；大门记录显示他直到 02:24 才出楼，完整覆盖 02:08—02:12 作案时间。证据：凶器是 305 工具墙上的扳手，只有熟悉 305 的人知道位置，被藏在东侧楼梯间，正是监控中戴帽人影往返的方向。排除：张薇 01:56—02:15 在值班室有监控证明；王琳整晚在图书馆；赵强 21:08 出楼、21:20 入住招待所。",
      },
    },
  },
];

// =====================================================================
// 案件二：消失的配方
// =====================================================================
const recipeScript: DemoStep[] = [
  {
    thinking:
      "保险柜没被撬，说明作案者懂得开柜方法——这是一起内部人员作案。先看案件全貌和嫌疑人名单。",
    action: { tool: "getCaseOverview", input: {} },
  },
  {
    thinking:
      "四个人里，能接触到配方的路径各不相同。先从配方原创者、也是知道密码的研发总监林芳开始。",
    action: { tool: "interrogateWitness", input: { name: "林芳" } },
  },
  {
    thinking:
      "林芳透露了关键信息：备用密码只有她和陈总两个人知道。这把作案范围一下子收窄了。她说 6 点就离开了，需要门禁核实。下一个，市场经理周明。",
    action: { tool: "interrogateWitness", input: { name: "周明" } },
  },
  {
    thinking:
      "周明声称从下午到晚上 9 点都在三楼会议室，有多人可以作证，研发部在五楼。这种多人见证的不在场证明比较容易核实。接着问保管钥匙的苏雨。",
    action: { tool: "interrogateWitness", input: { name: "苏雨" } },
  },
  {
    thinking:
      "苏雨有钥匙、知道日常密码，纸条也出现在她工位上——表面上她嫌疑最大。但她坚持不知道备用密码。如果保险柜是被备用密码打开的，她就很难做到。最后审问 CEO。",
    action: { tool: "interrogateWitness", input: { name: "陈总" } },
  },
  {
    thinking:
      "陈总说晚上 9 点多才落地、没回公司，还主动把矛头引向苏雨。一个刚刚失去核心资产的 CEO，第一反应是指认下属，有点刻意。看看有哪些物证。",
    action: { tool: "listAllEvidence", input: {} },
  },
  {
    thinking: "保险柜记录是本案的核心——它会告诉我们配方究竟是什么时候、用什么方式被取走的。",
    action: { tool: "examineEvidence", input: { evidenceName: "保险柜记录" } },
  },
  {
    thinking:
      "19:12 用备用密码开启，这是自设定以来第一次使用备用密码。知道它的只有林芳和陈总。接下来查监控，看 19:12 是谁出现在研发部。",
    action: { tool: "examineEvidence", input: { evidenceName: "走廊监控" } },
  },
  {
    thinking:
      "19:12 一名穿西装的男子从 CEO 专用电梯出来，身高约 178、戴金色腕表，拿走了一个牛皮纸袋。林芳 18:05 就离开了，而且是女性。需要用门禁记录确认电梯卡的持有人以及其他人的行踪。",
    action: { tool: "examineEvidence", input: { evidenceName: "大楼门禁记录" } },
  },
  {
    thinking:
      "19:09 CEO 电梯卡在地下车库启用，持卡人正是陈总；林芳 18:06 离楼后再没回来；周明的会议录音证明他 19:00—19:30 一直在发言。陈总说自己晚上 9 点才落地，看看他的通话记录。",
    action: { tool: "examineEvidence", input: { evidenceName: "陈总通话记录" } },
  },
  {
    thinking:
      "航班 16:40 就落地了，他在撒谎。更关键的是：18:55 茗悦副总裁问「东西准备好了吗」，他回「半小时后」——正好对上 19:12。还剩苏雨工位的纸条，看看它到底是谁留下的。",
    action: { tool: "examineEvidence", input: { evidenceName: "苏雨工位纸条" } },
  },
  {
    thinking:
      "笔迹不是苏雨的，纸张却是总裁办专用便签——这是栽赃，而且栽赃者能拿到总裁办的便签。再做一次交叉比对，把所有矛盾系统地梳理出来。",
    action: { tool: "crossCheckStatements", input: {} },
  },
  {
    thinking:
      "四处矛盾全部指向同一个人。指认前最后一次回顾，确认每个嫌疑人都已经被核实或排除。",
    action: { tool: "reviewClues", input: {} },
  },
  {
    thinking: "备用密码、电梯卡、监控、通话记录、栽赃纸条——五条线收束到一个人身上。指认。",
    action: {
      tool: "makeAccusation",
      input: {
        suspect: "陈总",
        reasoning:
          "动机：公司融资受阻、现金流紧张，陈总与竞品茗悦副总裁多次联系，18:55「东西准备好了吗」—「半小时后」，20:30 收到境外到账，意图出售配方。机会：他谎称晚上 9 点落地，实际 16:40 已到达；19:09 本人的 CEO 电梯卡在车库启用，19:12 保险柜被只有他和林芳知道的备用密码打开。证据：监控中从 CEO 专用电梯出来的西装男子身高约 178、戴金色腕表，与陈总吻合。栽赃：苏雨工位纸条笔迹不符，却使用总裁办专用便签，且他在证词中主动引导怀疑苏雨。排除：林芳 18:06 离楼未返；周明全程在会议室有录音和多人作证；苏雨不知道备用密码。",
      },
    },
  },
];

// =====================================================================
// 案件三：剧场的最后一幕
// =====================================================================
const theaterScript: DemoStep[] = [
  {
    thinking:
      "600 名观众眼前发生的毒杀，凶手必然利用了舞台上的某个盲区。先了解案情和所有相关人员。",
    action: { tool: "getCaseOverview", input: {} },
  },
  {
    thinking:
      "传闻中与死者矛盾最深的是导演方远，他案发时在侧台。先听听他的说法，同时留意他提到的任何舞台细节。",
    action: { tool: "interrogateWitness", input: { name: "方远" } },
  },
  {
    thinking:
      "方远提到一个重要异常：换场本该只暗三秒，结果黑了十几秒。这个黑暗间隙很可能就是投毒窗口。他还主动说日记日期被改过，有提词员作证。接下来问离死者最近的刘鑫。",
    action: { tool: "interrogateWitness", input: { name: "刘鑫" } },
  },
  {
    thinking:
      "刘鑫在黑暗中听到舞台左侧有轻微脚步声和玻璃碰桌声——有人在黑灯时摸到了酒杯旁。他自己说站在地标上没动，需要监控核实。下一个，准备酒杯的道具师小鹿。",
    action: { tool: "interrogateWitness", input: { name: "小鹿" } },
  },
  {
    thinking:
      "小鹿 20:34 把杯子放到左侧小圆桌后就去了右侧台。如果毒是在她倒酒时下的，那黑灯间隙里上台的人又是去做什么？最后审问替补赵雯。",
    action: { tool: "interrogateWitness", input: { name: "赵雯" } },
  },
  {
    thinking:
      "赵雯坚称一直坐在观众席第七排，没离开过座位，同时主动把矛头指向导演。她是最大受益者——宋雪倒下，她就能当主角。查物证，验证每个人的位置。",
    action: { tool: "listAllEvidence", input: {} },
  },
  {
    thinking: "先查毒物载体本身。酒杯检测能告诉我们毒是什么时候、以什么方式进入杯中的。",
    action: { tool: "examineEvidence", input: { evidenceName: "红酒杯检测" } },
  },
  {
    thinking:
      "毒物集中在液体上层，说明是倒酒之后滴入的，这在很大程度上减轻了小鹿的嫌疑；杯沿还有手套纤维擦痕。投毒者戴着手套，看舞台监控里黑灯那 12 秒发生了什么。",
    action: { tool: "examineEvidence", input: { evidenceName: "舞台监控" } },
  },
  {
    thinking:
      "黑灯是有人拉下了左侧台工作灯总闸。红外画面里一个戴手套的人从左侧台上台，在小圆桌前停了 4 秒。而小鹿和方远都在右侧台，刘鑫没动——三人可以排除。问题是：谁在 20:39 出现在左侧台？查后台签到表。",
    action: { tool: "examineEvidence", input: { evidenceName: "后台签到表" } },
  },
  {
    thinking:
      "赵雯 20:36 签入后台、20:42 签出，完整覆盖 20:39 的黑灯；她说的「洗手间」紧挨左侧台总闸；签名笔迹还被刻意改变了。她说自己从没离开座位，这是明确的谎言。查她的手机，寻找预谋证据。",
    action: { tool: "examineEvidence", input: { evidenceName: "赵雯手机" } },
  },
  {
    thinking:
      "三周前搜索乌头碱、16 天前购买草乌提取液、备忘录「首演那天，第三幕，换场」——蓄谋已久。相册里还有一张方远日记的照片。看看那本日记是怎么回事。",
    action: { tool: "examineEvidence", input: { evidenceName: "方远日记" } },
  },
  {
    thinking:
      "日记日期被新墨水涂改，原内容指向去年另一名演员——有人想把罪名嫁祸给导演，而拍下这一页的正是赵雯。系统地交叉比对一次，梳理全部矛盾。",
    action: { tool: "crossCheckStatements", input: {} },
  },
  {
    thinking: "四处矛盾互相印证。在指认前最后回顾全部线索，确保没有遗漏任何人的不在场证明。",
    action: { tool: "reviewClues", input: {} },
  },
  {
    thinking: "动机、预谋、作案窗口、栽赃，四条线全部闭合。最后一幕，该落幕了。",
    action: {
      tool: "makeAccusation",
      input: {
        suspect: "赵雯",
        reasoning:
          "动机：赵雯是女主角替补，宋雪无法演出她就能接替主演。预谋：三周前起搜索乌头碱致死量与可检测性，16 天前网购草乌提取液，备忘录写明「首演那天，第三幕，换场」。机会：她谎称整场未离开观众席，实则 20:36—20:42 用伪装笔迹签入后台，覆盖 20:39 的 12 秒黑灯；后台洗手间紧邻被拉下的左侧台工作灯总闸。证据：毒物集中在液体上层且杯沿有手套纤维，与监控中戴手套从左侧台上台、在小圆桌前停留 4 秒的人影吻合。栽赃：手机中有方远日记照片，日记日期被新墨水涂改，她在证词中还主动引导怀疑导演。排除：黑灯时小鹿和方远在右侧台，刘鑫在中央地标未动，均有红外监控为证。",
      },
    },
  },
];

export const DEMO_SCRIPTS: Record<string, DemoStep[]> = {
  "lab-night": labScript,
  "lost-recipe": recipeScript,
  "final-act": theaterScript,
};

/** 演示模式的节奏（毫秒） */
export const DEMO_TIMING = {
  beforeThinking: 600, // 进入步骤后，思考显示前
  afterThinking: 1200, // 思考显示后，执行行动前
  afterAction: 400, // 行动显示后，结果出现前
  afterResult: 1000, // 结果出现后，进入下一步前
};

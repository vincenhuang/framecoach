// 取景範本庫
// 每個範本：怎麼判斷畫面符合（match）、要把東西放到哪裡（target）、相機設定（zoom、bokeh）、拍法步驟（steps）
// 座標都是 0~1 的比例，原點在左上角

const cx = r => r.x + r.w / 2;

export const TEMPLATES = [
  {
    id: "corridor", name: "長廊・一點透視", short: "長廊",
    steps: ["站在走廊正中間", "手機放低到腰部", "消失點對準中央圓圈"],
    zoom: 1,
    match: f => f.vp && f.vp.strength > .2 && Math.abs(f.vp.x - .5) < .2 && Math.abs(f.vp.y - .5) < .3 ? .6 + f.vp.strength : 0,
    target: () => ({ vp: { x: .5, y: .5 } }),
    svg: `<path d="M0 0L24 34M60 0L36 34M0 80L24 46M60 80L36 46M8 0V80M52 0V80" /><rect x="24" y="34" width="12" height="12" class="t"/>`,
  },
  {
    id: "wall", name: "長牆・斜線延伸", short: "長牆",
    steps: ["貼近牆面站", "讓牆從畫面角落延伸出去", "消失點放到三分線上"],
    zoom: 1,
    match: f => f.vp && f.vp.strength > .18 && (f.vp.x < .3 || f.vp.x > .7) ? .55 + f.vp.strength : 0,
    target: f => ({ vp: { x: f.vp && f.vp.x < .5 ? 1 / 3 : 2 / 3, y: .45 } }),
    svg: `<path d="M0 0L40 32M0 80L40 44M0 20L40 35M0 60L40 41" /><circle cx="40" cy="38" r="4" class="t"/>`,
  },
  {
    id: "halfbody", name: "人像・半身", short: "半身人像",
    steps: ["用 2× 焦段，臉才不會變形", "眼睛放到上三分線", "臉朝的方向多留空間"],
    zoom: 2, bokeh: true,
    match: f => !f.face ? 0 : f.face.box.h > .12 ? .9 : f.face.box.h > .06 ? .55 : 0,
    target: f => ({ eyes: { x: f.face.turn > .15 ? 1 / 3 : f.face.turn < -.15 ? 2 / 3 : .5, y: 1 / 3 }, faceH: .16 }),
    svg: `<circle cx="30" cy="26" r="10"/><path d="M10 80C10 52 50 52 50 80"/><path d="M0 26.7H60" class="t"/>`,
  },
  {
    id: "fullbody", name: "人像・全身", short: "全身人像",
    steps: ["手機放低到腰部，腿會變長", "腳底貼近畫面下緣", "頭頂留一點點空間"],
    zoom: 1,
    match: f => f.person && f.person.h > .45 ? .8 : 0,
    target: () => ({ person: { top: .1, bottom: .95 } }),
    svg: `<circle cx="30" cy="14" r="5"/><path d="M30 19V48M30 48L22 74M30 48L38 74M30 26L20 40M30 26L40 40"/><path d="M0 8H60M0 76H60" class="t"/>`,
  },
  {
    id: "people-scene", name: "人與景", short: "人與景",
    steps: ["人放在左右三分點上", "人小一點，讓景說故事", "地平線放上三分線"],
    zoom: 1,
    match: f => f.subjectIsPerson && f.subjectBox && f.subjectBox.h < .45 && (f.horizon != null || (f.vp && f.vp.strength > .15) || f.sym > .6) ? .8 : 0,
    target: f => ({ subject: { x: f.subjectBox && cx(f.subjectBox) < .5 ? 1 / 3 : 2 / 3, y: .62 }, horizon: 1 / 3 }),
    svg: `<path d="M0 30H60M8 30L16 18L24 30M34 30L44 12L54 30"/><circle cx="20" cy="50" r="3"/><path d="M20 53V64" /><circle cx="20" cy="53.3" r="7" class="t"/>`,
  },
  {
    id: "landmark", name: "景點・對稱", short: "對稱景點",
    steps: ["走到建築的正中線", "手機保持垂直，別仰太多", "中線對齊畫面中央"],
    zoom: 1,
    match: f => !f.face && f.sym > .68 ? .45 + f.sym * .45 : 0,
    target: () => ({ axis: .5 }),
    svg: `<path d="M12 70V36L30 18L48 36V70ZM24 70V52H36V70"/><path d="M30 0V80" class="t"/>`,
  },
  {
    id: "landscape", name: "風景・地平線", short: "風景",
    steps: ["地平線放到三分線，別切中間", "天空漂亮就多留天空", "找一個前景增加層次"],
    zoom: 1,
    match: f => !f.face && f.horizon != null ? .5 : 0,
    target: f => ({ horizon: f.skyBright ? 2 / 3 : 1 / 3 }),
    svg: `<path d="M0 53H60M4 53L18 38L28 48L40 32L56 53"/><path d="M0 53.3H60" class="t"/>`,
  },
  {
    id: "frame", name: "框中框", short: "框中框",
    steps: ["用門、窗、拱門當外框", "主角放在框裡面", "對焦在框內的主角"],
    zoom: 1,
    match: f => f.frameDark > .15 ? .5 + f.frameDark : 0,
    target: () => ({ subject: { x: .5, y: .5 } }),
    svg: `<path d="M6 80V20Q30 0 54 20V80"/><circle cx="30" cy="50" r="5" class="t"/>`,
  },
  {
    id: "food-top", name: "美食・俯拍", short: "俯拍美食",
    steps: ["手機平舉在餐點正上方", "主菜放中間", "注意別拍到自己的影子"],
    zoom: 1,
    match: f => f.food && f.flat ? .9 : 0,
    target: () => ({ subject: { x: .5, y: .5 } }),
    svg: `<circle cx="30" cy="40" r="18"/><circle cx="30" cy="40" r="10"/><circle cx="30" cy="40" r="3" class="t"/>`,
  },
  {
    id: "food-45", name: "美食・45°", short: "45° 美食",
    steps: ["手機斜 45° 拍", "主菜放下三分線", "背景留一點餐廳氛圍"],
    zoom: 2, bokeh: true,
    match: f => f.food && !f.flat ? .85 : 0,
    target: () => ({ subject: { x: .5, y: 2 / 3 }, subjectH: .4 }),
    svg: `<ellipse cx="30" cy="54" rx="20" ry="8"/><path d="M14 52Q30 34 46 52"/><path d="M0 53.3H60" class="t"/>`,
  },
  {
    id: "pet", name: "寵物・平視", short: "寵物",
    steps: ["蹲到和牠一樣的高度", "對焦在眼睛", "牠看的方向多留空間"],
    zoom: 1,
    match: f => f.animal ? .85 : 0,
    target: () => ({ subject: { x: .5, y: .55 } }),
    svg: `<ellipse cx="30" cy="54" rx="16" ry="10"/><circle cx="30" cy="38" r="8"/><path d="M24 32L22 26M36 32L38 26"/><path d="M0 40H60" class="t"/>`,
  },
  {
    id: "object", name: "物品・特寫", short: "物品特寫",
    steps: ["靠近，讓物品占畫面 1/3", "放在左右三分點", "背景越單純越好"],
    zoom: 2, bokeh: true,
    match: f => f.object ? .6 : 0,
    target: f => ({ subject: { x: f.subjectBox && cx(f.subjectBox) < .5 ? 1 / 3 : 2 / 3, y: .5 }, subjectH: .35 }),
    svg: `<rect x="34" y="32" width="12" height="18" rx="2"/><path d="M20 0V80M40 0V80M0 26.7H60M0 53.3H60" class="g"/><circle cx="40" cy="41" r="10" class="t"/>`,
  },
];

/** 依畫面特徵排出符合的範本（分數高到低） */
export function rankTemplates(f) {
  return TEMPLATES.map(t => ({ t, score: t.match(f) || 0 }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** 範本示意圖（給範本清單用） */
export function templateSVG(t) {
  return `<svg viewBox="0 0 60 80" class="tpl-svg" aria-hidden="true">${t.svg}</svg>`;
}

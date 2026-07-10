export const manifest = {
  screens: {
    scr_9pa80g: { name: "Login / Unlock", route: "/login", position: {"x":160,"y":12100} },
    scr_fsw4jm: { name: "Library", route: "/library", position: {"x":160,"y":220} },
    scr_i2vnsu: { name: "Item · YouTube (weak)", route: "/item/2", position: {"x":1560,"y":220} },
    scr_9cwyp8: { name: "Item · PDF", route: "/item/5", position: {"x":2960,"y":220} },
    scr_uqjy5p: { name: "Item · Manual note", route: "/item/6", position: {"x":4360,"y":220} },
    scr_t2o4ve: { name: "Item · Full text", route: "/item/8", position: {"x":5760,"y":220} },
    scr_rw7f88: { name: "Weak Capture Repair", route: "/repair/2", position: {"x":160,"y":8140} },
    scr_utjr80: { name: "Share Capture Result", route: "/share-capture", position: {"x":1560,"y":2200} },
    scr_lolxln: { name: "Capture", route: "/capture", position: {"x":160,"y":2200} },
    scr_gdrx8k: { name: "Ask", route: "/ask", position: {"x":160,"y":4180} },
    scr_ajmznp: { name: "Needs Upgrade", route: "/needs-upgrade", position: {"x":7160,"y":220} },
    scr_e2ocha: { name: "More / Settings", route: "/more", position: {"x":160,"y":6160} },
    scr_yxk64d: { name: "Offline / Unreachable", route: "/offline", position: {"x":160,"y":10120} },
  },
  sections: {
    sec_4fjo27: { name: "Web Library Upgrade", x: 0, y: 0, width: 11320, height: 1180 },
    sec_j2horf: { name: "Web Capture", x: 0, y: 1980, width: 2920, height: 1180 },
    sec_ga6bph: { name: "Web Ask", x: 0, y: 3960, width: 1520, height: 1180 },
    sec_s5v61n: { name: "Web Settings", x: 0, y: 5940, width: 1520, height: 1180 },
    sec_qnhny1: { name: "Android Item Repair", x: 0, y: 7920, width: 8520, height: 1180 },
    sec_m5904y: { name: "Android Offline", x: 0, y: 9900, width: 1520, height: 1180 },
    sec_umnczv: { name: "Login / Unlock", x: 0, y: 11880, width: 2920, height: 1180 },
  },
  layers: [
    { kind: "section", id: "sec_4fjo27", children: [
      { kind: "screen", id: "scr_fsw4jm" },
      { kind: "screen", id: "scr_i2vnsu" },
      { kind: "screen", id: "scr_9cwyp8" },
      { kind: "screen", id: "scr_uqjy5p" },
      { kind: "screen", id: "scr_t2o4ve" },
      { kind: "screen", id: "scr_ajmznp" },
    ] },
    { kind: "section", id: "sec_j2horf", children: [
      { kind: "screen", id: "scr_lolxln" },
      { kind: "screen", id: "scr_utjr80" },
    ] },
    { kind: "section", id: "sec_ga6bph", children: [
      { kind: "screen", id: "scr_gdrx8k" },
    ] },
    { kind: "section", id: "sec_s5v61n", children: [
      { kind: "screen", id: "scr_e2ocha" },
    ] },
    { kind: "section", id: "sec_qnhny1", children: [
      { kind: "screen", id: "scr_rw7f88" },
    ] },
    { kind: "section", id: "sec_m5904y", children: [
      { kind: "screen", id: "scr_yxk64d" },
    ] },
    { kind: "section", id: "sec_umnczv", children: [
      { kind: "screen", id: "scr_9pa80g" },
    ] },
  ],
}

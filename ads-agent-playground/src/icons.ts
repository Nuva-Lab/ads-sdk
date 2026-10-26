const paths = {
  language: [
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18",
  ],
  plus: ["M12 5v14M5 12h14"],
  back: ["m12 5-7 7 7 7M5 12h14"],
  next: ["m12 5 7 7-7 7M5 12h14"],
  refresh: [
    "M3 12a9 9 0 0 1 9-9c2.5 0 4.7 1 6.3 2.7L21 8",
    "M21 3v5h-5",
    "M21 12a9 9 0 0 1-9 9c-2.5 0-4.7-1-6.3-2.7L3 16",
    "M3 21v-5h5",
  ],
  attach: ["m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8"],
  edit: ["m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-4-4L4 15z"],
  spark: ["m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"],
  image: ["M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4", "M15 8h.01"],
  video: ["M3 6h12v12H3zM15 10l6-4v12l-6-4"],
  audio: [
    "M9 18V5l11-2v13M9 8l11-2",
    "M9 18c0 2-6 3-6 0s6-3 6 0M20 16c0 2-6 3-6 0s6-3 6 0",
  ],
  layers: ["m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"],
  copy: ["M9 9h11v11H9zM15 9V4H4v11h5"],
  document: ["M6 3h8l4 4v14H6z", "M14 3v5h4M9 12h6M9 16h6"],
  code: ["m8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 18"],
  close: ["m6 6 12 12M6 18 18 6"],
  check: ["m4 12 5 5L20 6"],
  clock: ["M12 8v5l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"],
  stop: ["M6 6h12v12H6z"],
  folder: ["M3 7V4h7l2 3h9v13H3z"],
  subject: ["M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-2a8 8 0 0 1 16 0v2"],
} as const;
export type IconName = keyof typeof paths;
export function icon(name: IconName) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.7",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    focusable: "false",
  }))
    svg.setAttribute(key, value);
  svg.classList.add("ui-icon");
  for (const d of paths[name]) {
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

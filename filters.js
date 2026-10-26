// 濾鏡：用 WebGL 在 GPU 上即時套用，預覽和拍照用同一套運算，看到什麼就拍到什麼

// exposure 亮度倍率、contrast 對比、saturation 飽和、temp 冷(-)暖(+)、tint 洋紅(-)綠(+)、
// fade 褪色（黑色變灰，底片感）、vignette 暗角、mono 黑白程度
const BASE = { exposure: 1, contrast: 1, saturation: 1, temp: 0, tint: 0, fade: 0, vignette: 0, mono: 0 };

export const FILTERS = [
  { id: "none",   name: "原色" },
  { id: "clear",  name: "清透", exposure: 1.06, contrast: 1.04, saturation: 1.08, temp: -.15 },
  { id: "warm",   name: "暖陽", exposure: 1.04, saturation: 1.05, temp: .45, fade: .04 },
  { id: "japan",  name: "日系", exposure: 1.1, contrast: .86, saturation: .82, temp: -.1, tint: .2, fade: .08 },
  { id: "film",   name: "膠片", contrast: 1.06, saturation: .9, temp: .25, fade: .1, vignette: .35 },
  { id: "hk",     name: "港風", exposure: .97, contrast: 1.18, saturation: 1.15, temp: .4, tint: -.15, vignette: .3 },
  { id: "cool",   name: "冷調", contrast: 1.08, saturation: .88, temp: -.5, vignette: .2 },
  { id: "food",   name: "美食", exposure: 1.06, contrast: 1.08, saturation: 1.3, temp: .3 },
  { id: "vivid",  name: "鮮豔", contrast: 1.1, saturation: 1.4 },
  { id: "retro",  name: "復古", contrast: .92, saturation: .65, temp: .5, fade: .14, vignette: .4 },
  { id: "bw",     name: "黑白", contrast: 1.2, mono: 1, vignette: .25 },
].map(f => ({ ...BASE, ...f }));

// 每個範本推薦的濾鏡
export const RECOMMEND = {
  corridor: "cool", wall: "film", halfbody: "japan", fullbody: "japan", "people-scene": "warm",
  landmark: "film", landscape: "clear", frame: "film", "food-top": "food", "food-45": "food",
  pet: "warm", object: "clear",
};

const VERT = `
attribute vec2 p;
varying vec2 v;
void main() { v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
precision mediump float;
varying vec2 v;
uniform sampler2D tex;
uniform vec4 crop;
uniform float exposure, contrast, saturation, temp, tint, fade, vignette, mono;
void main() {
  vec3 c = texture2D(tex, crop.xy + v * crop.zw).rgb;
  c *= exposure;
  c += vec3(temp * .08, tint * .05, -temp * .08);
  c = (c - .5) * contrast + .5;
  float l = dot(c, vec3(.299, .587, .114));
  c = mix(vec3(l), c, saturation * (1. - mono));
  c = fade + c * (1. - fade);
  c *= 1. - vignette * smoothstep(.35, .8, distance(v, vec2(.5)));
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`;

export class FilterRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = this.gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error("webgl");
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    this.prog = prog;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
                            [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
      gl.texParameteri(gl.TEXTURE_2D, k, val);
    this.u = {};
    for (const n of ["crop", ...Object.keys(BASE)]) this.u[n] = gl.getUniformLocation(prog, n);
  }

  /** 把 source（video 或 canvas）套用濾鏡畫到自己的 canvas。crop 是要取的範圍（0~1） */
  render(source, filter, crop = { x: 0, y: 0, w: 1, h: 1 }) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    gl.uniform4f(this.u.crop, crop.x, crop.y, crop.w, crop.h);
    for (const k of Object.keys(BASE)) gl.uniform1f(this.u[k], filter[k]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// 色調 — nắn màu: thứ quyết định cái nhìn của igloo, và là phần quan trọng nhất của cả chuỗi hậu kỳ.
// Bốn bước, đúng thứ tự này:
//   0. khớp dải sáng của cảnh vào khoảng 0…1 (uInLow…uInHigh — do post.calibrate() tự tìm)
//   1. nâng chân đen: KHÔNG CÒN BÓNG ĐEN, cả bức nằm ở nửa trên thang sáng
//   2. ép cả khung về một sắc 215–225°
//   3. đặt bão hoà vào khoảng thấp nhưng khác 0 — mọi điểm ảnh đều ám một màu
// Bão hoà phải đặt SAU khi nâng chân đen: nâng chân đen là cộng một hằng số vào cả ba kênh,
// nó làm nhạt màu đi; nếu ép bão hoà trước thì số đo cuối cùng không còn đúng nữa.
import { Effect, BlendFunction, EffectAttribute } from 'postprocessing';
import { Uniform, Vector2, Vector4, Color, Matrix4 } from 'three';

const frag = /* glsl */`
uniform float uInLow;      // dải sáng vào: mức tối nhất của cảnh
uniform float uInHigh;     // dải sáng vào: mức sáng nhất của cảnh
uniform float uLift;       // chân đen của bức tranh
uniform float uOutHigh;   // đỉnh sáng của bức tranh
uniform float uGamma;      // uốn phân bố sáng: kéo trung vị về đúng chỗ
uniform float uContrast;
uniform float uHue;        // sắc mục tiêu, 0…1 (220° = 0.611)
uniform float uHueLock;
uniform float uSatFloor;   // sàn bão hoà — để không thành ảnh xám
uniform float uSatCeil;    // trần bão hoà — để không rực
uniform float uSatScale;
uniform float uSatK;       // độ cong của phép nén bão hoà
uniform vec2 uCenterFade;
uniform float uKeepWarm;   // 0…1: giữ nguyên sắc của điểm ẤM (đèn trong ô cửa) khi ép cả khung về một sắc
uniform float uKeepInk;    // 0…1: giữ nguyên sắc của MỰC 緑青 (vết cọ trên công trình) — màu nhấn không bị ép thành xám
uniform float uKeepPaper; // 0…1 (chương 皮): điểm SÁNG, ẤM NHẸ trước nắn màu = giấy dó có đèn sau lưng → trắng ngà 41°, bão hoà 0,085
uniform vec2 uInkSat;      // ngưỡng bão hoà để nhận ra mực (màn đầu 0,12–0,30; thung lũng thấp hơn: lõi nét gần trắng ánh lục vẫn giữ sắc)

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1.0e-10)), d / (q.x + 1.0e-10), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
float hueMix(float a, float b, float k) {
  float d = fract(b - a + 0.5) - 0.5;
  return fract(a + d * k);
}
// Chuỗi hậu kỳ làm việc trên giá trị tuyến tính, còn bảng chỉ tiêu (và mắt người) đọc ảnh đã hiển thị.
// Nắn màu phải làm trong không gian hiển thị, nếu không thì đặt chân đen 0,355 sẽ ra 0,63 trên màn hình.
vec3 toDisplay(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(1.0e-5)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 toLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = toDisplay(max(inputColor.rgb, 0.0));   // vào không gian hiển thị rồi mới nắn
  vec3 hsv0 = rgb2hsv(clamp(c, 0.0, 1.0));
  // điểm ấm: sắc 10–60°, đủ màu. Đây là đèn, không phải cảnh — không được ép về sắc chung.
  float warm = uKeepWarm * smoothstep(0.18, 0.42, hsv0.y) * (1.0 - smoothstep(0.06, 0.12, abs(fract(hsv0.x - 0.095 + 0.5) - 0.5)));
  // mực 緑青: sắc 150–170°, đủ màu. Cả khung là xám, chỉ vết mực được giữ sắc của nó
  warm = max(warm, uKeepInk * smoothstep(uInkSat.x, uInkSat.y, hsv0.y) * (1.0 - smoothstep(0.05, 0.10, abs(fract(hsv0.x - 0.445 + 0.5) - 0.5))));

  // 0. khớp dải sáng của cảnh, rồi uốn phân bố cho trung vị rơi đúng chỗ
  c = max((c - uInLow) / max(1.0e-4, uInHigh - uInLow), 0.0);
  // Phần vượt đỉnh được nén mềm chứ không cắt phẳng: khi ánh đèn lọt qua khe shoji làm sáng
  // hẳn một vùng, chỗ ấy vẫn còn sắc độ chứ không thành mảng trắng bệt.
  c = c / (1.0 + max(vec3(0.0), c - 0.97) * 1.1);
  c = clamp(c, 0.0, 1.0);
  c = pow(c, vec3(uGamma));

  // 1. trải cả bức vào đúng khoảng sáng đã định: đáy uLift, đỉnh uOutHigh — không còn bóng đen
  c = uLift + c * (uOutHigh - uLift);
  c = (c - 0.5) * uContrast + 0.5;
  float r = length(uv - 0.5) * 1.42;
  c *= 1.0 + uCenterFade.x * (1.0 - r) - uCenterFade.y * r * r;
  c = clamp(c, 0.0, 1.0);

  // 2–3. một sắc cho cả khung, bão hoà thấp nhưng khác 0
  vec3 hsv = rgb2hsv(c);
  hsv.x = hueMix(hsv.x, uHue, uHueLock * (1.0 - warm));
  // điểm được giữ sắc (đèn ấm, mực 緑青) lấy lại SẮC GỐC: sau bước nâng chân đen, điểm sẫm hoá xám và sắc của
  // xám là 0° (đỏ) — giữ bão hoà mà để sắc ấy thì mực sẫm thành vệt đỏ (đo 24/9)
  hsv.x = hueMix(hsv.x, hsv0.x, warm);
  // nén mềm, không cắt phẳng: giữ được phân bố bão hoà như bản in thật, chỉ kéo vào khoảng sàn–trần
  float s = (uSatFloor + (uSatCeil - uSatFloor) * (1.0 - exp(-hsv.y * uSatK))) * uSatScale;
  s *= mix(1.0, 0.82, smoothstep(0.72, 1.0, hsv.z));   // chỗ sáng nhất thì ánh sáng rửa trôi bớt sắc
  hsv.y = mix(s, max(s, min(0.85, hsv0.y * 0.95)), warm);
  // GIẤY (chỉ khi uKeepPaper > 0): cảnh 皮 vẽ giấy ấm nhẹ (sắc ~40°) — mọi thứ khác đã nhuộm ~160° nên không lẫn. Đặt về ngà rất nhẹ,
  // không vàng cam; chỗ sáng nhất ngả trắng hơn. uKeepPaper = 0 → pk = 0 → từng điểm ảnh y như cũ.
  if (uKeepPaper > 0.0) {
    float pk = uKeepPaper * smoothstep(0.1, 0.24, hsv0.z) * smoothstep(0.02, 0.05, hsv0.y) * (1.0 - smoothstep(0.05, 0.09, abs(fract(hsv0.x - 0.108 + 0.5) - 0.5)));
    hsv.x = mix(hsv.x, 0.114, pk);
    hsv.y = mix(hsv.y, 0.085 * (1.0 - 0.35 * smoothstep(0.85, 1.0, hsv.z)), pk);
  }

  outputColor = vec4(toLinear(clamp(hsv2rgb(hsv), 0.0, 1.0)), inputColor.a);   // trả về tuyến tính cho các bước sau
}
`;

export class GradeEffect extends Effect {
  constructor(opts = {}) {
    super('GradeEffect', frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uInLow', new Uniform(opts.inLow ?? 0.0)],
        ['uInHigh', new Uniform(opts.inHigh ?? 1.0)],
        ['uLift', new Uniform(opts.lift ?? 0.3)],
        ['uOutHigh', new Uniform(opts.outHigh ?? 0.88)],
        ['uGamma', new Uniform(opts.gamma ?? 1.0)],
        ['uContrast', new Uniform(opts.contrast ?? 1.0)],
        ['uHue', new Uniform(opts.hue ?? 220 / 360)],
        ['uHueLock', new Uniform(opts.hueLock ?? 0.9)],
        ['uSatFloor', new Uniform(opts.satFloor ?? 0.07)],
        ['uSatCeil', new Uniform(opts.satCeil ?? 0.24)],
        ['uSatScale', new Uniform(opts.satScale ?? 1.0)],
        ['uSatK', new Uniform(opts.satK ?? 3.0)],
        ['uCenterFade', new Uniform(new Vector2(opts.centerLift ?? 0.04, opts.edgeFade ?? 0.06))],
        ['uKeepWarm', new Uniform(opts.keepWarm ?? 0.0)],
        ['uKeepInk', new Uniform(opts.keepInk ?? 0.0)],
        ['uKeepPaper', new Uniform(opts.keepPaper ?? 0.0)],
        ['uInkSat', new Uniform(new Vector2(0.12, 0.30))],
      ]),
    });
  }
  set(o = {}) {
    const u = this.uniforms;
    const put = (k, v) => { if (v !== undefined) u.get(k).value = v; };
    put('uInLow', o.inLow); put('uInHigh', o.inHigh);
    put('uLift', o.lift); put('uOutHigh', o.outHigh); put('uGamma', o.gamma); put('uContrast', o.contrast);
    put('uHue', o.hue); put('uHueLock', o.hueLock);
    put('uKeepWarm', o.keepWarm); put('uKeepInk', o.keepInk); put('uKeepPaper', o.keepPaper);
    put('uSatFloor', o.satFloor); put('uSatCeil', o.satCeil); put('uSatScale', o.satScale); put('uSatK', o.satK);
    if (o.centerLift !== undefined || o.edgeFade !== undefined) {
      const v = u.get('uCenterFade').value;
      if (o.centerLift !== undefined) v.x = o.centerLift;
      if (o.edgeFade !== undefined) v.y = o.edgeFade;
    }
  }
  get(k) { return this.uniforms.get(k).value; }
}

// Chặn điểm ảnh hỏng trước bộ nở sáng (xem index.js): NaN/Inf → đen, kẹp trần dưới 60 000.
export class NanGuardEffect extends Effect {
  constructor() {
    super('NanGuardEffect', `
// isnan() bị trình dịch D3D (ANGLE) lược bỏ ("value cannot be NaN") — soi thẳng bit số mũ thì không lược được
bool kBad4(vec4 c) { uvec4 u = floatBitsToUint(c) & uvec4(0x7fffffffu); return any(greaterThanEqual(u, uvec4(0x7f800000u))); }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 c = inputColor;
  bool bad = kBad4(c);
  outputColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, vec4(-6.0e4), vec4(6.0e4));
}`, { blendFunction: BlendFunction.SRC });
    // (p11a B2 — GỐC của "連絡 cứ ~20 s nháy một khung": quầng loá tắt đúng một khung) phép trộn NORMAL của thư viện là
    // mix(ảnh vào, ảnh chặn, 1) = ảnh vào·0 + ảnh chặn → điểm ảnh vào là NaN / Inf thì 0·NaN = NaN: lớp chặn TỰ ĐƯA LẠI NaN nó vừa
    // chặn. NaN lọt vào bộ nở sáng, phép trung bình mip rải ra cả vùng, lớp cộng nở sáng coi vùng ấy "không có loá" → quầng quanh nét
    // tắt một khung. Trộn SRC = chỉ lấy ảnh chặn (không nhân gì với ảnh vào) — đo 連絡 90 s: trước 4 lần, sau 0 (bài _p11sua-nhay6)
  }
}

// GHÉP LỚP NÉT KẾT CẤU vào ảnh, CHỈ trong vùng vết cọ mực (Kōzō 24/9, ngọn cọ mực).
//   · lớp nét (scene/ketcau.js) vẽ riêng vào một khung đệm có độ sâu, cùng máy quay
//   · MẶT NẠ tính lại bằng đúng hàm mực của vật liệu (kInk, xuất từ scene/castle.js): từ độ sâu của cảnh dựng lại
//     điểm 3D trên mặt công trình sau điểm ảnh, hỏi điểm ấy có nằm trong vết mực không. Chỉ tính ở điểm ảnh CÓ nét
//     (nét thưa) nên rẻ. Ghép SAU chiều sâu trường ảnh: nét mực mảnh giữ sắc, không nhoè thành vệt.
//   · cửa sổ độ sâu: chỉ hiện nét nằm từ 0,6 m trước tới ~3 m SAU mặt công trình tại điểm ảnh ấy — thấy được khung
//     cột kèo ngay sau tường, không thấy nét của mặt bên kia toà thành
//   · màu nét: tương phản với MẶT ĐÃ NHUỘM MỰC (mực sẫm trên tường trát → nét sáng; mực sáng trên đá → nét sẫm)
export class KetCauGhepEffect extends Effect {
  constructor(inkGLSL, inkU) {
    super('KetCauGhepEffect', inkGLSL + `
uniform sampler2D tLines;
uniform sampler2D tLineDepth;
uniform float uOn;
uniform vec2 uNF;
uniform vec3 uLineDark, uLineLight;
uniform float uLineGlow;
uniform mat4 uInvProj, uCamWorld;
uniform float uIntroL, uLineCut;   // màn mở: nét kết cấu phát sáng vẽ từ đỉnh xuống (uLineCut: độ cao thế giới của ngọn bút)
uniform vec3 uLineCore, uLineHalo; // màn mở: lõi nét 緑青 (nấc 500) + quầng sáng (nấc 300) — nền sương sáng, nét trắng thì chìm
uniform float uDuskL, uDuskY, uDuskGain; // PHẦN 3 chạng vạng: nét kết cấu phát sáng MỌC TỪ CHÂN nền đá lên (uDuskY: ngọn nét, m)
uniform vec3 uDuskTint;
uniform mat4 uCastleInv;           // (p7b) thế giới → toạ độ toà thành: nhận mặt nền đá 石垣
uniform vec4 uBaseA;               // (cao H, mũ cong p, nửa rộng trên A, nửa rộng chân A)
uniform vec2 uBaseB;               // (nửa rộng trên B, nửa rộng chân B)
float kViewZ(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNF.x * uNF.y / (uNF.y + uNF.x - z * (uNF.y - uNF.x)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  // MÀN MỞ: cả lớp nét hiện ra (không cần vết cọ), từ đỉnh xuống chân; nét nằm sau mặt công trình quá 3,6 m thì bị che
  if (uIntroL > 0.001) {
    vec4 L = texture2D(tLines, uv);
    if (L.a > 0.002) {
      float dL = texture2D(tLineDepth, uv).r;
      vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, dL * 2.0 - 1.0, 1.0);
      vec3 pl = (uCamWorld * vec4(v.xyz / v.w, 1.0)).xyz;
      float rv = smoothstep(uLineCut - 0.4, uLineCut + 1.4, pl.y);
      float front = exp(-pow((pl.y - uLineCut) / 1.8, 2.0));
      float win = 1.0 - smoothstep(2.2, 3.6, kViewZ(dL) - kViewZ(depth));
      // mặt công trình đã hiện ở ngay chỗ nét: nét nhạt bớt (mặt thật là nhân vật chính, nét chỉ còn là bóng bản vẽ)
      float onSurf = 1.0 - smoothstep(3.0, 10.0, abs(kViewZ(depth) - kViewZ(dL)));
      float a = clamp(L.a, 0.0, 1.0) * uIntroL * rv * win * (1.0 - 0.5 * onSurf);
      c = mix(c, uLineCore, clamp(a * 0.85, 0.0, 1.0)) + uLineHalo * a * (0.45 + 1.2 * front);
    }
  }
  // CHẠNG VẠNG (bản p7b, p7a A2): bỏ viền sáng từng tảng đá (kiểu đèn neon). Thay bằng ÁNH HẮT lên mặt nền đá: trời tối dần,
  // ánh 緑青 từ thung lũng phía dưới hắt lên mặt đá — sáng nhất ở chân, dâng dần lên theo uDuskY, theo đúng độ sáng của chính mặt
  // đá (nhân vào màu đá): mạch đá vẫn tối, không có đường viền nào phát sáng.
  if (uDuskL > 0.001) {
    vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec3 pw = (uCamWorld * vec4(v.xyz / v.w, 1.0)).xyz;
    vec3 pc = (uCastleInv * vec4(pw, 1.0)).xyz;
    float t = clamp(pc.y / uBaseA.x, 0.0, 1.0);
    float bat = pow(1.0 - t, uBaseA.y);
    float ea = uBaseA.z + (uBaseA.w - uBaseA.z) * bat, eb = uBaseB.x + (uBaseB.y - uBaseB.x) * bat;
    float inside = (1.0 - smoothstep(ea - 0.3, ea + 0.7, abs(pc.x))) * (1.0 - smoothstep(eb - 0.3, eb + 0.7, abs(pc.z)))
                 * smoothstep(-0.8, 0.3, pc.y) * (1.0 - smoothstep(uBaseA.x - 0.4, uBaseA.x + 0.6, pc.y));
    if (inside > 0.001) {
      float rise = 1.0 - smoothstep(uDuskY - 3.0, uDuskY + 0.8, pw.y);
      float foot = mix(1.0, 0.3, smoothstep(0.0, uBaseA.x, pc.y));
      float k = uDuskL * inside * rise * foot;
      c += c * uDuskTint * uDuskGain * 1.1 * k + uDuskTint * 0.01 * k;
    }
  }
  if (uOn > 0.5 && uInkOn > 0.5) {
    vec4 L = texture2D(tLines, uv);
    if (L.a > 0.002) {
      vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      vec3 pw = (uCamWorld * vec4(v.xyz / v.w, 1.0)).xyz;
      float kWet, kDens, kEdge, kBleed;
      float m = kInk(pw, vec3(0.0, 1.0, 0.0), kWet, kDens, kEdge, kBleed);
      if (m > 0.002) {
        float ds = kViewZ(depth), dl = kViewZ(texture2D(tLineDepth, uv).r);
        float win = (1.0 - smoothstep(2.2, 3.6, dl - ds)) * step(-0.6, dl - ds);
        // MÀU CỦA CHÍNH LỚP NÉT, nhân lên cho PHÁT SÁNG (lớp loá sáng phía sau bắt vào thành quầng mềm).
        // &co=sang: nền nét đã sáng rực → nét kết cấu đổi sang mực sẫm để còn đọc được.
        // lớp nét xuất màu TUYẾN TÍNH ĐÃ NHÂN SẴN độ phủ (scene/ketcau.js), đã nhân độ sáng loá (setGlow)
        float mm = smoothstep(0.05, 0.40, m) * win;
        float a = clamp(L.a, 0.0, 1.0);
        if (uInkMode < 0.5) c = c * (1.0 - a * mm) + L.rgb * mm;
        else c = mix(c, uLineDark, a * mm);   // &co=sang: nền nét đã sáng rực → nét kết cấu đổi sang mực sẫm
      }
    }
  }
  outputColor = vec4(c, inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ['tLines', new Uniform(null)],
        ['tLineDepth', new Uniform(null)],
        ['uOn', new Uniform(0)],
        ['uNF', new Uniform(new Vector2(0.5, 6000))],
        ['uLineDark', new Uniform(new Color('#19342C'))],
        ['uLineLight', new Uniform(new Color('#EDF9F4'))],
        ['uLineGlow', new Uniform(2.6)],
        ['uInvProj', new Uniform(new Matrix4())],
        ['uCamWorld', new Uniform(new Matrix4())],
        ['uIntroL', new Uniform(0)],
        ['uLineCore', new Uniform(new Color('#3E9A80'))],
        ['uLineHalo', new Uniform(new Color('#8BC8B3'))],
        ['uLineCut', new Uniform(1e4)],
        ['uDuskL', new Uniform(0)],
        ['uDuskY', new Uniform(-10)],
        ['uDuskGain', new Uniform(0.9)],
        ['uDuskTint', new Uniform(new Color(0.62, 1.0, 0.86))],
        ['uCastleInv', new Uniform(new Matrix4())],
        ['uBaseA', new Uniform(new Vector4(15, 1.55, 12.5, 15.7))],
        ['uBaseB', new Uniform(new Vector2(10.5, 13.3))],
        // bộ uniform của mực — dùng CHUNG mảng số với vật liệu (cùng đối tượng Float32Array)
        ...Object.entries(inkU).map(([k, u]) => [k, new Uniform(u.value)]),
      ]),
    });
  }
}

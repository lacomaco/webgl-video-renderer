export const vs = `# version 300 es
layout (location = 0) in vec4 aPos;
layout (location = 1) in vec2 aTexCoords;

out vec2 TexCoords;

void main() {
  TexCoords = aTexCoords;
  gl_Position = aPos;
}
`;
export const fs = `# version 300 es
precision highp float;

#define width 1600.
#define height 900.
#define pixelw 2.
#define pixelh 4.

uniform sampler2D img;
uniform sampler2D noiseImg;
uniform float time;

in vec2 TexCoords;
out vec4 FragColor;

vec2 random2(vec2 uv) {
    float randX = fract(sin(dot(uv, vec2(12.9898,78.233))) * 43758.5453);
    float randY = fract(sin(dot(uv, vec2(26.12839, 86.71289))) * 4358.5453123);

    return vec2(randX, randY);
}

vec3 stripes(vec2 uv) {
  float line = abs(cos(-uv.y * 810. + time*3.));
  return vec3(line) * 0.2;
}

vec3 noiseStripes(vec2 uv) {
  // time graph: https://graphtoy.com/?f1(x,t)=sin(x+cos(x+t*0.8)*2.0)&v1=true&f2(x,t)=&v2=true&f3(x,t)=&v3=true&f4(x,t)=&v4=true&f5(x,t)=&v5=false&f6(x,t)=&v6=true&grid=1&coords=0,0,12
  
  float randomTime = sin(uv.y + cos(uv.y + time*0.8)) * 5.0;
  float randomNumber = max(random2(uv + randomTime).x,0.0);
  
  
  
  return vec3(randomNumber) * max(
  smoothstep(0.,1.-0.91,sin(uv.y * 15. +time + randomTime)-0.91)
  ,0.0);
}

vec4 colorBoom(vec2 uv,float offset) {
  float rOffset = offset * 0.025;
  float gOffset = offset * 0.0125;
  float bOffset = offset * 0.05;
  
  float distance = distance(TexCoords,vec2(0.5,0.5));
  float edgeStrength = smoothstep(0.0,1.0,distance);
  
  vec2 rUV = uv + vec2(rOffset) * edgeStrength;
  vec2 gUV = uv + vec2(gOffset) * edgeStrength;
  vec2 bUV = uv + vec2(bOffset) * edgeStrength;
  
  float r = texture(img,rUV).r;
  float g = texture(img,gUV).g;
  float b = texture(img,bUV).b;
  
  return vec4(r,g,b,1.0);
}

vec2 curved2(vec2 uv){
  uv = uv * 2.0 - 1.0;
  float dist = length(uv);
  uv *= 1.0 + dist * dist * 0.07;
  uv = (uv + 1.0)/2.0;
  return uv;
}

float vignette(){
  float distance = distance(TexCoords,vec2(0.5,0.5));
  float effectWeight = smoothstep(0., 1. ,pow(1.-(distance*distance*1.9),1.7));
  return effectWeight;
}

void main() {
  vec2 texCurve = curved2(TexCoords);
  
  if(texCurve.x < 0. || texCurve.x > 1.0 || texCurve.y < 0. || texCurve.y > 1.){
    discard;
  }
  
  vec4 color = texture(img,texCurve);
  color = colorBoom(texCurve,0.7);
  color.rgb -= stripes(texCurve);
  color.rgb *= vignette();
  color.rgb += noiseStripes(texCurve) * 0.14;
  FragColor = color;
}
`;
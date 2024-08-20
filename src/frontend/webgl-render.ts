import { mat4 } from 'gl-matrix';
import { VideoRenderer } from './video-render';

export class WebGLRender{
    private gl: WebGL2RenderingContext | null = null;
    width = 1600;
    height = 900;

    // plane 정사각형
    data = [
        // 첫 번째 삼각형
        -1,  1, 1.0, 0.0, 1.0, // 상단 왼쪽
        1,  1, 1.0, 1.0, 1.0, // 상단 오른쪽
        -1, -1, 1.0, 0.0, 0.0, // 하단 왼쪽

        // 두 번째 삼각형
        1,  1, 1.0, 1.0, 1.0, // 상단 오른쪽
        1, -1, 1.0, 1.0, 0.0, // 하단 오른쪽
        -1, -1, 1.0, 0.0, 0.0// 하단 왼쪽
    ];

    vao: WebGLVertexArrayObject  | null = null;
    vbo: WebGLBuffer | null = null;
    projection: mat4 = mat4.create();
    view: mat4 = mat4.create();

    vs = `#version 300 es
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec2 aTexCoords;
out vec2 TexCoords;

uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

void main(){
    TexCoords = aTexCoords;
    gl_Position = projection * view * model * vec4(aPos,1.0);
}`;
    fs = `#version 300 es
precision highp float;
in vec2 TexCoords;
out vec4 FragColor;

void main(){
    FragColor = vec4(TexCoords,0.0,1.0);
}`;

    commonProgram: WebGLProgram | null = null;
    videoRender = new VideoRenderer();

    constructor() {
        const canvas = document.createElement('canvas');
        this.gl = canvas.getContext('webgl2');

        canvas.width = this.width;
        canvas.height = this.height;

        document.body.appendChild(canvas);

        this.setUpWebGL();

        if(this.gl){
            this.videoRender.putGL(this.gl);
        }
    }

    private setUpWebGL(): void {
        if(!this.gl){
            return;
        }

        this.gl.viewport(0,0,this.width,this.height);

        const vsShader = this.createShader(this.vs,this.gl.VERTEX_SHADER, this.gl);
        const fsShader = this.createShader(this.fs,this.gl.FRAGMENT_SHADER, this.gl);

        this.commonProgram = this.gl.createProgram();

        if(!this.commonProgram || !vsShader || !fsShader){
            console.error('쉐이더 프로그램 생성 실패!!!!!!!!!!');
            return;
          }

        this.gl.attachShader(this.commonProgram,vsShader);
        this.gl.attachShader(this.commonProgram,fsShader);
  
        this.gl.linkProgram(this.commonProgram);
  
        this.gl.deleteShader(vsShader);
        this.gl.deleteShader(fsShader);

        const isSuccess = this.gl.getProgramParameter(this.commonProgram,this.gl.LINK_STATUS);

        if(!isSuccess){
            console.error('쉐이더 프로그램 링크 실패!');
            console.error(this.gl.getProgramInfoLog(this.commonProgram));
            return;
        }

        this.vao = this.gl.createVertexArray();
        this.vbo = this.gl.createBuffer();

        this.gl.bindVertexArray(this.vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);

        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(this.data),
            this.gl.STATIC_DRAW
        );

        const fbt = Float32Array.BYTES_PER_ELEMENT
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0,3,this.gl.FLOAT,false,5*fbt,0);
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1,2,this.gl.FLOAT,false,5*fbt,3*fbt);

        this.createOrthogonalProjectionMatrix();
        this.createViewProjectionMatrix();
    }

    private createShader(shaderSource: string, type: number, gl: WebGL2RenderingContext){
        const shader = gl.createShader(type);

        if(!shader){
            console.error('쉐이더 생성 실패!!!!!!!!!');
            return;
        }

        this.gl?.shaderSource(shader,shaderSource);
        this.gl?.compileShader(shader);

        const isSuccess = this.gl?.getShaderParameter(shader,gl.COMPILE_STATUS);

        if(!isSuccess){
            console.error('컴파일 실패!');
            console.error(this.gl?.getShaderInfoLog(shader));
            return;
        }

        return shader;
    }

    private createOrthogonalProjectionMatrix() {
        let projectionMatrix = mat4.create();
        mat4.ortho(projectionMatrix,-1,1,-1,1,0.01,10);
        this.projection = projectionMatrix;
    }

    private createViewProjectionMatrix() {
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, [0,0,0.1], [0,0,0],[0,1,0]);
        this.view = viewMatrix;
    }
}
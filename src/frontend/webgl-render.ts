import { mat4 } from 'gl-matrix';
import { VideoRenderer } from './video-render';
import {FontRender} from './font-render'

const mainFrameVS = `#version 300 es
layout (location = 0) in vec4 aPos;
layout (location = 1) in vec2 aTexCoords;
out vec2 TexCoords;

uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

void main(){
    TexCoords = aTexCoords;
    gl_Position = aPos;
}`;

const mainFrameFS = `#version 300 es
precision highp float;
uniform sampler2D img;
in vec2 TexCoords;
out vec4 FragColor;

void main(){
    FragColor = texture(img,TexCoords);
}`;

export class WebGLRender{
    private gl: WebGL2RenderingContext | null = null;
    width = 600;
    height = 800;

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
uniform sampler2D video;
uniform float alpha;
in vec2 TexCoords;
out vec4 FragColor;

void main(){
    vec4 texColor = texture(video, TexCoords);

    float adjustedAlpha = alpha * texColor.a;

    FragColor = vec4(texColor.rgb,adjustedAlpha);
}`;

    commonProgram: WebGLProgram | null = null;
    postProcessingProgram: WebGLProgram | null = null;
    videoRender = new VideoRenderer();
    canvas: HTMLCanvasElement;

    fontRenderer: FontRender[] = [];

    playTime = 0;

    isRecord = false;
    framebuffer: WebGLFramebuffer | null = null;
    offScreenTexture: WebGLTexture | null = null;
    intermediateTexture: WebGLTexture | null = null;
    constructor() {
        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl2');
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        document.body.appendChild(this.canvas);

        this.setUpWebGL();

        if(!this.gl){
            return;
        }

        this.framebuffer = this.gl.createFramebuffer();
        this.offScreenTexture = this.gl.createTexture();

        
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.offScreenTexture, 0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null);

        this.intermediateTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.intermediateTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null); 
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) !== this.gl.FRAMEBUFFER_COMPLETE){
            console.error('Frame buffer cannot created');
        }

        
        this.videoRender.putGL(this.gl);
        this.fontRenderer.push(new FontRender(this.gl,0.0,0.7,1,3));
        this.fontRenderer.push(new FontRender(this.gl,0.0,-0.7,4,7));

        document.getElementById('비디오 녹화')?.addEventListener('click',this.record.bind(this));

        document.getElementById('text1')?.addEventListener('input',(e)=>{
            const target = e.target as HTMLInputElement;
            this.fontRenderer[0].putText(target.value, 54);
        });

        document.getElementById('text2')?.addEventListener('input',(e)=>{
            const target = e.target as HTMLInputElement;
            this.fontRenderer[1].putText(target.value, 25);
        });

    }

    render(lastTime?:number) {
        if(!this.gl || !this.commonProgram || !this.postProcessingProgram){
            return;
        }

        if(!lastTime){
            lastTime = performance.now();
        }

        const currentTime = performance.now();

        if(this.isRecord){
            const deltaTime = (currentTime - lastTime) / 1000;
            this.playTime += deltaTime;    
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.clearColor(1.0,0.0,0.0,1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.commonProgram);
        this.gl.bindVertexArray(this.vao);

        const projectionLocation = this.gl.getUniformLocation(this.commonProgram, 'projection');
        const viewLocation = this.gl.getUniformLocation(this.commonProgram, 'view');
        const alpha = this.gl.getUniformLocation(this.commonProgram,'alpha');

        this.gl.uniformMatrix4fv(projectionLocation, false, this.projection);
        this.gl.uniformMatrix4fv(viewLocation, false, this.view);
        this.gl.uniform1f(alpha,1.0);

        this.videoRender.render(this.commonProgram);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.fontRenderer[0].render(this.commonProgram,600,800,this.playTime);
        this.fontRenderer[1].render(this.commonProgram,600,800,this.playTime);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.intermediateTexture);
        this.gl.copyTexImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 0, 0, this.width, this.height, 0);
        this.gl.bindTexture(this.gl.TEXTURE_2D,null);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null);
        this.gl.clearColor(1.0,0.0,0.0,1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.postProcessingProgram);
        const img = this.gl.getUniformLocation(this.postProcessingProgram,'img');
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.intermediateTexture);
        this.gl.uniform1i(img,0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        requestAnimationFrame(this.render.bind(this, currentTime));
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
        
        // post 프로세싱 프로그램 생성
        const postVSShader = this.createShader(mainFrameVS,this.gl.VERTEX_SHADER,this.gl);
        const postFSShader = this.createShader(mainFrameFS,this.gl.FRAGMENT_SHADER,this.gl);
        this.postProcessingProgram = this.gl.createProgram();
        if(!this.postProcessingProgram || !postVSShader || !postFSShader){
            console.error('포스트 프로세스 프로그램 생성 실패!!!!');
            return;
        }
        this.gl.attachShader(this.postProcessingProgram,postVSShader);
        this.gl.attachShader(this.postProcessingProgram,postFSShader);
        this.gl.linkProgram(this.postProcessingProgram);
        this.gl.deleteShader(postVSShader);
        this.gl.deleteShader(postFSShader);
        // post 프로세싱 프로그램 생성 종료

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
        mat4.lookAt(viewMatrix, [0,0,2], [0,0,0],[0,1,0]);
        this.view = viewMatrix;
    }

    record() {
        this.videoRender.play(0);
        this.videoRender.audioRender.playAudioBuffer(0);
        const stream = this.canvas.captureStream(60);
        const audioMediaStream = this.videoRender.getAudioDestination();

        const audioTrack = audioMediaStream?.stream.getAudioTracks();

        if(!audioTrack){
            console.error('audio Track cannot find');
            return;
        }

        stream.addTrack(audioTrack[0]);

        const mediaRecorder = new MediaRecorder(
            stream,
            {
                mimeType: 'video/webm; codecs=vp8,opus'
            }
        );

        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = function(event){
            if(event.data.size > 0){
                chunks.push(event.data);
            }
        }

        mediaRecorder.onstop = function() {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
    
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'animation_with_audio.webm';
            document.body.appendChild(a);
            a.click();
    
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        };

        mediaRecorder.start();
        this.isRecord = true;

        setTimeout(() => {
            this.isRecord = false;
            mediaRecorder.stop();
        }, this.videoRender.duration * 1000);
    }
}
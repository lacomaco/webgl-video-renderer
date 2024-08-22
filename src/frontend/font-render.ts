import {mat4} from 'gl-matrix';
import { cubicBezier } from './util';


export class FontRender {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;

    model = mat4.create();

    texture: WebGLTexture | null = null;
    gl: WebGL2RenderingContext;

    width = 0;
    height = 0;

    currentX = 0;
    currentY = 0;

    startTime;
    endTime;

    constructor (gl: WebGL2RenderingContext, x = 0, y = 0, s = 1, e = 7) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext("2d");
        this.gl = gl;
        this.startTime = s;
        this.endTime = e;

        if(!this.ctx){
            console.error('ctx 생성 실패');
        }
        this.currentX = x;
        this.currentY = y;
        mat4.translate(this.model,this.model,[x,y,1.0]);
        mat4.scale(this.model,this.model,[0.0,0.0,1.0]);

        this.texture = this.gl.createTexture();
    }

    putText(str: string, fontSize = 18): void {
        if(!this.ctx){
            return;
        }

        this.ctx.font = `${fontSize}px Montserrat`;

        const textMetrices = this.ctx.measureText(str);

        this.width = textMetrices.width;
        this.height = fontSize + 5;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.ctx.fillStyle = 'rgba(0,0,0,0)'
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.fillText(str, this.width/2,this.height/2);

        
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            this.canvas
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    render(program: WebGLProgram, width = 600, height = 800, time = 0) {
        if(this.startTime > time){
            return;
        }

        let deltaTime = (time - this.startTime) / 2.0;

        const alphaValue = deltaTime < 1.0 ? cubicBezier(0.41,0.01,1,1,deltaTime)[1] : 1.0;

        this.animation(0,width,height);
        const modelLocation = this.gl.getUniformLocation(program, 'model');
        const alpha = this.gl.getUniformLocation(program,'alpha');

        this.gl.uniformMatrix4fv(modelLocation, false, this.model);
        this.gl.uniform1f(alpha,alphaValue);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(
            this.gl.getUniformLocation(program, 'video'),0
        );

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }

    animation(t:number, width:number, height:number){
        // SRT
        const model = mat4.create();
        mat4.translate(model,model,[this.currentX,this.currentY,0.0]);
        mat4.scale(model,model,[this.width/width,this.height/height,1.0]);
        this.model = model;
    }
}
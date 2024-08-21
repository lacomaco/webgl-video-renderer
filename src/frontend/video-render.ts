import {mat4} from 'gl-matrix';
import { AudioRender } from './audio-render';

export class VideoRenderer {
    private file: undefined | File;
    private videoInput: HTMLInputElement;
    private videoElement: HTMLVideoElement; // Texture로 사용 가능
    private gl: WebGL2RenderingContext | null = null;
    fps = 60;

    duration = 0;
    videoWidth = 0;
    videoHeight = 0;

    model = mat4.create();
    texture: WebGLTexture | null = null;
    audioRender = new AudioRender();

    constructor() {
        this.videoInput = document.getElementById('uploader') as HTMLInputElement;
        this.videoElement = document.getElementById('output-video') as HTMLVideoElement;

        if(this.videoInput){
            this.videoInput.addEventListener('change', this.onVideoInputChange.bind(this));
        }

        this.videoElement.onloadeddata = () => {
            this.duration = this.videoElement.duration;
            this.videoWidth = this.videoElement.videoWidth;
            this.videoHeight = this.videoElement.videoHeight;
            this.play();
            this.createVideoTexture();
        }
    }

    onVideoInputChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if(input.files && input.files[0]){
            this.file = input.files[0];

            this.videoElement.src = URL.createObjectURL(this.file);
            this.audioRender.putAudioSource(this.file);
        }
    }

    putGL(gl: WebGL2RenderingContext){
        this.gl = gl;
    }

    createVideoTexture() {
        if(!this.gl){
            return;
        }

        if(this.texture){
            this.gl.deleteTexture(this.texture);
        }

        this.texture = this.gl?.createTexture();

        if(!this.texture){
            console.error('비디오 텍스처 생성 실패');
            return;
        }

        this.updateTexture();
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL,true);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.gl.bindTexture(this.gl.TEXTURE_2D,null);
    }

    updateTexture() {
        if(!this.gl || !this.texture){
            return;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL,true);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            this.videoElement
        );
    }

    bindTexture(id=0,program: WebGLProgram) {
        if(!this.gl || !this.texture){
            return;
        }

        this.gl.activeTexture(this.gl.TEXTURE0 + id);
        this.gl.bindTexture(this.gl.TEXTURE_2D,this.texture);
        this.gl.uniform1i(
            this.gl.getUniformLocation(program,'video'),id
        );
    }

    play(){
        this.videoElement.currentTime = 0;
        this.videoElement.play();
    }

    pause(){
        this.videoElement.pause();
    }

    render(program: WebGLProgram) {
        if(!this.gl){
            return;
        }
        this.updateTexture();
        const modelLocation = this.gl.getUniformLocation(program, 'model');
        this.gl.uniformMatrix4fv(modelLocation, false, this.model);
        this.bindTexture(0,program);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}

import {mat4} from 'gl-matrix';

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

    constructor() {
        this.videoInput = document.getElementById('uploader') as HTMLInputElement;
        this.videoElement = document.getElementById('output-video') as HTMLVideoElement;

        if(this.videoInput){
            this.videoInput.addEventListener('change', this.onVideoInputChange.bind(this));
        }

        this.videoElement.onloadedmetadata = () => {
            this.duration = this.videoElement.duration;
            this.videoWidth = this.videoElement.videoWidth;
            this.videoHeight = this.videoElement.videoHeight;          
        }

        this.videoElement.onload = () => {
            this.createVideoTexture();  
        }
    }

    onVideoInputChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if(input.files && input.files[0]){
            this.file = input.files[0];

            this.videoElement.src = URL.createObjectURL(this.file);
        }
    }

    putGL(gl: WebGL2RenderingContext){
        this.gl = gl;
    }

    createVideoTexture() {
        if(!this.gl){
            return;
        }

        if(!this.texture){
            this.gl.deleteTexture(this.texture);
        }

        this.texture = this.gl?.createTexture();

        if(!this.texture){
            console.error('비디오 텍스처 생성 실패');
            return;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            this.videoElement
        );
    }
}

// Activity is a pixel-change proxy, not people, purchases, or physical interactions.
export class MotionMeter {
  constructor({threshold=24,minFraction=.025}={}) {this.threshold=threshold;this.minFraction=minFraction;this.reset();}
  reset(){this.prev=null;this.last=null;this.warm=0;this.duration=0;this.active=0;this.episodes=0;this.run=0;this.gap=0;this.inEpisode=false;this.fraction=0;}
  sample(rgba,time) {
    if(!Number.isFinite(time))return this.result();
    const gray=new Uint8Array(rgba.length/4);
    for(let i=0;i<gray.length;i++)gray[i]=.299*rgba[4*i]+.587*rgba[4*i+1]+.114*rgba[4*i+2];
    if(!this.prev||this.prev.length!==gray.length||time<=this.last||time-this.last>1.5){this.prev=gray;this.last=time;this.run=0;this.gap=0;this.inEpisode=false;return this.result();}
    const dt=time-this.last;this.last=time;this.warm+=dt;let changed=0;
    for(let i=0;i<gray.length;i++) if(Math.abs(gray[i]-this.prev[i])>=this.threshold)changed++;
    this.prev=gray;this.fraction=changed/gray.length;
    if(this.warm<3)return this.result();
    this.duration+=dt;
    if(this.fraction>=this.minFraction){this.active+=dt;this.run+=dt;this.gap=0;if(this.run>=2&&!this.inEpisode){this.episodes++;this.inEpisode=true;}}
    else {this.gap+=dt;if(this.gap>=1){this.run=0;this.inEpisode=false;}}
    return this.result();
  }
  result(){return {duration:this.duration,active:this.active,activity:this.duration?this.active/this.duration:0,episodes:this.episodes,fraction:this.fraction};}
}
export function cropCell(crop,index,rows,cols){return {x:crop.x+(index%cols)*crop.w/cols,y:crop.y+Math.floor(index/cols)*crop.h/rows,w:crop.w/cols,h:crop.h/rows};}
export function cropPixels(roi,width,height){return [roi.x*width,roi.y*height,roi.w*width,roi.h*height];}

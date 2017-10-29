import { Component } from '@angular/core';

// Page editing stuff
import { ViewChild, ViewChildren, Renderer2 } from '@angular/core';

// Http stuff
import { Injectable }     from '@angular/core';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Rx';
import 'rxjs/Rx';

declare let navigator: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  videostream: any;
  vid: any;

  face: any;

  started = false;

  showPlayerDamage = false;

  playerDmg = 0;

  emotions = [
    {
      "emotion": "happiness",
      "level": 0,
      "img": "https://i.imgur.com/6vHSj7d.png"
    },
    {
      "emotion": "anger",
      "level": 0,
      "img": "https://i.imgur.com/OeMEOas.png"
    },
    {
      "emotion": "sadness",
      "level": 0,
      "img": "https://i.imgur.com/3WZk9wN.png"
    }
  ];

  maxEmotion = 
  {
    "emotion": "neutral",
    "level": 0,
    "img": ""
  };

  enemy = {
    "hp": 50,
    "im": "https://i.imgur.com/1rWJI9a.png"
  }

  player = {
    "hp": 100
  }

  enemyDmg = 5;

  @ViewChild('hardwareVideo') hardwareVideo: any;
  @ViewChild('output') output;
  @ViewChild('playerAttack') playerAttack;
  
  constructor(
      private renderer: Renderer2,
      private http: Http
    ) {
      
  }

  ngOnInit() {
    // this.videoStart();
  }

  videoStart() {
    this.started = true;
    let video = this.hardwareVideo.nativeElement;
    this.vid = video;

    let n = <any> navigator;

    n.getUserMedia = ( n.getUserMedia || n.webkitGetUserMedia || n.mozGetUserMedia  || n.msGetUserMedia );
    n.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
      video.src = window.URL.createObjectURL(stream);
      video.play();
    });

    this.enemyAttacking();
  }

  donutBlink = false;

  enemyAttacking() {
    // Enemy attack
    Observable.interval(2000).takeWhile(() => true).subscribe(() => {
      if((this.player.hp) > 0 && (this.enemy.hp > 0)) {
        this.donutBlink = true;
        this.player.hp -= this.enemyDmg;
        this.enemyDmg = 5;
        setTimeout(() => this.donutBlink = false, 500);        

        this.capture();
      }
    });  
  }

  capture() {

    if((this.enemy.hp <= 0) || (this.player.hp <= 0)) {
      return;
    }

    let out = this.output.nativeElement;

    let canv = this.renderer.createElement("canvas");
    canv.width = this.vid.videoWidth;
    canv.height = this.vid.videoHeight;
    canv.getContext('2d')
      .drawImage(this.vid, 0, 0, canv.width, canv.height);

    let im = this.renderer.createElement("img");
    let dataUrl = canv.toDataURL("image/jpg");
    im.src = dataUrl;
    
    this.face = dataUrl.split(",")[1];

    // out.prepend(im);

    this.uploadImg().subscribe(
      (r) => {
          console.log("Imgur link: ", r.data.link);
          this.emoteLink(r.data.link);

      },
      (x) => {
          /* this function is executed when there's an ERROR */
          console.log("ERROR: " + x);
      },
      () => {
          /* this function is executed when the observable ends (completes) its stream */
          console.log("Completed");
      }
    );
    
    
  }


  uploadImg() {
    let im = "https://i.imgur.com/GiOzvnM.jpg";
    
    let body = {
      image: this.face,
      type: "jpg"
    };

    let headers = new Headers(
      {
        "Authorization": "Bearer " + "REDACTED",
        "X-Mashape-Key": "REDACTED"
      }
    );
    headers.append('Content-Type', 'application/json');

    let options = new RequestOptions({ headers: headers });

    return this.http.post("https://imgur-apiv3.p.mashape.com/3/image", body, options)
      .map(
        (res:Response) => res.json()
      );
  }

  emoteLink(url: string) {
    let body = {
      url: url
    }

    let headers = new Headers(
      {
        "Ocp-Apim-Subscription-Key": "REDACTED"
      }
    );

    headers.append('Content-Type', 'application/json');    
    let options = new RequestOptions({ headers: headers });

    this.http.post("https://westus.api.cognitive.microsoft.com/emotion/v1.0/recognize", body, options)
      .map(
        (res:Response) => res.json()        
      )
      .subscribe(
        (r) => {
            console.log("Emotion: ", r);
            this.emotions[0].level = r[0].scores.happiness;
            this.emotions[1].level = r[0].scores.anger;
            this.emotions[2].level = r[0].scores.sadness;
            this.updateMaxEmotion();
            this.updateGameLogic();
        },
        (x) => {
            /* this function is executed when there's an ERROR */
            console.log("ERROR: " + x);
        },
        () => {
            /* this function is executed when the observable ends (completes) its stream */
            console.log("Completed");
        }
      );
  }

  updateMaxEmotion() {
    let maxIdx = 0;
    for(let i = 0; i < 3; i++) {
      if(this.emotions[i].level > this.emotions[maxIdx].level) {
        maxIdx = i;
      }
    }

    this.maxEmotion = this.emotions[maxIdx];
  }

  updateGameLogic() {
    if(this.maxEmotion.emotion == "happiness") {
      this.playerDmg = this.maxEmotion.level * 10;
    } else if(this.maxEmotion.emotion == "anger") {
      this.playerDmg = this.maxEmotion.level * 20;
    } else if(this.maxEmotion.emotion == "sadness") {
      this.playerDmg = this.maxEmotion.level * 8;
      this.enemyDmg = this.enemyDmg * 0.2;
    }

    this.enemy.hp -= this.playerDmg;



  }

}

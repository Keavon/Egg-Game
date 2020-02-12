
let control = false;
let left = false;
let right = false;
let rightLast = false; //which button was pressed last
let shellIntegrity = 100;

let sounds = {
  roll: "rolling.wav",
  crack: "crack.wav",
  jump: "jump.wav"
}

const ROLL_ACCEL = 100;
const WALK_SPEED = 200;

function updatePlayer(delta){
  //calculate player direction
  if (player.rolling){
    var xChange;
    if (rightLast){
      xChange = delta * (right ? ROLL_ACCEL : left ? -ROLL_ACCEL : 0);
    } else{
      xChange = delta * (left ? -ROLL_ACCEL : right ? ROLL_ACCEL : 0);
    }
    if (player.grounded){
      var theta = Math.atan2(player.vy, player.vx);
      player.vy += Math.sin(theta) * xChange;
      player.vx += xChange;
      // player.vx += Math.cos(theta) * xChange;
      // console.log(theta);
    }else {
      player.vx += xChange;
    }
  } else if (rightLast){
    player.vx = right ? WALK_SPEED : left ? -WALK_SPEED : 0;
  } else{
    player.vx = left ? -WALK_SPEED : right ? WALK_SPEED : 0;
  }
  //end player direction
}

function setupPlayer(){
  player = newEntity(100, 50, 40, 80);
  // player = newEntity(1150, -2500, 40, 80);
  player.type = "player";
  player.mask = [0];
  Object.keys(sounds).forEach((key) => {
    sounds[key] = new sound(sounds[key]);
  })
  entities.push(player); // add to update/collision list
  player.rolling = true;

  document.addEventListener("keydown", event => {
    if (!control){
      return;
    }
    switch (event.code){
      case "KeyA":
      case "ArrowLeft":
      left = true;
      rightLast = false;
      break;
      case "KeyD":
      case "ArrowRight":
      right = true;
      rightLast = true;
      break;
      case "Space":
      if (player.grounded){
        player.grounded = false;
        player.vy = -700;
      }
      break;
      case "ShiftLeft":
      if (!player.rolling && player.grounded){
        //initial roll convert
        var theta = -Math.atan(player.lastGround.slope);
        player.vy = Math.sin(theta) * player.vx;
        player.vx = Math.cos(theta) * player.vx;
      }
      player.rolling = true;
      break;
      case "KeyX":
      drawDebug = !drawDebug;
      break;
      case "KeyC":
      rollCredits(0);
    }
  });
  document.addEventListener("keyup", event => {
    if (!control){
      return;
    }
    switch(event.code){
      case "KeyA":
      case "ArrowLeft":
      left = false;
      break;
      case "KeyD":
      case "ArrowRight":
      right = false;
      break;
      case "ShiftLeft":
      player.rolling = false;
      break;
    }
  });

}

function sound(src) {
  this.sound = document.createElement("audio");
  this.sound.src = src;
  this.sound.setAttribute("preload", "auto");
  this.sound.setAttribute("controls", "none");
  this.sound.style.display = "none";
  document.body.appendChild(this.sound);
  this.play = function(){
    this.sound.play();
  }
  this.stop = function(){
    this.sound.pause();
  }
}

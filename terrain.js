
let terrain = [];

function newCircle(x, y, r){
  return {
    x: x,
    y: y,
    r: r
  };
}

function newSegment(x1, y1, x2, y2, oneWay){
  if (x1 < x2){
    return {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      len: Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2)),
      slope: (y1 - y2) / (x2 - x1),
      oneWay: oneWay && Math.abs(x1 - x2) > 0
    };
  } else {
    return {
      x1: x2,
      y1: y2,
      x2: x1,
      y2: y1,
      len: Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2)),
      slope: (y2 - y1) / (x1 - x2),
      oneWay: oneWay && Math.abs(x1 - x2) > 0
    };
  }
}

function curveBetween(l1, l2, oneWay = false, segs = 10){
  var p0 = {x: l1.x2, y: l1.y2};
  var p1 = {x: l2.x1, y: l2.y1};
  var iP = lineIntersection(l1, l2); //intersection point
  var lastP = p0;
  //interpolate quadratic bezier curve
  for (var i = 0; i < segs; i++){
    var t = (i / segs);
    var it = 1 - t;
    var x = it * it * p0.x + 2 * it * t * iP.x + t * t * p1.x;
    var y = it * it * p0.y + 2 * it * t * iP.y + t * t * p1.y;
    terrain.push(newSegment(lastP.x, lastP.y, x, y, oneWay));
    lastP.x = x;
    lastP.y = y;
  }
  terrain.push(newSegment(lastP.x, lastP.y, p1.x, p1.y, oneWay));
}

function lineIntersection(l1, l2, inf = true){
  var a1 = l1.y2 - l1.y1;
  var b1 = l1.x1 - l1.x2;
  var c1 = a1*(l1.x1) + b1*(l1.y1);

  var a2 = l2.y2 - l2.y1;
  var b2 = l2.x1 - l2.x2;
  var c2 = a2*(l2.x1) + b2*(l2.y1);

  var det = a1 * b2 - a2 * b1;
  if (det == 0){
    return null;
  } else{
    var x = (b2 * c1 - b1 * c2) / det;
    var y = (a1 * c2 - a2 * c1) / det;
    if (!inf){
      //check if point is not on each line, meaning the intersection happens in space
      var minx1 = Math.min(l1.x1, l1.x2) - 1;
      var maxx1 = Math.max(l1.x1, l1.x2) + 1;
      var miny1 = Math.min(l1.y1, l1.y2) - 1;
      var maxy1 = Math.max(l1.y1, l1.y2) + 1;
      var minx2 = Math.min(l2.x1, l2.x2) - 1;
      var maxx2 = Math.max(l2.x1, l2.x2) + 1;
      var miny2 = Math.min(l2.y1, l2.y2) - 1;
      var maxy2 = Math.max(l2.y1, l2.y2) + 1;
      if (!(minx1 <= x && x <= maxx1 &&
      minx2 <= x && x <= maxx2 &&
      miny1 <= y && y <= maxy1 &&
      miny2 <= y && y <= maxy2)){
        return null;
      }
    }
    return {
      x: x,
      y: y,
    };
  }
}

function drawTerrain(context, t){
	context.strokeStyle = 'black';
  context.beginPath();
  context.moveTo(t.x1, t.y1);
  context.lineTo(t.x2, t.y2);
  context.stroke();
}

function checkEntityTerrain(e, delta, prevPos){
  var ret = false;
  var closestP;
  var closestD = -1;
  var l;
  var checkLast = false;
  //buffer the distance check if the entity is grounded, check a little extra
  var distCheck = e.grounded || e.forceSlide ? (e.c.r * e.c.r + WALK_SPEED/1.5) : (e.c.r * e.c.r);
  //find the closest terrain segment and point of contact
  terrain.forEach((line, i) => {
    //check if circle is between ends of line before checking distances
    if (Math.max(e.c.x, prevPos.x) + e.c.r >= line.x1 && Math.min(e.c.x, prevPos.x) - e.c.r <= line.x2){
      //check if entity clipped through segment this frame
      var iP = lineIntersection(line, newSegment(prevPos.x, prevPos.y, e.c.x, e.c.y), false);
      if (iP != null && !e.phasing.includes(line) && (!line.oneWay || (e.vy > 0 && !e.grounded))){
        //entity center clipped through line, move back
        var xD = e.c.x - prevPos.x;
        var yD = e.c.y - prevPos.y;
        var s = Math.sqrt(xD * xD + yD * yD);
        e.c.x = iP.x - xD / (s/2);
        e.c.y = iP.y - yD / (s/2);
        e.hitBox.x = e.c.x - e.hitBox.w / 2;
        e.hitBox.y = e.c.y + e.c.r - e.hitBox.h;
      }

			var cPoint = circleLineCollision(e.c, line);
			var d = Math.pow(cPoint.x - e.c.x, 2) + Math.pow(cPoint.y - e.c.y, 2);
			if (e.phasing.includes(line) && d > distCheck){
				e.phasing.splice(e.phasing.indexOf(line), 1);
			}
			if (l == null || !e.phasing.includes(line)){
				if (d < closestD || closestD == -1){
					closestD = d;
					closestP = cPoint;
					l = line;
				}
				if (line == e.lastGround){
					checkLast = d < distCheck;
				}
			}
		}
	});
	if (l == null){
		forceSlide = false;
		// e.phasing = [];
		return ret;
	}

	if (checkLast && l != e.lastGround && (e.grounded) && !e.phasing.includes(l)){
		ret = true;
	}

	//recalc points and distance in case of extra clip
	closestP = circleLineCollision(e.c, l);
	closestD = Math.pow(closestP.x - e.c.x, 2) + Math.pow(closestP.y - e.c.y, 2);


	//check if the point is within the range check
	if (closestD != -1 && closestD < distCheck){
		var i = e.phasing.indexOf(l);
		if (i != -1){
			return false;
		}
		//adjust entity position
		var dirX = closestP.x - e.c.x;
		var dirY = closestP.y - e.c.y;
		var dist = Math.sqrt(dirX * dirX + dirY * dirY) / e.c.r;
		var lastPos = {x: e.c.x, y: e.c.y};
		//normalize to radius of circle
		e.c.x = closestP.x - dirX/dist;
		e.c.y = closestP.y - dirY/dist;
		e.hitBox.x = e.c.x - e.hitBox.w/2;
		e.hitBox.y = e.c.y + e.c.r - e.hitBox.h;

		var forceSlide = (Math.abs(l.slope) > 3.01);//max slope climb
		//check collision is down and whether center of entity is over the segment
		ret = ret || (dirY > 0 && e.c.x + e.c.r / 4 >= l.x1 && e.c.x - e.c.r / 4 <= l.x2);// &&
		if (dirY < 0 && (l.x1 - l.x2 != 0) && !l.oneWay){
			e.vy = e.vy < 0 ? 0 : e.vy;
			return ret; //ceiling collision
		} else if (!e.phasing.includes(l) && (dirY < 0 ) && e.vy <= 0 && l.oneWay && !e.grounded){
			e.c.x = lastPos.x;
			e.c.y = lastPos.y;
			e.hitBox.x = e.c.x - e.hitBox.w/2;
			e.hitBox.y = e.c.y + e.c.r - e.hitBox.h;
			e.phasing.push(l);
			return e.grounded;
		}
		// else if (e.phasing.indexOf(l) != -1 && dirY > 0 && e.vy > 0){
		// 	e.phasing.splice(e.phasing.indexOf(l), 1);
		// }

		if (l.x1 - l.x2 == 0){ //vert line case
			e.forceSlide = false;
			forceSlide = false;
			e.vx = 0;
		}

		//update rolling velocity
		else if ((e.rolling && !forceSlide && (e.lastGround != l || !e.grounded)) || (forceSlide && !e.forceSlide)){
			e.forceSlide = forceSlide;// && ret;
			// else if ((e.rolling || e.forceSlide) && (e.lastGround != l || (!e.grounded && !e.forceSlide))){
			//handle switching slopes and momentum transfer when entity lands on this
			//segment for the first time
			var speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
			var thetaL = Math.atan2(l.y1 - l.y2, l.x2 - l.x1);
			var thetaE = -Math.atan2(e.vy, e.vx);// : -Math.atan2(e.lastGround.y1 - e.lastGround.y2, e.lastGround.x2 - e.lastGround.x1);
			var speedTrans = (1.0 - Math.abs((thetaE - (thetaL)) / (Math.PI/2))) * 1.3;
			speedTrans = speedTrans.clamp(-1.0 , 1.0);
			e.vy = (speed * speedTrans) * Math.sin(Math.abs(thetaL)) * (l.slope > 0 ? -1 : 1);
			e.vx = (speed * speedTrans) * Math.cos(thetaL);
		} else if ((e.rolling && e.grounded) || (e.forceSlide && forceSlide)){
			//transfer verticle to horizontal each frame
			var speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
			var theta = Math.atan2(l.y1 - l.y2, l.x2 - l.x1);
			var yChange = gravity * delta * Math.sin(Math.abs(theta));
			if (l.slope != 0){
				e.vy += yChange * Math.sin(Math.abs(theta));// * (l.slope > 0 ? -1 : 1);
				e.vx += yChange * Math.cos(theta) * (l.slope < 0 ? 1 : -1);
			}
		}else if (!e.rolling && ret){
			//no roll, just stop the entity from falling
			e.forceSlide = forceSlide;
			e.vy = 0;
		} else{
			e.forceSlide = forceSlide;
			// console.log("hm");
		}
		//track the last terrain the entity was touching
		if (ret && (!checkLast || e.forceSlide || e.rolling)){
			e.lastGround = l;
		}
		if (ret){
			e.debugP = closestP;
		}
	} else{
		e.forceSlide = false;
		var i = e.phasing.indexOf(l);
		if (i != -1){
			e.phasing.splice(e.phasing.splice(i, 1));
		}
	}
	return ret && (!e.forceSlide || (checkLast && e.grounded));

}

function closestPointOnLine(l, x, y){
	var dot = (((x-l.x1)*(l.x2-l.x1)) + ((y-l.y1)*(l.y2-l.y1))) / Math.pow(l.len, 2);
	return {
		x: (l.x1 + (dot * (l.x2 - l.x1))).clamp(l.x1, l.x2),
		y: (l.y1 + (dot * (l.y2 - l.y1))).clamp(Math.min(l.y1, l.y2), Math.max(l.y1, l.y2))
	};
}

Number.prototype.clamp = function(min, max) {
	return Math.min(Math.max(this, min), max);
};

function circleLineCollision(c, l){
	return closestPointOnLine(l, c.x, c.y);
}

function pointCircleCollision(c, x, y){
	if (Math.pow(c.x - x, 2) + Math.pow(c.y - y, 2) <= c.r*c.r){
		return true;
	}
}

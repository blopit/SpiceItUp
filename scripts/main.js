////////////////////////////////////////////////////////////////////////////////
// Ajax sync script require
// sync aditional JS scripts, makes things modular
////////////////////////////////////////////////////////////////////////////////

//add required scripts in post (Not actually required can just add in html...)
function require(jsFilePath) {
    var js = document.createElement("script");

    js.type = "text/javascript";
    js.src = jsFilePath;

    document.body.appendChild(js);
}

require("scripts/base_objects.js");
require("scripts/player.js");
require("scripts/svg.js");
require("scripts/computation.js");
require("scripts/sprite.js");
require("scripts/camera.js");
require("scripts/fishbird.js");

////////////////////////////////////////////////////////////////////////////////
// Globals
////////////////////////////////////////////////////////////////////////////////

//screen globals
screen_width = 1280;
screen_height = 720;
screen_bound = 128;

//Global initializations
time = 0;               //time increment
list = [];
xmlhttp = null;
hero = null;  //player

/*var fps = {
    startTime : 0,
    frameNumber : 0,
    getFPS : function(){
        this.frameNumber++;
        var d = new Date().getTime(),
        currentTime = ( d - this.startTime ) / 1000,
        result = Math.floor( ( this.frameNumber / currentTime ) );
        if( currentTime > 1 ){
            this.startTime = new Date().getTime();
            this.frameNumber = 0;
        }
        return result;
    }
};
var f = document.querySelector("#fps");*/

grav = 0.5;             //gravity
timefctr = 1.0;         //time factor
canvas = null;

//KEYBOARD GLOBALS
//up,down,left,right,jump,att,item
//how long since last key press of same key
//how long key has been held down
keys = [false,false,false,false,false,false,false,
0,0,0,0,0,0,0,
0,0,0,0,0,0,0];

maxairmeter = airmeter = maxwatermeter = watermeter = 300;
stepstoair = stepstowater = 0;

//up_key, down_key, left_key, right_key, space_key, space_key, space_key
key_codes = [38, 40, 37, 39, 32 ,32 ,32] // key codes


////////////////////////////////////////////////////////////////////////////////
// SVG FILE READER
////////////////////////////////////////////////////////////////////////////////

//click 'Open SVG' button
$('#id').on('click', function() {
    $('#svg').trigger('click');
});

//read a file
function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;

        list = [];
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(contents,"text/xml");
        onLoadLevel(xmlDoc);
    };
    reader.readAsText(file);
}

//document.getElementById('svg').addEventListener('change', readSingleFile, false);

//check to see if svg element (elem) matches a color (col)
function checkColour(elem, col) {
  if (elem === null)
      return false;
  else if (elem.style.fill != null){
      if (elem.style.fill.toUpperCase() === col)
            return true;
  }
  else if (elem.getAttribute("fill") != null){
      if (elem.getAttribute("fill").toUpperCase() === col)
            return true;
  }
  else
      return false;
}

//Load an XML document (xmlDoc)
function onLoadLevel(xmlDoc) {
    var x = xmlDoc.getElementsByTagName("rect");
    var obj_missing_path = [];
    for (i = 0; i < x.length; i++) {
        if (x[i].style.fill === "rgb(0, 0, 0)" || checkColour(x[i],"#000000")){
            list.push(new objt(
            Math.floor(x[i].getAttribute("x")),
            Math.floor(x[i].getAttribute("y")),
            Math.floor(x[i].getAttribute("width")),
            Math.floor(x[i].getAttribute("height"))
            ));
        }else if (x[i].style.fill === "rgb(0, 255, 0)" || checkColour(x[i],"#00FF00")){
            hero = new player(
            Math.floor(x[i].getAttribute("x")),
            Math.floor(x[i].getAttribute("y")),
            Math.floor(x[i].getAttribute("width")),
            Math.floor(x[i].getAttribute("height"))
            );
            list.push(hero);
        }else if (x[i].style.fill === "rgb(255, 0, 255)" || checkColour(x[i],"#FF00FF")){
            list.push(new jtBlock(
            Math.floor(x[i].getAttribute("x")),
            Math.floor(x[i].getAttribute("y")),
            Math.floor(x[i].getAttribute("width")),
            Math.floor(x[i].getAttribute("height"))
            ));
        }else if (x[i].style.fill === "rgb(0, 0, 255)" || checkColour(x[i],"#0000FF")){
            var obj = new moveBlock(
            Math.floor(x[i].getAttribute("x")),
            Math.floor(x[i].getAttribute("y")),
            Math.floor(x[i].getAttribute("width")),
            Math.floor(x[i].getAttribute("height"))
            );
            obj_missing_path.push(obj);
            list.push(obj);
            console.log("blok");
        }else if (x[i].style.fill === "none"){
            if (x[i].style.stroke === "rgb(255, 0, 0)" || checkColour(x[i],"#FF0000")){
                cam.boundaries.push(new camBoundary(
                Math.floor(x[i].getAttribute("x")),
                Math.floor(x[i].getAttribute("y")),
                Math.floor(x[i].getAttribute("width")),
                Math.floor(x[i].getAttribute("height")),
                2
                ));
            }else if (x[i].style.stroke === "rgb(255, 255, 0)" || checkColour(x[i],"#FFFF00")){
                cam.boundaries.push(new camBoundary(
                Math.floor(x[i].getAttribute("x")),
                Math.floor(x[i].getAttribute("y")),
                Math.floor(x[i].getAttribute("width")),
                Math.floor(x[i].getAttribute("height")),
                1
                ));
            }
        }

    }

    x = xmlDoc.getElementsByTagName("path");
    for (i = 0; i < x.length; i++) {
        if (x[i].style.fill === "rgb(0, 0, 0)" || checkColour(x[i],"#000000")){
            var path = x[i].getAttribute("d");
            if (path != "" && path != null){
                var p = extractPoints(parse(path));
                list.push(new polyBlock(p[0],p[1]));
            }
        }else if (x[i].style.fill === "none"){
            var path = x[i].getAttribute("d");
            if (path != "" && path != null){
                var p = extractPoints(parse(path));
                var mp = new movePath(p[0],p[1],parseInt(x[i].style.strokeWidth,10));
                list.push(mp);
                console.log("path");
                if (obj_missing_path){
                    obj_missing_path[0].path = mp;
                    obj_missing_path.shift();
                }
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Event loop
////////////////////////////////////////////////////////////////////////////////


function doMouseDown(e) {
    var action = actionForEvent(e);
    keys[4] = true;
};

function doMouseUp(e) {
    var action = actionForEvent(e);
    keys[4] = false;
};

window.onload = function() {

    //get & set canvas
    var c = document.getElementById('screen').getContext('2d');
    c.canvas.width = screen_width;
    c.canvas.height = screen_height;

    var cx = document.getElementById('screen');
    cx.addEventListener("mousedown", doMouseDown, false);
    cx.addEventListener("mouseup", doMouseUp, false);
    cx.addEventListener("touchstart", doMouseDown, false);
    cx.addEventListener("touchend", doMouseUp, false);


    /*
   //load first level svg
   xmlhttp = new XMLHttpRequest();
   xmlhttp.open("GET", "levels/lvl0.svg", true);
   xmlhttp.onreadystatechange = function() {
       if (xmlhttp.readyState== 4 && xmlhttp.status == 200) {
           onLoadLevel(xmlhttp.responseXML);
       }
   };
   xmlhttp.send(null);*/

    hero = new fishbird(0, 0);
    list.push(hero);

    cam = new camera(0.15);

    var len = 3000;

    var grd1 = c.createLinearGradient(0, 0, 0, -len);
    grd1.addColorStop(0, "skyblue");
    grd1.addColorStop(1, "white");
    //grd1.addColorStop(1, "black");

    var grd2 = c.createLinearGradient(0, 0, 0, len);
    grd2.addColorStop(0, "turquoise");
    grd2.addColorStop(1, "black");

    //MAIN GAME LOOP
    setInterval(function() {
        time++;
        //f.innerHTML = "FPS: " + fps.getFPS();

        //save canvas settings
        c.save();
        //clear screen & draw background
        //c.clearRect(0,0,screen_width,screen_height);
        c.fillStyle = "LightGray";
        c.fillRect(0,0,screen_width,screen_height);

        c.translate(cam.width/2-cam.cx,cam.height/2-cam.cy);
        c.fillStyle = grd1;
        c.fillRect(hero.x-screen_width,0,screen_width*2,-len);
        c.fillStyle = grd2;
        c.fillRect(hero.x-screen_width,0,screen_width*2,len);
        c.translate(-cam.width/2+cam.cx,-cam.height/2+cam.cy);

        c.beginPath();
        c.lineWidth = 20;
        c.strokeStyle = "white";
        c.moveTo(0, screen_height);
        c.lineTo(screen_width * airmeter/maxairmeter, screen_height);
        c.stroke();
        c.beginPath();
        c.strokeStyle = "red";
        c.moveTo(screen_width * stepstoair/maxairmeter - 20, screen_height);
        c.lineTo(screen_width * stepstoair/maxairmeter, screen_height);
        c.stroke();

        c.beginPath();
        c.lineWidth = 20;
        c.strokeStyle = "blue";
        c.moveTo(0, 0);
        c.lineTo(screen_width * watermeter/maxwatermeter, 0);
        c.stroke();
        c.beginPath();
        c.strokeStyle = "red";
        c.moveTo(screen_width * stepstowater/maxwatermeter - 20, 0);
        c.lineTo(screen_width * stepstowater/maxwatermeter, 0);
        c.stroke();

        //draw objects relative to centered camera
        c.translate(cam.width/2-cam.cx,cam.height/2-cam.cy);

        c.beginPath();
        c.lineWidth = 5;
        c.strokeStyle = "white";
        c.moveTo(-3000000, 0);
        c.lineTo(3000000, 0);
        c.stroke();
        c.lineWidth = 1;



        canvas = c;
        //draw objects TODO: draw objects by depth property
        for (var i = 0; i < list.length; i++) {
            var o = list[i];
            o.update(list, keys);
            if (checkOnScreen(o,cam)){
                o.draw(c);
            }
        }

        //TODO:remove
        for (var i = 0; i < cam.boundaries.length; i++) {
            cam.boundaries[i].draw(c)
        }

        //restore saved canvas
        c.restore();

    }, 1000.0 / 60.0); //60fps TODO: find better/faster way to do this
};


function actionForEvent(e) {
    var key = e.which;
    for (var i = 0; i < key_codes.length; i++) {
        if (key == key_codes[i])
            return i;
    }
    return null;
}

window.onkeydown = function(e) {
    var action = actionForEvent(e);
    keys[action] = true;
};

window.onkeyup = function(e) {
    var action = actionForEvent(e);
    keys[action] = false;
};

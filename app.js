// Your code goes here
var previousSpeed = 0; //0=parked, 1-2=driving
gm.system.watchSpeed(watchSpeedCallback);
var dataListener; // id of vehicle data process
var rotaryWatcher; //id of rotary watcher process

var brakePositionData = [];
var acceleratorPositionData = [];
var wheelAngleData = [];

var svg, margin, width, height, gSpeed, gRPM, x, ySpeed, yRPM, lineSpeed, lineRPM;

var seconds;
var namesArray = [];
var graphsSetup = false;

var lastBrake = 0;
var lastAccelerator = 0;
var lastWheelAngle = 0;

var pickDriverPage = document.getElementById("start-up-page");
var guessDriverPage = document.getElementById("guess-driver");
var newDriverPage = document.getElementById("new-driver");
var statsPage = document.getElementById("stats-page");
var readyToDrivePage = document.getElementById("start-drive");
// var graphsPage = document.getElementById("graphs-page");

pickDriverPage.style.display = 'none';
guessDriverPage.style.display = 'none';
newDriverPage.style.display = 'none';
//readyToDrivePage.style.display = 'none';
statsPage.style.display = 'none';
// graphsPage.style.display = 'none';
// hideBoth();

function resetToStart() {
  pickDriverPage.style.display = 'none';
  guessDriverPage.style.display = 'none';
  newDriverPage.style.display = 'none';
  readyToDrivePage.style.display = 'block';
  statsPage.style.display = 'none';
  // graphsPage.style.display = 'none';
}

function watchSpeedCallback(speed) {
  if (speed == 0 && previousSpeed > 0) {
    //stop the drive
    previousSpeed = speed;
    stopDrive();
  } else if (previousSpeed == 0 && speed > 0) {
    //start the drive
    previousSpeed = speed;
    startDrive();
  }
}

function startDrive() {
  //update the UI to show we're in driving mode
  //start watching for data
  // TODO: consider backing up existing data
  brakePositionData = [];
  acceleratorPositionData = [];
  wheelAngleData = [];
  console.log('starting drive');
  // document.getElementById("title").innerHTML = "Currently Driving";
  // document.getElementById("subtitle").innerHTML = "There should be stats here but someone didn't get them done in time for demos";
  dataListener = gm.info.watchVehicleData(processData,processDataError,['brake_position','accelerator_position','wheel_angle'],100);
  rotaryWatcher = gm.info.watchRotaryControl(handleRotary);

  readyToDrivePage.style.display = 'none';
  pickDriverPage.style.display = 'none';
  guessDriverPage.style.display = 'none';
  newDriverPage.style.display = 'none';
  statsPage.style.display = 'block';
  // graphsPage.style.display = 'block';

  chronoStart();
}

function processData(data) {
  console.log('got vehicle data: ', data);
  if (data.brake_position) {
    lastBrake = data.brake_position;
    brakePositionData.push(lastBrake);
  } else if (lastBrake) {
    brakePositionData.push(lastBrake);
  } else {
    brakePositionData.push(0);
  }
  if (data.accelerator_position) {
    lastAccelerator = data.accelerator_position;
    acceleratorPositionData.push(lastAccelerator);
  } else if (lastAccelerator) {
    acceleratorPositionData.push(lastAccelerator);
  } else {
    acceleratorPositionData.push(0);
  }
  if (data.wheel_angle) {
    lastWheelAngle = data.wheel_angle;
    wheelAngleData.push(lastWheelAngle);
  } else if (lastWheelAngle) {
    wheelAngleData.push(lastWheelAngle);
  } else {
    wheelAngleData.push(0);
  }

  // if (!graphsSetup) {
  //   setupGraphs();
  //   graphsSetup = true;
  // }
  document.getElementById("status-header-acceleration").innerHTML = lastAccelerator;
  document.getElementById("status-header-braking").innerHTML = lastBrake;
  document.getElementById("status-header-wheel").innerHTML = lastWheelAngle;
//  if (graphsSetup) {
  //process the graph that is currently being displayed
  // d3.select("gRPM")
  //   .attr("d", lineRPM)
  //   .attr("transform", null);
  // d3.active("gRPM")
  //   .attr("transform", "translate(" + acceleratorPositionData.length + ",0)")
  //   .transition();
  // }
    // .on("start", processData);
}

function processDataError() {
  //TODO: display an error
}

function stopDrive() {
  //stop watching for data
  //send driving data to server, await response
  console.log('stopping drive');
  console.log('brake array: ', brakePositionData);
  console.log('acceleration array', acceleratorPositionData);
  console.log('wheel angle array', wheelAngleData);
  hideBoth();
  document.getElementById("guess-h1").innerHTML = "Drive Finished";
  document.getElementById("guess-h2").innerHTML = "Just one second while we crunch some numbers";
  readyToDrivePage.style.display = 'none';
  pickDriverPage.style.display = 'none';
  guessDriverPage.style.display = 'block';
  newDriverPage.style.display = 'none';
  statsPage.style.display = 'none';
  // graphsPage.style.display = 'none';
  document.getElementById("guess-no").style.display = 'none';
  document.getElementById("guess-yes").style.display = 'none';

  gm.info.clearVehicleData(dataListener);
  gm.info.clearRotaryControl(rotaryWatcher);

  chronoStopReset();

  var wcc = new WolframCloudCall();
  console.log("sending data to wolfram");
  seconds = new Date() / 1000; //seconds since epoch
  wcc.call(acceleratorPositionData, brakePositionData, wheelAngleData, seconds, function(result) {
    console.log("data sent");
    console.log(result);
    wcc.callClassify(seconds,function(result) {
      console.log(result);
      if (result == null || result == "Null") {
        //handle unsure case
        readyToDrivePage.style.display = 'none';
        pickDriverPage.style.display = 'block';
        guessDriverPage.style.display = 'none';
        newDriverPage.style.display = 'none';
        statsPage.style.display = 'none';
        // graphsPage.style.display = 'none';
        wcc.callListDrivers(function(result) {
          namesArray = result.split(",");
          RecursiveUnbind($('#driver-select-button-list'));
          console.log(result);
          $('#driver-select-button-list').empty();
          for (i in namesArray) {
            namesArray[i] = namesArray[i].replace(/[^A-Za-z0-9]/g, '');
            addDriverButton(namesArray[i]);
          }
        });
      } else {
        // handle sure case
        document.getElementById("guess-h1").innerHTML = "Driver Recognized as:";
        document.getElementById("guess-h2").innerHTML = result;
        document.getElementById("guess-no").style.display = 'block';
        document.getElementById("guess-yes").style.display = 'block';
        readyToDrivePage.style.display = 'none';
        pickDriverPage.style.display = 'none';
        guessDriverPage.style.display = 'block';
        newDriverPage.style.display = 'none';
        statsPage.style.display = 'none';
        // graphsPage.style.display = 'none';
      }
    });
  });
}

function addDriverButton(userName) {
  var driverButton = $('<button/>', {'class': 'btn', 'type': 'button', 'id': userName}).append(
      $('<span/>', {text: userName})
  );
  $("#driver-select-button-list").append(
      $('<div/>', {'class': 'col-sm-4'}).append(
        driverButton
      )
  );
  $("#driver-select-button-list").on("click", "#"+userName, function(){
    console.log("training function with:");
    console.log(userName);
    var wcc = new WolframCloudCall();
    wcc.callTrainClassify(seconds,userName,function(result) {
      resetToStart();
    });
  });
}

$( "#driver-select-manual" ).mousedown(showInputNewDriverScreen);
function showInputNewDriverScreen() {
  //TODO: show the screen for manually inputting a driver name
  // TODO: use the driver name that was input to train the data, so it improves in the future
  readyToDrivePage.style.display = 'none';
  pickDriverPage.style.display = 'none';
  guessDriverPage.style.display = 'none';
  newDriverPage.style.display = 'block';
  statsPage.style.display = 'none';
  // graphsPage.style.display = 'none';
}

$("#driver-manual-done").mousedown(classifyCustom);
function classifyCustom(){
  console.log("training function with:");
  console.log(userName);
  var userName = document.getElementById("driver-name-asdf").value;
  var wcc = new WolframCloudCall();
  wcc.callTrainClassify(seconds,userName,function(result) {
    resetToStart();
  });
}

/*
JavaScript EmbedCode usage:

var wcc = new WolframCloudCall();
wcc.call(accInt, brakeInt, steeringAngle, ID, function(result) { console.log(result); });
*/

var WolframCloudCall;

(function() {
WolframCloudCall = function() {	this.init(); };

var p = WolframCloudCall.prototype;

p.init = function() {};

p._createCORSRequest = function(method, url) {
	var xhr = new XMLHttpRequest();
	if ("withCredentials" in xhr) {
		xhr.open(method, url, true);
	} else if (typeof XDomainRequest != "undefined") {
		xhr = new XDomainRequest();
		xhr.open(method, url);
	} else {
		xhr = null;
	}
	return xhr;
};

p._encodeArgs = function(args) {
	var argName;
	var params = "";
	for (argName in args) {
		params += (params == "" ? "" : "&");
		params += encodeURIComponent(argName) + "=" + encodeURIComponent(args[argName]);
	}
	return params;
};

p._auxCall = function(url, args, callback) {
	var params = this._encodeArgs(args);
	var xhr = this._createCORSRequest("post", url);
	if (xhr) {
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.setRequestHeader("EmbedCode-User-Agent", "EmbedCode-JavaScript/1.0");
		xhr.onload = function() {
			if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
				callback(xhr.responseText);
			} else {
				callback(null);
			}
		};
		xhr.send(params);
	} else {
		throw new Error("Could not create request object.");
	}
};

p.call = function(accInt, brakeInt, steeringAngle, identifier, callback) {
	var url = "http://www.wolframcloud.com/objects/77de27df-c176-4003-9669-65f47541afe9";
	var args = {accInt: accInt, brakeInt: brakeInt, steeringAngle: steeringAngle, identifier: identifier};
	var callbackWrapper = function(result) {
		if (result === null) callback(null);
		else callback(result);
	};
	this._auxCall(url, args, callbackWrapper);
};

p.callClassify = function(key, callback) {
  var url = "https://www.wolframcloud.com/objects/172a9bb9-e1ff-4792-adc5-15b21fb532cf";
  var args = {key: key};
  var callbackWrapper = function(result) {
    if (result === null) callback(null);
    else callback(result);
  };
  this._auxCall(url, args, callbackWrapper);
};

// https://www.wolframcloud.com/objects/172a9bb9-e1ff-4792-adc5-15b21fb532cf
// TODO DEMO

//Hesitant classifier:
// http://www.wolframcloud.com/objects/b36b7ce5-4367-4e18-9c31-7db14765c39c

p.callTrainClassify = function(key, name, callback) {
  var url = "http://www.wolframcloud.com/objects/10794676-bfcf-4f2b-bb1a-a970e0b02a98";
  var args = {key: key, name: name};
  var callbackWrapper = function(result) {
    if (result === null) callback(null);
    else callback(result);
  };
  this._auxCall(url, args, callbackWrapper);
};

p.callListDrivers = function(callback) {
  var url = "http://www.wolframcloud.com/objects/cce7421b-d215-4232-aadb-0ed3ac20c440";
  var args = {};
  var callbackWrapper = function(result) {
    if (result === null) callback(null);
    else callback(result);
  };
  this._auxCall(url, args, callbackWrapper);
};

//https://www.wolframcloud.com/objects/cce7421b-d215-4232-aadb-0ed3ac20c440
//List Drivers

})();

// Dashboard JS

var currentlySelected = "top";

function resetDash() {
	$(".icon").removeClass("topGrad rightGrad bottomGrad leftGrad");
	$(".lines").hide();
  currentlySelected = null;
}

function selectTopStat() {
	$(".info .inner").css({"left":"0"});
	resetDash();
	$(".top").addClass("topGrad");
	$( ".lineTop" ).show();
  currentlySelected = "top";
  // hideBoth();
};
$( ".top" ).mousedown(selectTopStat);

function selectRightStat() {
	$(".info .inner").css({"left":"-110px"});
	resetDash()
	$(".right").addClass("rightGrad");
	$( ".lineRight" ).show();
  currentlySelected = "right";
  // show_gSpeed();
};
$( ".right" ).mousedown(selectRightStat);

function selectBottomStat() {
	$(".info .inner").css({"left":"-220px"});
	resetDash()
	$(".bottom").addClass("bottomGrad");
	$( ".lineBottom" ).show();
  currentlySelected = "bottom";
  // hideBoth();
};
$( ".bottom" ).mousedown(selectBottomStat);

function selectLeftStat() {
	$(".info .inner").css({"left":"-330px"});
	resetDash()
	$(".left").addClass("leftGrad");
	$( ".lineLeft" ).show();
  currentlySelected = "left";
  // show_gRPM();
};
$( ".left" ).mousedown(selectLeftStat);

function handleRotary(eventlist) {
  var event = eventlist[0];
  if (event === 'RC_CW') {
    switch (currentlySelected) {
      case "top":
        selectRightStat();
        break;
      case "right":
        selectBottomStat();
        break;
      case "bottom":
        selectLeftStat();
        break;
      default:
        selectTopStat();
    }
  } else if (event === 'RC_CCW') {
    switch (currentlySelected) {
      case "top":
        selectLeftStat();
        break;
      case "right":
        selectTopStat();
        break;
      case "bottom":
        selectRightStat();
        break;
      default:
        selectBottomStat();
    }
  }
}
// graphs

// function setupGraphs() {
//       svg = d3.select("svg"),
//       margin = {top: 1, right: 1, bottom: 1, left: 1},
//       width = +svg.attr("width") - margin.left - margin.right,
//       height = +svg.attr("height") - margin.top - margin.bottom,
//       gSpeed = svg.append("gSpeed").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
//       gRPM = svg.append("gRPM").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//
//    x = d3.scaleLinear()
//       .domain([0, acceleratorPositionData.length])
//       .range([0, width]);
//
//    ySpeed = d3.scaleLinear()
//       .domain([0, 200])
//       .range([height, 0]);
//
//    yRPM = d3.scaleLinear()
//       .domain([0, 100])
//       .range([height, 0]);
//
//    lineSpeed = d3.line()
//       .x(function(d,i) { return x(i); })
//       .y(function(d,i) { return ySpeed(d); });
//
//    lineRPM = d3.line()
//       .x(function(d,i) { return x(i); })
//       .y(function(d,i) { return yRPM(d); });
//    console.log("asdf");
//       gRPM.append("defs").append("clipPath")
//           .attr("id", "clip")
//           .append("rect")
//           .attr("width", width)
//           .attr("height", height);
//       gRPM.append("gRPM")
//           .attr("class", "axis axis--x")
//           .attr("transform", "translate(0," + yRPM(0) + ")")
//           .call(d3.axisBottom(x));
//       gRPM.append("gRPM")
//           .attr("class", "axis axis--yRPM")
//           .call(d3.axisLeft(yRPM));
//       gRPM.append("gRPM")
//           .attr("clip-path", "url(#clip)")
//           .append("path")
//           .datum(acceleratorPositionData)
//           .attr("class", "lineRPM")
//           .transition()
//           .duration(500)
//           .ease(d3.easeLinear);
// }
//
//     function show_gSpeed() {
//       console.log("showing speed graph");
//         d3.selectAll("gSpeed").attr("visibility", "visible");
//         d3.selectAll("gRPM").attr("visibility", "hidden");
//     }
//
//     function show_gRPM() {
//       console.log("showing RPM graph");
//         d3.selectAll("gSpeed").attr("visibility", "hidden");
//         d3.selectAll("gRPM").attr("visibility", "visible");
//     }
//
//     function hideBoth() {
//       console.log("hiding both graphs");
//         d3.selectAll("gSpeed").attr("visibility", "hidden");
//         d3.selectAll("gRPM").attr("visibility", "hidden");
//     }

    function RecursiveUnbind($jElement) {
        // remove this element's and all of its children's click events
        $jElement.unbind();
        $jElement.removeAttr('onclick');
        $jElement.children().each(function () {
            RecursiveUnbind($(this));
        });
      };


// // // CHRONOGRAPH

var startTime = 0
var start = 0
var end = 0
var diff = 0
var timerID = 0
function chrono(){
	end = new Date()
	diff = end - start
	diff = new Date(diff)
	var msec = diff.getMilliseconds()
	var sec = diff.getSeconds()
	var min = diff.getMinutes()
	var hr = diff.getHours()-1
	if (min < 10){
		min = "0" + min
	}
	if (sec < 10){
		sec = "0" + sec
	}
	if(msec < 10){
		msec = "00" +msec
	}
	else if(msec < 100){
		msec = "0" +msec
	}
	document.getElementById("status-header-duration").innerHTML = min + ":" + sec
	timerID = setTimeout("chrono()", 10)
}
function chronoStart(){
	start = new Date()
	chrono()
}
function chronoContinue(){
	start = new Date()-diff
	start = new Date(start)
	chrono()
}
function chronoReset(){
	document.getElementById("status-header-duration").innerHTML = "0:00:00:000"
	start = new Date()
}
function chronoStopReset(){
	document.getElementById("status-header-duration").innerHTML = "0:00:00:000"
	document.chronoForm.startstop.onclick = chronoStart
}
function chronoStop(){
	clearTimeout(timerID)
}
// function setCoord(pos) {
    // if (pos.coords !== undefined) {
        // latitude = pos.coords.latitude;
        // longitude = pos.coords.longitude;

        // map.panTo({lat: latitude, lng: longitude});

        // var xhr = new XMLHttpRequest();
        // var url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=AIzaSyBkgq6skqj_3s0ME2aQHUmq6N_EJ4iADKs&location=" + latitude + "," + longitude + "&radius=1000&keyword=hopital";
        // xhr.open("GET", url, false);
        // xhr.send();

        // var text = xhr.responseText + "";
        // var data = JSON.parse(text);

        // console.log(data["results"].length);
        // hopitaux = data["results"];
        // var list = document.getElementById("hopitaux");
        // for (var x = 0; x < data["results"].length; x++) {
            // var place = data["results"][x];
            // console.log(place);
            // if (place["name"] !== undefined) {
                // var marker = new google.maps.Marker({
                    // position: {
                        // lat: place["geometry"]["location"]["lat"],
                        // lng: place["geometry"]["location"]["lng"]
                    // },
                    // map: map
                // });
                // foodMarkers.push(marker);
                // var li = document.createElement("li");
                // li.innerHTML = place["name"] + "<br>" + place["vicinity"] + "<br>" + place["address"];
                // li.addEventListener("click", navigate);
                // list.appendChild(li);
            // }
        // }

    // }
// }

function setCoord2(pos) {
    if (pos.coords !== undefined) {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;

        map.panTo({lat: latitude, lng: longitude});

        var xhr = new XMLHttpRequest();
        var url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=AIzaSyBkgq6skqj_3s0ME2aQHUmq6N_EJ4iADKs&location=" + latitude + "," + longitude + "&radius=1000&keyword=pharmacieGarde";
        xhr.open("GET", url, false);
        xhr.send();

        var text = xhr.responseText + "";
        var data = JSON.parse(text);

        console.log(data["results"].length);
        pharmacies = data["results"];
        var list = document.getElementById("pharmacies");
        for (var x = 0; x < data["results"].length; x++) {
            var place = data["results"][x];
            console.log(place);
            if (place["name"] !== undefined) {
                var marker = new google.maps.Marker({
                    position: {
                        lat: place["geometry"]["location"]["lat"],
                        lng: place["geometry"]["location"]["lng"]
                    },
                    map: map
                });
                foodMarkers.push(marker);
                var li = document.createElement("li");
                li.innerHTML = place["name"] + "<br>" + place["vicinity"] + "<br>" ;
                li.addEventListener("click", navigate);
                list.appendChild(li);
            }
        }

    }
}
function navigate(event) {
    var vicinity = event.currentTarget.innerHTML.split("<br>")[1];
    gm.nav.setDestination(function () {
        console.log("Success")
    }, function () {
        console.log("Error")
    }, {address: vicinity}, true)
}
gm.info.getCurrentPosition(setCoord2, null, true);




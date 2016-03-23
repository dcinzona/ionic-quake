// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('quake', ['ionic'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    console.log(document.body.classList.contains('platform-browser'));
    ionic.Platform.fullScreen();
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.controller('quakeController', function($scope, $ionicGesture, $http){
    
	var tempData;
	var count = 20;
    var mag = 1.5;
	var newQuakes = 0;
	var interval;
    var globe = {};
    
    $scope.updateCount = function(c){
        updateCount(c);
    }
    function updateCount(c){
        tempData = [];
        count = c;
        updateData(c, true);
        $('.active').removeClass('active');
        $('#count'+count).addClass('active');
        newQuakes = count;
        $('#newQuakes').text(newQuakes);
    }
	function updateData(c, reset){
        
	    var url = "/mangolabs"; //"http://www.mangoflash.com/quake_JSON.cfm"; // json.php?count='+count
        var requestData = {
            count : c,
            myMag : mag
        }
        //var buildUrl = url + "?count="+ c +"&myMag=" + mag;
        //console.log(buildUrl);
        $http({
            method: 'GET',
            url: url + "?count="+requestData.count + "&myMag=" + requestData.myMag
            }).then(function successCallback(response) {
                var data = response.data;
                if(reset === true){
                    tempData = null;
                    globe.reset();
                }
                data = ConvertQuakeData(data.quakes);
                console.log("Data:" + data);
                if(tempData!=null){
                    var td = [];
                    for(var i = 0; i < data.length ; i+=3)
                    {
                        var td0 = data[i];
                        var td1 = data[i+1];
                        var td2 = data[i+2];
                        var add = true;
                        for(var x = 0; x < tempData.length; x+=3)
                        {
                            add = true;
                            if(td0 == tempData[x] &&
                                td1 == tempData[x+1] &&
                                td2 == tempData[x+2])
                            {
                                add=false;
                                break;
                            }
                        }
                        if(add)
                        {
                            newQuakes ++;
                            $('#newQuakes').text(newQuakes).css({color:'#66FFFF'})
                            .animate({
                                color:'#FFF'
                            },1200);
                            tempData.push(td0,td1,td2);
                            td.push(td0,td1,td2);
                            globe.addData(td, {format: 'magnitude'});
                            globe.createPoints();
                        }
                    }
                }
                else
                {
                    //convert data stream to magnitude array [lat,lon,mag]                
                    tempData = data;
                    globe.addData(tempData, {format: 'magnitude'});
                    globe.createPoints();
                }
            }, function errorCallback(response) {
                console.log('Error: ' + JSON.stringify(response));
            });
		$.getJSON(url, requestData, function(data){
            
		});		
	
	}
    function ConvertQuakeData(data){
        var arr = [];
        for(var i=0; i<data.length; i++){
            arr.push(data[i].LAT,data[i].LON,data[i].MAGNITUDE);
        }
        return arr;
    }
            

    $(document).ready(function () {
        if(!Detector.webgl){
            Detector.addGetWebGLMessage();
        } else {
            var container = document.getElementById('container');
            var xhr;	      
            $('.active').removeClass('active');
            $('#count'+count).addClass('active');
            tempData = null;
            newQuakes = count;
            $('#newQuakes').text(newQuakes);
            globe = new DAT.Globe(container, {}, $ionicGesture);	 
            globe.animate();
            var element = angular.element(document.querySelector('#container')); 
   
            $ionicGesture.on('drag', function(e){
                globe.onDrag(e);  
            }, element);
            
            $ionicGesture.on('pinchin', function(e){
                globe.onPinchIn(e);
            }, element);
            
            $ionicGesture.on('pinchout', function(e){
                globe.onPinchOut(e);
            }, element);
            
            
            updateData(count);
            if(interval)
                clearInterval(interval);
            interval = setInterval(function(){
                updateData(count);
            },60000);// 3000000);
        }
    });    
    
});


app.controller('quakeController', function($scope, $ionicGesture, $http, mangoLabs){
    
	$scope.newQuakes = 0;
    
	var tempData;
	var count = 20;
    var mag = 1.5;
	var interval;
    var globe = {};
    
            
    $scope.init = function(){
        var container = document.getElementById('container');
        $scope.loading = true;
        $('.active').removeClass('active');
        $('#count'+count).addClass('active');
        tempData = null;
        $scope.newQuakes = count;
        globe = new DAT.Globe(container, {}, $ionicGesture);	 
        globe.animate();
        enableTouch();
        updateData(count);
        if(interval)
            clearInterval(interval);
        interval = setInterval(function(){
            updateData(count);
        },60000);// 3000000);
    }
    
    $scope.updateCount = function(c){
        $scope.loading = true; //only show loading when manually triggered
        updateCount(c);
    }
    function updateCount(c){
        tempData = [];
        count = c;
        updateData(c, true);
        $('.active').removeClass('active');
        $('#count'+count).addClass('active');
    }
    
	function updateData(c, reset){
        mangoLabs.getData(c, mag)
            .then(function successCallback(response) {
                $scope.newQuakes = count;
                var data = response.data;
                if(reset === true){
                    tempData = null;
                    globe.reset();
                }
                data = ConvertQuakeData(data.quakes);
                $scope.loading = false;
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
                            $scope.newQuakes ++;
                            $('#newQuakes').css({color:'#66FFFF'})
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
            }, 
            function errorCallback(response) {
                $scope.loading = false;
                console.log('Error: ' + JSON.stringify(response));
            }
        );          
	}
    
    function ConvertQuakeData(data){
        var arr = [];
        for(var i=0; i<data.length; i++){
            arr.push(data[i].LAT,data[i].LON,data[i].MAGNITUDE);
        }
        return arr;
    }
    
    function enableTouch(){
        var element = angular.element(document.getElementById('container')); 
        $ionicGesture.on('drag', function(e){
            globe.onDrag(e);  
        }, element);
        
        $ionicGesture.on('pinchin', function(e){
            globe.onPinchIn(e);
        }, element);
        
        $ionicGesture.on('pinchout', function(e){
            globe.onPinchOut(e);
        }, element);
    }
});
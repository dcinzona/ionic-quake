app.service('mangoLabs', function ($http) {
    this.getData = function (c, mag) {
        var url = "http://www.mangoflash.com/quake_JSON.cfm"; 
        if(!window.cordova){
            url = "/mangoLabs";
        }//"http://www.mangoflash.com/quake_JSON.cfm"; // json.php?count='+count
        var requestData = {
            count : c,
            myMag : mag
        }
        var resp = $http.get(url + "?count="+requestData.count + "&myMag=" + requestData.myMag);
        return resp;
    };     
});
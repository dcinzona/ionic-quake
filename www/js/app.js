// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var app = angular.module('quake', ['ionic', 'ngCordova'])

.run(function($ionicPlatform, $cordovaDeviceMotion) {
  $ionicPlatform.ready(function() {
    if(window.StatusBar) {
      StatusBar.overlaysWebView( true );
      StatusBar.styleBlackOpaque();
      StatusBar.show();
    }
    console.log("TEST");
  });
})


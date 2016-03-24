
/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var DAT = DAT || {};

var SPIN_ID=0;

DAT.Globe = function(container, opts, $ionicGesture) {
  opts = opts || {};
  var colorFn = opts.colorFn || function(x) {
    var c = new THREE.Color();
    c.setHSL( ( 0.6 - ( x * 0.09 ) ), 1.0, .5 );
    return c;
  };

  var Shaders = {
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          'vNormal = normalize( normalMatrix * normal );',
          'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
          'vec3 diffuse = texture2D( texture, vUv ).xyz;',
          'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
          'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
          'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'vNormal = normalize( normalMatrix * normal );',
          'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
          'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, .8 ) ), 12.0 );',
          'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    }
  };

  var camera, scene, renderer, controls, w, h;
  var mesh, atmosphere, point;

  var overRenderer;
  var imgDir = 'img/';

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: 0, y: 0 },
      target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown = { x: 0, y: 0 };

  var distance = 1000000, distanceTarget = 1000000;
  var padding = 40;
  var PI_HALF = Math.PI / 2;

  function init() {
      
    w = container.offsetWidth || window.innerWidth;
    h = container.offsetHeight || window.innerHeight;
    
    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    var shader, uniforms, material;

    camera = new THREE.PerspectiveCamera(30, w / h, 1, 100000);
    camera.position.z = distance;

    scene = new THREE.Scene();

    var geometry = new THREE.SphereGeometry(200, 40, 30);

    shader = Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    var texture = new THREE.TextureLoader().load( imgDir + "world.jpg" );
    uniforms['texture'].value = texture;//THREE.ImageUtils.loadTexture('world.jpg');

    material = new THREE.ShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader

        });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    scene.add(mesh);

    shader = Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.ShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          transparent: true

        });

    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set( 1.1, 1.1, 1.1 );
    scene.add(mesh);

    geometry = new THREE.SphereGeometry(.3,.3, 32 );    
    geometry2 = new THREE.BoxGeometry(.1,.1,.1);
    for (var i = 0; i < geometry.vertices.length; i++) {
      var vertex = geometry.vertices[i];
      vertex.z += .052;
    }
    
    for (var i = 0; i < geometry2.vertices.length; i++) {
      var vertex = geometry2.vertices[i];
      vertex.z += .052;
    }
    
        
    point = new THREE.Mesh(geometry);
    line = new THREE.Mesh(geometry2);
    
    //space 
    var loader = new THREE.TextureLoader();
    var texture = loader.load( imgDir + 'stars.jpg' );               
    var backgroundMesh = new THREE.Mesh( 
        new THREE.BoxGeometry(10000, 10000, 10000),
        new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        }));
    scene.add(backgroundMesh);       
    
    SPIN_ID = setInterval(function() {
        rotate();
    }, 1000 / 60);
    

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(w, h);

    //renderer.domElement.style.position = 'absolute';

    container.appendChild(renderer.domElement);
    
    container.addEventListener('mousewheel', onMouseWheel, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    window.addEventListener('resize', onWindowResize, false);
  }

  addData = function(data, opts) {
    var lat, lng, size, color, i, step, colorFnWrapper;

    opts.animated = opts.animated || false;
    this.is_animated = opts.animated;
    opts.format = opts.format || 'magnitude'; // other option is 'legend'
    if (opts.format === 'magnitude') {
      step = 3;
      colorFnWrapper = function(data, i) { return colorFn(data[i+2]); }
    } else if (opts.format === 'legend') {
      step = 4;
      colorFnWrapper = function(data, i) { return colorFn(data[i+3]); }
    } else {
      throw('error: format not supported: '+opts.format);
    }

    if (opts.animated) {
      if (this._baseGeometry === undefined) {
        this._baseGeometry = new THREE.Geometry();
        for (i = 0; i < data.length; i += step) {
          lat = data[i];
          lng = data[i + 1];
//        size = data[i + 2];
          color = colorFnWrapper(data,i);
          size = 0;
          addPoint(lat, lng, size, color, this._baseGeometry);
        }
      }
      if(this._morphTargetId === undefined) {
        this._morphTargetId = 0;
      } else {
        this._morphTargetId += 1;
      }
      opts.name = opts.name || 'morphTarget'+this._morphTargetId;
    }
    var subgeo = new THREE.Geometry();
    for (i = 0; i < data.length; i += step) {
      lat = data[i];
      lng = data[i + 1];
      color = colorFnWrapper(data,i);
      size = data[i + 2];
      size = size*200;
      addPoint(lat, lng, size, color, subgeo);
    }
    if (opts.animated) {
      this._baseGeometry.morphTargets.push({'name': opts.name, vertices: subgeo.vertices});
    } else {
      this._baseGeometry = subgeo;
    }

  };

  function createPoints() {
    if (this._baseGeometry !== undefined) {
      if (this.is_animated === false) {
        this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
              color: 0xffffff,
              vertexColors: THREE.FaceColors,
              morphTargets: false
            }));
      } else {
        if (this._baseGeometry.morphTargets.length < 8) {
          var padding = 8-this._baseGeometry.morphTargets.length;
          for(var i=0; i<=padding; i++) {
            this._baseGeometry.morphTargets.push({'name': 'morphPadding'+i, vertices: this._baseGeometry.vertices});
          }
        }
        this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
              color: 0xffffff,
              vertexColors: THREE.FaceColors,
              morphTargets: true
            }));
      }
      scene.add(this.points);
    }
  }

  function addPoint(lat, lng, size, color, subgeo) {

    var phi = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;

    point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
    point.position.y = 200 * Math.cos(phi);
    point.position.z = 200 * Math.sin(phi) * Math.sin(theta);

    point.lookAt(mesh.position);

    //point.scale.z = Math.max( size, 0.01 ); // avoid non-invertible matrix
    
    point.scale.z = .01;//-size + 100;
    point.scale.x = size*.02;
    point.scale.y = size*.02;
    point.updateMatrix();

    for (var i = 0; i < point.geometry.faces.length; i++) {

      point.geometry.faces[i].color = color;

    }
    
    line.position.x = 200 * Math.sin(phi) * Math.cos(theta);
    line.position.y = 200 * Math.cos(phi);
    line.position.z = 200 * Math.sin(phi) * Math.sin(theta);

    line.lookAt(mesh.position);

    line.scale.z = -size;
    line.scale.x = size*.01;
    line.scale.y = size*.01;
    line.updateMatrix();
    
    var i;
    for (i = 0; i < line.geometry.faces.length; i++) {

      line.geometry.faces[i].color = color;

    }
    
    subgeo.merge(point.geometry, point.matrix);
    subgeo.merge(line.geometry, line.matrix);
  }

  
  function onDrag(event){
        var gesture = event.gesture;
        var e = event;
        var pX = e.gesture.center.pageX;
        var pY = e.gesture.center.pageY;
        //console.log("x: "+ pX + "  y:"+ pY);
        
        mouse.x = -pX;
        mouse.y = pY;

        var zoomDamp = distance / 1000;

        target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

        target.y = target.y > PI_HALF ? PI_HALF : target.y;
        target.y = target.y < -PI_HALF ? -PI_HALF : target.y;
        /*
        
        var dX = - gesture.deltaX;
        var dY = gesture.deltaY;

        var zoomDamp = distance/1000;

        target.x += dX * 0.0005// * zoomDamp;//targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        target.y += dY *0.0005// * zoomDamp; //targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

        target.y = target.y > PI_HALF ? PI_HALF : target.y;
        target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
        */
  }
  function onStartTouch(e){
      
        var pX = e.gesture.center.pageX;
        var pY = e.gesture.center.pageY;
      
        mouseOnDown.x = -pX;
        mouseOnDown.y = pY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

      //console.log("x: "+ pX + "  y:"+ pY);
  }
  function onEndTouch(e){
      var pX = e.gesture.center.pageX;
      var pY = e.gesture.center.pageY;
      //console.log("x: "+ pX + "  y:"+ pY);
  }
  
  function onPinchIn(event){
    event.preventDefault();
    zoom(event.gesture.scale * -25);
    return false;
  }
  
  function onPinchOut(event){
    event.preventDefault();
    zoom(event.gesture.scale * 25);
    return false;
  }

    function onMouseWheel(event) {
        event.preventDefault();
        zoom(event.wheelDeltaY * 0.3);
        return false;
    }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        zoom(100);
        event.preventDefault();
        break;
      case 40:
        zoom(-100);
        event.preventDefault();
        break;
    }
  }

  function onWindowResize( event ) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1500 ? 1500 : distanceTarget;
    distanceTarget = distanceTarget < 800 ? 800 : distanceTarget;
  }
  
  function rotate() {
    target.x -= 0.00008;
  }

  function animate() {
    requestAnimationFrame(animate);    
    render();
  }
  
  function render() {
    zoom(curZoomSpeed);
    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.3;
    camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = distance * Math.sin(rotation.y);
    camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);
    camera.lookAt(mesh.position);
    renderer.render(scene, camera);
  }

  init();
  this.animate = animate;


  this.__defineGetter__('time', function() {
    return this._time || 0;
  });

  this.__defineSetter__('time', function(t) {
    var validMorphs = [];
    var morphDict = this.points.morphTargetDictionary;
    for(var k in morphDict) {
      if(k.indexOf('morphPadding') < 0) {
        validMorphs.push(morphDict[k]);
      }
    }
    validMorphs.sort();
    var l = validMorphs.length-1;
    var scaledt = t*l+1;
    var index = Math.floor(scaledt);
    for (i=0;i<validMorphs.length;i++) {
      this.points.morphTargetInfluences[validMorphs[i]] = 0;
    }
    var lastIndex = index - 1;
    var leftover = scaledt - index;
    if (lastIndex >= 0) {
      this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
    }
    this.points.morphTargetInfluences[index] = leftover;
    this._time = t;
  });

  function reset() {
    scene.remove(this.points);
    this.points = null;
  }

  this.addData = addData;
  this.createPoints = createPoints;
  this.renderer = renderer;
  this.scene = scene;
  this.reset = reset;
  this.onDrag = onDrag;
  this.onStartTouch = onStartTouch;
  this.onEndTouch = onEndTouch;
  this.onPinchIn = onPinchIn;
  this.onPinchOut = onPinchOut;

  return this;

};


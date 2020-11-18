import 'aframe';
import 'aframe-mapbox-component';
import 'aframe-shadow-casting';

const AFRAME = window.AFRAME;

AFRAME.registerComponent('canvas-updater', {
  dependencies: ['geometry', 'material'],

  tick: function () {
    var el = this.el;
    var material;

    material = el.getObject3D('mesh').material;
    if (!material.map) { return; }
          material.map.needsUpdate = true;
  }
});

AFRAME.registerComponent("yelpmap", {
  schema: {

  },
  init: function() {
    const centerLatLng = {lat: 37.7749,  lng: -122.4194}; // SF
    const mapZoom = 8;
    const mapPosition = {x: 0, y: 0, z: 0};//{x: 0, y: 1, z: -11};

    console.log("yelp map init!");

    this.mapBoxLoaded = false;
    this.resultsUpdated = false;
    this.businessList = undefined;
    this.mapPosition = mapPosition;
    this.mapEl = undefined;
    this.resultList = undefined;
    this.resultsBounds = undefined;

    // this.resultHoverCardEl = this.el.querySelector('#result-hovercard');

    this.createMapBoxMap(centerLatLng.lat, centerLatLng.lng, mapZoom, [mapPosition.x, mapPosition.y, mapPosition.z]);

    // this.mainCamera = document.querySelector('#mainCamera');
    // this.lookCube = document.querySelector('#lookCube');
    
  },
  update: function(oldData) {
    
  },
  remove: function() {

  },
  tick: function() {
      // Dont set this unless it changes
    // this.lookCube.setAttribute('position', this.mainCamera.getObject3D('camera').position);
  },

  setSearchResults: function(businessResults) {
    console.log('setSearchResults');
    this.businessList = businessResults;
    this.resultsUpdated = false;
    
    this.updateResults();    
  },

  ///////////////////////////
  // Helper Functions
  ///////////////////////////
  createMapBoxMap: function(mapCenterLat, mapCenterLng, mapZoom, position) {
    const mapEl = document.createElement('a-entity');  
    mapEl.setAttribute("id", "map-plane");
    mapEl.setAttribute("position", String(position.join(" ")));// "0 1 -11");//
    mapEl.setAttribute("rotation", "-90 0 0");
    mapEl.setAttribute("geometry", "primitive: plane; width: 10; height: 10;");
    mapEl.setAttribute("material", "color: #ffffff; shader: flat; side: both; transparent: true;");
    mapEl.setAttribute("shadow", "cast: true; receive: true;");
    mapEl.setAttribute("canvas-updater", "");
      
    const mapBoxParams = [
      'center: ', mapCenterLng + ", " + mapCenterLat,
      '; zoom: ', ''+(mapZoom+1),
      '; accesstoken: MAPBOX_ACCESS_TOKEN',
      '; style: mapbox://styles/mapbox/outdoors-v10;',
    ];
    mapEl.setAttribute("mapbox", mapBoxParams.join(''));
  
    const mapTableEl = document.createElement('a-box');  
    mapTableEl.setAttribute("id", "map-table");
    mapTableEl.setAttribute("position", "0 0 -0.051");
    mapTableEl.setAttribute("scale", "10 10 0.1");
    mapTableEl.setAttribute("material", "color: #ffffff;");
    mapTableEl.setAttribute("shadow", "cast: true; receive: true;");
    mapEl.appendChild(mapTableEl);  
    this.el.appendChild(mapEl);

    const shadowPlaneEl = document.createElement('a-entity');
    const shadowPanelPosition = [...position];
    shadowPanelPosition[1] = shadowPanelPosition[1] + 0.1;
    shadowPlaneEl.setAttribute("position", String(shadowPanelPosition.join(" "))); //"0 1.01 -11"
    shadowPlaneEl.setAttribute("shadow-plane", 'opacity: 0.3; dimensions: 10 10;');
    this.el.appendChild(shadowPlaneEl);

    this.mapEl = mapEl;
    this.mapEl.addEventListener("mapbox-loaded", () => this.onMapInit() );    
  },

  getMapMarker: function (mapEl, business) {
    const pos = mapEl.components.mapbox.project(business.coordinates.longitude, business.coordinates.latitude);
    const markerPosStr = pos.x + ' ' + pos.y + ' ' + (pos.z + 0.5);
  
    const point = document.createElement('a-cone');
    point.setAttribute('height', 0.5);
    point.setAttribute('radius-bottom', 0);
    point.setAttribute('radius-top', 0.1);
    point.setAttribute("segments-radial", "10");
    point.setAttribute("segments-height", "1");
    point.setAttribute('rotation', {x: 90, y: 0, z: 0});
    point.setAttribute('position', markerPosStr);
    point.setAttribute('color', '#f00');
    point.setAttribute("shadow", "cast: true");
    // point.setAttribute('wireframe', 'true');
  
    const markerEl = document.createElement('a-sphere');
    markerEl.setAttribute("color", "#f00");
    markerEl.setAttribute("position", "0 0.5 0");
    markerEl.setAttribute("radius", "0.2");
    markerEl.setAttribute("segments-height", "10");
    markerEl.setAttribute("segments-width", "10");
    markerEl.setAttribute("shadow", "cast: true");
    // markerEl.setAttribute('wireframe', 'true');
  
    point.appendChild(markerEl);

    return point;
  },

  onMapInit: function() {
    this.mapBoxLoaded = true;
    console.log("map-box loaded!");
    this.updateResults();
  
  },

  updateResults: function() {
    if(this.resultsUpdated) return;
    if(!this.businessList) return;
    if(!this.mapBoxLoaded) return;
    if(!this.mapEl) return;

    // Compare business lists to see if they are the same
    if (this.resultList) {
      let anyDifference = false;
      if (this.resultList.length != this.businessList.length) {
        anyDifference = true;
      } else {
        this.resultList.map((res, ind) => {
          if(res.business.id != this.businessList[ind].id) {
            anyDifference = true;
          }
        });  
      }
      // If there is any difference, clear out the existing results
      if (anyDifference) {
        this.clearResults();
      } else {
        this.resultsUpdated = true;
        return; // If there is not any differnce - then dont bother updating anything
      }
    }

    this.resultsUpdated = true;

    const newBounds = this.getResultsBounds(this.businessList);
    if(!this.resultsBounds || 
      this.resultsBounds.minLng != newBounds.minLng ||
      this.resultsBounds.minLat != newBounds.minlat ||
      this.resultsBounds.maxLng != newBounds.maxLng ||
      this.resultsBounds.maxLat != newBounds.maxLat) {
      
      this.resultsBounds = newBounds;
      const boundsWSENArray= [newBounds.minLng, newBounds.minLat, newBounds.maxLng, newBounds.maxLat];
      const mapBoxInst = this.mapEl.components.mapbox.getMap();
      mapBoxInst.once('moveend', _ => {
        this._buildResultList(this.businessList);
      });
      mapBoxInst.fitBounds(boundsWSENArray);      
  
    } else {
      this._buildResultList(this.businessList);
    }

  },

  _buildResultList: function(businessList) {
    console.log('building results listd');
    const resultList = businessList.map(biz => {
      return {
        business: biz,
        markerEl: this.getMapMarker(this.mapEl, biz)        
      }
    });
    this.resultList = resultList;

    resultList.map(res => {
      res.mouseEnterListener = () => this.onResultMouseEnter(res);
      res.markerEl.addEventListener("mouseenter", res.mouseEnterListener);
      res.mouseLeaveListener = () => this.onResultMouseLeave(res);
      res.markerEl.addEventListener("mouseleave", res.mouseLeaveListener);     
      this.mapEl.appendChild(res.markerEl);
    });

  },

  clearResults: function() {
    if(!this.resultList) {
      return;
    }

    this.resultList.map(res => {
      res.markerEl.removeEventListener("mouseenter", res.mouseEnterListener);
      res.markerEl.removeEventListener("mouseleave", res.mouseLeaveListener);
      this.mapEl.removeChild(res.markerEl);
    });
    this.resultList = undefined;
  },

  onResultMouseEnter: function(result) {
    // result.markerEl.setAttribute("color", "#ff0");
    // const pointEl = result.markerEl.querySelector("a-sphere"); 
    // pointEl.setAttribute("color", "#ff0");
  
    
    // const markerPosition = {...result.markerEl.getAttribute("position")};
    // const hoverCardPosition = {
    //   x: this.mapPosition.x + markerPosition.x,
    //   y: this.mapPosition.y + markerPosition.z,// + 2,
    //   z: this.mapPosition.z - markerPosition.y
    // };
    // this.resultHoverCardEl.setAttribute("position",`${hoverCardPosition.x} ${hoverCardPosition.y} ${hoverCardPosition.z}` );
    // this.resultHoverCardEl.querySelector("h1").innerHTML = `${result.business.name}`;
    // this.resultHoverCardEl.querySelector("p").innerHTML = `${result.business.rating} stars  ${result.business.review_count} reviews`;
    // if(result.business.photos && result.business.photos.length>0) {
    //   this.resultHoverCardEl.querySelector("img").setAttribute('src', result.business.photos[0]);
    // }
    // this.resultHoverCardEl.setAttribute("visible", "true");
  
  },
  
  onResultMouseLeave: function(result,) {
    // result.markerEl.setAttribute("color", "#f00");
    // const pointEl = result.markerEl.querySelector("a-sphere"); 
    // pointEl.setAttribute("color", "#f00");

    // this.resultHoverCardEl.setAttribute("visible", "false");
    // this.resultHoverCardEl.setAttribute("position", "0 0 100");
  },

  getResultsCenterLatLng: function(businessList) {
    const latLngSum = businessList.reduce((latLngSum, biz) => {
      latLngSum.lat += biz.coordinates.latitude;
      latLngSum.lng += biz.coordinates.longitude;
      return latLngSum;
    }, {lat: 0, lng: 0});
    return { lat: latLngSum.lat / businessList.length, lng: latLngSum.lng / businessList.length };
  },
  
  getResultsBounds: function(businessList) {
    const bounds = businessList.reduce((minMaxLatLng, biz) => {
      minMaxLatLng.maxLat = minMaxLatLng.maxLat > biz.coordinates.latitude ? minMaxLatLng.maxLat : biz.coordinates.latitude;
      minMaxLatLng.maxLng = minMaxLatLng.maxLng > biz.coordinates.longitude ? minMaxLatLng.maxLng : biz.coordinates.longitude;
      minMaxLatLng.minLat = minMaxLatLng.minLat < biz.coordinates.latitude ? minMaxLatLng.minLat : biz.coordinates.latitude;
      minMaxLatLng.minLng = minMaxLatLng.minLng < biz.coordinates.longitude ? minMaxLatLng.minLng : biz.coordinates.longitude;
      return minMaxLatLng;
    }, {maxLat: -1000, maxLng: -1000, minLat: 1000, minLng: 1000});
    return bounds; 
  }
});

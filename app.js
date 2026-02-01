js

console.log("App.js loaded");
import {parseStepClimb} from './core/parser.js';
import {buildRoutePoints,enrichRoute} from './core/route.js';
import airports from './data/airports.json' assert {type:'json'};

const map=L.map('map').setView([50,30],4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:10}).addTo(map);
let routeLayer;

function flColor(fl){return fl<300?'#00bcd4':fl<340?'#4caf50':'#ff9800';}

function drawRoute(points){
  if(routeLayer) routeLayer.remove();
  const segs=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    segs.push(L.polyline([[a.lat,a.lon],[b.lat,b.lon]],{color:flColor(a.fl),weight:4}));
  }
  routeLayer=L.layerGroup(segs).addTo(map);
  map.fitBounds(routeLayer.getBounds(),{padding:[20,20]});
}

document.getElementById('calculate').onclick=()=>{
  const dep=airports[from.value], dest=airports[to.value];
  const profile=parseStepClimb(stepProfile.value);
  const {points}=buildRoutePoints(dep,dest,100);
  drawRoute(enrichRoute(points,profile));
};


import React, { useEffect, useRef, useState } from 'react';
import { Puzzle } from '../types';
import { Navigation, Globe, Map as MapIcon, Layers, Play, X, MapPin, MousePointerClick } from 'lucide-react';

// Declare Leaflet types since we are loading it via script tag
declare global {
  interface Window {
    L: any;
  }
}

interface GameMapProps {
  puzzles: Puzzle[];
  onPuzzleSelect: (puzzle: Puzzle) => void;
  fogEnabled: boolean;
  onGpsStatusChange: (status: 'searching' | 'locked' | 'error') => void;
  completedPuzzleIds: string[];
}

// Constant for the Fog of War "Clear Zone" radius (in meters)
const FOG_RADIUS = 80;

// --- Geo Math Helpers ---
function toRad(deg: number) {
    return deg * Math.PI / 180;
}

function toDeg(rad: number) {
    return rad * 180 / Math.PI;
}

function getBearing(lat1: number, lng1: number, lat2: number, lng2: number) {
    const dLon = toRad(lng2 - lng1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360;
}

function getDestination(lat: number, lng: number, brng: number, distMeters: number) {
    const R = 6371000; // Earth Radius in meters
    const angDist = distMeters / R;
    const lat1 = toRad(lat);
    const lon1 = toRad(lng);
    const brngRad = toRad(brng);

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angDist) +
                           Math.cos(lat1) * Math.sin(angDist) * Math.cos(brngRad));
    const lon2 = lon1 + Math.atan2(Math.sin(brngRad) * Math.sin(angDist) * Math.cos(lat1),
                                   Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2));

    return { lat: toDeg(lat2), lng: toDeg(lon2) };
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371e3; // metres
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2-lat1);
    const Δλ = toRad(lng2-lng1);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}
// ------------------------

export const GameMap: React.FC<GameMapProps> = ({ puzzles, onPuzzleSelect, fogEnabled, onGpsStatusChange, completedPuzzleIds }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const fogLayerRef = useRef<any>(null);
  
  // Use a ref for the callback to avoid re-running the main useEffect
  const onGpsStatusChangeRef = useRef(onGpsStatusChange);
  useEffect(() => {
      onGpsStatusChangeRef.current = onGpsStatusChange;
  }, [onGpsStatusChange]);

  const hasCenteredRef = useRef<boolean>(false);
  const isFollowingRef = useRef<boolean>(true); // Track if map should follow user
  const userPosRef = useRef<{lat: number, lng: number} | null>(null); // Ref to access userPos in callbacks
  
  // We store both mission markers and arrow markers
  const markersRef = useRef<{[key: string]: any}>({}); 
  const arrowsRef = useRef<{[key: string]: any}>({});

  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  const [showMapLinks, setShowMapLinks] = useState<boolean>(false);
  
  // Selection State
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null);

  // Sync ref with state
  useEffect(() => {
    userPosRef.current = userPos;
  }, [userPos]);

  // External URLs
  const URL_GEOMAP = "https://geomap.gsmma.gov.tw/gwh";
  const URL_MAPY = "https://map.happyman.idv.tw/twmap/login.php";

  const DEFAULT_LAT = 25.032647;
  const DEFAULT_LNG = 121.580098;

  // Handle Device Orientation for User Marker Arrow
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading = 0;
      if ((event as any).webkitCompassHeading) {
        // iOS
        heading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android (absolute if available, else relative)
        heading = 360 - event.alpha;
      }
      
      const arrow = document.getElementById('user-heading-arrow');
      if (arrow) {
          arrow.style.transform = `rotate(${heading}deg)`;
      }
    };

    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Initialize Leaflet Map
    const map = window.L.map(mapContainerRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    // Disable following when user manually drags the map
    map.on('dragstart', () => {
        isFollowingRef.current = false;
    });

    // Deselect on map click
    map.on('click', () => {
        setSelectedPuzzleId(null);
    });

    // Light Mode Tiles (CartoDB Light)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Create Fog Layer - White Mist for Light Mode
    const fogCanvas = window.L.canvas({ padding: 0.5 });
    fogCanvas.addTo(map);
    fogLayerRef.current = fogCanvas;

  }, []);

  // Update Fog Logic & Landmarks Visibility
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // 1. Handle Fog Layer
    if (fogLayerRef.current) {
       // Clear existing fog polygons
       map.eachLayer((layer: any) => {
          if (layer._path && layer.options.className === 'fog-of-war') {
            map.removeLayer(layer);
          }
       });

       if (fogEnabled && userPos) {
           const worldCoords = [
             [90, -180], [90, 180], [-90, 180], [-90, -180]
           ];
           const holePoints = [];
           for(let i=0; i<=360; i+=10) {
               const dest = getDestination(userPos.lat, userPos.lng, i, FOG_RADIUS);
               holePoints.push([dest.lat, dest.lng]);
           }

           const fogPolygon = window.L.polygon([worldCoords, holePoints], {
             color: 'transparent',
             fillColor: '#ffffff', // White fog
             fillOpacity: 0.9,
             className: 'fog-of-war',
             interactive: false,
             zIndex: 500
           });
           fogPolygon.addTo(map);
       }
    }

    // 2. Handle Landmarks (Four Beasts)
    // We use a separate class 'landmark-marker' to track them
    map.eachLayer((layer: any) => {
        if (layer.options && layer.options.className === 'landmark-label') {
            map.removeLayer(layer);
        }
        if (layer.options && layer.options.icon && layer.options.icon.options.className === 'landmark-label') {
             map.removeLayer(layer);
        }
    });

    const LANDMARKS = [
      { name: '虎山', height: 138, lat: 25.031571054733273, lng: 121.58361867008533 },
      { name: '豹山', height: 141, lat: 25.029558090580725, lng: 121.582654871389 },
      { name: '獅山', height: 151, lat: 25.026732268016207, lng: 121.58067762839389 },
      { name: '象山', height: 183, lat: 25.02788330197117, lng: 121.5762413424949 }
    ];

    LANDMARKS.forEach(lm => {
        let isVisible = true;
        if (fogEnabled && userPos) {
            const dist = getDistance(userPos.lat, userPos.lng, lm.lat, lm.lng);
            if (dist > FOG_RADIUS) isVisible = false;
        }

        if (isVisible) {
            const icon = window.L.divIcon({
                className: 'landmark-label',
                html: `<div class="flex flex-col items-center justify-center">
                        <div class="w-2 h-2 bg-slate-600 rounded-full ring-2 ring-white"></div>
                        <span class="mt-1 text-[10px] font-bold text-slate-700 bg-white/80 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap border border-slate-200">${lm.name}</span>
                    </div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 5] 
            });
            
            const marker = window.L.marker([lm.lat, lm.lng], { 
                icon, 
                interactive: true, 
                zIndexOffset: 400 
            });

            marker.on('click', () => {
                // Determine height text based on Mission 1 completion
                const isMission1Complete = completedPuzzleIds.includes('1');
                const heightText = isMission1Complete 
                    ? `<span class="text-teal-600">高度: ${lm.height}m</span>` 
                    : `<span class="text-slate-400">高度: ???</span>`;

                window.L.popup({
                    offset: [0, -10],
                    className: 'landmark-popup',
                    closeButton: false,
                    autoClose: true
                })
                .setLatLng([lm.lat, lm.lng])
                .setContent(`<div class="text-center font-sans font-bold text-slate-700 text-xs">${lm.name}<br/>${heightText}</div>`)
                .openOn(map);
            });

            marker.addTo(map);
        }
    });

  }, [fogEnabled, userPos, completedPuzzleIds]);

  // Update User Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const updateUserPosition = (lat: number, lng: number) => {
        setUserPos({ lat, lng });

        if (!userMarkerRef.current) {
            // Create User Marker with Direction Arrow
            const icon = window.L.divIcon({
                className: 'user-marker',
                html: `
                  <div class="relative flex items-center justify-center w-12 h-12">
                     <!-- Direction Arrow -->
                     <div id="user-heading-arrow" class="absolute w-full h-full flex items-center justify-center transition-transform duration-200 ease-linear" style="transform: rotate(0deg);">
                        <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] border-b-blue-500" style="margin-bottom: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));"></div>
                     </div>
                     <!-- Pulse -->
                     <div class="absolute w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                     <!-- Center Dot -->
                     <div class="relative w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10"></div>
                  </div>
                `,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });
            userMarkerRef.current = window.L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
        } else {
            userMarkerRef.current.setLatLng([lat, lng]);
        }

        // Center map initially or auto-follow
        if (!hasCenteredRef.current) {
            mapInstanceRef.current.setView([lat, lng], 17);
            hasCenteredRef.current = true;
        } else if (isFollowingRef.current) {
            mapInstanceRef.current.panTo([lat, lng]);
        }
    };

    if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser. Using fallback.");
        onGpsStatusChangeRef.current('error');
        updateUserPosition(DEFAULT_LAT, DEFAULT_LNG);
        return;
    }

    onGpsStatusChangeRef.current('searching');

    const watchId = navigator.geolocation.watchPosition(
        (position) => {
            onGpsStatusChangeRef.current('locked');
            const { latitude, longitude } = position.coords;
            updateUserPosition(latitude, longitude);
        },
        (error) => {
            console.warn("Geolocation error:", error.message, "- Using fallback location.");
            onGpsStatusChangeRef.current('error');
            updateUserPosition(DEFAULT_LAT, DEFAULT_LNG);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update Puzzle Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    puzzles.forEach(puzzle => {
        const isSelected = selectedPuzzleId === puzzle.id;
        const isCompleted = completedPuzzleIds.includes(puzzle.id);
        
        // Visibility Check for Fog
        let isVisible = true;
        if (fogEnabled && userPos) {
            const dist = getDistance(userPos.lat, userPos.lng, puzzle.lat, puzzle.lng);
            if (dist > FOG_RADIUS) isVisible = false;
        }

        // Remove existing marker if invisible
        if (!isVisible) {
            if (markersRef.current[puzzle.id]) {
                mapInstanceRef.current.removeLayer(markersRef.current[puzzle.id]);
                delete markersRef.current[puzzle.id];
            }
            return; // Skip rendering
        }

        // Marker Color based on difficulty
        let colorClass = 'bg-slate-500'; // Default Gray for completed
        if (!isCompleted) {
            if (puzzle.difficulty === 'Novice') colorClass = 'bg-emerald-500';
            if (puzzle.difficulty === 'Geologist') colorClass = 'bg-amber-500';
            if (puzzle.difficulty === 'Expert') colorClass = 'bg-rose-500';
            if (puzzle.type === 'side') colorClass = 'bg-indigo-500';
        } else {
            colorClass = 'bg-slate-400';
        }

        const html = `
            <div class="relative group flex items-center justify-center w-12 h-12">
                ${!isCompleted ? `<div class="absolute inset-2 ${colorClass} rounded-full animate-ping opacity-40"></div>` : ''}
                <div class="relative w-8 h-8 ${colorClass} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white transition-transform ${isSelected ? 'scale-125 ring-4 ring-teal-300' : ''}">
                   ${isCompleted 
                     ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                     : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
                   }
                </div>
            </div>
        `;

        if (!markersRef.current[puzzle.id]) {
            const icon = window.L.divIcon({
                className: 'custom-puzzle-marker',
                html: html,
                iconSize: [48, 48],
                iconAnchor: [24, 24] // Center it better for the pulse effect area
            });
            
            const marker = window.L.marker([puzzle.lat, puzzle.lng], { icon });
            marker.on('click', () => {
                setSelectedPuzzleId(puzzle.id);
            });
            marker.addTo(mapInstanceRef.current);
            markersRef.current[puzzle.id] = marker;
        } else {
             const icon = window.L.divIcon({
                className: 'custom-puzzle-marker',
                html: html,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });
            markersRef.current[puzzle.id].setIcon(icon);
        }
    });

    // Clean up markers for puzzles not in current list (rare) or hidden by fog loop above handles removal
  }, [puzzles, selectedPuzzleId, completedPuzzleIds, fogEnabled, userPos]); 

  // Update Fog Arrows
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Clear old arrows
    Object.values(arrowsRef.current).forEach((arrow: any) => {
        mapInstanceRef.current.removeLayer(arrow);
    });
    arrowsRef.current = {};

    // Only show arrows if Fog is enabled and we have user position
    if (fogEnabled && userPos) {
        puzzles.forEach(puzzle => {
            // Skip if completed
            if (completedPuzzleIds.includes(puzzle.id)) return;

            // Calculate distance and bearing
            const dist = getDistance(userPos.lat, userPos.lng, puzzle.lat, puzzle.lng);
            const bearing = getBearing(userPos.lat, userPos.lng, puzzle.lat, puzzle.lng);

            // If puzzle is outside fog radius, show arrow
            if (dist > FOG_RADIUS) {
                const arrowPos = getDestination(userPos.lat, userPos.lng, bearing, FOG_RADIUS - 20);
                
                let color = '#64748b'; 
                if (puzzle.difficulty === 'Novice') color = '#10b981'; 
                if (puzzle.difficulty === 'Geologist') color = '#f59e0b'; 
                if (puzzle.difficulty === 'Expert') color = '#f43f5e'; 
                if (puzzle.type === 'side') color = '#6366f1'; 

                const icon = window.L.divIcon({
                    className: 'custom-arrow-icon',
                    html: `
                        <div style="transform: rotate(${bearing}deg); display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));">
                             <svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="12 2 22 22 12 18 2 22" />
                             </svg>
                        </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                
                const arrowMarker = window.L.marker([arrowPos.lat, arrowPos.lng], { 
                    icon, 
                    zIndexOffset: 1000,
                    interactive: false 
                });
                arrowMarker.addTo(mapInstanceRef.current);
                arrowsRef.current[puzzle.id] = arrowMarker;
            }
        });
    }

  }, [fogEnabled, userPos, puzzles, completedPuzzleIds]);

  const handleRecenter = () => {
      if (userPos && mapInstanceRef.current) {
          mapInstanceRef.current.setView([userPos.lat, userPos.lng], 17);
          isFollowingRef.current = true;
      }
  };

  const selectedPuzzle = selectedPuzzleId ? puzzles.find(p => p.id === selectedPuzzleId) : null;
  const distanceToTarget = (userPos && selectedPuzzle) 
      ? Math.round(getDistance(userPos.lat, userPos.lng, selectedPuzzle.lat, selectedPuzzle.lng)) 
      : 0;

  return (
    <div className="relative w-full h-full bg-slate-200">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Selected Mission Card */}
      {selectedPuzzle && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className={`h-1.5 w-full ${
                      completedPuzzleIds.includes(selectedPuzzle.id) ? 'bg-slate-400' :
                      selectedPuzzle.difficulty === 'Novice' ? 'bg-emerald-500' :
                      selectedPuzzle.difficulty === 'Geologist' ? 'bg-amber-500' : 
                      selectedPuzzle.difficulty === 'Expert' ? 'bg-rose-500' : 'bg-indigo-500'
                  }`}></div>
                  <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Target Locked</div>
                              <h3 className="font-bold text-slate-800 font-mono leading-tight">{selectedPuzzle.title}</h3>
                          </div>
                          <div className="text-right">
                              <div className="text-2xl font-bold font-mono text-teal-600">{distanceToTarget}m</div>
                              <div className="text-[10px] text-slate-400 font-mono">DISTANCE</div>
                          </div>
                      </div>
                      
                      <p className="text-xs text-slate-600 line-clamp-2 mb-4 border-l-2 border-slate-200 pl-2">
                          {selectedPuzzle.description}
                      </p>

                      <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedPuzzleId(null)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-lg font-mono font-bold text-xs"
                          >
                            CANCEL
                          </button>
                          <button 
                            onClick={() => onPuzzleSelect(selectedPuzzle)}
                            className={`flex-[2] text-white py-2.5 rounded-lg font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                                completedPuzzleIds.includes(selectedPuzzle.id) 
                                ? 'bg-slate-500 hover:bg-slate-600' 
                                : 'bg-teal-600 hover:bg-teal-500 hover:shadow-teal-500/20'
                            }`}
                          >
                             {completedPuzzleIds.includes(selectedPuzzle.id) ? 'REVIEW DATA' : 'ENGAGE MISSION'}
                             <Play className="w-3 h-3 fill-current" />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* External Map Links */}
      {showMapLinks && (
        <div className="absolute bottom-6 right-20 z-[1000] flex flex-col gap-2 animate-in slide-in-from-right-4 fade-in duration-200">
             <a 
                href={URL_MAPY} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/90 backdrop-blur border border-amber-200 px-4 py-2 rounded-lg shadow-lg hover:bg-amber-50 flex items-center gap-2 text-xs font-mono font-bold text-slate-700"
            >
                <Globe className="w-4 h-4 text-amber-500" />
                Mapy.tw
            </a>
            <a 
                href={URL_GEOMAP} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/90 backdrop-blur border border-emerald-200 px-4 py-2 rounded-lg shadow-lg hover:bg-emerald-50 flex items-center gap-2 text-xs font-mono font-bold text-slate-700"
            >
                <Layers className="w-4 h-4 text-emerald-500" />
                GeoMap
            </a>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-3">
        <button 
            onClick={() => setShowMapLinks(!showMapLinks)}
            className={`p-3 rounded-full shadow-lg transition-all ${showMapLinks ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:text-teal-600'}`}
        >
            <MapIcon className="w-6 h-6" />
        </button>
        <button 
            onClick={handleRecenter}
            className="bg-white p-3 rounded-full text-slate-600 shadow-lg hover:text-teal-600 active:scale-95 transition-all"
        >
            <Navigation className={`w-6 h-6 ${isFollowingRef.current ? 'text-teal-600 fill-teal-100' : ''}`} />
        </button>
      </div>

    </div>
  );
};

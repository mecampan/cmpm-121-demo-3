import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";

import { Board } from "./board.ts";
import luck from "./luck.ts";

import "./style.css";

// Set the game name
document.title = "Breathing Air From Around the World";

// Variables, Classes, and Interface Declarations ---------------------------------------//
interface Cell {
  i: number;
  j: number;
}

interface Coin {
  cell: Cell;
  serial: number;
}

interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

class Cache implements Memento<string> {
  cell: Cell;
  coins: Coin[];

  constructor(cell: Cell, coins: Coin[]) {
    this.cell = cell;
    this.coins = coins;
  }

  toMemento(): string {
    return JSON.stringify({ coins: this.coins });
  }

  fromMemento(memento: string) {
    const state = JSON.parse(memento);
    this.coins = state.coins;
  }
}

const AIR_EMOJI: string = "💨";
const BUBBLE_EMOJI: string = "🫧";

// Map and player marker setup ---------------------------------------//

const oakesClassroom = leaflet.latLng({
  lat: 36.98949379578401,
  lng: -122.06277128548504,
});
const mapZoomLevel = 19;

const map = leaflet.map(document.getElementById("map")!, {
  center: oakesClassroom,
  zoom: mapZoomLevel,
  minZoom: mapZoomLevel - 3,
  maxZoom: mapZoomLevel + 1,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

const playerMarker = leaflet.marker(oakesClassroom).bindTooltip(
  "It's a you, {userName}!",
);
playerMarker.addTo(map);

// Player inventory setup ---------------------------------------//
const playerInventoryCache = new Cache({ i: -1, j: -1 }, []);
const playerInventoryText = document.createElement("div");
playerInventoryText.textContent =
  `Inhaled ${playerInventoryCache.coins.length} Breaths of Air`;
document.body.appendChild(playerInventoryText);

const playerInventoryList = document.createElement("div");
document.body.appendChild(playerInventoryList);

function updatePlayerInventory() {
  playerInventoryText.textContent =
    `Inhaled ${playerInventoryCache.coins.length} Breaths of Air`;
  playerInventoryList.innerHTML = "";
  playerInventoryCache.coins.forEach((coin) => {
    const coinInfo = document.createElement("div");
    coinInfo.textContent =
      `${AIR_EMOJI} ${coin.cell.i}:${coin.cell.j}#${coin.serial}`;

    // Add click event to center map on the coin's home cache
    coinInfo.addEventListener("click", () => {
      const cellKey = `${coin.cell.i},${coin.cell.j}`;
      if (cellCacheMap.has(cellKey)) {
        const cacheBounds = gridMap.getCellBounds(coin.cell); // Get bounds of the cache
        map.panTo(cacheBounds.getCenter()); // Center map on the cache
      }
    });

    playerInventoryList.appendChild(coinInfo);
  });

  savePlayerInventory();
}

// Map Cache ---------------------------------------//
const cellCacheMap = new Map<string, string>();
const visibleCacheMarkers = new Map<string, leaflet.Marker>();
const gridMap = new Board(0.0001, 8);

function transferCoin(fromCache: Cache, toCache: Cache, coin: Coin) {
  fromCache.coins = fromCache.coins.filter((c) => c !== coin);
  toCache.coins.push(coin);
  toCache.coins.sort((a, b) => a.serial - b.serial);
}

function updateVisibleCaches() {
  const currentVisibleCells = gridMap.getCellsNearPoint(
    playerMarker.getLatLng(),
  );
  const currentVisibleKeys = new Set(
    currentVisibleCells.map((cell) => `${cell.i},${cell.j}`),
  );

  // Remove markers that are no longer in the visible cells
  visibleCacheMarkers.forEach((marker, cellKey) => {
    if (!currentVisibleKeys.has(cellKey)) {
      map.removeLayer(marker);
      visibleCacheMarkers.delete(cellKey);
    }
  });

  // Create or show caches in the visible cells
  currentVisibleCells.forEach((cell) => {
    const cellKey = `${cell.i},${cell.j}`;
    if (visibleCacheMarkers.has(cellKey)) {
      // Cache is already visible; nothing to do
      return;
    }

    let cache: Cache;
    if (cellCacheMap.has(cellKey)) {
      // Restore cache state from memento
      cache = new Cache(cell, []);
      cache.fromMemento(cellCacheMap.get(cellKey)!);
    } else if (luck(cellKey) < 0.02) {
      // 2% chance to create a new cache
      cache = createCache(cell);
      cellCacheMap.set(cellKey, cache.toMemento()); // Save the cache's memento
    } else {
      return;
    }

    // Create custom emoji icon for the cache marker
    const bubbleIcon = leaflet.divIcon({
      className: "bubble-icon",
      html: BUBBLE_EMOJI,
      iconSize: [10, 10],
      iconAnchor: [30, 30],
    });

    // Create and display the cache marker
    const bounds = gridMap.getCellBounds(cell);
    const center = bounds.getCenter();
    const cacheMarker = leaflet.marker(center, { icon: bubbleIcon });

    const container = createCachePopup(cache);
    cacheMarker.bindPopup(() => container);
    cacheMarker.addTo(map);
    visibleCacheMarkers.set(cellKey, cacheMarker);
  });
}

function createCache(inCell: Cell) {
  const numCoins = Math.floor(
    luck([inCell.i, inCell.j, "i_dont_get_this_tbh"].toString()) * 5,
  );

  const coins: Coin[] = [];
  for (let i = 0; i < numCoins; i++) {
    coins.push({ cell: inCell, serial: i + 1 });
  }
  return new Cache(inCell, coins);
}

function createCachePopup(cache: Cache): HTMLElement {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";

  // Cache ID (Static Display)
  const cacheID = document.createElement("div");
  cacheID.textContent = `Air Pocket: ${cache.cell.i}:${cache.cell.j}`;
  container.appendChild(cacheID);

  // Collect Buttons Div
  const collectButtonsDiv = document.createElement("div");
  collectButtonsDiv.style.display = "flex";
  collectButtonsDiv.style.flexDirection = "column";
  container.appendChild(collectButtonsDiv);

  // Insert Button Div
  const insertButtonDiv = document.createElement("div");
  insertButtonDiv.style.display = "flex";
  insertButtonDiv.style.justifyContent = "center";
  container.appendChild(insertButtonDiv);

  // Add Insert Button
  const insertButton = createDropCoinButton(cache);
  insertButtonDiv.appendChild(insertButton);

  // Initial Setup for Collect Buttons
  createCollectButtons(cache, collectButtonsDiv);

  return container;
}

function refreshCachePopup(cache: Cache) {
  const cellKey = `${cache.cell.i},${cache.cell.j}`;
  const cacheMarker = visibleCacheMarkers.get(cellKey);

  if (cacheMarker) {
    const popupContent = createCachePopup(cache);
    cacheMarker.setPopupContent(popupContent);
  }
}

function createCollectButtons(cache: Cache, collectButtonsDiv: HTMLElement) {
  // Clear existing buttons
  collectButtonsDiv.innerHTML = "";

  // Create a button for each coin in the cache
  cache.coins.forEach((coin) => {
    const button = createCollectCoinButton(cache, coin);
    collectButtonsDiv.appendChild(button);
  });
}

function createCollectCoinButton(cache: Cache, coin: Coin): HTMLElement {
  const coinButtonData = document.createElement("div");
  coinButtonData.style.display = "flex";
  coinButtonData.style.flexDirection = "row";

  const coinDataText = document.createElement("div");
  coinDataText.textContent =
    `${AIR_EMOJI} ${coin.cell.i}:${coin.cell.j}#${coin.serial}`;

  const collectButton = document.createElement("button");
  collectButton.textContent = "Inhale";

  collectButton.addEventListener("click", () => {
    transferCoin(cache, playerInventoryCache, coin);
    cellCacheMap.set(`${cache.cell.i},${cache.cell.j}`, cache.toMemento());
    refreshCachePopup(cache);
    updatePlayerInventory();
    saveCaches();
  });

  coinButtonData.appendChild(coinDataText);
  coinButtonData.appendChild(collectButton);
  return coinButtonData;
}

function createDropCoinButton(cache: Cache): HTMLButtonElement {
  const insertButton = document.createElement("button");
  insertButton.textContent = "Exhale";

  insertButton.addEventListener("click", () => {
    if (playerInventoryCache.coins.length > 0) {
      const coinToDrop = playerInventoryCache.coins.pop()!;
      transferCoin(playerInventoryCache, cache, coinToDrop);
      cellCacheMap.set(`${cache.cell.i},${cache.cell.j}`, cache.toMemento());
      refreshCachePopup(cache);
      updatePlayerInventory();
      saveCaches();
    }
  });

  return insertButton;
}

// Movement controls---------------------------------------//
const geolocationButton = document.querySelector<HTMLButtonElement>("#global");
if (geolocationButton) {
  geolocationButton.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition((position) => {
      playerMarker.setLatLng([
        position.coords.latitude,
        position.coords.longitude,
      ]);
      updatePathLines([position.coords.latitude, position.coords.longitude]);
      map.panTo(playerMarker.getLatLng());
      updateVisibleCaches();
    }, (error) => {
      console.error(error);
    });
  });
}

const movementButtons = document.querySelectorAll<HTMLButtonElement>(
  "#controlPanel button[direction]",
);
const moveDistance = 0.0001;

function movePlayer(direction: string) {
  const currentPos = playerMarker.getLatLng();
  let newLat = currentPos.lat;
  let newLng = currentPos.lng;

  switch (direction) {
    case "north":
      newLat += moveDistance;
      break;
    case "south":
      newLat -= moveDistance;
      break;
    case "west":
      newLng -= moveDistance;
      break;
    case "east":
      newLng += moveDistance;
      break;
  }

  const newCoords: [number, number] = [newLat, newLng];
  playerMarker.setLatLng(newCoords);
  updatePathLines(newCoords); // Update the polyline immediately
  map.panTo(playerMarker.getLatLng());
  updateVisibleCaches();
}

movementButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.getAttribute("direction")!;
    movePlayer(direction);
  });
});

let geolocationWatchId: number | null = null;

const toggleGeolocationButton = document.querySelector<HTMLButtonElement>(
  "#global",
);
if (toggleGeolocationButton) {
  toggleGeolocationButton.addEventListener("click", () => {
    if (geolocationWatchId === null) {
      // Start geolocation updates
      geolocationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          playerMarker.setLatLng([latitude, longitude]);
          updatePathLines([latitude, longitude]); // Update polyline
          map.panTo(playerMarker.getLatLng()); // Pan map to new location
          updateVisibleCaches(); // Update visible caches
        },
        (error) => {
          console.error("Geolocation error:", error.message);
        },
      );
      console.log("Geolocation updates started.");
    } else {
      // Stop geolocation updates
      navigator.geolocation.clearWatch(geolocationWatchId);
      geolocationWatchId = null;
      console.log("Geolocation updates stopped.");
    }
  });
}

// Path Memory ---------------------------------------//
let pathCoords: Array<[number, number]> = [];
const polyline = leaflet.polyline([], { color: "red" }).addTo(map);

function initializePath() {
  const playerPosition = playerMarker.getLatLng();
  if (pathCoords.length === 0) { // Avoid overwriting if already initialized
    const startingCoords: [number, number] = [
      playerPosition.lat,
      playerPosition.lng,
    ];
    pathCoords.push(startingCoords);
    polyline.setLatLngs(pathCoords);
    localStorage.setItem("pathCoords", JSON.stringify(pathCoords));
  }
}

function updatePathLines(newCoords: [number, number]) {
  if (pathCoords.length === 0) {
    initializePath(); // Ensure path starts from the player's current location
  }
  pathCoords.push(newCoords);
  polyline.setLatLngs(pathCoords);
  localStorage.setItem("pathCoords", JSON.stringify(pathCoords));
}

// Clear persistent data ---------------------------------------//
const clearDataButton = document.querySelector<HTMLButtonElement>("#clear");
if (clearDataButton) {
  clearDataButton.addEventListener("click", () => {
    const clear = prompt(
      "Are you sure you want to reset path data and exhale all air back to their homes? (y/n):",
    );
    if (clear === "y") {
      clearPersistentData();
    }
  });
}

function clearPersistentData() {
  // Clear visible caches from the map
  visibleCacheMarkers.forEach((marker) => map.removeLayer(marker));
  visibleCacheMarkers.clear();

  // Clear runtime and persistent data
  cellCacheMap.clear();
  localStorage.removeItem("caches");
  localStorage.removeItem("playerInventory");
  localStorage.removeItem("pathCoords");

  // Clear the polyline
  pathCoords = [];
  polyline.setLatLngs([]);

  // Clear player inventory
  playerInventoryCache.coins = [];
  updatePlayerInventory();

  // Reinitialize caches and polyline
  initializePath();
  updateVisibleCaches();
}

function saveCaches() {
  const cacheData = Array.from(cellCacheMap.entries()).map((
    [key, memento],
  ) => ({
    key,
    memento,
  }));
  localStorage.setItem("caches", JSON.stringify(cacheData));
}

function savePlayerInventory() {
  localStorage.setItem("playerInventory", playerInventoryCache.toMemento());
}

function LoadPersistentData() {
  initializePath();
  loadPlayerInventory();
  loadCaches();
  loadPathData();
}

function loadCaches() {
  const storedCaches = localStorage.getItem("caches");
  if (storedCaches) {
    const cacheArray = JSON.parse(storedCaches);
    cacheArray.forEach(({ key, memento }: { key: string; memento: string }) => {
      const cellParts = key.split(",");
      const cell: Cell = {
        i: parseInt(cellParts[0]),
        j: parseInt(cellParts[1]),
      };
      const cache = new Cache(cell, []);
      cache.fromMemento(memento);

      // Ensure cache is recreated using deterministic luck
      const recreatedCache = createCache(cell);
      recreatedCache.coins = cache.coins; // Overwrite with stored coins if present
      cellCacheMap.set(key, recreatedCache.toMemento());
    });
  }
  updateVisibleCaches();
}

function loadPlayerInventory() {
  const storedPlayerInventory = localStorage.getItem("playerInventory");
  if (storedPlayerInventory) {
    playerInventoryCache.fromMemento(storedPlayerInventory);
    updatePlayerInventory(); // Update the UI to reflect the loaded inventory
  }
}

function loadPathData() {
  const storedPathCoords = localStorage.getItem("pathCoords");
  if (storedPathCoords) {
    pathCoords = JSON.parse(storedPathCoords);
    polyline.setLatLngs(pathCoords);
  } else {
    initializePath();
  }
}

LoadPersistentData();

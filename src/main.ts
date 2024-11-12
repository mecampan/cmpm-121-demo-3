import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";

import { Board } from "./board.ts";
import luck from "./luck.ts";

import "./style.css";

// Set the game name
document.title = "GeoCoin Game";

// Map and player marker setup
const oakesClassroom = leaflet.latLng({
  lat: 36.98949379578401,
  lng: -122.06277128548504,
});
const mapZoomLevel = 19;

const map = leaflet.map(document.getElementById("map")!, {
  center: oakesClassroom,
  zoom: mapZoomLevel,
  minZoom: mapZoomLevel,
  maxZoom: mapZoomLevel,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

const playerMarker = leaflet.marker(oakesClassroom).bindTooltip(
  "It's a you, {userName}!",
);
playerMarker.addTo(map);

interface Cell {
  i: number;
  j: number;
}

interface Coin {
  cell: Cell;
  serial: number;
}

// Player inventory setup
const playerInventory: Coin[] = [];
const playerInventoryText = document.createElement("div");
playerInventoryText.textContent = `Coins Collected: ${playerInventory.length}`;
document.body.appendChild(playerInventoryText);

const playerInventoryList = document.createElement("div");
document.body.appendChild(playerInventoryList);

function updatePlayerInventory() {
  playerInventoryText.textContent =
    `Coins Collected: ${playerInventory.length}`;
  playerInventoryList.innerHTML = "";
  playerInventory.forEach((coin) => {
    const coinInfo = document.createElement("div");
    coinInfo.textContent = `${coin.cell.i}:${coin.cell.j}#${coin.serial}`;
    playerInventoryList.appendChild(coinInfo);
  });
}

// Movement controls
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

  playerMarker.setLatLng([newLat, newLng]);
  map.panTo(playerMarker.getLatLng());
  updateVisibleCaches();
}

movementButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.getAttribute("direction")!;
    movePlayer(direction);
  });
});

// Cache Creation and Regeneration
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

const cellCacheMap = new Map<string, string>();
const visibleCacheMarkers = new Map<string, leaflet.Marker>();
const gridMap = new Board(0.0001, 8);

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
      // No cache in this cell
      return;
    }

    // Create and display the cache marker
    const bounds = gridMap.getCellBounds(cell);
    const center = bounds.getCenter();
    const cacheMarker = leaflet.marker(center);

    const container = createCachePopup(cache);
    cacheMarker.bindPopup(() => container);
    cacheMarker.addTo(map);
    visibleCacheMarkers.set(cellKey, cacheMarker);
  });
}

function createCache(inCell: Cell) {
  // Generate a random number of coins between 0 and 3 because luck only make 0...
  const numCoins = Math.floor(Math.random() * 4);

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

  const cacheID = document.createElement("div");
  cacheID.textContent = `Cache: ${cache.cell.i}:${cache.cell.j}`;
  container.appendChild(cacheID);

  cache.coins.forEach((coin) => {
    const button = createCollectCoinButton(cache, coin, container);
    container.appendChild(button);
  });

  container.appendChild(createDropCoinButton(cache, container));
  return container;
}

function createCollectCoinButton(
  cache: Cache,
  coin: Coin,
  container: HTMLElement,
): HTMLElement {
  const coinButtonData = document.createElement("div");
  coinButtonData.style.display = "flex";
  coinButtonData.style.flexDirection = "row";

  const coinDataText = document.createElement("div");
  coinDataText.textContent = `${coin.cell.i}:${coin.cell.j}#${coin.serial}`;

  const collectButton = document.createElement("button");
  collectButton.textContent = "Collect Coin";

  collectButton.addEventListener("click", () => {
    if (
      cache.coins.find((c) =>
        c.cell.i === coin.cell.i && c.cell.j === coin.cell.j &&
        c.serial === coin.serial
      )
    ) {
      playerInventory.push(coin);
      cache.coins = cache.coins.filter((c) => c !== coin);
      container.removeChild(coinButtonData);
      updatePlayerInventory();
      cellCacheMap.set(`${cache.cell.i},${cache.cell.j}`, cache.toMemento());
    }
  });

  coinButtonData.appendChild(coinDataText);
  coinButtonData.appendChild(collectButton);
  container.appendChild(coinButtonData);

  return coinButtonData;
}

function createDropCoinButton(
  cache: Cache,
  container: HTMLElement,
): HTMLButtonElement {
  const insertButton = document.createElement("button");
  insertButton.textContent = "Insert Coin";

  insertButton.addEventListener("click", () => {
    if (playerInventory.length > 0) {
      const newCoin = playerInventory.pop()!;
      cache.coins.push(newCoin);

      const newCollectButton = createCollectCoinButton(
        cache,
        newCoin,
        container,
      );
      container.insertBefore(newCollectButton, insertButton);

      updatePlayerInventory();
      cellCacheMap.set(`${cache.cell.i},${cache.cell.j}`, cache.toMemento());
    }
  });

  return insertButton;
}

updateVisibleCaches();

import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";

import { Board } from "./board.ts";
//import luck from "./luck.ts"

import "./style.css";

const gameName = "GeoCoin Game";
document.title = gameName;

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
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(oakesClassroom);
playerMarker.bindTooltip("It's a you, {userName}!");
playerMarker.addTo(map);

let playerInventory = 0;
const playerInventoryText = document.createElement("div");
playerInventoryText.textContent = `Coins Collected: ${playerInventory}`;
document.body.appendChild(playerInventoryText);

function updatePlayerInventory() {
  playerInventoryText.textContent = `Coins Collected: ${playerInventory}`;
}

const gridMap = new Board(0.0001, 8);
const visibleCells = gridMap.getCellsNearPoint(playerMarker.getLatLng());
//visibleCells.forEach(cell => {
//const bounds = gridMap.getCellBounds(cell);
// View grid
//const layer = leaflet.rectangle(bounds, { color: "#ff7800", weight: 1 });
//layer.addTo(map);
//});

interface Cell {
  i: number;
  j: number;
}

interface Coin {
  cell: Cell;
  serial: number;
}

interface Cache {
  coins: Coin[];
}

function createCache() {
  const randomCellIndex = randomNum(0, visibleCells.length - 1);
  const selectedCell = visibleCells[randomCellIndex];

  const numCoins = randomNum(1, 3);
  const cache: Cache = { coins: [] };
  for (let i = 0; i < numCoins; i++) {
    cache.coins.push({ cell: selectedCell, serial: i });
  }

  const bounds = gridMap.getCellBounds(selectedCell);
  const center = bounds.getCenter();
  const cacheMarker = leaflet.marker(center);

  const container = document.createElement("div");

  const coinCountText = document.createElement("div");
  coinCountText.id = `coins-${randomCellIndex}`;
  coinCountText.textContent = `Coins: ${cache.coins.length}`;

  container.appendChild(coinCountText);
  container.appendChild(createCollectCoinButton(cache));
  container.appendChild(createDropCoinButton(cache, selectedCell));

  cacheMarker.bindPopup(() => container);

  addEventListener("cache-updated", () => {
    coinCountText.id = `coins-${randomCellIndex}`;
    coinCountText.textContent = `Coins: ${cache.coins.length}`;
  });

  addEventListener("player-inventory-changed", () => {
    updatePlayerInventory();
  });

  cacheMarker.addTo(map);
}

function createCollectCoinButton(cache: Cache): HTMLButtonElement {
  const collectButton = document.createElement("button");
  collectButton.textContent = "Collect Coin";
  collectButton.addEventListener("click", () => {
    if (cache.coins.length > 0) {
      playerInventory++;
      cache.coins.pop();
      dispatchEvent(new Event("cache-updated"));
      dispatchEvent(new Event("player-inventory-changed"));
    }
  });

  return collectButton;
}

function createDropCoinButton(
  cache: Cache,
  selectedCell: Cell,
): HTMLButtonElement {
  const insertButton = document.createElement("button");
  insertButton.textContent = "Insert Coin";
  insertButton.addEventListener("click", () => {
    if (playerInventory > 0) {
      playerInventory--;
      cache.coins.push({ cell: selectedCell, serial: cache.coins.length });
      dispatchEvent(new Event("cache-updated"));
      dispatchEvent(new Event("player-inventory-changed"));
    }
  });

  return insertButton;
}

function randomNum(min: number, max: number) {
  return Math.floor((Math.random() * (max - min + 1)) + min);
}

const numCaches = randomNum(1, 5);
for (let i = 0; i < numCaches; i++) {
  createCache();
}

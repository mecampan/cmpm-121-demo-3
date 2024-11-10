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

const playerInventory: Coin[] = [];
const playerInventoryText = document.createElement("div");
playerInventoryText.textContent = `Coins Collected: ${playerInventory}`;
document.body.appendChild(playerInventoryText);

// Container to display collected coins
const playerInventoryList = document.createElement("div");
document.body.appendChild(playerInventoryList);

function updatePlayerInventory() {
  playerInventoryText.textContent =
    `Coins Collected: ${playerInventory.length}`;
  playerInventoryList.innerHTML = ""; // Clear the current list

  // Display each collected coin in the inventory
  playerInventory.forEach((coin) => {
    const coinInfo = document.createElement("div");
    coinInfo.textContent = `${coin.cell.i}:${coin.cell.j}#${coin.serial}`;
    playerInventoryList.appendChild(coinInfo);
  });
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

  // Initialize coins in the cache
  for (let i = 0; i < numCoins; i++) {
    cache.coins.push({ cell: selectedCell, serial: i + 1 });
  }

  const bounds = gridMap.getCellBounds(selectedCell);
  const center = bounds.getCenter();
  const cacheMarker = leaflet.marker(center);

  const container = document.createElement("div");
  container.style.flexDirection = "column"; // Align buttons vertically

  const cacheID = document.createElement("div");
  cacheID.textContent = `Cache: ${selectedCell.i}:${selectedCell.j}`;
  container.appendChild(cacheID);

  // Add collect buttons for each coin
  cache.coins.forEach((coin) => {
    const button = createCollectCoinButton(cache, coin, container);
    container.appendChild(button);
  });

  // Add insert button
  container.appendChild(createDropCoinButton(cache, container));

  cacheMarker.bindPopup(() => container);

  addEventListener("cache-updated", () => {
  });

  addEventListener("player-inventory-changed", () => {
    updatePlayerInventory();
  });

  cacheMarker.addTo(map);
}

function createCollectCoinButton(
  cache: Cache,
  coin: Coin,
  container: HTMLElement,
): HTMLElement {
  const coinButtonData = document.createElement("div");
  coinButtonData.style.display = "flex";
  coinButtonData.style.flexDirection = "row"; // Align buttons vertically

  const coinDataText = document.createElement("div");
  coinDataText.textContent = `${coin.cell.i}:${coin.cell.j}#${coin.serial}`;

  const collectButton = document.createElement("button");
  collectButton.textContent = "Collect Coin";

  collectButton.addEventListener("click", () => {
    // Use find to check if the coin exists in cache.coins
    if (
      cache.coins.find((c) => c.cell === coin.cell && c.serial === coin.serial)
    ) {
      playerInventory.push(coin); // Add the collected coin to player inventory
      cache.coins = cache.coins.filter((c) => c !== coin); // Remove the specific coin from the cache

      // Update the DOM and remove the button
      container.removeChild(coinButtonData);
      dispatchEvent(new Event("cache-updated"));
      dispatchEvent(new Event("player-inventory-changed"));
    }
  });

  coinButtonData.appendChild(coinDataText);
  coinButtonData.appendChild(collectButton);

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
      const newCoin = playerInventory.pop()!; // Remove a coin from player inventory
      cache.coins.push(newCoin);

      // Add a new "Collect Coin" button to the container
      const newCollectButton = createCollectCoinButton(
        cache,
        newCoin,
        container,
      );
      container.insertBefore(newCollectButton, insertButton); // Add button above the insert button

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

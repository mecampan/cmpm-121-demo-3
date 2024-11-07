import leaflet from "leaflet";

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();

    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }

    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const aCell = this.getCanonicalCell(cell);

    const southWest = new leaflet.LatLng(
      aCell.i * this.tileWidth,
      aCell.j * this.tileWidth,
    );
    const northEast = new leaflet.LatLng(
      (aCell.i + 1) * this.tileWidth,
      (aCell.j + 1) * this.tileWidth,
    );

    return new leaflet.LatLngBounds(southWest, northEast);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);

    for (
      let i = originCell.i - this.tileVisibilityRadius;
      i <= originCell.i + this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = originCell.j - this.tileVisibilityRadius;
        j <= originCell.j + this.tileVisibilityRadius;
        j++
      ) {
        const cell = this.getCanonicalCell({ i, j });
        if (
          !resultCells.some((existingCell) =>
            existingCell.i === cell.i && existingCell.j === cell.j
          )
        ) {
          resultCells.push(cell);
        }
      }
    }
    return resultCells;
  }
}

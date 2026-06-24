import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type Map, type Marker } from 'maplibre-gl';

export type RouteMapPoint = {
  latitude: number | string;
  longitude: number | string;
};

export type RouteMapStop = RouteMapPoint & {
  label: string;
  title?: string;
  subtitle?: string;
  kind?: 'pickup' | 'collection';
};

type Coordinate = [number, number];
type OsrmRouteResponse = {
  routes?: Array<{
    geometry?: {
      type: 'LineString';
      coordinates: Coordinate[];
    };
  }>;
};

const MALAYSIA_BOUNDS: LngLatBoundsLike = [
  [99.0, -1.8],
  [120.5, 8.2],
];
const ROUTE_REQUEST_TIMEOUT_MS = 8_000;

@Component({
  selector: 'app-route-map',
  template: `
    <div class="relative size-full min-h-64  overflow-hidden bg-muted">
      <div #mapHost class="size-full min-h-64 "></div>
      @if (loadError) {
      <div class="absolute bottom-3 inset-x-3  rounded-md border border-border bg-background/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
        {{ loadError }}
      </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    :host ::ng-deep .maplibregl-map {
      font: inherit;
      height: 100%;
      overflow: hidden;
      position: relative;
      width: 100%;
    }

    :host ::ng-deep .maplibregl-canvas {
      display: block;
      height: 100%;
      left: 0;
      position: absolute;
      top: 0;
      width: 100%;
    }

    :host ::ng-deep .maplibregl-marker {
      left: 0;
      opacity: 1;
      position: absolute;
      top: 0;
      will-change: transform;
    }

    :host ::ng-deep .maplibregl-popup {
      max-width: 16rem;
      pointer-events: none;
      position: absolute;
      z-index: 3;
    }

    :host ::ng-deep .maplibregl-popup-content {
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
      border-radius: 0.5rem;
      box-shadow: 0 10px 30px rgb(15 23 42 / 0.16);
      color: hsl(var(--foreground));
      font-size: 0.75rem;
      padding: 0.5rem 0.625rem;
    }

    :host ::ng-deep .maplibregl-popup-tip {
      display: none;
    }

    :host ::ng-deep .route-marker {
      align-items: center;
      border: 2px solid hsl(var(--background));
      box-shadow: 0 10px 24px rgb(15 23 42 / 0.2);
      display: grid;
      font-size: 0.8rem;
      font-weight: 800;
      height: 2rem;
      justify-items: center;
      line-height: 1;
      width: 2rem;
    }

    :host ::ng-deep .route-marker-origin {
      border-radius: 9999px;
    }

    :host ::ng-deep .route-marker-pickup {
      border-radius: 9999px;
      outline: 2px solid rgb(255 255 255 / 0.8);
      outline-offset: 1px;
    }

    :host ::ng-deep .route-marker-collection {
      border-radius: 9999px;
      height: 2.25rem;
      outline: 2px solid rgb(255 255 255 / 0.9);
      outline-offset: 1px;
      width: 2.25rem;
    }

    :host ::ng-deep .route-marker-collection svg {
      height: 1.2rem;
      width: 1.2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mapHost = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');

  @Input() origin: RouteMapPoint | null = null;
  @Input() stops: RouteMapStop[] = [];
  @Input() collectionPoints: RouteMapStop[] = [];

  protected loadError = '';
  protected isRouteLoading = false;

  private map: Map | null = null;
  private markers: Marker[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;
  private routeRequestId = 0;
  private renderedRouteSignature = '';

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.createMap();
  }

  ngOnChanges(): void {
    if (!this.map) {
      return;
    }

    this.renderRouteIfChanged();
  }

  ngOnDestroy(): void {
    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
    }
    this.resizeObserver?.disconnect();
    this.clearMarkers();
    this.map?.remove();
    this.map = null;
  }

  private createMap(): void {
    const firstCoordinate = this.routeCoordinates()[0] ?? [101.6869, 3.139] as Coordinate;

    this.map = new maplibregl.Map({
      container: this.mapHost().nativeElement,
      center: firstCoordinate,
      zoom: 11,
      minZoom: 5,
      maxZoom: 16,
      maxBounds: MALAYSIA_BOUNDS,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: 'OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.queueResize();
    });
    this.resizeObserver.observe(this.mapHost().nativeElement);
    this.queueResize();

    this.map.on('load', () => {
      this.queueResize();
      this.renderRouteIfChanged();
    });
  }

  private renderRouteIfChanged(): void {
    if (!this.map?.loaded()) {
      return;
    }

    const signature = this.routeSignature();
    if (signature === this.renderedRouteSignature) {
      return;
    }

    this.renderedRouteSignature = signature;
    void this.renderRoute();
  }

  private async renderRoute(): Promise<void> {
    const map = this.map;
    if (!map || !map.loaded()) {
      return;
    }

    const requestId = ++this.routeRequestId;
    const coordinates = this.routeCoordinates();
    const viewportCoordinates = this.viewportCoordinates();
    this.loadError = '';
    this.isRouteLoading = coordinates.length >= 2;
    map.resize();
    this.renderMarkers();
    this.fitToCoordinates(viewportCoordinates);

    if (coordinates.length < 2) {
      this.isRouteLoading = false;
      this.renderRouteLine(coordinates);
      return;
    }

    try {
      const routeCoordinates = await this.fetchRouteCoordinates(coordinates);
      if (requestId !== this.routeRequestId) {
        return;
      }

      this.map?.resize();
      this.renderRouteLine(routeCoordinates.length > 0 ? routeCoordinates : coordinates);
      this.fitToCoordinates(routeCoordinates.length > 0 ? routeCoordinates : coordinates);
    } catch {
      if (requestId !== this.routeRequestId) {
        return;
      }

      this.loadError = 'Showing stop order. Driving route is unavailable right now.';
      this.renderRouteLine(coordinates);
      this.fitToCoordinates(viewportCoordinates);
    } finally {
      if (requestId === this.routeRequestId) {
        this.isRouteLoading = false;
      }
    }
  }

  private async fetchRouteCoordinates(coordinates: Coordinate[]): Promise<Coordinate[]> {
    const coordinatePath = coordinates.map(([longitude, latitude]) => `${longitude},${latitude}`).join(';');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ROUTE_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinatePath}?overview=full&geometries=geojson`, {
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error('Unable to load OSRM route.');
    }

    const payload = await response.json() as OsrmRouteResponse;
    return payload.routes?.[0]?.geometry?.coordinates ?? [];
  }

  private renderMarkers(): void {
    const map = this.map;
    if (!map) {
      return;
    }

    this.clearMarkers();

    const originCoordinate = this.toCoordinate(this.origin);
    if (originCoordinate) {
      this.markers.push(this.createMarker('You', 'origin', originCoordinate));
    }

    for (const stop of this.stops) {
      const coordinate = this.toCoordinate(stop);
      if (!coordinate) {
        continue;
      }

      this.markers.push(this.createMarker(stop.label, stop.kind === 'collection' ? 'collection' : 'pickup', coordinate, stop.title, stop.subtitle));
    }

    for (const point of this.collectionPoints) {
      const coordinate = this.toCoordinate(point);
      if (!coordinate) {
        continue;
      }

      this.markers.push(this.createMarker(point.label, 'collection', coordinate, point.title, point.subtitle));
    }
  }

  private createMarker(label: string, kind: 'origin' | 'pickup' | 'collection', coordinate: Coordinate, title?: string, subtitle?: string): Marker {
    const markerElement = document.createElement('div');
    markerElement.className = `route-marker route-marker-${kind}`;
    this.applyMarkerColors(markerElement, kind);
    if (kind === 'collection') {
      markerElement.innerHTML = `
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V9l7-4 7 4v12" />
          <path d="M9 21v-6h6v6" />
          <path d="M9 10h.01" />
          <path d="M15 10h.01" />
        </svg>
      `;
      markerElement.setAttribute('aria-label', label);
    } else {
      markerElement.textContent = label;
    }

    const marker = new maplibregl.Marker({ element: markerElement, anchor: 'center' }).setLngLat(coordinate);
    if (title || subtitle) {
      marker.setPopup(
        new maplibregl.Popup({ closeButton: false, offset: 18 }).setHTML(
          `<strong>${this.escapeHtml(title ?? label)}</strong>${subtitle ? `<br><span>${this.escapeHtml(subtitle)}</span>` : ''}`,
        ),
      );
    }

    marker.addTo(this.map as Map);
    return marker;
  }

  private applyMarkerColors(element: HTMLElement, kind: 'origin' | 'pickup' | 'collection'): void {
    if (kind === 'origin') {
      element.style.backgroundColor = '#111827';
      element.style.color = '#ffffff';
      return;
    }

    if (kind === 'collection') {
      element.style.backgroundColor = '#f59e0b';
      element.style.color = '#111827';
      return;
    }

    element.style.backgroundColor = '#16a34a';
    element.style.color = '#ffffff';
  }

  private renderRouteLine(coordinates: Coordinate[]): void {
    const map = this.map;
    if (!map || coordinates.length === 0) {
      return;
    }

    const data = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates,
      },
    };

    if (map.getSource('route')) {
      (map.getSource('route') as GeoJSONSource).setData(data);
      return;
    }

    map.addSource('route', {
      type: 'geojson',
      data,
    });
    map.addLayer({
      id: 'route-shadow',
      type: 'line',
      source: 'route',
      paint: {
        'line-color': '#0f172a',
        'line-opacity': 0.18,
        'line-width': 8,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      paint: {
        'line-color': '#16a34a',
        'line-width': 4,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });
  }

  private fitToCoordinates(coordinates: Coordinate[]): void {
    const map = this.map;
    if (!map || coordinates.length === 0) {
      return;
    }

    if (coordinates.length === 1) {
      map.easeTo({ center: coordinates[0], zoom: 13, duration: 350 });
      return;
    }

    const bounds = coordinates.reduce((nextBounds, coordinate) => nextBounds.extend(coordinate), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
    map.fitBounds(bounds as LngLatBoundsLike, {
      padding: 48,
      maxZoom: 14,
      duration: 350,
    });
  }

  private queueResize(): void {
    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
    }

    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.map?.resize();
      this.fitToCoordinates(this.viewportCoordinates());
    });
  }

  private routeCoordinates(): Coordinate[] {
    return [
      this.toCoordinate(this.origin),
      ...this.stops.map((stop) => this.toCoordinate(stop)),
    ].filter((coordinate): coordinate is Coordinate => coordinate !== null);
  }

  private collectionPointCoordinates(): Coordinate[] {
    return this.collectionPoints
      .map((point) => this.toCoordinate(point))
      .filter((coordinate): coordinate is Coordinate => coordinate !== null);
  }

  private viewportCoordinates(): Coordinate[] {
    const routeCoordinates = this.routeCoordinates();
    return routeCoordinates.length > 0 ? routeCoordinates : this.collectionPointCoordinates();
  }

  private routeSignature(): string {
    const origin = this.toCoordinate(this.origin);
    const stops = this.stops
      .map((stop) => {
        const coordinate = this.toCoordinate(stop);
        return coordinate ? `${stop.kind ?? 'pickup'}:${stop.label}:${coordinate[0]},${coordinate[1]}` : null;
      })
      .filter((value): value is string => value !== null)
      .join('|');
    const collectionPoints = this.collectionPoints
      .map((point) => {
        const coordinate = this.toCoordinate(point);
        return coordinate ? `${point.label}:${coordinate[0]},${coordinate[1]}` : null;
      })
      .filter((value): value is string => value !== null)
      .join('|');

    return `${origin ? `${origin[0]},${origin[1]}` : 'no-origin'}>${stops}>${collectionPoints}`;
  }

  private toCoordinate(point: RouteMapPoint | null): Coordinate | null {
    if (!point) {
      return null;
    }

    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return [longitude, latitude];
  }

  private clearMarkers(): void {
    for (const marker of this.markers) {
      marker.remove();
    }

    this.markers = [];
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      switch (character) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#039;';
        default:
          return character;
      }
    });
  }
}

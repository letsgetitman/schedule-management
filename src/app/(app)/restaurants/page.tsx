"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

type Restaurant = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  lat: number;
  lng: number;
  memo: string | null;
  visited: boolean;
  rating: number | null;
  addedBy: { id: string; name: string };
};

type SearchResult = {
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  naverPlaceId: string | null;
};

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // 서울시청

export default function RestaurantsPage() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const markersRef = useRef<{ setMap: (m: NaverMapInstance | null) => void }[]>(
    [],
  );

  const [mapReady, setMapReady] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  const loadRestaurants = useCallback(async () => {
    const res = await fetch("/api/restaurants");
    if (res.ok) {
      const body = await res.json();
      setRestaurants(body.restaurants);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount is intentional
    loadRestaurants();
  }, [loadRestaurants]);

  // Initialize the map once the SDK script has loaded.
  useEffect(() => {
    if (!mapReady || !mapDivRef.current || !window.naver) return;
    mapRef.current = new window.naver.maps.Map(mapDivRef.current, {
      center: new window.naver.maps.LatLng(
        DEFAULT_CENTER.lat,
        DEFAULT_CENTER.lng,
      ),
      zoom: 13,
    });
  }, [mapReady]);

  // Redraw markers whenever the restaurant list changes.
  useEffect(() => {
    if (!mapRef.current || !window.naver) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = restaurants.map(
      (r) =>
        new window.naver!.maps.Marker({
          position: new window.naver!.maps.LatLng(r.lat, r.lng),
          map: mapRef.current,
          title: r.name,
        }),
    );
  }, [restaurants]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const res = await fetch(
      `/api/restaurants/search?query=${encodeURIComponent(query)}`,
    );
    setSearching(false);
    if (res.ok) {
      const body = await res.json();
      setResults(body.items);
    }
  }

  async function addRestaurant(item: SearchResult) {
    await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    setResults((r) => r.filter((i) => i.name !== item.name));
    await loadRestaurants();
    if (mapRef.current && window.naver) {
      mapRef.current.panTo(new window.naver.maps.LatLng(item.lat, item.lng));
    }
  }

  async function toggleVisited(r: Restaurant) {
    await fetch(`/api/restaurants/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: !r.visited }),
    });
    loadRestaurants();
  }

  async function setRating(r: Restaurant, rating: number) {
    await fetch(`/api/restaurants/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    loadRestaurants();
  }

  async function removeRestaurant(id: string) {
    await fetch(`/api/restaurants/${id}`, { method: "DELETE" });
    loadRestaurants();
  }

  return (
    <div className="space-y-4">
      {clientId ? (
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`}
          strategy="afterInteractive"
          onLoad={() => setMapReady(true)}
        />
      ) : (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 설정되지 않아 지도를 표시할 수
          없습니다. .env를 확인하세요.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          ref={mapDivRef}
          className="h-[480px] w-full rounded-lg border border-black/10 bg-black/5"
        />

        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="맛집 검색 (예: 홍대 파스타)"
              className="flex-1 rounded-md border border-black/15 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-md bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              검색
            </button>
          </form>

          {results.length > 0 && (
            <ul className="space-y-2">
              {results.map((item) => (
                <li
                  key={`${item.name}-${item.lat}`}
                  className="rounded-md border border-black/10 p-2 text-sm"
                >
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-black/50">
                    {item.category} · {item.address}
                  </p>
                  <button
                    onClick={() => addRestaurant(item)}
                    className="mt-1 rounded-md border border-black/15 px-2 py-0.5 text-xs"
                  >
                    지도에 추가
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">저장된 맛집</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {restaurants.map((r) => (
            <li
              key={r.id}
              className="space-y-1 rounded-md border border-black/10 p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.name}</span>
                <button
                  onClick={() => removeRestaurant(r.id)}
                  className="text-xs text-black/40 hover:text-red-600"
                >
                  삭제
                </button>
              </div>
              <p className="text-xs text-black/50">
                {r.category} · {r.address}
              </p>
              <p className="text-xs text-black/40">
                추가: {r.addedBy.name}
              </p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={r.visited}
                    onChange={() => toggleVisited(r)}
                  />
                  가봤어요
                </label>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(r, n)}
                      className={
                        r.rating && n <= r.rating
                          ? "text-amber-500"
                          : "text-black/20"
                      }
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

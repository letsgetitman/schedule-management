import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Proxies Naver's 지역(local) search API. This must run server-side: the
// API requires the Client Secret in a header (never expose it to the
// browser) and does not allow direct browser calls (CORS).
//
// Docs: https://developers.naver.com/docs/serviceapi/search/local/local.md
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "NAVER_SEARCH_CLIENT_ID / SECRET이 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  if (!query) {
    return NextResponse.json({ error: "query가 필요합니다." }, { status: 400 });
  }

  const naverUrl = new URL("https://openapi.naver.com/v1/search/local.json");
  naverUrl.searchParams.set("query", query);
  naverUrl.searchParams.set("display", "5");

  const res = await fetch(naverUrl, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "네이버 검색 API 호출에 실패했습니다." },
      { status: res.status },
    );
  }

  const data = await res.json();

  // mapx/mapy are WGS84 longitude/latitude * 10^7 (Naver changed away from
  // KATEC in 2021). Divide by 1e7 to get plain lat/lng for the map.
  // Double-check pin placement against current Naver docs if this ever
  // looks off, since third-party API formats can change.
  const items = (data.items ?? []).map((item: Record<string, string>) => ({
    name: item.title.replace(/<\/?b>/g, ""),
    category: item.category,
    address: item.roadAddress || item.address,
    lat: Number(item.mapy) / 1e7,
    lng: Number(item.mapx) / 1e7,
    naverPlaceId: item.link || null,
  }));

  return NextResponse.json({ items });
}

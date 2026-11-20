import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";

function loadEnvLocal(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuffer, data]);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function createSolidWarmIvoryPng(width = 4, height = 4) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // RGB color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const rowStride = 1 + width * 3;
  const rawScanlines = Buffer.alloc(rowStride * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowStride;
    rawScanlines[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x += 1) {
      const px = rowStart + 1 + x * 3;
      rawScanlines[px] = 0xfa; // R (#FAF8F5)
      rawScanlines[px + 1] = 0xf8; // G
      rawScanlines[px + 2] = 0xf5; // B
    }
  }

  const compressed = deflateSync(rawScanlines);

  return Buffer.concat([
    signature,
    makePngChunk("IHDR", ihdrData),
    makePngChunk("IDAT", compressed),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function extractAdminSessionCookie(res) {
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  const headerList =
    setCookies.length > 0
      ? setCookies
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie")]
        : [];

  for (const header of headerList) {
    if (!header) continue;
    const match = header.match(/(honju_admin_session=[^;]+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

const MOCK_RAW_TEXT = `
[청담 아뜰리에 혼주메이크업 헤어]
위치: 서울 강남구 압구정로 123 3층 (청담역 8번 출구 200m)
혼주 패키지: 어머님 헤어+메이크업 1인 25만원, 아버님 7만원
새벽 5시부터 예약 가능 (얼리스타트 6시 이전 3만원 추가)
발렛파킹 가능 (2시간 4천원)
후기 요약: 한복 올림머리 볼륨을 너무 과하지 않고 단아하게 잘 잡아주심. 양가 어머님 모두 만족해하셨어요.
단독 프라이빗 룸에서 조용하게 진행되어 복잡하지 않아 좋았습니다.
네이버 플레이스: https://naver.me/mocktest123
`.trim();

const REQUIRED_PARSED_KEYS = [
  "name",
  "region",
  "address",
  "price_summary",
  "service_type",
  "parking_info",
  "business_hours",
  "highlights",
  "pros",
  "cons",
  "summary_note",
];

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  loadEnvLocal(envPath);

  const baseUrl = (process.env.TEST_BASE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const adminPin = process.env.ADMIN_PIN;
  const keepCreatedShop = process.argv.includes("--keep");

  if (!adminPin) {
    throw new Error("ADMIN_PIN is missing in environment or .env.local");
  }

  console.log("=== Honju Lookbook E2E Mock Test ===");
  console.log(`Target Base URL: ${baseUrl}`);

  let sessionCookie = null;
  let uploadedImage = null;
  let createdShopId = null;

  try {
    // 1. Admin Auth
    const authRes = await fetch(`${baseUrl}/api/admin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: adminPin }),
    });
    const authJson = await authRes.json();
    assert.equal(
      authRes.status,
      200,
      `Step 1 Auth failed (${authRes.status}): ${JSON.stringify(authJson)}`
    );
    assert.equal(authJson.authenticated, true);

    sessionCookie = extractAdminSessionCookie(authRes);
    assert.ok(sessionCookie, "honju_admin_session cookie was not set");
    console.log("[PASS] Step 1 POST /api/admin/auth -> 200 (cookie acquired)");

    // 2. Gemini AI Parse
    const parseRes = await fetch(`${baseUrl}/api/admin/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ raw_text: MOCK_RAW_TEXT }),
    });
    const parseJson = await parseRes.json();
    assert.equal(
      parseRes.status,
      200,
      `Step 2 Parse failed (${parseRes.status}): ${JSON.stringify(parseJson)}`
    );
    const parsed = parseJson.parsed;
    assert.ok(parsed && typeof parsed === "object", "Missing parsed object");

    for (const key of REQUIRED_PARSED_KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(parsed, key),
        `Parsed output missing key: ${key}`
      );
    }
    assert.ok(Array.isArray(parsed.highlights), "highlights must be an array");
    assert.equal(
      parsed.detected_naver_map_url,
      "https://naver.me/mocktest123"
    );
    console.log("[PASS] Step 2 POST /api/admin/parse -> 200 (11 fields + URL)");
    console.log("Parsed Draft:", JSON.stringify(parsed, null, 2));

    // 3. Image Upload
    const pngBuffer = createSolidWarmIvoryPng(4, 4);
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([pngBuffer], { type: "image/png" }),
      "e2e-mock.png"
    );

    const uploadRes = await fetch(`${baseUrl}/api/admin/upload`, {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
      },
      body: formData,
    });
    const uploadJson = await uploadRes.json();
    assert.equal(
      uploadRes.status,
      201,
      `Step 3 Upload failed (${uploadRes.status}): ${JSON.stringify(uploadJson)}`
    );
    assert.ok(uploadJson.storage_path, "Missing storage_path");
    assert.ok(uploadJson.public_url, "Missing public_url");
    uploadedImage = uploadJson;

    const cdnRes = await fetch(uploadJson.public_url);
    assert.equal(
      cdnRes.status,
      200,
      `Uploaded CDN URL returned ${cdnRes.status}`
    );
    console.log(
      `[PASS] Step 3 POST /api/admin/upload -> 201 (CDN verified: ${uploadJson.storage_path})`
    );

    // 4. Create Shop
    const createShopPayload = {
      name: parsed.name || "청담 아뜰리에 혼주메이크업 헤어",
      status: "finalist",
      region: parsed.region,
      address: parsed.address,
      venue_distance_note: "식장까지 차로 15분 (E2E 테스트)",
      service_type: parsed.service_type,
      price_summary: parsed.price_summary,
      parking_info: parsed.parking_info,
      business_hours: parsed.business_hours,
      highlights: parsed.highlights,
      pros: parsed.pros,
      cons: parsed.cons,
      summary_note: parsed.summary_note,
      naver_map_url: parsed.detected_naver_map_url,
      instagram_url: parsed.detected_instagram_url,
      raw_source_text: MOCK_RAW_TEXT,
      images: [
        {
          storage_path: uploadJson.storage_path,
          public_url: uploadJson.public_url,
          caption: "어머님 한복 올림머리 (E2E 테스트)",
          is_cover: true,
          sort_order: 0,
        },
      ],
    };

    const createRes = await fetch(`${baseUrl}/api/admin/shops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify(createShopPayload),
    });
    const createJson = await createRes.json();
    assert.equal(
      createRes.status,
      201,
      `Step 4 Create shop failed (${createRes.status}): ${JSON.stringify(createJson)}`
    );
    createdShopId = createJson.shop?.id;
    assert.ok(createdShopId, "Created shop ID is missing");
    console.log(
      `[PASS] Step 4 POST /api/admin/shops -> 201 (id: ${createdShopId})`
    );

    // 5. Public List & Detail Read (No admin cookie)
    const listRes = await fetch(`${baseUrl}/api/shops?filter=all`, {
      cache: "no-store",
    });
    const listJson = await listRes.json();
    assert.equal(
      listRes.status,
      200,
      `Step 5 List failed (${listRes.status}): ${JSON.stringify(listJson)}`
    );
    const matchedShop = (listJson.shops || []).find(
      (item) => item.id === createdShopId
    );
    assert.ok(matchedShop, "Created shop did not appear in GET /api/shops");
    assert.equal(
      matchedShop.cover_image?.public_url,
      uploadJson.public_url,
      "Cover image mismatch in public list"
    );

    const detailRes = await fetch(`${baseUrl}/api/shops/${createdShopId}`, {
      cache: "no-store",
    });
    const detailJson = await detailRes.json();
    assert.equal(detailRes.status, 200, "GET /api/shops/[id] failed");
    assert.equal(detailJson.shop?.id, createdShopId);
    console.log(
      `[PASS] Step 5 GET /api/shops & GET /api/shops/[id] -> 200 (visible in public lookbook, total=${listJson.total})`
    );

    // 6. Family Role Vote
    const voteRes = await fetch(`${baseUrl}/api/shops/${createdShopId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family_role: "신부측 어머니" }),
    });
    const voteJson = await voteRes.json();
    assert.equal(
      voteRes.status,
      200,
      `Step 6 Vote failed (${voteRes.status}): ${JSON.stringify(voteJson)}`
    );
    assert.equal(voteJson.voted, true);
    assert.equal(voteJson.vote_count, 1);
    assert.ok(
      Array.isArray(voteJson.voters) &&
        voteJson.voters.includes("신부측 어머니"),
      "Voter list does not include 신부측 어머니"
    );
    console.log(
      `[PASS] Step 6 POST /api/shops/[id]/vote -> 200 (voted=${voteJson.voted}, voters=${JSON.stringify(voteJson.voters)})`
    );
  } finally {
    // 7. Cleanup mock records & uploaded storage object
    if (!keepCreatedShop && sessionCookie) {
      if (createdShopId) {
        const delRes = await fetch(
          `${baseUrl}/api/admin/shops/${createdShopId}`,
          {
            method: "DELETE",
            headers: { Cookie: sessionCookie },
          }
        );
        const delJson = await delRes.json().catch(() => null);
        if (delRes.ok) {
          const checkGone = await fetch(
            `${baseUrl}/api/shops/${createdShopId}`
          );
          console.log(
            `[PASS] Step 7 DELETE /api/admin/shops/${createdShopId} -> ${delRes.status} (post-delete public check: ${checkGone.status})`
          );
        } else {
          console.error(
            `[WARN] Cleanup DELETE /api/admin/shops/${createdShopId} failed:`,
            delRes.status,
            delJson
          );
        }
      } else if (uploadedImage?.storage_path) {
        const delImgRes = await fetch(`${baseUrl}/api/admin/upload`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ storage_path: uploadedImage.storage_path }),
        });
        console.log(
          `[CLEANUP] DELETE /api/admin/upload (${uploadedImage.storage_path}) -> ${delImgRes.status}`
        );
      }
    }
  }

  console.log("=== All E2E Checks Passed! ===");
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});

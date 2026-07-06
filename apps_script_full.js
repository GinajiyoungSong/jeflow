/* ============================================================
 * 📍 이 파일 구조 안내 (수정할 때 여기부터 읽으세요)
 * ============================================================
 * 이 Apps Script는 하나의 웹앱 URL로 여러 공공 API를 대신 호출해주는
 * "중간 다리" 역할을 해요. 사이트 코드는 이 URL 하나만 호출하고,
 * 실제 API 키는 여기(서버 쪽)에만 있어서 브라우저에 노출되지 않아요.
 *
 * [새 API를 추가하고 싶을 때]
 *   1. doGet() 함수 안에 새 action 분기를 추가 (예: else if (action === 'xxx'))
 *   2. handleXxxRequest(e, key) 함수를 새로 만들어서 목표 API 호출
 *   3. 필요하면 맨 아래 "🔑 API 키 보관함"에 키 추가
 *   4. 다 수정했으면 꼭 재배포! → 배포 관리 → 연필 아이콘 → 새 버전 → 배포
 *
 * [현재 등록된 기능 목록]
 *   - action 없음 (기본값) → 물때(조석) 조회             → handleTideRequest()
 *   - action=beach          → 해수욕장 파고/수온/조석 등   → handleBeachRequest()
 *   - action=scuba          → 스킨스쿠버지수 조회         → handleScubaRequest()
 *   - action=vilage         → 단기예보(풍속/파고 등)       → handleVilageRequest()
 *   - action=tiderecent     → 조위관측소 최신 관측데이터   → handleTideRecentRequest()
 *   - action=seacctv        → 월파감시 실시간 CCTV 영상    → handleSeaCctvRequest()
 *   - action=dronevideo     → 제주 공공저작물 영상자료     → handleDroneVideoRequest()
 *   - action=warning [신규] → 제주 기상특보 현황           → handleWarningRequest()
 *   - action=typhoon [신규] → 태풍정보 조회               → handleTyphoonRequest()
 * ============================================================ */

function doGet(e) {
  var action = e.parameter.action || 'tide';

  // 👉 여기에 새 action 분기를 추가하세요 (else if 로 이어서 추가)
  if (action === 'beach') {
    return handleBeachRequest(e, API_KEYS.beach);
  } else if (action === 'scuba') {
    return handleScubaRequest(e, API_KEYS.scuba);
  } else if (action === 'vilage') {
    return handleVilageRequest(e, API_KEYS.vilage);
  } else if (action === 'tiderecent') {
    return handleTideRecentRequest(e, API_KEYS.khoa);
  } else if (action === 'seacctv') {
    return handleSeaCctvRequest(e);
  } else if (action === 'dronevideo') {
    return handleDroneVideoRequest(e);
  } else if (action === 'warning') {
    return handleWarningRequest(e, API_KEYS.warning);
  } else if (action === 'typhoon') {
    return handleTyphoonRequest(e, API_KEYS.typhoon);
  } else {
    return handleTideRequest(e, API_KEYS.khoa);
  }
}


/* ============================================================
 * 🌀 기능 9 [신규]: 태풍정보 조회 (TyphoonInfoService / getTyphoonInfo)
 * 프론트엔드 호출 예시: ...exec?action=typhoon
 * - 오늘 날짜 기준으로 조회 (파라미터 생략 시 자동으로 오늘 날짜 사용)
 * - 응답에 태풍번호(typSeq), 이름(typName/typEn), 위치설명(typLoc), 위경도,
 *   중심기압(typPs), 최대풍속(typWs), 진행방향(typDir), 이동속도(typSp),
 *   경로이미지(img) 등이 포함됨. 태풍이 없으면 데이터가 비어있음(정상)
 * ============================================================ */
function handleTyphoonRequest(e, apiKey) {
  var fromTmFc = e.parameter.fromTmFc || getDefaultBaseDate();
  var toTmFc = e.parameter.toTmFc || getDefaultBaseDate();

  var targetUrl = "https://apis.data.go.kr/1360000/TyphoonInfoService/getTyphoonInfo"
    + "?serviceKey=" + apiKey
    + "&numOfRows=10&pageNo=1&dataType=JSON"
    + "&fromTmFc=" + fromTmFc
    + "&toTmFc=" + toTmFc;

  try {
    var response = UrlFetchApp.fetch(targetUrl, { muteHttpExceptions: true });
    return jsonOutputRaw(response.getContentText());
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}


/* ============================================================
 * ⚠️ 기능 8 [신규]: 제주 기상특보 현황 (getPwnStatus)
 * 프론트엔드 호출 예시: ...exec?action=warning
 * - 지역코드 불필요! 전국 현재 발효중인 특보를 t6 필드에 텍스트로 통째로 줌
 * - 프론트엔드에서 이 텍스트 중 "제주"가 포함된 줄만 걸러서 배너에 표시함
 * ============================================================ */
function handleWarningRequest(e, apiKey) {
  var targetUrl = "http://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus"
    + "?serviceKey=" + apiKey
    + "&pageNo=1&numOfRows=10&dataType=JSON";

  try {
    var response = UrlFetchApp.fetch(targetUrl, { muteHttpExceptions: true });
    return jsonOutputRaw(response.getContentText());
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}


/* ============================================================
 * 📹 기능 6: 월파감시 실시간 영상 (제주시청, 키 불필요)
 * 프론트엔드 호출 예시: ...exec?action=seacctv&pointname=성산
 * 응답: point_name, cctv_url(m3u8 스트림), latitude, longitude
 * ============================================================ */
function handleSeaCctvRequest(e) {
  var pointname = e.parameter.pointname || '';
  var page = e.parameter.page || '1';
  var pageSize = e.parameter.pageSize || '50';

  var targetUrl = "http://openapi.jejusi.go.kr/service/sea/"
    + "?page=" + page
    + "&pageSize=" + pageSize
    + (pointname ? "&pointname=" + encodeURIComponent(pointname) : "");

  try {
    var response = UrlFetchApp.fetch(targetUrl, { muteHttpExceptions: true });
    // [중요] 이 API는 XML로만 응답이 와서, 프론트엔드가 다루기 쉽게 JSON으로 변환해서 반환합니다.
    var xml = XmlService.parse(response.getContentText());
    var root = xml.getRootElement();
    var items = [];
    var itemsEl = root.getChild('items');
    if (itemsEl) {
      var itemEls = itemsEl.getChildren('item');
      for (var i = 0; i < itemEls.length; i++) {
        var it = itemEls[i];
        items.push({
          point_name: getXmlText_(it, 'point_name'),
          cctv_url: getXmlText_(it, 'cctv_url'),
          latitude: getXmlText_(it, 'latitude'),
          longitude: getXmlText_(it, 'longitude')
        });
      }
    }
    return jsonOutput({
      total: getXmlText_(root, 'total'),
      page: getXmlText_(root, 'page'),
      pageSize: getXmlText_(root, 'pageSize'),
      items: items
    });
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}

function getXmlText_(parent, tagName) {
  var el = parent.getChild(tagName);
  return el ? el.getText() : '';
}


/* ============================================================
 * 🎬 기능 7: 제주 공공저작물 영상자료 (드론/경관 영상, 키 불필요)
 * 프론트엔드 호출 예시: ...exec?action=dronevideo&title=성산일출봉&pageSize=10
 * 응답: title, url(상세페이지), exts.youtube, exts.thumbnail
 * ============================================================ */
function handleDroneVideoRequest(e) {
  var title = e.parameter.title || '';
  var page = e.parameter.page || '1';
  var pageSize = e.parameter.pageSize || '10';

  var targetUrl = "https://www.jeju.go.kr/api/publicmedia/movie"
    + "?page=" + page
    + "&pageSize=" + pageSize
    + (title ? "&title=" + encodeURIComponent(title) : "");

  try {
    var response = UrlFetchApp.fetch(targetUrl, { muteHttpExceptions: true });
    return jsonOutputRaw(response.getContentText());
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}


/* ============================================================
 * 💨 기능 5: 조위관측소 최신 관측데이터 (풍속 등 실측값) - 하이브리드 1순위용
 * 프론트엔드 호출 예시: ...exec?action=tiderecent&obsCode=DT_0004&reqDate=20260704&min=60
 * 응답에 풍향(wndrct)·풍속(wspd)·기온(artmp)·기압(atmpr)·수온(wtem)·조위(bscTdlvHgt)·
 * 염분(slntQty)·유향(crdir)·유속(crsp) 포함 (단, 파고는 없음)
 * ============================================================ */
function handleTideRecentRequest(e, apiKey) {
  var obsCode = e.parameter.obsCode;
  var reqDate = e.parameter.reqDate;
  var min = e.parameter.min || "60";

  if (!obsCode) {
    return jsonOutput({ error: "obsCode 파라미터가 필요합니다." });
  }

  var targetUrl = "https://apis.data.go.kr/1192136/dtRecent/GetDTRecentApiService"
    + "?serviceKey=" + apiKey
    + "&type=json"
    + "&obsCode=" + obsCode
    + "&reqDate=" + (reqDate || getDefaultBaseDate())
    + "&min=" + min;

  try {
    var response = UrlFetchApp.fetch(targetUrl, { muteHttpExceptions: true });
    return jsonOutputRaw(response.getContentText());
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}


/* ============================================================
 * 🌊 기능 1: 물때(조석) 조회
 * 프론트엔드 호출 예시: ...exec?obsCode=DT_0004&date=20260703
 * ============================================================ */
function handleTideRequest(e, apiKey) {
  var obsCode = e.parameter.obsCode;   // 관측소 코드 (예: DT_0004)
  var date = e.parameter.date;         // YYYYMMDD

  if (!obsCode || !date) {
    return jsonOutput({ error: "obsCode, date 파라미터가 필요합니다." });
  }

  var targetUrl = "https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService"
    + "?serviceKey=" + apiKey
    + "&type=json"
    + "&obsCode=" + obsCode
    + "&reqDate=" + date
    + "&min=10"
    + "&numOfRows=200";

  try {
    var response = UrlFetchApp.fetch(targetUrl, { muteHttpExceptions: true });
    return jsonOutputRaw(response.getContentText());
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}


/* ============================================================
 * 🏖️ 기능 2: 해수욕장 날씨 (파고 / 조석 / 일출일몰 / 수온)
 * 프론트엔드 호출 예시: ...exec?action=beach&type=wave&beach_num=17
 * type 값: wave(파고) | tide(조석) | sun(일출일몰) | temp(수온)
 * ============================================================ */
function handleBeachRequest(e, apiKey) {
  var type = e.parameter.type;
  var beachNum = e.parameter.beach_num;

  if (!beachNum) {
    return jsonOutput({ error: "beach_num 파라미터가 필요합니다." });
  }

  var opMap = {
    wave: "getWhBuoyBeach",
    tide: "getTideInfoBeach",
    sun:  "getSunInfoBeach",
    temp: "getTwBuoyBeach"
  };
  var operation = opMap[type] || "getWhBuoyBeach";

  var baseUrl = "https://apis.data.go.kr/1360000/BeachInfoservice/" + operation;
  var params = "?serviceKey=" + apiKey
    + "&numOfRows=10&pageNo=1&dataType=JSON&beach_num=" + beachNum;

  if (type === 'wave' || type === 'temp') {
    params += "&searchTime=" + (e.parameter.searchTime || getDefaultSearchTime());
  } else {
    params += "&base_date=" + (e.parameter.base_date || getDefaultBaseDate());
  }

  try {
    var response = UrlFetchApp.fetch(baseUrl + params, { muteHttpExceptions: true });
    return jsonOutputRaw(response.getContentText());
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}


/* ============================================================
 * 🤿 기능 3: 스킨스쿠버지수 조회
 * 프론트엔드 호출 예시: ...exec?action=scuba&placeCode=SS1
 * ============================================================ */
function handleScubaRequest(e, apiKey) {
  var placeCode = e.parameter.placeCode;
  var reqDate = e.parameter.reqDate;

  if (!placeCode) {
    return jsonOutput({ error: "placeCode 파라미터가 필요합니다." });
  }

  var targetUrl = "https://apis.data.go.kr/1192136/fcstSkinScubaV2/GetFcstSkinScubaApiServicev2"
    + "?serviceKey=" + apiKey
    + "&type=json"
    + "&reqDate=" + (reqDate || getDefaultBaseDate())
    + "&numOfRows=10"
    + "&placeCode=" + placeCode;

  try {
    var response = UrlFetchApp.fetch(targetUrl, { muteHttpExceptions: true });
    return jsonOutputRaw(response.getContentText());
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}


/* ============================================================
 * 🌬️ 기능 4: 기상청 단기예보 (바람 WSD / 파고 WAV) - 하이브리드용
 * 프론트엔드 호출 예시: ...exec?action=vilage&nx=53&ny=38&base_date=20260704&base_time=0500
 * - 격자좌표(nx, ny) 변환은 프론트엔드에서 미리 계산해서 넘겨줍니다 (람베르트 도법, 서비스키 불필요)
 * - 응답은 기상청 원본 그대로 반환 (response.body.items.item 배열) - 프론트엔드에서 WSD/WAV 카테고리 파싱
 * ============================================================ */
function handleVilageRequest(e, apiKey) {
  var nx = e.parameter.nx;
  var ny = e.parameter.ny;
  var baseDate = e.parameter.base_date || getDefaultBaseDate();
  var baseTime = e.parameter.base_time || "0500";

  if (!nx || !ny) {
    return jsonOutput({ error: "nx, ny 파라미터가 필요합니다." });
  }

  var targetUrl = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
    + "?serviceKey=" + apiKey
    + "&pageNo=1"
    + "&numOfRows=1000"
    + "&dataType=JSON"
    + "&base_date=" + baseDate
    + "&base_time=" + baseTime
    + "&nx=" + nx
    + "&ny=" + ny;

  try {
    var response = UrlFetchApp.fetch(targetUrl, { muteHttpExceptions: true });
    return jsonOutputRaw(response.getContentText());
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}


/* ============================================================
 * 🔑 API 키 보관함 - 새 API 신청하면 여기에 한 줄 추가하세요
 * (지금은 전부 같은 data.go.kr 일반인증키를 씁니다)
 * ============================================================ */
var API_KEYS = {
  khoa:    "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b",
  beach:   "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b",
  scuba:   "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b",
  vilage:  "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b",
  warning: "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b",
  typhoon: "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b"
};


/* ============================================================
 * 🛠️ 공통 헬퍼 함수 - 보통 건드릴 일 없어요
 * ============================================================ */
function getDefaultSearchTime() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMddHHmm");
}
function getDefaultBaseDate() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd");
}
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function jsonOutputRaw(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

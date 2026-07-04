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
  } else {
    return handleTideRequest(e, API_KEYS.khoa);
  }
}


/* ============================================================
 * 💨 기능 5 [신규]: 조위관측소 최신 관측데이터 (풍속 등 실측값) - 하이브리드 1순위용
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
 * 🌬️ 기능 4 [신규]: 기상청 단기예보 (바람 WSD / 파고 WAV) - 하이브리드용
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
  khoa:   "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b",
  beach:  "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b",
  scuba:  "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b",
  vilage: "d273b665e9fd1be93b9de01c39880ce9135632dfebde539dc7dd79c477512a8b"
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

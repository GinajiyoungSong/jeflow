/**
 * 기상청 API허브 - BeachInfoservice 프록시 핸들러
 * 기존 Apps Script 프로젝트의 doGet(e) 함수 안에,
 * action === 'beach' 분기 처리 부분에 아래 로직을 추가/교체하세요.
 *
 * 사용 예 (프론트엔드에서 이미 이렇게 호출 중):
 *   ...exec?action=beach&type=wave&beach_num=1
 *   ...exec?action=beach&type=temp&beach_num=1
 */

// authKey는 코드에 직접 쓰지 말고 스크립트 속성에 저장하세요.
// Apps Script 편집기 좌측 메뉴 '프로젝트 설정' → '스크립트 속성' → 키: KMA_AUTH_KEY, 값: 발급받은 인증키
function getKmaAuthKey() {
  return PropertiesService.getScriptProperties().getProperty('KMA_AUTH_KEY');
}

function handleBeachRequest(type, beachNum) {
  const authKey = getKmaAuthKey();
  const now = new Date();

  // KMA 서버는 KST 기준. Apps Script 기본 타임존이 스크립트 설정에 따라 다를 수 있어
  // 명시적으로 Asia/Seoul로 포맷팅합니다.
  const tm = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMddHHmm');

  let endpoint;
  if (type === 'wave') {
    endpoint = 'getWhBuoyBeach';
  } else if (type === 'temp') {
    endpoint = 'getTwBuoyBeach';
  } else if (type === 'sun') {
    endpoint = 'getSunInfoBeach';
  } else {
    throw new Error('알 수 없는 beach API type: ' + type);
  }

  let url;
  if (type === 'sun') {
    // 일출몰 API는 base_date 기준 (당일)
    const baseDate = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd');
    url = `https://apihub.kma.go.kr/api/typ02/openApi/BeachInfoservice/${endpoint}` +
          `?numOfRows=1&pageNo=1&dataType=JSON&Base_date=${baseDate}` +
          `&beach_num=${beachNum}&authKey=${authKey}`;
  } else {
    // 파고/수온 API는 searchTime(가장 최근 관측시각) 기준
    url = `https://apihub.kma.go.kr/api/typ02/openApi/BeachInfoservice/${endpoint}` +
          `?numOfRows=1&pageNo=1&dataType=JSON&beach_num=${beachNum}` +
          `&searchTime=${tm}&authKey=${authKey}`;
  }

  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  return res.getContentText(); // 프론트엔드가 기대하는 원본 JSON 그대로 전달
}

/**
 * 기존 doGet(e) 안에 이런 분기가 있을 거예요. 예시:
 *
 * function doGet(e) {
 *   const action = e.parameter.action;
 *
 *   if (action === 'beach') {
 *     const type = e.parameter.type;       // 'wave' | 'temp' | 'sun'
 *     const beachNum = e.parameter.beach_num;
 *     const json = handleBeachRequest(type, beachNum);
 *     return ContentService.createTextOutput(json)
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 *
 *   if (action === 'tide') {
 *     // ...기존 물때 처리 로직 그대로 유지...
 *   }
 * }
 */

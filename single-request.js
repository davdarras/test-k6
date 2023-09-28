import http from "k6/http";

export const options = {
  iterations: 2,
};

export default function () {
  const response = http.get("http://queen-api:8080/api/survey-unit/11");
  const response = http.get("http://queen-api:8080/api/survey-unit/42");
  const response = http.get("http://queen-api:8080/api/survey-unit/12");
  sleep(3);
  const response = http.get("http://queen-api:8080/api/survey-unit/11");
}

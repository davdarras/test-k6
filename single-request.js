import http from "k6/http";
import { sleep } from "k6";

export const options = {
  iterations: 5,
};

export default function () {
  let resp = http.get("http://queen-api:8080/api/survey-unit/21");
  //console.log(`status: "${resp.body}"`);
  http.get("http://queen-api:8080/api/survey-unit/22");
  http.get("http://queen-api:8080/api/survey-unit/23");
  sleep(3);
  http.get("http://queen-api:8080/api/survey-unit/24");
}

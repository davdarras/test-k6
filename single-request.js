import http from "k6/http";

export const options = {
  iterations: 1,
};

export default function () {
  const response = http.get("http://queen-api:8080/api/survey-unit/11");
}

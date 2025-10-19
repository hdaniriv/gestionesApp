export const environment = {
  production: false,
  API_URL: "http://localhost:3000/api",
  FEATURE_FLAGS: {
    LOG_HTTP_HEADERS: true,
    LOG_HTTP_BODY: true,
    // NO_CACHE ahora usa query param _nc en GET para evitar 304 sin tocar headers
    NO_CACHE: true,
  },
};

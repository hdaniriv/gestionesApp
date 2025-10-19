import {
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from "@angular/common/http";
import { finalize, tap } from "rxjs/operators";
import { Observable } from "rxjs";
import { environment } from "../environments/environment";

export const loggingInterceptor: HttpInterceptorFn = (
  req,
  next
): Observable<HttpEvent<unknown>> => {
  const started = performance.now();
  const { method, urlWithParams } = req;

  // En dev, evitar 304 con un cache-busting param en GET (sin tocar headers para no romper CORS)
  if (
    !environment.production &&
    environment.FEATURE_FLAGS?.NO_CACHE &&
    req.method === "GET"
  ) {
    const url = new URL(urlWithParams, window.location.origin);
    url.searchParams.set("_nc", Date.now().toString());
    req = req.clone({ url: url.toString() });
  }

  // Log detallado de request (endpoint, headers y body opcional)
  if (!environment.production) {
    // eslint-disable-next-line no-console
    console.debug("[HTTP REQ]", method, urlWithParams);
    if (environment.FEATURE_FLAGS?.LOG_HTTP_HEADERS) {
      // eslint-disable-next-line no-console
      console.debug(
        "[HTTP REQ HEADERS]",
        req.headers
          ?.keys()
          .reduce((acc: any, k) => ({ ...acc, [k]: req.headers.get(k) }), {})
      );
    }
    if (environment.FEATURE_FLAGS?.LOG_HTTP_BODY && req.body) {
      // eslint-disable-next-line no-console
      console.debug("[HTTP REQ BODY]", req.body);
    }
  }

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const elapsed = Math.round(performance.now() - started);
          // eslint-disable-next-line no-console
          console.debug(
            `[HTTP RES] ${method} ${urlWithParams} -> ${event.status} in ${elapsed}ms`
          );
          if (
            !environment.production &&
            environment.FEATURE_FLAGS?.LOG_HTTP_HEADERS
          ) {
            // eslint-disable-next-line no-console
            console.debug(
              "[HTTP RES HEADERS]",
              event.headers
                ?.keys()
                .reduce(
                  (acc: any, k) => ({ ...acc, [k]: event.headers.get(k) }),
                  {}
                )
            );
          }
          if (
            !environment.production &&
            environment.FEATURE_FLAGS?.LOG_HTTP_BODY
          ) {
            // eslint-disable-next-line no-console
            console.debug("[HTTP RES BODY]", event.body);
          }
        }
      },
      error: (err) => {
        const elapsed = Math.round(performance.now() - started);
        const status = err?.status ?? "ERR";
        // eslint-disable-next-line no-console
        console.debug(
          `[HTTP ERR] ${method} ${urlWithParams} -> ${status} in ${elapsed}ms`,
          err
        );
      },
    }),
    finalize(() => {
      // noop; kept for symmetry and potential future aggregation
    })
  );
};

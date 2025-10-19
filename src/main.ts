import { bootstrapApplication } from "@angular/platform-browser";
import {
  provideHttpClient,
  withInterceptors,
  withFetch,
} from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { provideAnimations } from "@angular/platform-browser/animations";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";
import { authInterceptor } from "./app/core/auth.interceptor";
import { loggingInterceptor } from "./app/core/logging.interceptor";
import { environment } from "./app/environments/environment";

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors(
        environment.production
          ? [authInterceptor]
          : [loggingInterceptor, authInterceptor]
      )
    ),
    provideAnimations(),
  ],
}).catch((err) => console.error(err));

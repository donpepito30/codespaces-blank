# Andes · Radar laboral Ecuador

Aplicación para explorar oportunidades públicas de trabajo en Ecuador y cotejarlas con un curriculum. El análisis del CV ocurre en el navegador: el archivo no se sube ni se guarda.

La búsqueda en vivo usa una Cloudflare Pages Function en `/api/search` para consultar Computrabajo, Impactpool, UNJobNet, OEA/CIDH, UNICEF y UNFPA Ecuador. Cada adaptador extrae enlaces públicos y, cuando existe, datos `JobPosting` en JSON-LD. Si una fuente no responde, las demás continúan disponibles y la interfaz conserva un catálogo local de respaldo para desarrollo.

## Flujo del usuario

1. Puede escribir un cargo, habilidad o empresa y ejecutar una búsqueda manual.
2. Puede cargar un CV en PDF, TXT o MD; el análisis se hace localmente en el navegador.
3. Andes detecta habilidades y un rol aproximado, genera una consulta y ejecuta la búsqueda automáticamente.
4. Puede elegir `Ecuador`, `Internacionales` o `Todas las fuentes` antes o después de cargar el CV.
5. Los resultados se ordenan por coincidencia cuando la fuente aporta habilidades; la postulación siempre se completa en el portal original.

## Ejecutar localmente

```bash
python3 -m http.server 8788
```

Visita `http://localhost:8788`.

## Desplegar en Cloudflare Pages

1. Sube este repositorio a GitHub.
2. En Cloudflare: **Workers & Pages > Create application > Pages > Connect to Git**.
3. Configura preset `None`, comando de build vacío y directorio de salida `.`.
4. Cloudflare detectará automáticamente `functions/api/search.js` y publicará la ruta `/api/search` junto con la interfaz.

Con Wrangler:

```bash
npx wrangler pages deploy . --project-name andes-radar
```

Para probar la función localmente, usa Wrangler en lugar de `python3 -m http.server`, ya que el servidor estático no ejecuta Pages Functions:

```bash
npx wrangler pages dev .
```

## Fuentes y alcance

Las fuentes conectadas son Computrabajo, Impactpool, UNJobNet, OEA/CIDH, UNICEF y UNFPA Ecuador. ReliefWeb fue descartada del scraping HTML porque AWS WAF presenta un desafío; debe integrarse mediante su API pública. Indeed, Buscojobs y Jooble también requieren API, feed o autorización del proveedor. No se deben evadir CAPTCHA, Cloudflare ni AWS WAF. La función usa caché HTTP de 15 minutos y limita el detalle a 10 ofertas por fuente y consulta para reducir carga sobre los portales.
